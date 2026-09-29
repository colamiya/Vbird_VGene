use crate::evolution::benchmark::{score_useful_work, BenchmarkTaskId, ScoreBreakdown};
use crate::evolution::entity::Entity;
use dashmap::DashMap;
use rayon::prelude::*;
use sha2::{Digest, Sha256};
use wasmtime::*;

const MEMORY_LIMIT_BYTES: usize = 1024 * 1024;
const ENTITY_FUEL_LIMIT: u64 = 500;
const VALIDATION_FUEL_LIMIT: u64 = 200;
const TASK_FUEL_LIMIT: u64 = 100_000;
const TASK_SIZE_BUDGET_BYTES: usize = 32 * 1024;
const MEMORY_SNAPSHOT_BYTES: usize = 256;
pub(crate) const MAX_WAT_SOURCE_BYTES: usize = 128 * 1024;
const MAX_WASM_BINARY_BYTES: usize = 512 * 1024;

pub(crate) fn parse_wat_bounded(dna: &str) -> Option<Vec<u8>> {
    if dna.len() > MAX_WAT_SOURCE_BYTES {
        return None;
    }
    let wasm = wat::parse_str(dna).ok()?;
    (wasm.len() <= MAX_WASM_BINARY_BYTES).then_some(wasm)
}

const SORT_LONG_INPUT: [i32; 24] = [
    12, -7, 0, 12, -7, 5, -20, 5, 99, -1, 0, 42, -100, 8, 8, -3, 17, -20, 64, 11, -2, 33, -100, 7,
];
const SORT_LONG_EXPECTED: [i32; 24] = [
    -100, -100, -20, -20, -7, -7, -3, -2, -1, 0, 0, 5, 5, 7, 8, 8, 11, 12, 12, 17, 33, 42, 64, 99,
];
const RLE_LONG_RUN: [u8; 300] = [b'x'; 300];
const RLE_LONG_RUN_EXPECTED: [u8; 4] = [b'x', 255, b'x', 45];
const CHECKSUM_LONG_ONES: [u8; 260] = [1; 260];

#[derive(Clone, Copy)]
enum RleExpected<'a> {
    Bytes(&'a [u8]),
    ReturnCode(i32),
}

