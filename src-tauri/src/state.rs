use std::sync::Mutex;
use crate::evolution::{
    entity::Entity, 
    mutation::{MutationEngine, MutationMode}, 
    environment::EnvConfig,
    crash_registry::CrashRegistry
};
use crate::evolution::wasm_runtime::WasmEngine;

pub struct AppState {
    pub entities: Mutex<Vec<Entity>>,
    pub env_config: Mutex<EnvConfig>,
    pub mutation_engine: Mutex<MutationEngine>,
    pub wasm_engine: Mutex<WasmEngine>,
    pub crash_registry: CrashRegistry,
    pub is_running: Mutex<bool>,
}

impl AppState {
    pub fn new() -> Self {
        // 默认初始配置
        let env_config = crate::evolution::environment::detect_hardware();
        
        let mutation_engine = MutationEngine::new(MutationMode::LocalMock);
        let wasm_engine = WasmEngine::new().expect("Failed to initialize Wasmtime");
        let crash_registry = CrashRegistry::new();

        Self {
            entities: Mutex::new(Vec::new()),
            env_config: Mutex::new(env_config),
            mutation_engine: Mutex::new(mutation_engine),
            wasm_engine: Mutex::new(wasm_engine),
            crash_registry,
            is_running: Mutex::new(false),
        }
    }
}
