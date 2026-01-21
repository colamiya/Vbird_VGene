use sysinfo::System;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvConfig {
    pub max_entities: usize,
    pub evolution_throttle: u64, // 进化周期之间的毫秒数
    pub visual_fidelity: String, // "High"或"Low"
}

pub fn detect_hardware() -> EnvConfig {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_memory_gb = sys.total_memory() / 1024 / 1024 / 1024;
    let cpus = sys.cpus().len();

    // 启发式：如果内存>16GB且核心数>8，则假设高性能
    if total_memory_gb >= 16 && cpus >= 8 {
        EnvConfig {
            max_entities: 2000,
            evolution_throttle: 100, // 快速进化
            visual_fidelity: "High".to_string(),
        }
    } else {
        EnvConfig {
            max_entities: 500,
            evolution_throttle: 500, // 较慢的进化
            visual_fidelity: "Low".to_string(),
        }
    }
}
