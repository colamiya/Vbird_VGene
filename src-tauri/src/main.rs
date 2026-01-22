// 防止Windows发布版本中出现额外的控制台窗口，请勿删除！
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod evolution;
mod state;

use tauri::State;
use std::sync::Arc;
use state::{AppState, LineageRecord};
use evolution::{entity::Entity, entity::Ethics, mutation::MutationMode};
use rayon::prelude::*;
use std::time::Duration;
use tokio::sync::mpsc;
use sysinfo::{System, RefreshKind, CpuRefreshKind, MemoryRefreshKind};
use serde::{Serialize, Deserialize};
use std::fs::{OpenOptions, read_to_string};
use std::io::{Write as IoWrite};
use chrono::Local;

const MALICIOUS_DNA_TEMPLATE: &str = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 999
  )
)"#;

fn calculate_distance(p1: (f32, f32, f32), p2: (f32, f32, f32)) -> f32 {
    ((p1.0 - p2.0).powi(2) + (p1.1 - p2.1).powi(2) + (p1.2 - p2.2).powi(2)).sqrt()
}

fn process_collision(entities: &mut [Entity], i: usize, j: usize) {
    let pos1 = entities[i].position;
    let pos2 = entities[j].position;
    
    // 🔒 优化：改用平方距离比较，避免开方运算 (Law #15)
    let dx = pos1.0 - pos2.0;
    let dy = pos1.1 - pos2.1;
    let dz = pos1.2 - pos2.2;
    let dist_sq = dx * dx + dy * dy + dz * dz;

    if dist_sq < 0.25 { // 0.5 * 0.5
        // 🔒 利他主义与协作逻辑 (Law #21)
        let altruism_i = entities[i].ethics.altruism;
        let altruism_j = entities[j].ethics.altruism;

        // 如果双方都比较善良，则分享能量
        if altruism_i > 0.7 && altruism_j > 0.7 {
            let shared = (entities[i].energy + entities[j].energy) / 2.0;
            entities[i].energy = shared;
            entities[j].energy = shared;
            return;
        }

        // 攻击逻辑 (PVP 燃料掠夺)
        if entities[i].stats.attack > entities[j].stats.defense + 50 {
            entities[j].energy = 0.0;
            entities[i].energy = (entities[i].energy + 20.0).min(100.0);
        } else if entities[j].stats.attack > entities[i].stats.defense + 50 {
            entities[i].energy = 0.0;
            entities[j].energy = (entities[j].energy + 20.0).min(100.0);
        }
    }
}

