use crate::evolution::benchmark::{
    phase1_task_catalog, score_useful_work, BenchmarkTask, ScoreBreakdown,
};

#[tauri::command]
pub fn get_benchmark_catalog() -> Vec<BenchmarkTask> {
    phase1_task_catalog()
}

#[tauri::command]
pub fn score_benchmark_preview(
    passed_cases: usize,
    total_cases: usize,
    consumed_fuel: u64,
    fuel_budget: u64,
    wasm_bytes: usize,
    size_budget: usize,
    trap_count: usize,
    task_bonus: f32,
) -> ScoreBreakdown {
    score_useful_work(
        passed_cases,
        total_cases,
        consumed_fuel,
        fuel_budget,
        wasm_bytes,
        size_budget,
        trap_count,
        task_bonus,
    )
}
