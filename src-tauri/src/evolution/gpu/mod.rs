use crate::evolution::compute::{
    adaptive_scale_for, effective_entity_cap, query_gpu_telemetry, ActiveComputeBackend,
    ComputeStatus, ComputeStepOutcome, ComputeStepParams,
};
use crate::evolution::entity::Entity;

#[cfg(feature = "cuda")]
mod cuda_backend {
    use super::*;
    use cudarc::driver::{CudaContext, CudaFunction, CudaModule, LaunchConfig};
    use cudarc::nvrtc::Ptx;
    use once_cell::sync::OnceCell;
    use std::sync::{Arc, Mutex};
    use std::time::Instant;

    static CUDA_ENGINE: OnceCell<Mutex<Result<CudaEngine, String>>> = OnceCell::new();

    struct CudaEngine {
        ctx: Arc<CudaContext>,
        ecology: CudaFunction,
        interaction: CudaFunction,
        selection: CudaFunction,
        stats: CudaFunction,
    }

    impl CudaEngine {
        fn new() -> Result<Self, String> {
            let ctx = CudaContext::new(0)
                .map_err(|error| format!("CUDA context init failed: {error}"))?;
            let ptx = Ptx::from_src(include_str!(concat!(
                env!("OUT_DIR"),
                "/vgene_evolution.ptx"
            )));
            let module: Arc<CudaModule> = ctx
                .load_module(ptx)
                .map_err(|error| format!("CUDA PTX load failed: {error}"))?;
            let ecology = module
                .load_function("ecology_step_kernel")
                .map_err(|error| format!("CUDA ecology_step_kernel missing: {error}"))?;
            let interaction = module
                .load_function("interaction_kernel")
                .map_err(|error| format!("CUDA interaction_kernel missing: {error}"))?;
            let selection = module
                .load_function("selection_score_kernel")
                .map_err(|error| format!("CUDA selection_score_kernel missing: {error}"))?;
            let stats = module
                .load_function("world_stats_kernel")
                .map_err(|error| format!("CUDA world_stats_kernel missing: {error}"))?;

            Ok(Self {
                ctx,
                ecology,
                interaction,
                selection,
                stats,
            })
        }

