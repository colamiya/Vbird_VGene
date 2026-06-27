use std::env;
use std::path::PathBuf;
use std::process::Command;

fn command_exists(name: &str) -> bool {
    env::var_os("PATH")
        .map(|paths| {
            env::split_paths(&paths).any(|path| {
                let candidate = path.join(name);
                candidate.exists() || cfg!(windows) && path.join(format!("{name}.exe")).exists()
            })
        })
        .unwrap_or(false)
}

fn compile_cuda_ptx() {
    if env::var_os("CARGO_FEATURE_CUDA").is_none() {
        return;
    }

    if !command_exists("nvcc") {
        panic!(
            "CUDA feature enabled but nvcc was not found in PATH. Install NVIDIA CUDA Toolkit and set PATH, or build without --features cuda."
        );
    }
    if cfg!(windows) && !command_exists("cl") {
        panic!(
            "CUDA feature enabled but MSVC cl.exe was not found in PATH. Run from a Developer PowerShell or install Visual Studio Build Tools."
        );
    }

    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let kernel = manifest_dir.join("src/evolution/gpu/kernels/evolution.cu");
    let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR"));
    let ptx = out_dir.join("vgene_evolution.ptx");
    let arch = env::var("VGENE_CUDA_ARCH").unwrap_or_else(|_| "sm_86".to_string());

    println!("cargo:rerun-if-changed={}", kernel.display());
    println!("cargo:rerun-if-env-changed=VGENE_CUDA_ARCH");

    let output = Command::new("nvcc")
        .arg("-ptx")
        .arg(format!("-arch={arch}"))
        .arg("-O3")
        .arg("-o")
        .arg(&ptx)
        .arg(&kernel)
        .output()
        .expect("failed to run nvcc");

    if !output.status.success() {
        panic!(
            "nvcc failed while compiling {}:\nstdout:\n{}\nstderr:\n{}",
            kernel.display(),
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

fn main() {
    compile_cuda_ptx();
    tauri_build::build();
}