struct RleCase<'a> {
    input: &'a [u8],
    out_cap: i32,
    expected: RleExpected<'a>,
}

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
        linker.func_wrap(
            "env",
            "log_msg",
            |_caller: Caller<'_, HostState>, _ptr: i32, _len: i32| {
                // 后续实现：从内存读取日志
            },
        )?;

        linker.func_wrap(
            "env",
            "energy_check",
            |_caller: Caller<'_, HostState>| -> i32 { 100 },
        )?;

        Ok(Self {
            engine,
            linker,
            module_cache: DashMap::new(),
        })
    }

    fn get_dna_hash(dna: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(dna.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    fn compile_or_get_module(&self, dna: &str) -> Option<(Module, usize)> {
        if dna.len() > MAX_WAT_SOURCE_BYTES {
            return None;
        }
        let dna_hash = Self::get_dna_hash(dna);
        if let Some(module) = self.module_cache.get(&dna_hash) {
            return Some((module.clone(), dna.len()));
        }

        if self.module_cache.len() > 5000 {
            log::warn!("Wasm module cache full, clearing...");
            self.module_cache.clear();
        }

        let wasm_binary = parse_wat_bounded(dna)?;
        let wasm_size = wasm_binary.len();
        let module = Module::new(&self.engine, &wasm_binary).ok()?;
        self.module_cache.insert(dna_hash, module.clone());
        Some((module, wasm_size))
    }

    fn instantiate_with_fuel(
        &self,
        module: &Module,
        fuel_limit: u64,
    ) -> anyhow::Result<(Store<HostState>, Instance)> {
        let mut store = Store::new(&self.engine, HostState::new(MEMORY_LIMIT_BYTES));
        store.limiter(|s| &mut s.limits);
        store.set_fuel(fuel_limit)?;
        let instance = self.linker.instantiate(&mut store, module)?;
        Ok((store, instance))
    }

    fn memory_snapshot(memory: &Memory, store: &Store<HostState>) -> Vec<u8> {
        memory
            .data(store)
            .iter()
            .take(MEMORY_SNAPSHOT_BYTES)
            .cloned()
            .collect()
    }

    pub fn execute_entity(&self, entity: &mut Entity) -> anyhow::Result<f32> {
        if entity.dna.is_empty() {
            return Ok(0.0);
        }

        // 模块编译缓存优化：使用 SHA256 哈希作为键
        let module = match self.compile_or_get_module(&entity.dna) {
            Some((module, _)) => module,
            None => return Ok(0.0),
        };

        // 🔒 v41.x: 初始化 Store 并注入限制器
        let mut store = Store::new(&self.engine, HostState::new(MEMORY_LIMIT_BYTES));
        store.limiter(|s| &mut s.limits);

        let fuel_limit = ENTITY_FUEL_LIMIT;
        store.set_fuel(fuel_limit)?; // 设置执行限额

        let instance = match self.linker.instantiate(&mut store, &module) {
            Ok(i) => i,
            Err(e) => {
                eprintln!(
                    "WASM instantiation failed for entity {}: {:?}",
                    entity.id, e
                );
                return Ok(0.0); // 运行时错误处理
            }
        };

        // 调用进化体核心逻辑
        let fitness =
            if let Ok(func) = instance.get_typed_func::<(), i32>(&mut store, "calculate_fitness") {
                let res = match func.call(&mut store, ()) {
                    Ok(val) => {
                        let consumed = fuel_limit.saturating_sub(store.get_fuel().unwrap_or(0));

                        // 🔒 记录燃料消耗统计
                        entity.fuel_consumed += consumed;
                        entity.fuel_efficiency = (val as f32) / (consumed as f32 + 1.0);

                        // 熵增损耗系数：执行指令越多，得分惩罚越重
                        let efficiency_factor =
                            (fuel_limit as f32 - consumed as f32) / fuel_limit as f32;
                        entity.stats.efficiency = efficiency_factor.clamp(0.0, 1.0);

                        (val as f32) * efficiency_factor.max(0.1)
                    }
                    Err(e) => {
                        eprintln!("WASM execution failed for entity {}: {:?}", entity.id, e);
                        0.0
                    }
                };

                // 🔒 提取内存快照 (Law #12)
                if let Some(memory) = instance.get_memory(&mut store, "memory") {
                    entity.last_memory_snapshot = Self::memory_snapshot(&memory, &store);
                }

                res
            } else {
                0.0
            };

        Ok(fitness)
    }

    pub fn execute_entity_for_task(
        &self,
        entity: &mut Entity,
        task_id: BenchmarkTaskId,
    ) -> anyhow::Result<f32> {
        if task_id == BenchmarkTaskId::Freeform {
            return self.execute_entity(entity);
        }

        let (score, observation) = self.score_dna_for_task_with_observation(&entity.dna, task_id);
        entity.stats.efficiency = score.fuel_efficiency.clamp(0.0, 1.0);
        entity.fuel_efficiency = score.fuel_efficiency;

        if let Some((consumed, snapshot)) = observation {
            entity.fuel_consumed += consumed;
            entity.last_memory_snapshot = snapshot;
        }

        Ok(score.final_score)
    }

    pub fn validate_and_test(&self, dna: &str) -> bool {
        // 1. 语法检查
        let wasm_binary = match parse_wat_bounded(dna) {
            Some(binary) => binary,
            None => return false,
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
            let mut store = Store::new(&self.engine, HostState::new(MEMORY_LIMIT_BYTES));
            store.limiter(|s| &mut s.limits);

            // 🔒 降低测试时的 fuel 限额 (200 单位，比正式运行更严格)
            if store.set_fuel(VALIDATION_FUEL_LIMIT).is_err() {
                return false;
            }

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

    pub fn validate_and_test_for_task(&self, dna: &str, task_id: BenchmarkTaskId) -> bool {
        if task_id == BenchmarkTaskId::Freeform {
            return self.validate_and_test(dna);
        }

        self.score_dna_for_task(dna, task_id).final_score > 0.0
    }

    pub fn score_dna_for_task(&self, dna: &str, task_id: BenchmarkTaskId) -> ScoreBreakdown {
        self.score_dna_for_task_with_observation(dna, task_id).0
    }

    fn score_dna_for_task_with_observation(
        &self,
        dna: &str,
        task_id: BenchmarkTaskId,
    ) -> (ScoreBreakdown, Option<(u64, Vec<u8>)>) {
        let (module, wasm_size) = match self.compile_or_get_module(dna) {
            Some(compiled) => compiled,
            None => return (failed_task_score(1), None),
        };

        match task_id {
            BenchmarkTaskId::Freeform => {
                let passed = usize::from(self.validate_and_test(dna));
                (
                    score_useful_work(
                        passed,
                        1,
                        0,
                        1,
                        wasm_size,
                        TASK_SIZE_BUDGET_BYTES,
                        usize::from(passed == 0),
                        0.0,
                    ),
                    None,
                )
            }
            BenchmarkTaskId::SortI32 => self.score_sort_i32(&module, wasm_size),
            BenchmarkTaskId::Rle => self.score_rle(&module, wasm_size),
            BenchmarkTaskId::SumI32 => self.score_i32_array_return(
                &module,
                wasm_size,
                "sum_i32",
                &[
                    (&[1, 2, 3], 6),
                    (&[-3, 5, 10], 12),
                    (&[], 0),
                    (&[i32::MAX, -1, -2], i32::MAX - 3),
                    (&[i32::MIN, 1], i32::MIN + 1),
                    (&[1024, -1024, 0, 7], 7),
                ],
                0.08,
            ),
            BenchmarkTaskId::MaxI32 => self.score_i32_array_return(
                &module,
                wasm_size,
                "max_i32",
                &[
                    (&[3, 9, 1], 9),
                    (&[-8, -2, -30], -2),
                    (&[], 0),
                    (&[i32::MIN], i32::MIN),
                    (&[i32::MIN, 0, i32::MAX, -1], i32::MAX),
                    (&[42, 42, 41], 42),
                ],
                0.08,
            ),
            BenchmarkTaskId::FindI32 => self.score_find_i32(&module, wasm_size),
            BenchmarkTaskId::Checksum8 => self.score_checksum8(&module, wasm_size),
            BenchmarkTaskId::CountByte => self.score_count_byte(&module, wasm_size),
        }
    }

    fn score_i32_array_return(
        &self,
        module: &Module,
        wasm_size: usize,
        export_name: &str,
        cases: &[(&[i32], i32)],
        task_bonus: f32,
    ) -> (ScoreBreakdown, Option<(u64, Vec<u8>)>) {
        let mut passed_cases = 0;
        let mut consumed_fuel = 0;
        let mut trap_count = 0;
        let mut observation = None;

        for (input, expected) in cases {
            match self.run_i32_array_return_case(module, export_name, input, *expected) {
                Ok((passed, consumed, snapshot)) => {
                    if passed {
                        passed_cases += 1;
                    }
                    consumed_fuel += consumed;
                    if observation.is_none() && !snapshot.is_empty() {
                        observation = Some((consumed, snapshot));
                    }
                }
                Err(_) => trap_count += 1,
            }
        }

        (
            score_useful_work(
                passed_cases,
                cases.len(),
                consumed_fuel,
                TASK_FUEL_LIMIT * cases.len() as u64,
                wasm_size,
                TASK_SIZE_BUDGET_BYTES,
                trap_count,
                task_bonus,
            ),
            observation,
        )
    }

    fn run_i32_array_return_case(
        &self,
        module: &Module,
        export_name: &str,
        input: &[i32],
        expected: i32,
    ) -> anyhow::Result<(bool, u64, Vec<u8>)> {
        let (mut store, instance) = self.instantiate_with_fuel(module, TASK_FUEL_LIMIT)?;
        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or_else(|| anyhow::anyhow!("{export_name} task requires exported memory"))?;
        let func = instance.get_typed_func::<(i32, i32), i32>(&mut store, export_name)?;

        let mut input_bytes = Vec::with_capacity(input.len() * 4);
        for value in input {
            input_bytes.extend_from_slice(&value.to_le_bytes());
        }
        memory.write(&mut store, 0, &input_bytes)?;

        let actual = func.call(&mut store, (0, input.len() as i32))?;
        let consumed = TASK_FUEL_LIMIT.saturating_sub(store.get_fuel().unwrap_or(0));
        let snapshot = Self::memory_snapshot(&memory, &store);
        Ok((actual == expected, consumed, snapshot))
    }

    fn score_find_i32(
        &self,
        module: &Module,
        wasm_size: usize,
    ) -> (ScoreBreakdown, Option<(u64, Vec<u8>)>) {
        let cases: &[(&[i32], i32, i32)] = &[
            (&[4, 7, 7], 7, 1),
            (&[1, 2, 3], 9, -1),
            (&[-5, 0, -5, 2], -5, 0),
            (&[], 5, -1),
            (&[9, 9, 9], 9, 0),
            (&[i32::MIN, 0, i32::MAX], i32::MAX, 2),
        ];
        self.score_i32_array_target_return(module, wasm_size, "find_i32", cases, 0.08)
    }

    fn score_i32_array_target_return(
        &self,
        module: &Module,
        wasm_size: usize,
        export_name: &str,
        cases: &[(&[i32], i32, i32)],
        task_bonus: f32,
    ) -> (ScoreBreakdown, Option<(u64, Vec<u8>)>) {
        let mut passed_cases = 0;
        let mut consumed_fuel = 0;
        let mut trap_count = 0;
        let mut observation = None;

        for (input, target, expected) in cases {
            match self.run_i32_array_target_return_case(
                module,
                export_name,
                input,
                *target,
                *expected,
            ) {
                Ok((passed, consumed, snapshot)) => {
                    if passed {
                        passed_cases += 1;
                    }
                    consumed_fuel += consumed;
                    if observation.is_none() && !snapshot.is_empty() {
                        observation = Some((consumed, snapshot));
                    }
                }
                Err(_) => trap_count += 1,
            }
        }

        (
            score_useful_work(
                passed_cases,
                cases.len(),
                consumed_fuel,
                TASK_FUEL_LIMIT * cases.len() as u64,
                wasm_size,
                TASK_SIZE_BUDGET_BYTES,
                trap_count,
                task_bonus,
            ),
            observation,
        )
    }

    fn run_i32_array_target_return_case(
        &self,
        module: &Module,
        export_name: &str,
        input: &[i32],
        target: i32,
        expected: i32,
    ) -> anyhow::Result<(bool, u64, Vec<u8>)> {
        let (mut store, instance) = self.instantiate_with_fuel(module, TASK_FUEL_LIMIT)?;
        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or_else(|| anyhow::anyhow!("{export_name} task requires exported memory"))?;
        let func = instance.get_typed_func::<(i32, i32, i32), i32>(&mut store, export_name)?;

        let mut input_bytes = Vec::with_capacity(input.len() * 4);
        for value in input {
            input_bytes.extend_from_slice(&value.to_le_bytes());
        }
        memory.write(&mut store, 0, &input_bytes)?;

        let actual = func.call(&mut store, (0, input.len() as i32, target))?;
        let consumed = TASK_FUEL_LIMIT.saturating_sub(store.get_fuel().unwrap_or(0));
        let snapshot = Self::memory_snapshot(&memory, &store);
        Ok((actual == expected, consumed, snapshot))
    }

    fn score_checksum8(
        &self,
        module: &Module,
        wasm_size: usize,
    ) -> (ScoreBreakdown, Option<(u64, Vec<u8>)>) {
        let cases: &[(&[u8], i32)] = &[
            (b"\x01\x02\x03", 6),
            (&[250u8, 10u8], 4),
            (b"", 0),
            (&[255u8, 1u8, 1u8], 1),
            (&CHECKSUM_LONG_ONES, 4),
            (&[128u8, 128u8, 127u8], 127),
        ];
        let mut passed_cases = 0;
        let mut consumed_fuel = 0;
        let mut trap_count = 0;
        let mut observation = None;

        for (input, expected) in cases {
            match self.run_byte_array_return_case(module, "checksum8", input, *expected) {
                Ok((passed, consumed, snapshot)) => {
                    if passed {
                        passed_cases += 1;
                    }
                    consumed_fuel += consumed;
                    if observation.is_none() && !snapshot.is_empty() {
                        observation = Some((consumed, snapshot));
                    }
                }
                Err(_) => trap_count += 1,
            }
        }

        (
            score_useful_work(
                passed_cases,
                cases.len(),
                consumed_fuel,
                TASK_FUEL_LIMIT * cases.len() as u64,
                wasm_size,
                TASK_SIZE_BUDGET_BYTES,
                trap_count,
                0.08,
            ),
            observation,
        )
    }

    fn run_byte_array_return_case(
        &self,
        module: &Module,
        export_name: &str,
        input: &[u8],
        expected: i32,
    ) -> anyhow::Result<(bool, u64, Vec<u8>)> {
        let (mut store, instance) = self.instantiate_with_fuel(module, TASK_FUEL_LIMIT)?;
        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or_else(|| anyhow::anyhow!("{export_name} task requires exported memory"))?;
        let func = instance.get_typed_func::<(i32, i32), i32>(&mut store, export_name)?;
        memory.write(&mut store, 0, input)?;
        let actual = func.call(&mut store, (0, input.len() as i32))?;
        let consumed = TASK_FUEL_LIMIT.saturating_sub(store.get_fuel().unwrap_or(0));
        let snapshot = Self::memory_snapshot(&memory, &store);
        Ok((actual == expected, consumed, snapshot))
    }

    fn score_count_byte(
        &self,
        module: &Module,
        wasm_size: usize,
    ) -> (ScoreBreakdown, Option<(u64, Vec<u8>)>) {
        let cases: &[(&[u8], i32, i32)] = &[
            (b"banana", b'a' as i32, 3),
            (b"aaaa", b'a' as i32, 4),
            (b"abcd", b'z' as i32, 0),
            (b"", b'a' as i32, 0),
            (&[0u8, 255u8, 0u8, 128u8], 0, 2),
            (&[255u8, 0u8, 255u8], 511, 2),
        ];
        let mut passed_cases = 0;
        let mut consumed_fuel = 0;
        let mut trap_count = 0;
        let mut observation = None;

        for (input, target, expected) in cases {
            match self.run_byte_array_target_return_case(
                module,
                "count_byte",
                input,
                *target,
                *expected,
            ) {
                Ok((passed, consumed, snapshot)) => {
                    if passed {
                        passed_cases += 1;
                    }
                    consumed_fuel += consumed;
                    if observation.is_none() && !snapshot.is_empty() {
                        observation = Some((consumed, snapshot));
                    }
                }
                Err(_) => trap_count += 1,
            }
        }

        (
            score_useful_work(
                passed_cases,
                cases.len(),
                consumed_fuel,
                TASK_FUEL_LIMIT * cases.len() as u64,
                wasm_size,
                TASK_SIZE_BUDGET_BYTES,
                trap_count,
                0.08,
            ),
            observation,
        )
    }

    fn run_byte_array_target_return_case(
        &self,
        module: &Module,
        export_name: &str,
        input: &[u8],
        target: i32,
        expected: i32,
    ) -> anyhow::Result<(bool, u64, Vec<u8>)> {
        let (mut store, instance) = self.instantiate_with_fuel(module, TASK_FUEL_LIMIT)?;
        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or_else(|| anyhow::anyhow!("{export_name} task requires exported memory"))?;
        let func = instance.get_typed_func::<(i32, i32, i32), i32>(&mut store, export_name)?;
        memory.write(&mut store, 0, input)?;
        let actual = func.call(&mut store, (0, input.len() as i32, target))?;
        let consumed = TASK_FUEL_LIMIT.saturating_sub(store.get_fuel().unwrap_or(0));
        let snapshot = Self::memory_snapshot(&memory, &store);
        Ok((actual == expected, consumed, snapshot))
    }

    fn score_sort_i32(
        &self,
        module: &Module,
        wasm_size: usize,
    ) -> (ScoreBreakdown, Option<(u64, Vec<u8>)>) {
        let cases: &[(&[i32], &[i32])] = &[
            (&[3, 1, 2], &[1, 2, 3]),
            (&[0, -1, 8, 8], &[-1, 0, 8, 8]),
            (&[], &[]),
            (&[9, 7, 5, 3, 1], &[1, 3, 5, 7, 9]),
            (&[-3, -3, -4, -1, -4], &[-4, -4, -3, -3, -1]),
            (&[5, 5, 5, 5], &[5, 5, 5, 5]),
            (&SORT_LONG_INPUT, &SORT_LONG_EXPECTED),
        ];

        let mut passed_cases = 0;
        let mut consumed_fuel = 0;
        let mut trap_count = 0;
        let mut observation = None;

        for (input, expected) in cases {
            match self.run_sort_i32_case(module, input, expected) {
                Ok((passed, consumed, snapshot)) => {
                    if passed {
                        passed_cases += 1;
                    }
                    consumed_fuel += consumed;
                    if observation.is_none() && !snapshot.is_empty() {
                        observation = Some((consumed, snapshot));
                    }
                }
                Err(_) => trap_count += 1,
            }
        }

        (
            score_useful_work(
                passed_cases,
                cases.len(),
                consumed_fuel,
                TASK_FUEL_LIMIT * cases.len() as u64,
                wasm_size,
                TASK_SIZE_BUDGET_BYTES,
                trap_count,
                0.10,
            ),
            observation,
        )
    }

    fn run_sort_i32_case(
        &self,
        module: &Module,
        input: &[i32],
        expected: &[i32],
    ) -> anyhow::Result<(bool, u64, Vec<u8>)> {
        let (mut store, instance) = self.instantiate_with_fuel(module, TASK_FUEL_LIMIT)?;
        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or_else(|| anyhow::anyhow!("sort_i32 task requires exported memory"))?;
        let sort = instance.get_typed_func::<(i32, i32), i32>(&mut store, "sort_i32")?;

        let mut input_bytes = Vec::with_capacity(input.len() * 4);
        for value in input {
            input_bytes.extend_from_slice(&value.to_le_bytes());
        }
        memory.write(&mut store, 0, &input_bytes)?;

        let return_code = sort.call(&mut store, (0, input.len() as i32))?;
        let consumed = TASK_FUEL_LIMIT.saturating_sub(store.get_fuel().unwrap_or(0));
        if return_code != 1 {
            let snapshot = Self::memory_snapshot(&memory, &store);
            return Ok((false, consumed, snapshot));
        }

        let mut actual_bytes = vec![0; expected.len() * 4];
        memory.read(&store, 0, &mut actual_bytes)?;
        let snapshot = Self::memory_snapshot(&memory, &store);
        let actual: Vec<i32> = actual_bytes
            .chunks_exact(4)
            .map(|chunk| i32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
            .collect();

        Ok((actual == expected, consumed, snapshot))
    }

    fn score_rle(
        &self,
        module: &Module,
        wasm_size: usize,
    ) -> (ScoreBreakdown, Option<(u64, Vec<u8>)>) {
        let cases: &[RleCase<'_>] = &[
            RleCase {
                input: b"aaabb",
                out_cap: 256,
                expected: RleExpected::Bytes(&[b'a', 3, b'b', 2]),
            },
            RleCase {
                input: b"abcd",
                out_cap: 256,
                expected: RleExpected::Bytes(&[b'a', 1, b'b', 1, b'c', 1, b'd', 1]),
            },
            RleCase {
                input: b"zzzzzz",
                out_cap: 256,
                expected: RleExpected::Bytes(&[b'z', 6]),
            },
            RleCase {
                input: b"",
                out_cap: 256,
                expected: RleExpected::Bytes(&[]),
            },
            RleCase {
                input: &RLE_LONG_RUN,
                out_cap: 512,
                expected: RleExpected::Bytes(&RLE_LONG_RUN_EXPECTED),
            },
            RleCase {
                input: b"aaabbb",
                out_cap: 3,
                expected: RleExpected::ReturnCode(-1),
            },
            RleCase {
                input: &RLE_LONG_RUN,
                out_cap: 2,
                expected: RleExpected::ReturnCode(-1),
            },
        ];

        let mut passed_cases = 0;
        let mut consumed_fuel = 0;
        let mut trap_count = 0;
        let mut observation = None;

        for case in cases {
            match self.run_rle_case(module, case) {
                Ok((passed, consumed, snapshot)) => {
                    if passed {
                        passed_cases += 1;
                    }
                    consumed_fuel += consumed;
                    if observation.is_none() && !snapshot.is_empty() {
                        observation = Some((consumed, snapshot));
                    }
                }
                Err(_) => trap_count += 1,
            }
        }

        (
            score_useful_work(
                passed_cases,
                cases.len(),
                consumed_fuel,
                TASK_FUEL_LIMIT * cases.len() as u64,
                wasm_size,
                TASK_SIZE_BUDGET_BYTES,
                trap_count,
                0.10,
            ),
            observation,
        )
    }

    fn run_rle_case(
        &self,
        module: &Module,
        case: &RleCase<'_>,
    ) -> anyhow::Result<(bool, u64, Vec<u8>)> {
        let (mut store, instance) = self.instantiate_with_fuel(module, TASK_FUEL_LIMIT)?;
        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or_else(|| anyhow::anyhow!("rle task requires exported memory"))?;
        let encode =
            instance.get_typed_func::<(i32, i32, i32, i32), i32>(&mut store, "rle_encode")?;

        let in_ptr = 0;
        let out_ptr = 1024;
        memory.write(&mut store, in_ptr as usize, case.input)?;

        let written = encode.call(
            &mut store,
            (in_ptr, case.input.len() as i32, out_ptr, case.out_cap),
        )?;
        let consumed = TASK_FUEL_LIMIT.saturating_sub(store.get_fuel().unwrap_or(0));
        let snapshot = Self::memory_snapshot(&memory, &store);
        match case.expected {
            RleExpected::ReturnCode(expected_code) => {
                Ok((written == expected_code, consumed, snapshot))
            }
            RleExpected::Bytes(expected) => {
                if written < 0 || written as usize != expected.len() {
                    return Ok((false, consumed, snapshot));
                }

                let mut actual = vec![0; written as usize];
                memory.read(&store, out_ptr as usize, &mut actual)?;
                Ok((actual == expected, consumed, snapshot))
            }
        }
    }
}

fn failed_task_score(total_cases: usize) -> ScoreBreakdown {
    score_useful_work(
        0,
        total_cases,
        TASK_FUEL_LIMIT,
        TASK_FUEL_LIMIT,
        TASK_SIZE_BUDGET_BYTES,
        TASK_SIZE_BUDGET_BYTES,
        1,
        0.0,
    )
}

#[cfg(test)]
mod tests {
    use super::{parse_wat_bounded, WasmEngine, MAX_WAT_SOURCE_BYTES};
    use crate::evolution::benchmark::{baseline_dna_for_task, BenchmarkTaskId};

    #[test]
    fn freeform_still_accepts_calculate_fitness() {
        let engine = WasmEngine::new().unwrap();
        let dna = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 42
  )
)"#;

        assert!(engine.validate_and_test_for_task(dna, BenchmarkTaskId::Freeform));
    }

    #[test]
    fn wat_parser_rejects_oversized_source_before_compilation() {
        assert!(parse_wat_bounded("(module)").is_some());
        assert!(parse_wat_bounded(&" ".repeat(MAX_WAT_SOURCE_BYTES + 1)).is_none());
    }

    #[test]
    fn sort_task_rejects_dna_without_sort_export() {
        let engine = WasmEngine::new().unwrap();
        let dna = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 999
  )
)"#;

        assert!(!engine.validate_and_test_for_task(dna, BenchmarkTaskId::SortI32));
    }

    #[test]
    fn phase1_baseline_tasks_pass_real_task_cases() {
        let engine = WasmEngine::new().unwrap();

        for task_id in [
            BenchmarkTaskId::SortI32,
            BenchmarkTaskId::Rle,
            BenchmarkTaskId::SumI32,
            BenchmarkTaskId::MaxI32,
            BenchmarkTaskId::FindI32,
            BenchmarkTaskId::Checksum8,
            BenchmarkTaskId::CountByte,
        ] {
            assert!(
                engine.validate_and_test_for_task(baseline_dna_for_task(task_id), task_id),
                "baseline failed for {:?}",
                task_id
            );
        }
    }

    #[test]
    fn phase1_baseline_tasks_pass_hidden_edge_corpus() {
        let engine = WasmEngine::new().unwrap();

        for task_id in [
            BenchmarkTaskId::SortI32,
            BenchmarkTaskId::Rle,
            BenchmarkTaskId::SumI32,
            BenchmarkTaskId::MaxI32,
            BenchmarkTaskId::FindI32,
            BenchmarkTaskId::Checksum8,
            BenchmarkTaskId::CountByte,
        ] {
            let score = engine.score_dna_for_task(baseline_dna_for_task(task_id), task_id);
            assert_eq!(
                score.correctness, 1.0,
                "hidden corpus failed for {task_id:?}"
            );
            assert!(
                score.final_score > 0.0,
                "hidden corpus produced zero final score for {task_id:?}",
            );
        }
    }
}
