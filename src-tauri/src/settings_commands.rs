use crate::evolution::{
    benchmark::{baseline_dna_for_task, BenchmarkTaskId},
    compute::ComputeBackend,
    entity::Entity,
    gpu,
    mutation::MutationMode,
    simulation_engine,
};
use crate::runtime_files::{read_text_with_legacy_fallback, write_run_log, write_text};
use crate::state::{lock_app_state, AppState};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

const MIN_MAX_ENTITIES: usize = 1;
const MAX_MAX_ENTITIES: usize = 5000;
const MIN_EVOLUTION_THROTTLE_MS: u64 = 16;
const MAX_EVOLUTION_THROTTLE_MS: u64 = 10_000;
const MIN_FONT_SCALE: f32 = 0.8;
const MAX_FONT_SCALE: f32 = 1.5;

#[derive(Serialize, Deserialize, Clone)]
pub struct AppSettings {
    mode: String,
    ollama_url: String,
    model_name: String,
    max_entities: usize,
    evolution_throttle: u64,
    visual_fidelity: String,
    resolution: String,
    display_mode: String,
    #[serde(default = "default_font_scale")]
    font_scale: f32,
    #[serde(default = "default_mutation_rate")]
    mutation_rate: f32,
    #[serde(default = "default_entropy_factor")]
    entropy_factor: f32,
    #[serde(default = "default_winning_rule")]
    winning_rule: String,
    #[serde(default = "default_env_type")]
    env_type: String,
    #[serde(default)]
    compute_backend: ComputeBackend,
    task_id: Option<BenchmarkTaskId>,
    #[serde(default = "default_audio_enabled")]
    audio_enabled: bool,
    #[serde(default = "default_master_volume")]
    master_volume: f32,
    #[serde(default = "default_music_volume")]
    music_volume: f32,
    #[serde(default = "default_sfx_volume")]
    sfx_volume: f32,
    #[serde(default = "default_adaptive_music")]
    adaptive_music: bool,
}

fn default_audio_enabled() -> bool {
    true
}
fn default_master_volume() -> f32 {
    0.75
}
fn default_music_volume() -> f32 {
    0.55
}
fn default_sfx_volume() -> f32 {
    0.8
}
fn default_adaptive_music() -> bool {
    true
}
fn default_font_scale() -> f32 {
    1.25
}
fn default_mutation_rate() -> f32 {
    0.05
}
fn default_entropy_factor() -> f32 {
    0.1
}
fn default_winning_rule() -> String {
    "SURVIVAL".to_string()
}
fn default_env_type() -> String {
    "EARTH".to_string()
}

fn sanitize_max_entities(value: usize) -> usize {
    value.clamp(MIN_MAX_ENTITIES, MAX_MAX_ENTITIES)
}

fn sanitize_evolution_throttle(value: u64) -> u64 {
    value.clamp(MIN_EVOLUTION_THROTTLE_MS, MAX_EVOLUTION_THROTTLE_MS)
}

fn sanitize_visual_fidelity(value: String) -> String {
    match value.as_str() {
        "Low" | "Medium" | "High" | "Ultra" => value,
        _ => "High".to_string(),
    }
}

fn sanitize_winning_rule(value: String) -> String {
    match value.as_str() {
        "PREDATION" | "CODE_SIZE" => value,
        _ => "SURVIVAL".to_string(),
    }
}

fn sanitize_env_type(value: String) -> String {
    match value.as_str() {
        "DEEP_SEA" | "SPACE" => value,
        _ => "EARTH".to_string(),
    }
}

fn sanitize_compute_backend(value: ComputeBackend) -> ComputeBackend {
    if value == ComputeBackend::CUDA && !gpu::cuda_feature_enabled() {
        ComputeBackend::Auto
    } else {
        value
    }
}

