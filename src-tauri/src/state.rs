use serde::Serialize;
use std::sync::{Mutex, Arc};
use crate::evolution::{
    entity::Entity, 
    mutation::{MutationEngine, MutationMode}, 
    environment::EnvConfig,
    crash_registry::CrashRegistry
};
use crate::evolution::wasm_runtime::WasmEngine;

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
    pub lineage_history: Mutex<Vec<LineageRecord>>,
    pub hall_of_fame: Mutex<Vec<Entity>>,
}

impl AppState {
    pub fn new() -> Self {
        // 默认初始配置
        let env_config = crate::evolution::environment::detect_hardware();
        
        let mutation_engine = MutationEngine::new(MutationMode::LocalMock);
        let wasm_engine = Arc::new(WasmEngine::new().expect("Failed to initialize Wasmtime"));
        let crash_registry = CrashRegistry::new();

        Self {
            entities: Mutex::new(Vec::new()),
            env_config: Mutex::new(env_config),
            mutation_engine: Mutex::new(mutation_engine),
            wasm_engine,
            crash_registry,
            is_running: Mutex::new(false),
            lineage_history: Mutex::new(Vec::new()),
            hall_of_fame: Mutex::new(Vec::new()),
        }
    }
}