#[derive(Serialize)]
struct SysInfo {
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
struct LiveStats {
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

// 日志函数：首行插入
fn write_to_run_log(module: &str, content: &str) {
    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let new_entry = format!("[{}] [{}] {}\n", now, module, content);
    
    let existing_content = read_to_string("run.log").unwrap_or_default();
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open("run.log")
        .unwrap();
    
    file.write_all(new_entry.as_bytes()).unwrap();
    file.write_all(existing_content.as_bytes()).unwrap();
}

#[tauri::command]
fn logger(module: String, content: String) {
    write_to_run_log(&module, &content);
}

#[derive(Serialize, Deserialize, Clone)]
struct AppSettings {
    mode: String,
    ollama_url: String,
    model_name: String,
    max_entities: usize,
    evolution_throttle: u64,
    visual_fidelity: String,
    resolution: String,
    display_mode: String,
}

#[tauri::command]
fn save_settings(settings: AppSettings) -> Result<(), String> {
    write_to_run_log("Settings", "Saving user configuration to settings.json");
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write("settings.json", json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_settings() -> Result<AppSettings, String> {
    write_to_run_log("Settings", "Loading configuration from settings.json");
    let content = read_to_string("settings.json").map_err(|e| e.to_string())?;
    let settings: AppSettings = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(settings)
}

#[derive(Serialize)]
struct EntityView {
    id: u32,
    position: (f32, f32, f32),
    ethics: Ethics,
    score: f32,
    energy: f32,
    metabolic_toxin: f32,
    generation: u32,
}

#[tauri::command]
fn get_sys_info() -> SysInfo {
    write_to_run_log("System", "Fetching global system information");
    let mut sys = System::new_all();
    sys.refresh_specifics(RefreshKind::nothing().with_cpu(CpuRefreshKind::everything()).with_memory(MemoryRefreshKind::everything()));
    
    let cpu_brand = sys.cpus().first().map(|cpu| cpu.brand().to_string()).unwrap_or_else(|| "Unknown".to_string());
    let cpu_cores = sys.cpus().len();
    let os_info = format!("{} v{}", System::name().unwrap_or_default(), System::os_version().unwrap_or_default());

    // 获取内存速度和类型 (Windows 专用)
    let (mem_speed, mem_type) = if cfg!(windows) {
        use std::process::Command;
        let output = Command::new("wmic")
            .args(&["memorychip", "get", "speed,ConfiguredClockSpeed"])
            .output()
            .ok();
        
        let speed = if let Some(out) = output {
            let s = String::from_utf8_lossy(&out.stdout);
            s.lines()
                .nth(1)
                .map(|l| l.trim().to_string())
                .unwrap_or_else(|| "Unknown".to_string())
        } else {
            "Unknown".to_string()
        };

        // 简单启发式判断 DDR 类型 (基于速度)
        let m_type = if let Ok(s_val) = speed.parse::<u32>() {
            if s_val >= 4800 { "DDR5" }
            else if s_val >= 2133 { "DDR4" }
            else if s_val >= 800 { "DDR3" }
            else { "DDR" }
        } else {
            "DDR4" // 默认
        };

        (format!("{} MHz", speed), m_type.to_string())
    } else {
        ("Unknown".to_string(), "Unknown".to_string())
    };

    // 获取 GPU 信息
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
                            memory_total: device.memory_info().map(|m| m.total).unwrap_or(0),
                        });
                    }
                }
            }
        }
    }
    // 如果没有 NVIDIA GPU 或 NVML 失败，尝试简单占位或后续扩展
    if gpu_info.is_empty() {
        // 可以添加 Intel/AMD 的获取逻辑，暂用占位
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
fn get_live_stats() -> LiveStats {
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
                            load: device.utilization_rates().map(|u| u.gpu).unwrap_or(0),
                            memory_usage: device.memory_info().map(|m| m.used).unwrap_or(0),
                            temperature: device.temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu).unwrap_or(0),
                        });
                    }
                }
            }
        }
    }

    LiveStats {
        cpu_usage: sys.global_cpu_usage(),
        memory_usage: sys.used_memory() as f32 / 1024.0 / 1024.0, // MB
        memory_total: sys.total_memory() as f32 / 1024.0 / 1024.0, // MB
        gpu_stats,
    }
}

#[tauri::command]
async fn export_logs(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    let lineage = state.lineage_history.lock().unwrap();
    let log_content = serde_json::to_string_pretty(&*lineage)
        .map_err(|e| e.to_string())?;
    
    // 简单的日志导出到当前目录
    std::fs::write("vgene_evolution_log.json", log_content)
        .map_err(|e| e.to_string())?;
    
    Ok("Logs exported to vgene_evolution_log.json".to_string())
}

#[tauri::command]
async fn start_sim(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    write_to_run_log("Simulation", "Attempting to start simulation engine");
    let mut is_running = state.is_running.lock().unwrap();
    if *is_running {
        return Ok("Already running".to_string());
    }
    *is_running = true;
    
    // 如果种群为空，初始化种群
    let mut entities = state.entities.lock().unwrap();
    if entities.is_empty() {
        let config = state.env_config.lock().unwrap();
        let initial_dna = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 10
  )
)"#;
        for i in 0..config.max_entities {
             entities.push(Entity::new(i as u32, initial_dna.to_string()));
        }
    }

    // 生成模拟任务 (Async)
    let state_clone = state.inner().clone();
    tokio::spawn(async move {
        simulation_loop(state_clone).await;
    });

    Ok("Simulation started".to_string())
}

