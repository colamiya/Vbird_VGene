// 防止Windows发布版本中出现额外的控制台窗口，请勿删除！
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod evolution;
mod state;

use tauri::State;
use std::sync::Arc;
use state::AppState;
use evolution::{entity::Entity, mutation::MutationMode};
use rayon::prelude::*;
use std::time::Duration;
use tokio::sync::mpsc;
use sysinfo::System;
use serde::Serialize;

#[derive(Serialize)]
struct SysInfo {
    cpu_brand: String,
    cpu_cores: usize,
    os_info: String,
}

#[tauri::command]
fn get_sys_info() -> SysInfo {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let cpu_brand = sys.cpus().first().map(|cpu| cpu.brand().to_string()).unwrap_or_else(|| "Unknown".to_string());
    let cpu_cores = sys.cpus().len();
    let os_info = format!("{} v{}", System::name().unwrap_or_default(), System::os_version().unwrap_or_default());

    SysInfo {
        cpu_brand,
        cpu_cores,
        os_info,
    }
}

#[tauri::command]
async fn start_sim(state: State<'_, Arc<AppState>>) -> Result<String, String> {
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
    let mut is_running = state.is_running.lock().unwrap();
    *is_running = false;
    Ok("Simulation stopped".to_string())
}

#[tauri::command]
async fn get_world_state(state: State<'_, Arc<AppState>>) -> Result<Vec<Entity>, String> {
    let entities = state.entities.lock().unwrap();
    Ok(entities.clone())
}

#[tauri::command]
async fn update_settings(
    state: State<'_, Arc<AppState>>, 
    mode: String, 
    ollama_url: Option<String>, 
    model_name: Option<String>,
    max_entities: Option<usize>
) -> Result<String, String> {
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

    if let Some(max) = max_entities {
        let mut config = state.env_config.lock().unwrap();
        config.max_entities = max;
    }

    Ok("Settings updated".to_string())
}

async fn simulation_loop(state: Arc<AppState>) {
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

        // 1. 应用上一次迭代的变异结果
        while let Ok((id, new_dna)) = rx.try_recv() {
            let mut entities = state.entities.lock().unwrap();
            if let Some(entity) = entities.iter_mut().find(|e| e.id == id) {
                // 应用前最后一次检查，确保不是黑名单 DNA
                if !state.crash_registry.is_blacklisted(&new_dna) {
                    entity.dna = new_dna;
                    entity.generation += 1;
                    entity.energy = 100.0; // 进化后重置能量
                    entity.metabolic_toxin = 0.0;
                }
            }
        }

        // 2. 进化/处理步骤
        {
            let mut entities = state.entities.lock().unwrap();
            let wasm_engine = state.wasm_engine.lock().unwrap();
            
            // 计算引力场 (资源分配)
            // 效率越高、科技越高，吸引的能量越多
            let _total_tech: f32 = entities.iter().map(|e| e.stats.tech_level as f32).sum();
            
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
                
                // 简单的移动逻辑 (受引力影响，暂时模拟为随机+微调)
                entity.position.0 += (rand::random::<f32>() - 0.5) * 0.2;
                entity.position.1 += (rand::random::<f32>() - 0.5) * 0.2;
                entity.position.2 += (rand::random::<f32>() - 0.5) * 0.2;

                // 死亡逻辑
                if entity.energy <= 0.0 || entity.metabolic_toxin >= 1.0 {
                    entity.score = 0.0; // 标记为死亡，稍后由变异逻辑替换
                }
            });

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
                        let mut new_dna = {
                            let engine = state_clone.mutation_engine.lock().unwrap().clone();
                            engine.mutate(&parent).await
                        };

                        // 规则 12: 影子演化与规则 9: 免疫记忆
                        let is_valid = {
                            let wasm_engine = state_clone.wasm_engine.lock().unwrap();
                            !state_clone.crash_registry.is_blacklisted(&new_dna) && wasm_engine.validate_and_test(&new_dna)
                        };

                        if !is_valid {
                            state_clone.crash_registry.report_crash(&new_dna);
                            
                            // 如果 AI 突变失败，尝试规则 11: 水平基因转移 (基因拼接)
                            let entities = state_clone.entities.lock().unwrap();
                            if entities.len() > 2 {
                                let other_parent = &entities[rand::random::<usize>() % entities.len()];
                                new_dna = evolution::dna_splicer::DnaSplicer::splice(&parent.dna, &other_parent.dna);
                            } else {
                                new_dna = parent.dna.clone();
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

#[tokio::main]
async fn main() {
    let app_state = Arc::new(AppState::new());

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            start_sim, 
            stop_sim, 
            get_world_state, 
            update_settings,
            get_sys_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
