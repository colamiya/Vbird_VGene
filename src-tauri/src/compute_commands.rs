use crate::evolution::compute::{query_gpu_telemetry, ComputeStatus};
use crate::state::{lock_app_state, AppState};
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn get_compute_status(state: State<'_, Arc<AppState>>) -> Result<ComputeStatus, String> {
    let mut status = lock_app_state(&state.compute_status, "compute_status")?.clone();
    let telemetry = query_gpu_telemetry();

    status.cuda_available =
        telemetry.cuda_available && crate::evolution::gpu::cuda_feature_enabled();
    status.device_name = telemetry.device_name;
    status.compute_capability = telemetry.compute_capability;
    status.vram_total = telemetry.vram_total;
    status.vram_free = telemetry.vram_free;
    status.gpu_load = telemetry.gpu_load;
    status.temperature = telemetry.temperature;

    if !status.cuda_available && status.fallback_reason.is_none() {
        status.fallback_reason = telemetry
            .fallback_reason
            .or_else(|| Some("CUDA feature is not enabled in this build".to_string()));
    }

    Ok(status)
}