#[tauri::command]
async fn stop_sim(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    write_to_run_log("Simulation", "Stopping simulation engine");
    let mut is_running = state.is_running.lock().unwrap();
    *is_running = false;
    Ok("Simulation stopped".to_string())
}

#[tauri::command]
fn get_world_binary(state: State<'_, Arc<AppState>>) -> Vec<u8> {
    let entities = state.entities.lock().unwrap();
    let mut buffer = Vec::with_capacity(entities.len() * 36);
    
    for e in entities.iter() {
        buffer.extend_from_slice(&e.id.to_le_bytes());
        buffer.extend_from_slice(&e.position.0.to_le_bytes());
        buffer.extend_from_slice(&e.position.1.to_le_bytes());
        buffer.extend_from_slice(&e.position.2.to_le_bytes());
        buffer.extend_from_slice(&e.ethics.altruism.to_le_bytes());
        buffer.extend_from_slice(&e.score.to_le_bytes());
        buffer.extend_from_slice(&e.energy.to_le_bytes());
        buffer.extend_from_slice(&e.metabolic_toxin.to_le_bytes());
        buffer.extend_from_slice(&e.generation.to_le_bytes());
    }

    // 🔒 附加全域统计信息 (香农熵等) 到原始缓冲区末尾
    if !entities.is_empty() {
        let scores: Vec<i32> = entities.iter().map(|e| (e.score / 10.0) as i32).collect();
        let mut counts = std::collections::HashMap::new();
        for s in scores {
            *counts.entry(s).or_insert(0) += 1;
        }
        
        let mut entropy = 0.0;
        let len = entities.len() as f32;
        for &count in counts.values() {
            let p = count as f32 / len;
            entropy -= p * p.log2();
        }
        let normalized_entropy = (entropy / 5.0).min(1.0) * 100.0;
        
        let avg_score: f32 = entities.iter().map(|e| e.score).sum::<f32>() / len;
        let avg_gen: f32 = entities.iter().map(|e| e.generation as f32).sum::<f32>() / len;
        
        buffer.extend_from_slice(&normalized_entropy.to_le_bytes());
        buffer.extend_from_slice(&avg_score.to_le_bytes());
        buffer.extend_from_slice(&avg_gen.to_le_bytes());
    }

    // 🔒 极致压缩：使用 Zstd 压缩二进制流 (Law #15)
    zstd::encode_all(&buffer[..], 3).unwrap_or(buffer)
}

#[tauri::command]
async fn get_world_state(state: State<'_, Arc<AppState>>) -> Result<Vec<EntityView>, String> {
    let entities = state.entities.lock().unwrap();
    Ok(entities.iter().map(|e| EntityView {
        id: e.id,
        position: e.position,
        ethics: e.ethics.clone(),
        score: e.score,
        energy: e.energy,
        metabolic_toxin: e.metabolic_toxin,
        generation: e.generation,
    }).collect())
}

#[tauri::command]
async fn get_lineage(state: State<'_, Arc<AppState>>) -> Result<Vec<LineageRecord>, String> {
    let history = state.lineage_history.lock().unwrap();
    Ok(history.clone())
}

#[tauri::command]
async fn get_hall_of_fame(state: State<'_, Arc<AppState>>) -> Result<Vec<Entity>, String> {
    let fame = state.hall_of_fame.lock().unwrap();
    Ok(fame.clone())
}

#[tauri::command]
async fn interfere_at(state: State<'_, Arc<AppState>>, x: f32, y: f32, z: f32) -> Result<String, String> {
    write_to_run_log("Simulation", &format!("Observer intervention at coordinates: ({}, {}, {})", x, y, z));
    let mut entities = state.entities.lock().unwrap();
    let mut count = 0;
    for entity in entities.iter_mut() {
        let dist = calculate_distance(entity.position, (x, y, z));
        if dist < 2.0 {
            // 观察者干扰：增加该区域实体的能量，并略微提高其得分（模拟干预）
            entity.energy = (entity.energy + 30.0).min(100.0);
            entity.score += 5.0;
            count += 1;
        }
    }
    Ok(format!("Interfered with {} entities at ({}, {}, {})", count, x, y, z))
}

