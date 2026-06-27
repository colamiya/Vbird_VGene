use crate::evolution::wasm_runtime::WasmEngine;
use crate::evolution::{
    compute::{ComputeStatus, InteractionEvent},
    crash_registry::CrashRegistry,
    entity::Entity,
    environment::EnvConfig,
    mutation::{MutationEngine, MutationMode},
};
use serde::Serialize;
use std::sync::{Arc, Mutex, MutexGuard};

#[derive(Serialize, Clone)]
pub struct LineageRecord {
    pub id: u32,
    pub parent_id: Option<u32>,
    pub generation: u32,
    pub score: f32,
    pub dna_preview: String,
}

pub struct AppState {
    pub entities: Mutex<Vec<Entity>>,
    pub env_config: Mutex<EnvConfig>,
    pub mutation_engine: Mutex<MutationEngine>,
    pub wasm_engine: Arc<WasmEngine>,
    pub crash_registry: CrashRegistry,
    pub is_running: Mutex<bool>,
    pub run_epoch: Mutex<u64>,
    pub lineage_history: Mutex<Vec<LineageRecord>>,
    pub hall_of_fame: Mutex<Vec<Entity>>,
    pub compute_status: Mutex<ComputeStatus>,
    pub recent_interactions: Mutex<Vec<InteractionEvent>>,
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        // 默认初始配置
        let env_config = crate::evolution::environment::detect_hardware();

        let mutation_engine = MutationEngine::new(MutationMode::Local);
        let wasm_engine = Arc::new(
            WasmEngine::new().map_err(|error| format!("Failed to initialize Wasmtime: {error}"))?,
        );
        let crash_registry = CrashRegistry::new();

        Ok(Self {
            entities: Mutex::new(Vec::new()),
            env_config: Mutex::new(env_config),
            mutation_engine: Mutex::new(mutation_engine),
            wasm_engine,
            crash_registry,
            is_running: Mutex::new(false),
            run_epoch: Mutex::new(0),
            lineage_history: Mutex::new(Vec::new()),
            hall_of_fame: Mutex::new(Vec::new()),
            compute_status: Mutex::new(ComputeStatus::default()),
            recent_interactions: Mutex::new(Vec::new()),
        })
    }
}

pub fn lock_app_state<'a, T>(mutex: &'a Mutex<T>, name: &str) -> Result<MutexGuard<'a, T>, String> {
    mutex
        .lock()
        .map_err(|_| format!("State lock poisoned: {}", name))
}
