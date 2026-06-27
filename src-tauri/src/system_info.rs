use crate::runtime_files::write_run_log;
use serde::Serialize;
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

#[derive(Serialize)]
pub struct SysInfo {
    cpu_brand: String,
    cpu_cores: usize,
    os_info: String,
    mem_speed: String,
    mem_type: String,
    gpu_info: Vec<GpuInfo>,
}

#[derive(Serialize, Clone)]
struct GpuInfo {
    name: String,
    cuda_cores: u32,
    memory_total: u64,
}

#[derive(Serialize)]
pub struct LiveStats {
    cpu_usage: f32,
    memory_usage: f32,
    memory_total: f32,
    gpu_stats: Vec<GpuLiveStats>,
}

#[derive(Serialize, Clone)]
struct GpuLiveStats {
    load: u32,
    memory_usage: u64,
    temperature: u32,
}

fn parse_memory_clock_mhz(output: &str) -> Option<u32> {
    output
        .lines()
        .skip(1)
        .flat_map(|line| line.split_whitespace())
        .filter_map(|token| token.parse::<u32>().ok())
        .filter(|speed| *speed > 0)
        .max()
}

fn memory_type_from_clock(speed_mhz: u32) -> &'static str {
    if speed_mhz >= 4800 {
        "DDR5"
    } else if speed_mhz >= 2133 {
        "DDR4"
    } else if speed_mhz >= 800 {
        "DDR3"
    } else {
        "DDR"
    }
}

#[tauri::command]
pub fn get_sys_info() -> SysInfo {
    write_run_log("System", "Fetching global system information");
    let mut sys = System::new_all();
    sys.refresh_specifics(
        RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let cpu_cores = sys.cpus().len();
    let os_info = format!(
        "{} v{}",
        System::name().unwrap_or_default(),
        System::os_version().unwrap_or_default()
    );

    let (mem_speed, mem_type) = if cfg!(windows) {
        use std::process::Command;
        let output = Command::new("wmic")
            .args(["memorychip", "get", "speed,ConfiguredClockSpeed"])
            .output()
            .ok();

        if let Some(out) = output {
            let stdout = String::from_utf8_lossy(&out.stdout);
            if let Some(speed_mhz) = parse_memory_clock_mhz(&stdout) {
                (
                    format!("{} MHz", speed_mhz),
                    memory_type_from_clock(speed_mhz).to_string(),
                )
            } else {
                ("Unknown".to_string(), "Unknown".to_string())
            }
        } else {
            ("Unknown".to_string(), "Unknown".to_string())
        }
    } else {
        ("Unknown".to_string(), "Unknown".to_string())
    };

    let mut gpu_info = Vec::new();
    {
        use nvml_wrapper::Nvml;
        if let Ok(nvml) = Nvml::init() {
            if let Ok(device_count) = nvml.device_count() {
                for i in 0..device_count {
                    if let Ok(device) = nvml.device_by_index(i) {
                        gpu_info.push(GpuInfo {
                            name: device.name().unwrap_or_else(|_| "NVIDIA GPU".to_string()),
                            cuda_cores: device.num_cores().unwrap_or(0),
                            memory_total: device
                                .memory_info()
                                .map(|memory| memory.total)
                                .unwrap_or(0),
                        });
                    }
                }
            }
        }
    }

    SysInfo {
        cpu_brand,
        cpu_cores,
        os_info,
        mem_speed,
        mem_type,
        gpu_info,
    }
}

#[tauri::command]
pub fn get_live_stats() -> LiveStats {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let mut gpu_stats = Vec::new();
    {
        use nvml_wrapper::Nvml;
        if let Ok(nvml) = Nvml::init() {
            if let Ok(device_count) = nvml.device_count() {
                for i in 0..device_count {
                    if let Ok(device) = nvml.device_by_index(i) {
                        gpu_stats.push(GpuLiveStats {
                            load: device
                                .utilization_rates()
                                .map(|usage| usage.gpu)
                                .unwrap_or(0),
                            memory_usage: device
                                .memory_info()
                                .map(|memory| memory.used)
                                .unwrap_or(0),
                            temperature: device
                                .temperature(
                                    nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu,
                                )
                                .unwrap_or(0),
                        });
                    }
                }
            }
        }
    }

    LiveStats {
        cpu_usage: sys.global_cpu_usage(),
        memory_usage: sys.used_memory() as f32 / 1024.0 / 1024.0,
        memory_total: sys.total_memory() as f32 / 1024.0 / 1024.0,
        gpu_stats,
    }
}