#[tauri::command]
async fn get_entity_detail(state: State<'_, Arc<AppState>>, entity_id: u32) -> Result<Entity, String> {
    let entities = state.entities.lock().unwrap();
    entities.iter()
        .find(|e| e.id == entity_id)
        .cloned()
        .ok_or_else(|| "Entity not found".to_string())
}

#[tauri::command]
async fn update_settings(
    state: State<'_, Arc<AppState>>, 
    mode: String, 
    ollama_url: Option<String>, 
    model_name: Option<String>,
    max_entities: Option<usize>,
    evolution_throttle: Option<u64>,
    visual_fidelity: Option<String>
) -> Result<String, String> {
    write_to_run_log("Settings", "Updating environment parameters");
    {
        let mut engine = state.mutation_engine.lock().unwrap();
        match mode.as_str() {
            "Ollama" => {
                if let (Some(url), Some(model)) = (ollama_url, model_name) {
                    engine.set_mode(MutationMode::Ollama { url, model });
                }
            },
            _ => {
                engine.set_mode(MutationMode::LocalMock);
            }
        }
    }

    {
        let mut config = state.env_config.lock().unwrap();
        if let Some(max) = max_entities {
            config.max_entities = max;
        }
        if let Some(throttle) = evolution_throttle {
            config.evolution_throttle = throttle;
        }
        if let Some(fidelity) = visual_fidelity {
            config.visual_fidelity = fidelity;
        }
    }

    Ok("Settings updated".to_string())
}

