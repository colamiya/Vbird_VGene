use wasmtime::*;
use crate::evolution::entity::Entity;
use std::sync::Mutex;
use std::collections::HashMap;

pub struct WasmEngine {
    engine: Engine,
    linker: Linker<()>,
    module_cache: Mutex<HashMap<String, Module>>,
}

impl WasmEngine {
    pub fn new() -> anyhow::Result<Self> {
        let mut config = Config::new();
        config.consume_fuel(true); // 启用燃料消耗 (熵增逻辑)
        
        let engine = Engine::new(&config)?;
        let mut linker = Linker::new(&engine);

        // 定义WASM可以调用的宿主函数（基因）
        linker.func_wrap("env", "log_msg", |_caller: Caller<'_, ()>, _ptr: i32, _len: i32| {
            // 后续实现：从内存读取日志
        })?;

        linker.func_wrap("env", "energy_check", |_caller: Caller<'_, ()>| -> i32 {
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

        let mut store = Store::new(&self.engine, ());
        let fuel_limit = 2000;
        store.set_fuel(fuel_limit)?; // 设置执行限额
        
        let instance = match self.linker.instantiate(&mut store, &module) {
            Ok(i) => i,
            Err(_) => return Ok(0.0), // 运行时错误处理
        };

        // 调用进化体核心逻辑
        let fitness = if let Ok(func) = instance.get_typed_func::<(), i32>(&mut store, "calculate_fitness") {
            match func.call(&mut store, ()) {
                Ok(val) => {
                    let consumed = fuel_limit - store.get_fuel().unwrap_or(0);
                    // 熵增损耗：代码越臃肿（执行指令越多），得分系数越低
                    let efficiency = (fuel_limit as f32 - consumed as f32) / fuel_limit as f32;
                    entity.stats.efficiency = efficiency;
                    (val as f32) * efficiency.max(0.1)
                },
                Err(_) => 0.0,
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

        // 3. 影子演化（Shadow Evolution）：10轮快速试运行
        for _ in 0..10 {
            let mut store = Store::new(&self.engine, ());
            if store.set_fuel(500).is_err() { return false; } // 严格的测试限额

            let instance = match self.linker.instantiate(&mut store, &module) {
                Ok(i) => i,
                Err(_) => return false,
            };

            if let Ok(func) = instance.get_typed_func::<(), i32>(&mut store, "calculate_fitness") {
                if func.call(&mut store, ()).is_err() {
                    return false; // 任何运行时错误都判定为失败
                }
            } else {
                return false; // 缺少关键函数
            }
        }

        true
    }
}