fn sanitize_app_settings(mut settings: AppSettings) -> AppSettings {
    settings.max_entities = sanitize_max_entities(settings.max_entities);
    settings.evolution_throttle = sanitize_evolution_throttle(settings.evolution_throttle);
    settings.visual_fidelity = sanitize_visual_fidelity(settings.visual_fidelity);
    settings.font_scale = settings.font_scale.clamp(MIN_FONT_SCALE, MAX_FONT_SCALE);
    settings.mutation_rate = settings.mutation_rate.clamp(0.001, 1.0);
    settings.entropy_factor = settings.entropy_factor.clamp(0.0, 1.0);
    settings.winning_rule = sanitize_winning_rule(settings.winning_rule);
    settings.env_type = sanitize_env_type(settings.env_type);
    settings.compute_backend = sanitize_compute_backend(settings.compute_backend);
    if settings.task_id.is_none() {
        settings.task_id = Some(BenchmarkTaskId::Freeform);
    }
    settings.master_volume = settings.master_volume.clamp(0.0, 1.0);
    settings.music_volume = settings.music_volume.clamp(0.0, 1.0);
    settings.sfx_volume = settings.sfx_volume.clamp(0.0, 1.0);
    settings
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    write_run_log(
        "Settings",
        "Saving user configuration to app data settings.json",
    );
    let settings = sanitize_app_settings(settings);
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    write_text("settings.json", &json)?;
    Ok(())
}

#[tauri::command]
pub fn load_settings() -> Result<AppSettings, String> {
    write_run_log(
        "Settings",
        "Loading configuration from app data settings.json",
    );
    let content = read_text_with_legacy_fallback("settings.json")?;
    let settings: AppSettings = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(sanitize_app_settings(settings))
}

