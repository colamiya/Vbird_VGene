use wasmtime::*;
use crate::evolution::entity::Entity;
use dashmap::DashMap;
use sha2::{Sha256, Digest};
use rayon::prelude::*;

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
    module_cache: DashMap<String, Module>,
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
            module_cache: DashMap::new()
        })
    }

    fn get_dna_hash(dna: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(dna.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub fn execute_entity(&self, entity: &mut Entity) -> anyhow::Result<f32> {
        if entity.dna.is_empty() {
             return Ok(0.0);
        }

        // 模块编译缓存优化：使用 SHA256 哈希作为键
        let dna_hash = Self::get_dna_hash(&entity.dna);
        let module = if let Some(m) = self.module_cache.get(&dna_hash) {
            m.clone()
        } else {
            // 🔒 缓存淘汰策略：如果缓存过大，清理一部分 (防止内存泄漏)
            if self.module_cache.len() > 5000 {
                log::warn!("Wasm module cache full, clearing...");
                self.module_cache.clear();
            }

            let wasm_binary = match wat::parse_str(&entity.dna) {
                Ok(b) => b,
                Err(_) => return Ok(0.0),
            };
            match Module::new(&self.engine, &wasm_binary) {
                Ok(m) => {
                    self.module_cache.insert(dna_hash, m.clone());
                    m
                },
                Err(_) => return Ok(0.0),
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
            let res = match func.call(&mut store, ()) {
                Ok(val) => {
                    let consumed = fuel_limit.saturating_sub(store.get_fuel().unwrap_or(0));
                    
                    // 🔒 记录燃料消耗统计
                    entity.fuel_consumed += consumed;
                    entity.fuel_efficiency = (val as f32) / (consumed as f32 + 1.0);
                    
                    // 熵增损耗系数：执行指令越多，得分惩罚越重
                    let efficiency_factor = (fuel_limit as f32 - consumed as f32) / fuel_limit as f32;
                    entity.stats.efficiency = efficiency_factor.clamp(0.0, 1.0);
                    
                    (val as f32) * efficiency_factor.max(0.1)
                },
                Err(e) => {
                    eprintln!("WASM execution failed for entity {}: {:?}", entity.id, e);
                    0.0
                },
            };

            // 🔒 提取内存快照 (Law #12)
            if let Some(memory) = instance.get_memory(&mut store, "memory") {
                let data = memory.data(&store);
                // 仅提取前 256 字节用于可视化，减少数据传输
                entity.last_memory_snapshot = data.iter().take(256).cloned().collect();
            }

            res
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
        // 使用 rayon 并行执行测试
        (0..50).into_par_iter().all(|_trial| {
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
                            return false;
                        }
                        true
                    }
                    Err(_) => false,
                }
            } else {
                false // 缺少关键函数
            }
        })
    }
}