        fn run_step(
            &mut self,
            entities: &mut [Entity],
            params: &ComputeStepParams,
        ) -> Result<ComputeStepOutcome, String> {
            let count = entities.len();
            let telemetry = query_gpu_telemetry();
            if count == 0 {
                let adaptive_scale = adaptive_scale_for(&telemetry);
                let effective_cap =
                    effective_entity_cap(params.max_entities, &telemetry, adaptive_scale);
                return Ok(ComputeStepOutcome {
                    selection_scores: Vec::new(),
                    status: status_from_cuda(
                        params,
                        telemetry,
                        0.0,
                        adaptive_scale,
                        effective_cap,
                        None,
                    ),
                    interactions: Vec::new(),
                });
            }

            let start = Instant::now();
            let stream = self.ctx.default_stream();
            let n = count as i32;
            let env_code = env_code(&params.env_type);
            let rule_code = rule_code(&params.winning_rule);
            let entropy_factor = params.entropy_factor.clamp(0.0, 1.0);

            let mut x = Vec::with_capacity(count);
            let mut y = Vec::with_capacity(count);
            let mut z = Vec::with_capacity(count);
            let mut scores = Vec::with_capacity(count);
            let mut energy = Vec::with_capacity(count);
            let mut toxin = Vec::with_capacity(count);
            let mut efficiency = Vec::with_capacity(count);
            let mut altruism = Vec::with_capacity(count);
            let mut collaboration = Vec::with_capacity(count);
            let mut fuel_efficiency = Vec::with_capacity(count);
            let mut attack = Vec::with_capacity(count);
            let mut defense = Vec::with_capacity(count);
            let mut generation = Vec::with_capacity(count);
            let mut dna_len = Vec::with_capacity(count);
            let mut ids = Vec::with_capacity(count);

            for entity in entities.iter() {
                x.push(entity.position.0);
                y.push(entity.position.1);
                z.push(entity.position.2);
                scores.push(entity.score);
                energy.push(entity.energy);
                toxin.push(entity.metabolic_toxin);
                efficiency.push(entity.stats.efficiency);
                altruism.push(entity.ethics.altruism);
                collaboration.push(entity.ethics.collaboration);
                fuel_efficiency.push(entity.fuel_efficiency);
                attack.push(entity.stats.attack as i32);
                defense.push(entity.stats.defense as i32);
                generation.push(entity.generation as i32);
                dna_len.push(entity.dna.len() as i32);
                ids.push(entity.id);
            }

            let mut x_dev = stream
                .clone_htod(&x)
                .map_err(|error| format!("CUDA HtoD x failed: {error}"))?;
            let mut y_dev = stream
                .clone_htod(&y)
                .map_err(|error| format!("CUDA HtoD y failed: {error}"))?;
            let mut z_dev = stream
                .clone_htod(&z)
                .map_err(|error| format!("CUDA HtoD z failed: {error}"))?;
            let mut score_dev = stream
                .clone_htod(&scores)
                .map_err(|error| format!("CUDA HtoD score failed: {error}"))?;
            let mut energy_dev = stream
                .clone_htod(&energy)
                .map_err(|error| format!("CUDA HtoD energy failed: {error}"))?;
            let mut toxin_dev = stream
                .clone_htod(&toxin)
                .map_err(|error| format!("CUDA HtoD toxin failed: {error}"))?;
            let efficiency_dev = stream
                .clone_htod(&efficiency)
                .map_err(|error| format!("CUDA HtoD efficiency failed: {error}"))?;
            let altruism_dev = stream
                .clone_htod(&altruism)
                .map_err(|error| format!("CUDA HtoD altruism failed: {error}"))?;
            let collaboration_dev = stream
                .clone_htod(&collaboration)
                .map_err(|error| format!("CUDA HtoD collaboration failed: {error}"))?;
            let fuel_efficiency_dev = stream
                .clone_htod(&fuel_efficiency)
                .map_err(|error| format!("CUDA HtoD fuel efficiency failed: {error}"))?;
            let attack_dev = stream
                .clone_htod(&attack)
                .map_err(|error| format!("CUDA HtoD attack failed: {error}"))?;
            let defense_dev = stream
                .clone_htod(&defense)
                .map_err(|error| format!("CUDA HtoD defense failed: {error}"))?;
            let generation_dev = stream
                .clone_htod(&generation)
                .map_err(|error| format!("CUDA HtoD generation failed: {error}"))?;
            let dna_len_dev = stream
                .clone_htod(&dna_len)
                .map_err(|error| format!("CUDA HtoD dna len failed: {error}"))?;
            let ids_dev = stream
                .clone_htod(&ids)
                .map_err(|error| format!("CUDA HtoD ids failed: {error}"))?;
            let mut selection_dev = stream
                .alloc_zeros::<f32>(count)
                .map_err(|error| format!("CUDA alloc selection failed: {error}"))?;
            let mut stats_dev = stream
                .alloc_zeros::<f32>(4)
                .map_err(|error| format!("CUDA alloc stats failed: {error}"))?;

            let cfg = LaunchConfig::for_num_elems(count as u32);
            unsafe {
                stream
                    .launch_builder(&self.ecology)
                    .arg(&n)
                    .arg(&env_code)
                    .arg(&entropy_factor)
                    .arg(&params.seed)
                    .arg(&ids_dev)
                    .arg(&efficiency_dev)
                    .arg(&mut x_dev)
                    .arg(&mut y_dev)
                    .arg(&mut z_dev)
                    .arg(&mut score_dev)
                    .arg(&mut energy_dev)
                    .arg(&mut toxin_dev)
                    .launch(cfg)
                    .map_err(|error| format!("CUDA ecology launch failed: {error}"))?;

                stream
                    .launch_builder(&self.interaction)
                    .arg(&n)
                    .arg(&x_dev)
                    .arg(&y_dev)
                    .arg(&z_dev)
                    .arg(&attack_dev)
                    .arg(&defense_dev)
                    .arg(&altruism_dev)
                    .arg(&collaboration_dev)
                    .arg(&mut energy_dev)
                    .arg(&mut score_dev)
                    .launch(cfg)
                    .map_err(|error| format!("CUDA interaction launch failed: {error}"))?;

                stream
                    .launch_builder(&self.selection)
                    .arg(&n)
                    .arg(&rule_code)
                    .arg(&score_dev)
                    .arg(&energy_dev)
                    .arg(&attack_dev)
                    .arg(&dna_len_dev)
                    .arg(&fuel_efficiency_dev)
                    .arg(&mut selection_dev)
                    .launch(cfg)
                    .map_err(|error| format!("CUDA selection launch failed: {error}"))?;

                stream
                    .launch_builder(&self.stats)
                    .arg(&n)
                    .arg(&score_dev)
                    .arg(&energy_dev)
                    .arg(&toxin_dev)
                    .arg(&generation_dev)
                    .arg(&mut stats_dev)
                    .launch(cfg)
                    .map_err(|error| format!("CUDA stats launch failed: {error}"))?;
            }

            stream
                .synchronize()
                .map_err(|error| format!("CUDA stream sync failed: {error}"))?;

            let x_out = stream
                .clone_dtoh(&x_dev)
                .map_err(|error| format!("CUDA DtoH x failed: {error}"))?;
            let y_out = stream
                .clone_dtoh(&y_dev)
                .map_err(|error| format!("CUDA DtoH y failed: {error}"))?;
            let z_out = stream
                .clone_dtoh(&z_dev)
                .map_err(|error| format!("CUDA DtoH z failed: {error}"))?;
            let score_out = stream
                .clone_dtoh(&score_dev)
                .map_err(|error| format!("CUDA DtoH score failed: {error}"))?;
            let energy_out = stream
                .clone_dtoh(&energy_dev)
                .map_err(|error| format!("CUDA DtoH energy failed: {error}"))?;
            let toxin_out = stream
                .clone_dtoh(&toxin_dev)
                .map_err(|error| format!("CUDA DtoH toxin failed: {error}"))?;
            let selection_scores = stream
                .clone_dtoh(&selection_dev)
                .map_err(|error| format!("CUDA DtoH selection failed: {error}"))?;

            for (idx, entity) in entities.iter_mut().enumerate() {
                entity.position = (x_out[idx], y_out[idx], z_out[idx]);
                entity.score = score_out[idx].max(0.0);
                entity.energy = energy_out[idx].clamp(0.0, 100.0);
                entity.metabolic_toxin = toxin_out[idx].clamp(0.0, 1.0);
            }

            let elapsed = start.elapsed().as_secs_f32() * 1000.0;
            let telemetry = query_gpu_telemetry();
            let adaptive_scale = adaptive_scale_for(&telemetry);
            let effective_cap =
                effective_entity_cap(params.max_entities, &telemetry, adaptive_scale);

            Ok(ComputeStepOutcome {
                selection_scores,
                status: status_from_cuda(
                    params,
                    telemetry,
                    elapsed,
                    adaptive_scale,
                    effective_cap,
                    None,
                ),
                interactions: Vec::new(),
            })
        }
    }