async fn simulation_loop(state: Arc<AppState>) {
    write_to_run_log("Simulation", "Core simulation loop initialized and running");
    let (tx, mut rx) = mpsc::channel::<(u32, String)>(100);

    loop {
        {
            let is_running = state.is_running.lock().unwrap();
            if !*is_running {
                break;
            }
        }
        
        let throttle_ms = {
            state.env_config.lock().unwrap().evolution_throttle
        };

        // 1. 应用上一次迭代的变异结果 (Mutation results from previous cycle)
        let mut updates = Vec::new();
        while let Ok(update) = rx.try_recv() {
            updates.push(update);
        }

        if !updates.is_empty() {
            let mut entities = state.entities.lock().unwrap();
            let history = state.lineage_history.lock().unwrap();
            for (id, new_dna) in updates {
                if let Some(entity) = entities.iter_mut().find(|e| e.id == id) {
                    // 应用前最后一次检查，确保不是黑名单 DNA
                    if !state.crash_registry.is_blacklisted(&new_dna) {
                        // 🔒 关联父代 ID (从谱系历史中回溯)
                        if let Some(record) = history.iter().rev().find(|r| r.id == id) {
                            entity.parent_id = record.parent_id;
                        }
                        entity.dna = new_dna;
                        entity.generation += 1;
                        entity.energy = 100.0; // 进化后重置能量
                        entity.metabolic_toxin = 0.0;
                    }
                }
            }
        }

        // 2. 进化/处理步骤
        {
            let mut entities = state.entities.lock().unwrap();
            let wasm_engine = &state.wasm_engine; // 直接使用 Arc
            
            // 🔒 动态捕食者注入逻辑 (Law #2: 捕食者-猎物模型)
            // 基于种群平均健康度动态触发，而非固定周期
            let (total_energy, _max_gen) = entities.iter().fold((0.0, 0), |(e, g), ent| (e + ent.energy, g.max(ent.generation)));
            let avg_energy = if entities.is_empty() { 0.0 } else { total_energy / entities.len() as f32 };
            
            // 如果平均能量过高 (过度繁荣) 且种群未达上限，则注入捕食者
            if avg_energy > 80.0 && entities.len() < 2000 {
                let mut predator = Entity::new(rand::random::<u32>(), MALICIOUS_DNA_TEMPLATE.to_string());
                predator.stats.attack = 120; // 极高攻击力
                predator.ethics.altruism = 0.0; // 极度邪恶
                entities.push(predator);
            }

            // 并行执行 WASM 与状态更新
            entities.par_iter_mut().for_each(|entity| {
                // 执行 WASM 并获取效率
                match wasm_engine.execute_entity(entity) {
                    Ok(score) => {
                        entity.score = score;
                    }
                    Err(_) => {
                        entity.score = 0.0;
                        entity.energy -= 10.0; // 运行时错误重罚
                    }
                }

                // 代谢毒素逻辑：低效代码产生毒素
                if entity.stats.efficiency < 0.3 {
                    entity.metabolic_toxin += 0.05;
                } else {
                    entity.metabolic_toxin -= 0.01;
                }
                entity.metabolic_toxin = entity.metabolic_toxin.clamp(0.0, 1.0);

                // 能量消耗 (规则 1: 熵增损耗)
                entity.energy -= 0.1 + (entity.metabolic_toxin * 0.5);

                // 🔒 计算引力场 (定律 #13: 资源分配)
                // 高得分个体吸引更多“计算能量”
                let gravity_gain = (entity.score / 50.0).min(0.5);
                entity.energy += gravity_gain;
                
                // 简单的移动逻辑 (受引力影响，暂时模拟为随机+微调)
                entity.position.0 += (rand::random::<f32>() - 0.5) * 0.2;
                entity.position.1 += (rand::random::<f32>() - 0.5) * 0.2;
                entity.position.2 += (rand::random::<f32>() - 0.5) * 0.2;

                // 死亡逻辑
                if entity.energy <= 0.0 || entity.metabolic_toxin >= 1.0 {
                    entity.score = 0.0; // 标记为死亡，稍后由变异逻辑替换
                }
            });

            // 🔒 优化后的碰撞检测：基于简单的空间网格划分 (Law #15)
            // 将空间划分为 2.0x2.0x2.0 的网格
            use std::collections::HashMap;
            let mut grid: HashMap<(i32, i32, i32), Vec<usize>> = HashMap::new();
            let grid_size = 2.0;

            for (idx, entity) in entities.iter().enumerate() {
                let cell = (
                    (entity.position.0 / grid_size).floor() as i32,
                    (entity.position.1 / grid_size).floor() as i32,
                    (entity.position.2 / grid_size).floor() as i32,
                );
                grid.entry(cell).or_default().push(idx);
            }

            // 🔒 修正：使用 13 个正向偏移量避免重复计算与漏算
            let offsets = [
                (1, 0, 0), (0, 1, 0), (0, 0, 1),
                (1, 1, 0), (1, -1, 0), (1, 0, 1), (1, 0, -1),
                (0, 1, 1), (0, 1, -1), (1, 1, 1), (1, 1, -1),
                (1, -1, 1), (1, -1, -1)
            ];

            let cells: Vec<_> = grid.keys().cloned().collect();
            for cell in cells {
                if let Some(indices) = grid.get(&cell) {
                    // 1. 网格内部碰撞
                    for i in 0..indices.len() {
                        for j in i + 1..indices.len() {
                            process_collision(&mut entities, indices[i], indices[j]);
                        }
                    }

                    // 2. 相邻网格碰撞 (仅检查定义的 13 个方向)
                    for &(dx, dy, dz) in &offsets {
                        let neighbor_cell = (cell.0 + dx, cell.1 + dy, cell.2 + dz);
                        if let Some(neighbor_indices) = grid.get(&neighbor_cell) {
                            for &idx1 in indices {
                                for &idx2 in neighbor_indices {
                                    process_collision(&mut entities, idx1, idx2);
                                }
                            }
                        }
                    }
                }
            }

            // 善恶博弈 (近距离个体互动)
            let count = entities.len();
            if count > 10 {
                let mut sorted_indices: Vec<usize> = (0..count).collect();
                sorted_indices.sort_by(|&a, &b| entities[b].score.partial_cmp(&entities[a].score).unwrap());
                
                let elite_count = (count as f32 * 0.05) as usize;
                let bottom_indices: Vec<u32> = sorted_indices[count - elite_count..].iter().map(|&i| entities[i].id).collect();
                let top_entities: Vec<Entity> = sorted_indices[..elite_count].iter().map(|&i| entities[i].clone()).collect();

                for i in 0..elite_count {
                    let parent = top_entities[i].clone();
                    let target_id = bottom_indices[i];
                    let tx_clone = tx.clone();
                    let state_clone = state.clone();

                    tokio::spawn(async move {
                        // 1. 先克隆 engine (已经是 Clone 的了)
                        let engine = {
                            let guard = state_clone.mutation_engine.lock().unwrap();
                            guard.clone()
                        }; // 锁立即释放

                        // 2. 在锁外进行异步调用
                        let mut new_dna = engine.mutate(&parent).await;

                        // 3. 影子演化验证
                        let is_valid = {
                            let wasm_engine = &state_clone.wasm_engine;
                            !state_clone.crash_registry.is_blacklisted(&new_dna) && wasm_engine.validate_and_test(&new_dna)
                        };

                        if !is_valid {
                            state_clone.crash_registry.report_crash(&new_dna);
                            
                            // 如果 AI 突变失败，尝试规则 11: 水平基因转移 (基因拼接)
                            let entities = state_clone.entities.lock().unwrap();
                            if entities.len() > 2 {
                                let other_parent = &entities[rand::random_range(0..entities.len())];
                                new_dna = evolution::dna_splicer::DnaSplicer::splice(&parent.dna, &other_parent.dna);
                            } else {
                                new_dna = parent.dna.clone();
                            }
                        }
                        
                        // 🔒 记录谱系历史
                        {
                            let mut history = state_clone.lineage_history.lock().unwrap();
                            history.push(LineageRecord {
                                id: target_id,
                                parent_id: Some(parent.id),
                                generation: parent.generation + 1,
                                score: parent.score,
                                dna_preview: new_dna.chars().take(50).collect(),
                            });
                            // 保持历史记录在合理范围内 (例如最近 1000 条)
                            if history.len() > 1000 {
                                history.remove(0);
                            }
                        }

                        // 🔒 检查英灵殿 (Hall of Fame)
                        if parent.score > 90.0 {
                            let mut fame = state_clone.hall_of_fame.lock().unwrap();
                            if !fame.iter().any(|e| e.id == parent.id) {
                                fame.push(parent.clone());
                                if fame.len() > 10 {
                                    fame.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
                                    fame.truncate(10);
                                }
                            }
                        }
                        
                        let _ = tx_clone.send((target_id, new_dna)).await;
                    });
                }
            }
        }

        tokio::time::sleep(Duration::from_millis(throttle_ms)).await;
    }
}

#[cfg(windows)]
fn optimize_for_windows() {
    use windows::Win32::System::Threading::{SetPriorityClass, GetCurrentProcess, HIGH_PRIORITY_CLASS};
    unsafe {
        // 提高进程优先级 (需要管理员权限，若无权限则静默失败)
        let _ = SetPriorityClass(GetCurrentProcess(), HIGH_PRIORITY_CLASS);
    }
}

#[tokio::main]
async fn main() {
    // 初始化日志
    env_logger::init();
    
    // Windows 环境优化
    #[cfg(windows)]
    optimize_for_windows();

    let app_state = Arc::new(AppState::new());

    log::info!("V-GENE Simulation System Started");

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            start_sim, 
            stop_sim, 
            get_world_state, 
            get_world_binary,
            get_entity_detail,
            get_lineage,
            get_hall_of_fame,
            interfere_at,
            update_settings,
            get_sys_info,
            get_live_stats,
            export_logs,
            save_settings,
            load_settings,
            logger
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
