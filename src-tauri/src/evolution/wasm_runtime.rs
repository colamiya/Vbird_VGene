use wasmtime::*;
use crate::evolution::entity::Entity;
use std::sync::Mutex;
use std::collections::HashMap;

/// 🔒 适配 wasmtime v41.x 的资源限制器
struct HostState {
    limits: StoreLimits,
}

impl HostState {
    fn new(max_memory: usize) -> Self {
        Self {
            limits: StoreLimitsBuilder::new()
                .memory_size(max_memory)
                .instances(1)
                .tables(1)
                .memories(1)
                .build(),
        }
    }
}

pub struct WasmEngine {
    engine: Engine,
    linker: Linker<HostState>,
    module_cache: Mutex<HashMap<String, Module>>,
}

impl WasmEngine {
    pub fn new() -> anyhow::Result<Self> {
        let mut config = Config::new();
        config.consume_fuel(true); // 启用燃料消耗 (熵增逻辑)
        config.max_wasm_stack(128 * 1024); // 128KB 栈 (解决 v41 警告)
        
        let engine = Engine::new(&config)?;
        let mut linker = Linker::new(&engine);

        // 定义WASM可以调用的宿主函数（基因）
        linker.func_wrap("env", "log_msg", |_caller: Caller<'_, HostState>, _ptr: i32, _len: i32| {
            // 后续实现：从内存读取日志
        })?;

        linker.func_wrap("env", "energy_check", |_caller: Caller<'_, HostState>| -> i32 {
            100
        })?;

        Ok(Self { 
            engine, 
            linker,
            module_cache: Mutex::new(HashMap::new())
        })
    }

    pub fn execute_entity(&self, entity: &mut Entity) -> anyhow::Result<f32> {
        if entity.dna.is_empty() {
             return Ok(0.0);
        }

        // 模块编译缓存优化
        let module = {
            let mut cache = self.module_cache.lock().unwrap();
            if let Some(m) = cache.get(&entity.dna) {
                m.clone()
            } else {
                let wasm_binary = match wat::parse_str(&entity.dna) {
                    Ok(b) => b,
                    Err(_) => return Ok(0.0),
                };
                match Module::new(&self.engine, &wasm_binary) {
                    Ok(m) => {
                        cache.insert(entity.dna.clone(), m.clone());
                        m
                    },
                    Err(_) => return Ok(0.0),
                }
            }
        };

        // 🔒 v41.x: 初始化 Store 并注入限制器
        let mut store = Store::new(&self.engine, HostState::new(1024 * 1024));
        store.limiter(|s| &mut s.limits);

        let fuel_limit = 500;
        store.set_fuel(fuel_limit)?; // 设置执行限额
        
        let instance = match self.linker.instantiate(&mut store, &module) {
            Ok(i) => i,
            Err(e) => {
                eprintln!("WASM instantiation failed for entity {}: {:?}", entity.id, e);
                return Ok(0.0); // 运行时错误处理
            }
        };

        // 调用进化体核心逻辑
        let fitness = if let Ok(func) = instance.get_typed_func::<(), i32>(&mut store, "calculate_fitness") {
            match func.call(&mut store, ()) {
                Ok(val) => {
                    let consumed = fuel_limit.saturating_sub(store.get_fuel().unwrap_or(0));
                    // 熵增损耗：代码越臃肿（执行指令越多），得分系数越低
                    let efficiency = (fuel_limit as f32 - consumed as f32) / fuel_limit as f32;
                    entity.stats.efficiency = efficiency.clamp(0.0, 1.0);
                    (val as f32) * efficiency.max(0.1)
                },
                Err(e) => {
                    eprintln!("WASM execution failed for entity {}: {:?}", entity.id, e);
                    0.0
                },
            }
        } else {
            0.0
        };

        Ok(fitness)
    }

    pub fn validate_and_test(&self, dna: &str) -> bool {
        // 1. 语法检查
        let wasm_binary = match wat::parse_str(dna) {
            Ok(b) => b,
            Err(_) => return false,
        };

        // 2. 编译检查
        let module = match Module::new(&self.engine, &wasm_binary) {
            Ok(m) => m,
            Err(_) => return false,
        };

        // 3. 影子演化（Shadow Evolution）：50轮快速试运行 (检测随机性 bug)
        for trial in 0..50 {
            // 🔒 v41.x: 初始化 Store 并注入限制器
            let mut store = Store::new(&self.engine, HostState::new(1024 * 1024));
            store.limiter(|s| &mut s.limits);

            // 🔒 降低测试时的 fuel 限额 (200 单位，比正式运行更严格)
            if store.set_fuel(200).is_err() { return false; }

            let instance = match self.linker.instantiate(&mut store, &module) {
                Ok(i) => i,
                Err(_) => return false,
            };

            if let Ok(func) = instance.get_typed_func::<(), i32>(&mut store, "calculate_fitness") {
                match func.call(&mut store, ()) {
                    Ok(result) => {
                        // 🔒 额外验证：结果必须在合理范围内
                        if result < 0 || result > 1000 {
                            eprintln!("Shadow test failed: invalid result {} on trial {}", result, trial);
                            return false;
                        }
                    }
                    Err(e) => {
                        eprintln!("Shadow test failed on trial {}: {:?}", trial, e);
                        return false;
                    }
                }
            } else {
                return false; // 缺少关键函数
            }
        }

        true
    }
}
