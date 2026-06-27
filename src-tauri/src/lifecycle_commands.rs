use crate::evolution::{
    benchmark::baseline_dna_for_task,
    compute::{adaptive_scale_for, effective_entity_cap, query_gpu_telemetry},
    entity::Entity,
    simulation_engine,
};
use crate::runtime_files::{read_runtime_text, write_run_log, write_text};
use crate::state::{lock_app_state, AppState};
use chrono::Local;
use serde_json::json;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn logger(module: String, content: String) {
    write_run_log(&module, &content);
}

#[tauri::command]
pub async fn export_logs(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    let lineage = lock_app_state(&state.lineage_history, "lineage_history")?;
    let log_content = serde_json::to_string_pretty(&json!({
        "exported_at": Local::now().to_rfc3339(),
        "run_log": read_runtime_text("run.log"),
        "lineage": &*lineage,
    }))
    .map_err(|e| e.to_string())?;

    let export_path = write_text("vgene_evolution_log.json", &log_content)?;

    Ok(format!("Logs exported to {}", export_path.display()))
}

#[tauri::command]
pub async fn start_sim(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    write_run_log("Simulation", "Attempting to start simulation engine");
    let run_epoch = {
        let mut is_running = lock_app_state(&state.is_running, "is_running")?;
        if *is_running {
            return Ok("Already running".to_string());
        }
        *is_running = true;

        let mut run_epoch = lock_app_state(&state.run_epoch, "run_epoch")?;
        *run_epoch += 1;
        *run_epoch
    };

    let mut entities = lock_app_state(&state.entities, "entities")?;
    if entities.is_empty() {
        let config = lock_app_state(&state.env_config, "env_config")?;
        let telemetry = query_gpu_telemetry();
        let adaptive_scale = adaptive_scale_for(&telemetry);
        let initial_cap = effective_entity_cap(config.max_entities, &telemetry, adaptive_scale);
        let initial_dna = baseline_dna_for_task(config.task_id);
        for i in 0..initial_cap {
            entities.push(Entity::new(i as u32, initial_dna.to_string()));
        }
    }
    drop(entities);
    lock_app_state(&state.recent_interactions, "recent_interactions")?.clear();

    let state_clone = state.inner().clone();
    tokio::spawn(async move {
        simulation_engine::run(state_clone, run_epoch).await;
    });

    Ok("Simulation started".to_string())
}

#[tauri::command]
pub async fn stop_sim(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    write_run_log("Simulation", "Stopping simulation engine");
    {
        let mut is_running = lock_app_state(&state.is_running, "is_running")?;
        *is_running = false;

        let mut run_epoch = lock_app_state(&state.run_epoch, "run_epoch")?;
        *run_epoch += 1;
    }
    Ok("Simulation stopped".to_string())
}

#[tauri::command]
pub async fn reset_sim(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    write_run_log("Simulation", "Resetting simulation world state");
    {
        let mut is_running = lock_app_state(&state.is_running, "is_running")?;
        *is_running = false;

        let mut run_epoch = lock_app_state(&state.run_epoch, "run_epoch")?;
        *run_epoch += 1;
    }

    lock_app_state(&state.entities, "entities")?.clear();
    lock_app_state(&state.lineage_history, "lineage_history")?.clear();
    lock_app_state(&state.hall_of_fame, "hall_of_fame")?.clear();
    lock_app_state(&state.recent_interactions, "recent_interactions")?.clear();

    Ok("Simulation reset".to_string())
}
