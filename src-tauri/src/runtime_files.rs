use chrono::Local;
use std::fs::{create_dir_all, read_to_string, File};
use std::io::Write as IoWrite;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use windows::core::PCWSTR;
#[cfg(windows)]
use windows::Win32::Storage::FileSystem::{
    MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
};

const APP_DATA_DIR_NAME: &str = "VGene";
const MAX_RUN_LOG_BYTES: usize = 256 * 1024;
static RUN_LOG_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

pub fn runtime_dir() -> PathBuf {
    let preferred = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|path| path.join(APP_DATA_DIR_NAME));

    if let Some(dir) = preferred {
        if create_dir_all(&dir).is_ok() {
            return dir;
        }
        eprintln!("Unable to create app data runtime directory: {:?}", dir);
    }

    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

pub fn runtime_file(name: &str) -> PathBuf {
    runtime_dir().join(name)
}

pub fn read_text_with_legacy_fallback(name: &str) -> Result<String, String> {
    let runtime_path = runtime_file(name);
    match read_to_string(&runtime_path) {
        Ok(content) => Ok(content),
        Err(runtime_error) => read_to_string(name).map_err(|legacy_error| {
            format!(
                "Unable to read {:?}: {}; legacy {}: {}",
                runtime_path, runtime_error, name, legacy_error
            )
        }),
    }
}

pub fn write_text(name: &str, content: &str) -> Result<PathBuf, String> {
    let path = runtime_file(name);
    write_text_atomically(&path, content)?;
    Ok(path)
}

fn write_text_atomically(path: &Path, content: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("Unable to resolve parent directory for {:?}", path))?;
    create_dir_all(parent)
        .map_err(|error| format!("Unable to create runtime directory {:?}: {}", parent, error))?;

    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("Invalid runtime file name for {:?}", path))?;
    let unique_suffix = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let temp_path = parent.join(format!(
        ".{}.{}.{}.tmp",
        file_name,
        std::process::id(),
        unique_suffix
    ));

    {
        let mut file = File::create(&temp_path)
            .map_err(|error| format!("Unable to create temp file {:?}: {}", temp_path, error))?;
        file.write_all(content.as_bytes())
            .map_err(|error| format!("Unable to write temp file {:?}: {}", temp_path, error))?;
        file.sync_all()
            .map_err(|error| format!("Unable to sync temp file {:?}: {}", temp_path, error))?;
    }

    replace_file(&temp_path, path).map_err(|error| {
        let _ = std::fs::remove_file(&temp_path);
        error
    })
}

#[cfg(windows)]
fn replace_file(temp_path: &Path, target_path: &Path) -> Result<(), String> {
    let from: Vec<u16> = temp_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let to: Vec<u16> = target_path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let flags = MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH;

    unsafe { MoveFileExW(PCWSTR(from.as_ptr()), PCWSTR(to.as_ptr()), flags) }.map_err(|error| {
        format!(
            "Unable to atomically replace {:?} with {:?}: {}",
            target_path, temp_path, error
        )
    })
}

#[cfg(not(windows))]
fn replace_file(temp_path: &Path, target_path: &Path) -> Result<(), String> {
    std::fs::rename(temp_path, target_path).map_err(|error| {
        format!(
            "Unable to atomically replace {:?} with {:?}: {}",
            target_path, temp_path, error
        )
    })
}

pub fn read_runtime_text(name: &str) -> String {
    read_to_string(runtime_file(name)).unwrap_or_default()
}

fn truncate_to_log_budget(content: &str) -> &str {
    if content.len() <= MAX_RUN_LOG_BYTES {
        return content;
    }

    let mut end = MAX_RUN_LOG_BYTES;
    while !content.is_char_boundary(end) {
        end -= 1;
    }
    &content[..end]
}

// Insert newest entries first so the run log opens at the latest event.
pub fn write_run_log(module: &str, content: &str) {
    let lock = RUN_LOG_LOCK.get_or_init(|| Mutex::new(()));
    let _guard = match lock.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let new_entry = format!("[{}] [{}] {}\n", now, module, content);
    let log_path = runtime_file("run.log");

    let existing_content = read_to_string(&log_path).unwrap_or_default();
    let retained_content = truncate_to_log_budget(&existing_content);
    let next_content = format!("{new_entry}{retained_content}");
    if let Err(error) = write_text_atomically(&log_path, &next_content) {
        eprintln!("Unable to write run log {:?}: {}", log_path, error);
    }
}

#[cfg(test)]
mod tests {
    use super::write_text_atomically;
    use std::fs::read_to_string;

    #[test]
    fn atomic_text_write_replaces_existing_file() {
        let dir =
            std::env::temp_dir().join(format!("vgene-runtime-files-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).expect("create temp test dir");
        let path = dir.join("settings.json");

        write_text_atomically(&path, "{\"value\":1}").expect("initial write");
        write_text_atomically(&path, "{\"value\":2}").expect("replacement write");

        assert_eq!(
            read_to_string(&path).expect("read settings"),
            "{\"value\":2}"
        );
        let _ = std::fs::remove_file(path);
        let _ = std::fs::remove_dir(dir);
    }
}