    fn status_from_cuda(
        params: &ComputeStepParams,
        telemetry: crate::evolution::compute::GpuTelemetry,
        elapsed_ms: f32,
        adaptive_scale: f32,
        effective_cap: usize,
        fallback_reason: Option<String>,
    ) -> ComputeStatus {
        ComputeStatus {
            requested_backend: params.requested_backend,
            active_backend: ActiveComputeBackend::Cuda.as_label().to_string(),
            cuda_available: telemetry.cuda_available,
            device_name: telemetry.device_name,
            compute_capability: telemetry.compute_capability,
            vram_total: telemetry.vram_total,
            vram_free: telemetry.vram_free,
            gpu_load: telemetry.gpu_load,
            temperature: telemetry.temperature,
            last_kernel_ms: elapsed_ms,
            fallback_reason,
            adaptive_scale,
            effective_entity_cap: effective_cap,
        }
    }

    fn engine() -> Result<std::sync::MutexGuard<'static, Result<CudaEngine, String>>, String> {
        let mutex = CUDA_ENGINE.get_or_init(|| Mutex::new(CudaEngine::new()));
        mutex
            .lock()
            .map_err(|_| "CUDA engine lock poisoned".to_string())
    }

    pub fn run_cuda_step(
        entities: &mut [Entity],
        params: &ComputeStepParams,
    ) -> Result<ComputeStepOutcome, String> {
        let mut guard = engine()?;
        match &mut *guard {
            Ok(engine) => engine.run_step(entities, params),
            Err(error) => Err(error.clone()),
        }
    }

    fn env_code(env_type: &str) -> i32 {
        match env_type {
            "DEEP_SEA" => 1,
            "SPACE" => 2,
            _ => 0,
        }
    }

    fn rule_code(winning_rule: &str) -> i32 {
        match winning_rule {
            "PREDATION" => 1,
            "CODE_SIZE" => 2,
            _ => 0,
        }
    }
}

#[cfg(feature = "cuda")]
pub fn run_cuda_step(
    entities: &mut [Entity],
    params: &ComputeStepParams,
) -> Result<ComputeStepOutcome, String> {
    cuda_backend::run_cuda_step(entities, params)
}

#[cfg(not(feature = "cuda"))]
pub fn run_cuda_step(
    _entities: &mut [Entity],
    _params: &ComputeStepParams,
) -> Result<ComputeStepOutcome, String> {
    Err("CUDA feature is not enabled in this build".to_string())
}

#[cfg(feature = "cuda")]
pub fn cuda_feature_enabled() -> bool {
    true
}

#[cfg(not(feature = "cuda"))]
pub fn cuda_feature_enabled() -> bool {
    false
}

pub fn fallback_status(
    params: &ComputeStepParams,
    reason: String,
    elapsed_ms: f32,
) -> ComputeStatus {
    let telemetry = query_gpu_telemetry();
    let adaptive_scale = adaptive_scale_for(&telemetry);
    let effective_cap = effective_entity_cap(params.max_entities, &telemetry, adaptive_scale);
    ComputeStatus {
        requested_backend: params.requested_backend,
        active_backend: ActiveComputeBackend::Cpu.as_label().to_string(),
        cuda_available: telemetry.cuda_available && cuda_feature_enabled(),
        device_name: telemetry.device_name,
        compute_capability: telemetry.compute_capability,
        vram_total: telemetry.vram_total,
        vram_free: telemetry.vram_free,
        gpu_load: telemetry.gpu_load,
        temperature: telemetry.temperature,
        last_kernel_ms: elapsed_ms,
        fallback_reason: Some(reason),
        adaptive_scale,
        effective_entity_cap: effective_cap,
    }
}
