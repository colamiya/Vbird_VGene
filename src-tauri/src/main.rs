// 防止Windows发布版本中出现额外的控制台窗口，请勿删除！
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_commands;
mod benchmark_commands;
mod compute_commands;
mod evolution;
mod lifecycle_commands;
mod runtime_files;
mod settings_commands;
mod state;
mod system_info;
mod world_commands;

use state::AppState;
use std::sync::Arc;

#[cfg(windows)]
fn optimize_for_windows() {
    use windows::Win32::System::Threading::{
        GetCurrentProcess, SetPriorityClass, HIGH_PRIORITY_CLASS,
    };
    unsafe {
        // 提高进程优先级 (需要管理员权限，若无权限则静默失败)
        let _ = SetPriorityClass(GetCurrentProcess(), HIGH_PRIORITY_CLASS);
    }
}

#[tokio::main]
async fn main() {
    // 初始化日志
    env_logger::init();

    // Windows 环境优化
    #[cfg(windows)]
    optimize_for_windows();

    let app_state = match AppState::new() {
        Ok(state) => Arc::new(state),
        Err(error) => {
            eprintln!("{error}");
            log::error!("{error}");
            return;
        }
    };

    log::info!("V-GENE Simulation System Started");

    if let Err(error) = tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            lifecycle_commands::start_sim,
            lifecycle_commands::stop_sim,
            lifecycle_commands::reset_sim,
            world_commands::get_world_state,
            world_commands::get_world_binary,
            world_commands::get_entity_detail,
            world_commands::get_lineage,
            world_commands::get_recent_interactions,
            world_commands::get_hall_of_fame,
            world_commands::interfere_at,
            world_commands::apply_player_intervention,
            settings_commands::update_settings,
            system_info::get_sys_info,
            system_info::get_live_stats,
            compute_commands::get_compute_status,
            benchmark_commands::get_benchmark_catalog,
            benchmark_commands::score_benchmark_preview,
            ai_commands::check_ollama_models,
            ai_commands::generate_divine_mandate,
            lifecycle_commands::export_logs,
            settings_commands::save_settings,
            settings_commands::load_settings,
            lifecycle_commands::logger
        ])
        .run(tauri::generate_context!())
    {
        eprintln!("error while running tauri application: {error}");
        log::error!("error while running tauri application: {error}");
    }
}