#[tauri::command]
pub async fn update_settings(
    state: State<'_, Arc<AppState>>,
    mode: String,
    ollama_url: Option<String>,
    model_name: Option<String>,
    max_entities: Option<usize>,
    evolution_throttle: Option<u64>,
    visual_fidelity: Option<String>,
    mutation_rate: Option<f32>,
    entropy_factor: Option<f32>,
    winning_rule: Option<String>,
    env_type: Option<String>,
    compute_backend: Option<ComputeBackend>,
    task_id: Option<BenchmarkTaskId>,
) -> Result<String, String> {
    write_run_log("Settings", "Updating environment parameters");
    let mut task_changed = None;
    {
        let mut engine = lock_app_state(&state.mutation_engine, "mutation_engine")?;
        match mode.as_str() {
            "Ollama" => {
                if let (Some(url), Some(model)) = (ollama_url, model_name) {
                    engine.set_mode(MutationMode::Ollama { url, model });
                }
            }
            _ => {
                engine.set_mode(MutationMode::Local);
            }
        }
    }

    {
        let mut config = lock_app_state(&state.env_config, "env_config")?;
        if let Some(max) = max_entities {
            config.max_entities = sanitize_max_entities(max);
        }
        if let Some(throttle) = evolution_throttle {
            config.evolution_throttle = sanitize_evolution_throttle(throttle);
        }
        if let Some(fidelity) = visual_fidelity {
            config.visual_fidelity = sanitize_visual_fidelity(fidelity);
        }
        if let Some(rate) = mutation_rate {
            config.mutation_rate = rate.clamp(0.001, 1.0);
        }
        if let Some(entropy) = entropy_factor {
            config.entropy_factor = entropy.clamp(0.0, 1.0);
        }
        if let Some(rule) = winning_rule {
            config.winning_rule = sanitize_winning_rule(rule);
        }
        if let Some(env) = env_type {
            config.env_type = sanitize_env_type(env);
        }
        if let Some(backend) = compute_backend {
            config.compute_backend = sanitize_compute_backend(backend);
            write_run_log(
                "Compute",
                &format!("Selected compute backend: {:?}", config.compute_backend),
            );
        }
        if let Some(task) = task_id {
            if config.task_id != task {
                config.task_id = task;
                task_changed = Some(task);
            }
            write_run_log("Benchmark", &format!("Selected Phase 1 task: {:?}", task));
        }
    }

    if let Some(task) = task_changed {
        let is_running = *lock_app_state(&state.is_running, "is_running")?;
        let restart_epoch = if is_running {
            let mut run_epoch = lock_app_state(&state.run_epoch, "run_epoch")?;
            *run_epoch += 1;
            Some(*run_epoch)
        } else {
            None
        };
        let max_entities = lock_app_state(&state.env_config, "env_config")?.max_entities;
        let mut entities = lock_app_state(&state.entities, "entities")?;
        entities.clear();
        if is_running {
            let initial_dna = baseline_dna_for_task(task);
            for i in 0..max_entities {
                entities.push(Entity::new(i as u32, initial_dna.to_string()));
            }
        }
        drop(entities);
        lock_app_state(&state.lineage_history, "lineage_history")?.clear();
        lock_app_state(&state.hall_of_fame, "hall_of_fame")?.clear();
        lock_app_state(&state.recent_interactions, "recent_interactions")?.clear();
        write_run_log("Benchmark", "Cleared population after Phase 1 task change");

        if let Some(run_epoch) = restart_epoch {
            let state_clone = state.inner().clone();
            tokio::spawn(async move {
                simulation_engine::run(state_clone, run_epoch).await;
            });
            write_run_log(
                "Benchmark",
                "Restarted simulation loop after Phase 1 task change",
            );
        }
    }

    Ok("Settings updated".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unsafe_settings() -> AppSettings {
        AppSettings {
            mode: "Local".to_string(),
            ollama_url: "http://localhost:11434".to_string(),
            model_name: "codellama".to_string(),
            max_entities: usize::MAX,
            evolution_throttle: 0,
            visual_fidelity: "Cinema".to_string(),
            resolution: "1920x1080".to_string(),
            display_mode: "windowed".to_string(),
            font_scale: 9.0,
            mutation_rate: 2.5,
            entropy_factor: -1.0,
            winning_rule: "FAKE_RULE".to_string(),
            env_type: "MOON".to_string(),
            compute_backend: ComputeBackend::Auto,
            task_id: None,
            audio_enabled: true,
            master_volume: 3.0,
            music_volume: -1.0,
            sfx_volume: 8.0,
            adaptive_music: true,
        }
    }

    #[test]
    fn sanitize_settings_clamps_backend_runtime_values() {
        let sanitized = sanitize_app_settings(unsafe_settings());

        assert_eq!(sanitized.max_entities, MAX_MAX_ENTITIES);
        assert_eq!(sanitized.evolution_throttle, MIN_EVOLUTION_THROTTLE_MS);
        assert_eq!(sanitized.font_scale, MAX_FONT_SCALE);
        assert_eq!(sanitized.mutation_rate, 1.0);
        assert_eq!(sanitized.entropy_factor, 0.0);
        assert_eq!(sanitized.master_volume, 1.0);
        assert_eq!(sanitized.music_volume, 0.0);
        assert_eq!(sanitized.sfx_volume, 1.0);
    }

    #[test]
    fn sanitize_settings_rejects_unknown_mode_strings() {
        let sanitized = sanitize_app_settings(unsafe_settings());

        assert_eq!(sanitized.visual_fidelity, "High");
        assert_eq!(sanitized.winning_rule, "SURVIVAL");
        assert_eq!(sanitized.env_type, "EARTH");
        assert_eq!(sanitized.task_id, Some(BenchmarkTaskId::Freeform));
    }

    #[cfg(not(feature = "cuda"))]
    #[test]
    fn sanitize_settings_degrades_cuda_without_cuda_feature() {
        let mut settings = unsafe_settings();
        settings.compute_backend = ComputeBackend::CUDA;

        let sanitized = sanitize_app_settings(settings);

        assert_eq!(sanitized.compute_backend, ComputeBackend::Auto);
    }
}
