use crate::evolution::entity::Entity;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

const BYTES_PER_GIB: u64 = 1024 * 1024 * 1024;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ComputeBackend {
    Auto,
    CPU,
    CUDA,
}

impl Default for ComputeBackend {
    fn default() -> Self {
        Self::Auto
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
pub enum ActiveComputeBackend {
    Cpu,
    Cuda,
}

impl ActiveComputeBackend {
    pub fn as_label(self) -> &'static str {
        match self {
            Self::Cpu => "CPU",
            Self::Cuda => "CUDA",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ComputeStatus {
    pub requested_backend: ComputeBackend,
    pub active_backend: String,
    pub cuda_available: bool,
    pub device_name: Option<String>,
    pub compute_capability: Option<String>,
    pub vram_total: u64,
    pub vram_free: u64,
    pub gpu_load: u32,
    pub temperature: u32,
    pub last_kernel_ms: f32,
    pub fallback_reason: Option<String>,
    pub adaptive_scale: f32,
    pub effective_entity_cap: usize,
}

impl Default for ComputeStatus {
    fn default() -> Self {
        Self {
            requested_backend: ComputeBackend::Auto,
            active_backend: "CPU".to_string(),
            cuda_available: false,
            device_name: None,
            compute_capability: None,
            vram_total: 0,
            vram_free: 0,
            gpu_load: 0,
            temperature: 0,
            last_kernel_ms: 0.0,
            fallback_reason: Some("CUDA runtime has not been initialized".to_string()),
            adaptive_scale: 1.0,
            effective_entity_cap: 0,
        }
    }
}

#[derive(Debug, Clone)]
pub struct GpuTelemetry {
    pub cuda_available: bool,
    pub device_name: Option<String>,
    pub compute_capability: Option<String>,
    pub vram_total: u64,
    pub vram_free: u64,
    pub gpu_load: u32,
    pub temperature: u32,
    pub fallback_reason: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ComputeStepParams {
    pub requested_backend: ComputeBackend,
    pub entropy_factor: f32,
    pub env_type: String,
    pub winning_rule: String,
    pub max_entities: usize,
    pub seed: u32,
    pub tick: u64,
}

#[derive(Debug, Clone)]
pub struct ComputeStepOutcome {
    pub selection_scores: Vec<f32>,
    pub status: ComputeStatus,
    pub interactions: Vec<InteractionEvent>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum InteractionKind {
    MutualAid,
    ResourceTransfer,
    Predation,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct InteractionEvent {
    pub id: String,
    pub tick: u64,
    pub kind: InteractionKind,
    pub source_id: u32,
    pub target_id: u32,
    pub distance: f32,
    pub source_energy_delta: f32,
    pub target_energy_delta: f32,
    pub source_toxin_delta: f32,
    pub target_toxin_delta: f32,
    pub source_score: f32,
    pub target_score: f32,
    pub source_generation: u32,
    pub target_generation: u32,
}

pub fn query_gpu_telemetry() -> GpuTelemetry {
    use nvml_wrapper::enum_wrappers::device::TemperatureSensor;
    use nvml_wrapper::Nvml;

    let Ok(nvml) = Nvml::init() else {
        return GpuTelemetry {
            cuda_available: false,
            device_name: None,
            compute_capability: None,
            vram_total: 0,
            vram_free: 0,
            gpu_load: 0,
            temperature: 0,
            fallback_reason: Some(
                "NVML unavailable; NVIDIA driver or nvml.dll not found".to_string(),
            ),
        };
    };

    let Ok(device) = nvml.device_by_index(0) else {
        return GpuTelemetry {
            cuda_available: false,
            device_name: None,
            compute_capability: None,
            vram_total: 0,
            vram_free: 0,
            gpu_load: 0,
            temperature: 0,
            fallback_reason: Some("No NVIDIA CUDA device detected".to_string()),
        };
    };

    let memory = device.memory_info().ok();
    let utilization = device.utilization_rates().ok();
    let capability = device.cuda_compute_capability().ok();

    GpuTelemetry {
        cuda_available: true,
        device_name: device.name().ok(),
        compute_capability: capability.map(|cap| format!("{}.{}", cap.major, cap.minor)),
        vram_total: memory.as_ref().map(|m| m.total).unwrap_or(0),
        vram_free: memory.as_ref().map(|m| m.free).unwrap_or(0),
        gpu_load: utilization.as_ref().map(|u| u.gpu).unwrap_or(0),
        temperature: device.temperature(TemperatureSensor::Gpu).unwrap_or(0),
        fallback_reason: None,
    }
}

pub fn adaptive_scale_for(telemetry: &GpuTelemetry) -> f32 {
    if !telemetry.cuda_available {
        return 1.0;
    }

    if telemetry.temperature >= 83
        || telemetry.gpu_load >= 92
        || telemetry.vram_free < BYTES_PER_GIB
    {
        1.75
    } else if telemetry.temperature >= 78
        || telemetry.gpu_load >= 85
        || telemetry.vram_free < BYTES_PER_GIB * 2
    {
        1.25
    } else {
        1.0
    }
}

pub fn effective_entity_cap(
    max_entities: usize,
    telemetry: &GpuTelemetry,
    adaptive_scale: f32,
) -> usize {
    if !telemetry.cuda_available {
        return max_entities;
    }

    if adaptive_scale >= 1.75 {
        max_entities.clamp(1, 1500)
    } else if adaptive_scale >= 1.25 {
        max_entities.clamp(1, 2500)
    } else {
        max_entities
    }
}

pub fn throttle_with_adaptive_scale(throttle_ms: u64, adaptive_scale: f32) -> u64 {
    ((throttle_ms as f32) * adaptive_scale)
        .round()
        .clamp(16.0, 30_000.0) as u64
}

pub fn movement_step_for_env(env_type: &str) -> f32 {
    match env_type {
        "DEEP_SEA" => 0.08,
        "SPACE" => 0.35,
        _ => 0.2,
    }
}

pub fn selection_score(entity: &Entity, winning_rule: &str) -> f32 {
    match winning_rule {
        "CODE_SIZE" => {
            let size_penalty = (entity.dna.len() as f32 / 2000.0).min(40.0);
            entity.score + entity.fuel_efficiency * 10.0 - size_penalty
        }
        "PREDATION" => entity.score + entity.stats.attack as f32 * 0.35,
        _ => entity.score + entity.energy * 0.05,
    }
}

fn process_collision(
    entities: &mut [Entity],
    i: usize,
    j: usize,
    tick: u64,
) -> Option<InteractionEvent> {
    let pos1 = entities[i].position;
    let pos2 = entities[j].position;

    let dx = pos1.0 - pos2.0;
    let dy = pos1.1 - pos2.1;
    let dz = pos1.2 - pos2.2;
    let dist_sq = dx * dx + dy * dy + dz * dz;

    if dist_sq >= 0.25 {
        return None;
    }

    let distance = dist_sq.sqrt();
    let before_i_energy = entities[i].energy;
    let before_j_energy = entities[j].energy;
    let before_i_toxin = entities[i].metabolic_toxin;
    let before_j_toxin = entities[j].metabolic_toxin;
    let altruism_i = entities[i].ethics.altruism;
    let altruism_j = entities[j].ethics.altruism;

    if altruism_i > 0.7 && altruism_j > 0.7 {
        let shared = (entities[i].energy + entities[j].energy) / 2.0;
        entities[i].energy = shared;
        entities[j].energy = shared;
        let is_resource_transfer = (before_i_energy - before_j_energy).abs() >= 6.0;
        if is_resource_transfer && before_j_energy > before_i_energy {
            return Some(interaction_event_for_pair(
                &entities[j],
                &entities[i],
                tick,
                InteractionKind::ResourceTransfer,
                distance,
                before_j_energy,
                before_i_energy,
                before_j_toxin,
                before_i_toxin,
            ));
        }
        return Some(interaction_event_for_pair(
            &entities[i],
            &entities[j],
            tick,
            if is_resource_transfer {
                InteractionKind::ResourceTransfer
            } else {
                InteractionKind::MutualAid
            },
            distance,
            before_i_energy,
            before_j_energy,
            before_i_toxin,
            before_j_toxin,
        ));
    }

    if entities[i].stats.attack > entities[j].stats.defense + 50 {
        entities[j].energy = 0.0;
        entities[i].energy = (entities[i].energy + 20.0).min(100.0);
        return Some(interaction_event_for_pair(
            &entities[i],
            &entities[j],
            tick,
            InteractionKind::Predation,
            distance,
            before_i_energy,
            before_j_energy,
            before_i_toxin,
            before_j_toxin,
        ));
    }

    if entities[j].stats.attack > entities[i].stats.defense + 50 {
        entities[i].energy = 0.0;
        entities[j].energy = (entities[j].energy + 20.0).min(100.0);
        return Some(interaction_event_for_pair(
            &entities[j],
            &entities[i],
            tick,
            InteractionKind::Predation,
            distance,
            before_j_energy,
            before_i_energy,
            before_j_toxin,
            before_i_toxin,
        ));
    }

    None
}

fn interaction_event_for_pair(
    source: &Entity,
    target: &Entity,
    tick: u64,
    kind: InteractionKind,
    distance: f32,
    source_energy_before: f32,
    target_energy_before: f32,
    source_toxin_before: f32,
    target_toxin_before: f32,
) -> InteractionEvent {
    InteractionEvent {
        id: format!(
            "ix-{tick}-{}-{}-{}",
            source.id,
            target.id,
            match kind {
                InteractionKind::MutualAid => "aid",
                InteractionKind::ResourceTransfer => "transfer",
                InteractionKind::Predation => "predation",
            }
        ),
        tick,
        kind,
        source_id: source.id,
        target_id: target.id,
        distance,
        source_energy_delta: source.energy - source_energy_before,
        target_energy_delta: target.energy - target_energy_before,
        source_toxin_delta: source.metabolic_toxin - source_toxin_before,
        target_toxin_delta: target.metabolic_toxin - target_toxin_before,
        source_score: source.score,
        target_score: target.score,
        source_generation: source.generation,
        target_generation: target.generation,
    }
}

pub fn run_cpu_step(entities: &mut [Entity], params: &ComputeStepParams) -> ComputeStepOutcome {
    let start = Instant::now();
    let telemetry = query_gpu_telemetry();
    let adaptive_scale = adaptive_scale_for(&telemetry);
    let effective_cap = effective_entity_cap(params.max_entities, &telemetry, adaptive_scale);
    let movement_step = movement_step_for_env(&params.env_type);
    let entropy_pressure = 0.5 + params.entropy_factor.clamp(0.0, 1.0);

    entities.iter_mut().enumerate().for_each(|(idx, entity)| {
        if entity.stats.efficiency < 0.3 {
            entity.metabolic_toxin += 0.05 * entropy_pressure;
        } else {
            entity.metabolic_toxin -= 0.01 / entropy_pressure.max(0.1);
        }
        entity.metabolic_toxin = entity.metabolic_toxin.clamp(0.0, 1.0);

        entity.energy -= 0.1 + (entity.metabolic_toxin * (0.35 + params.entropy_factor));
        entity.energy += (entity.score / 50.0).min(0.5);

        let noise = hash_noise(params.seed, entity.id, idx as u32);
        entity.position.0 += (noise.0 - 0.5) * movement_step;
        entity.position.1 += (noise.1 - 0.5) * movement_step;
        entity.position.2 += (noise.2 - 0.5) * movement_step;

        if entity.energy <= 0.0 || entity.metabolic_toxin >= 1.0 {
            entity.score = 0.0;
        }
    });

    let mut grid: HashMap<(i32, i32, i32), Vec<usize>> = HashMap::new();
    let grid_size = 2.0;

    for (idx, entity) in entities.iter().enumerate() {
        let cell = (
            (entity.position.0 / grid_size).floor() as i32,
            (entity.position.1 / grid_size).floor() as i32,
            (entity.position.2 / grid_size).floor() as i32,
        );
        grid.entry(cell).or_default().push(idx);
    }

    let offsets = [
        (1, 0, 0),
        (0, 1, 0),
        (0, 0, 1),
        (1, 1, 0),
        (1, -1, 0),
        (1, 0, 1),
        (1, 0, -1),
        (0, 1, 1),
        (0, 1, -1),
        (1, 1, 1),
        (1, 1, -1),
        (1, -1, 1),
        (1, -1, -1),
    ];

    let mut interactions = Vec::new();
    let cells: Vec<_> = grid.keys().cloned().collect();
    for cell in cells {
        if let Some(indices) = grid.get(&cell) {
            for i in 0..indices.len() {
                for j in i + 1..indices.len() {
                    if let Some(event) =
                        process_collision(entities, indices[i], indices[j], params.tick)
                    {
                        interactions.push(event);
                    }
                }
            }

            for &(dx, dy, dz) in &offsets {
                let neighbor_cell = (cell.0 + dx, cell.1 + dy, cell.2 + dz);
                if let Some(neighbor_indices) = grid.get(&neighbor_cell) {
                    for &idx1 in indices {
                        for &idx2 in neighbor_indices {
                            if let Some(event) =
                                process_collision(entities, idx1, idx2, params.tick)
                            {
                                interactions.push(event);
                            }
                        }
                    }
                }
            }
        }
    }

    let selection_scores = entities
        .iter()
        .map(|entity| selection_score(entity, &params.winning_rule))
        .collect();
    let elapsed = start.elapsed().as_secs_f32() * 1000.0;
    let fallback_reason = if params.requested_backend == ComputeBackend::CUDA {
        Some("CUDA feature/runtime unavailable; CPU backend executed this tick".to_string())
    } else if params.requested_backend == ComputeBackend::Auto && !telemetry.cuda_available {
        telemetry.fallback_reason.clone()
    } else {
        None
    };

    ComputeStepOutcome {
        selection_scores,
        status: ComputeStatus {
            requested_backend: params.requested_backend,
            active_backend: ActiveComputeBackend::Cpu.as_label().to_string(),
            cuda_available: telemetry.cuda_available,
            device_name: telemetry.device_name,
            compute_capability: telemetry.compute_capability,
            vram_total: telemetry.vram_total,
            vram_free: telemetry.vram_free,
            gpu_load: telemetry.gpu_load,
            temperature: telemetry.temperature,
            last_kernel_ms: elapsed,
            fallback_reason,
            adaptive_scale,
            effective_entity_cap: effective_cap,
        },
        interactions,
    }
}

fn hash_noise(seed: u32, id: u32, salt: u32) -> (f32, f32, f32) {
    (
        unit_noise(seed ^ id.wrapping_mul(747_796_405) ^ salt),
        unit_noise(seed.wrapping_add(0x9e37_79b9) ^ id.wrapping_mul(289_133_645) ^ salt),
        unit_noise(seed.wrapping_add(0x85eb_ca6b) ^ id.wrapping_mul(1_597_334_677) ^ salt),
    )
}

fn unit_noise(mut value: u32) -> f32 {
    value ^= value >> 16;
    value = value.wrapping_mul(0x7feb_352d);
    value ^= value >> 15;
    value = value.wrapping_mul(0x846c_a68b);
    value ^= value >> 16;
    (value as f32) / (u32::MAX as f32)
}

#[cfg(test)]
pub(crate) mod parity_fixture {
    use super::{run_cpu_step, ComputeBackend, ComputeStepOutcome, ComputeStepParams};
    use crate::evolution::entity::{Entity, Ethics, Stats};

    pub(crate) const CPU_TOLERANCE: f32 = 0.0;
    #[cfg(feature = "cuda")]
    pub(crate) const CUDA_TOLERANCE: f32 = 0.000_5;

    #[derive(Debug, Clone)]
    pub(crate) struct EntityParitySnapshot {
        pub(crate) id: u32,
        pub(crate) energy: f32,
        pub(crate) metabolic_toxin: f32,
        pub(crate) position: (f32, f32, f32),
        pub(crate) score: f32,
        pub(crate) stats_population: u32,
    }

    #[derive(Debug, Clone)]
    pub(crate) struct ComputeParitySnapshot {
        pub(crate) entities: Vec<EntityParitySnapshot>,
        pub(crate) selection_scores: Vec<f32>,
        pub(crate) population: usize,
        pub(crate) avg_score: f32,
        pub(crate) avg_generation: f32,
    }

    pub(crate) fn fixture_params(requested_backend: ComputeBackend) -> ComputeStepParams {
        ComputeStepParams {
            requested_backend,
            entropy_factor: 0.4,
            env_type: "FOREST".to_string(),
            winning_rule: "ENERGY".to_string(),
            max_entities: 64,
            seed: 0x5EED_C0DE,
            tick: 1,
        }
    }

    pub(crate) fn fixture_entities() -> Vec<Entity> {
        vec![
            fixture_entity(FixtureEntity {
                id: 101,
                dna: "(module (func (export \"calculate_fitness\") (result i32) i32.const 17))",
                attack: 44,
                defense: 70,
                population: 12,
                tech_level: 2,
                efficiency: 0.92,
                altruism: 0.22,
                collaboration: 0.35,
                generation: 1,
                score: 18.0,
                position: (-8.0, -1.0, 0.5),
                metabolic_toxin: 0.18,
                energy: 72.0,
                fuel_consumed: 1_200,
                fuel_efficiency: 0.84,
            }),
            fixture_entity(FixtureEntity {
                id: 202,
                dna: "(module (func (export \"calculate_fitness\") (result i32) i32.const 31) (func $pad (result i32) i32.const 0))",
                attack: 95,
                defense: 30,
                population: 9,
                tech_level: 4,
                efficiency: 0.24,
                altruism: 0.61,
                collaboration: 0.48,
                generation: 3,
                score: 41.0,
                position: (-3.0, 2.0, -0.75),
                metabolic_toxin: 0.42,
                energy: 66.0,
                fuel_consumed: 2_900,
                fuel_efficiency: 0.58,
            }),
            fixture_entity(FixtureEntity {
                id: 303,
                dna: "(module (func (export \"calculate_fitness\") (result i32) i32.const 5))",
                attack: 22,
                defense: 140,
                population: 16,
                tech_level: 1,
                efficiency: 0.76,
                altruism: 0.84,
                collaboration: 0.80,
                generation: 5,
                score: 7.5,
                position: (2.5, -4.0, 3.0),
                metabolic_toxin: 0.04,
                energy: 54.0,
                fuel_consumed: 530,
                fuel_efficiency: 0.91,
            }),
            fixture_entity(FixtureEntity {
                id: 404,
                dna: "(module (func (export \"calculate_fitness\") (result i32) i32.const 64) (func $long (result i32) i32.const 1))",
                attack: 130,
                defense: 60,
                population: 7,
                tech_level: 6,
                efficiency: 0.88,
                altruism: 0.18,
                collaboration: 0.27,
                generation: 8,
                score: 64.0,
                position: (7.25, 3.25, -2.5),
                metabolic_toxin: 0.26,
                energy: 88.0,
                fuel_consumed: 4_100,
                fuel_efficiency: 0.67,
            }),
            fixture_entity(FixtureEntity {
                id: 505,
                dna: "(module (func (export \"calculate_fitness\") (result i32) i32.const 23))",
                attack: 55,
                defense: 55,
                population: 21,
                tech_level: 3,
                efficiency: 0.31,
                altruism: 0.72,
                collaboration: 0.74,
                generation: 13,
                score: 23.0,
                position: (12.0, -6.5, 4.25),
                metabolic_toxin: 0.63,
                energy: 49.0,
                fuel_consumed: 1_870,
                fuel_efficiency: 0.49,
            }),
        ]
    }

    pub(crate) fn run_cpu_reference(
        requested_backend: ComputeBackend,
    ) -> (ComputeParitySnapshot, ComputeStepOutcome) {
        let mut entities = fixture_entities();
        let params = fixture_params(requested_backend);
        let outcome = run_cpu_step(&mut entities, &params);
        (snapshot_from(&entities, &outcome), outcome)
    }

    pub(crate) fn snapshot_from(
        entities: &[Entity],
        outcome: &ComputeStepOutcome,
    ) -> ComputeParitySnapshot {
        let population = entities.len();
        let avg_score = average(entities.iter().map(|entity| entity.score));
        let avg_generation = average(entities.iter().map(|entity| entity.generation as f32));

        ComputeParitySnapshot {
            entities: entities
                .iter()
                .map(|entity| EntityParitySnapshot {
                    id: entity.id,
                    energy: entity.energy,
                    metabolic_toxin: entity.metabolic_toxin,
                    position: entity.position,
                    score: entity.score,
                    stats_population: entity.stats.population,
                })
                .collect(),
            selection_scores: outcome.selection_scores.clone(),
            population,
            avg_score,
            avg_generation,
        }
    }

    pub(crate) fn assert_snapshot_close(
        actual: &ComputeParitySnapshot,
        expected: &ComputeParitySnapshot,
        tolerance: f32,
    ) {
        assert_eq!(actual.population, expected.population);
        assert_close("avg_score", actual.avg_score, expected.avg_score, tolerance);
        assert_close(
            "avg_generation",
            actual.avg_generation,
            expected.avg_generation,
            tolerance,
        );
        assert_eq!(
            actual.selection_scores.len(),
            expected.selection_scores.len(),
            "selection score length mismatch",
        );
        for (idx, (actual_score, expected_score)) in actual
            .selection_scores
            .iter()
            .zip(expected.selection_scores.iter())
            .enumerate()
        {
            assert_close(
                &format!("selection_scores[{idx}]"),
                *actual_score,
                *expected_score,
                tolerance,
            );
        }
        assert_eq!(
            actual.entities.len(),
            expected.entities.len(),
            "entity snapshot length mismatch",
        );
        for (idx, (actual_entity, expected_entity)) in actual
            .entities
            .iter()
            .zip(expected.entities.iter())
            .enumerate()
        {
            assert_eq!(actual_entity.id, expected_entity.id);
            assert_eq!(
                actual_entity.stats_population, expected_entity.stats_population,
                "entity[{idx}] stats.population mismatch",
            );
            assert_close(
                &format!("entity[{idx}].energy"),
                actual_entity.energy,
                expected_entity.energy,
                tolerance,
            );
            assert_close(
                &format!("entity[{idx}].metabolic_toxin"),
                actual_entity.metabolic_toxin,
                expected_entity.metabolic_toxin,
                tolerance,
            );
            assert_close(
                &format!("entity[{idx}].position.0"),
                actual_entity.position.0,
                expected_entity.position.0,
                tolerance,
            );
            assert_close(
                &format!("entity[{idx}].position.1"),
                actual_entity.position.1,
                expected_entity.position.1,
                tolerance,
            );
            assert_close(
                &format!("entity[{idx}].position.2"),
                actual_entity.position.2,
                expected_entity.position.2,
                tolerance,
            );
            assert_close(
                &format!("entity[{idx}].score"),
                actual_entity.score,
                expected_entity.score,
                tolerance,
            );
        }
    }

    fn average(values: impl Iterator<Item = f32>) -> f32 {
        let (sum, count) = values.fold((0.0, 0usize), |(sum, count), value| {
            (sum + value, count + 1)
        });
        if count == 0 {
            0.0
        } else {
            sum / count as f32
        }
    }

    fn assert_close(label: &str, actual: f32, expected: f32, tolerance: f32) {
        assert!(
            (actual - expected).abs() <= tolerance,
            "{label}: actual {actual} expected {expected} tolerance {tolerance}",
        );
    }

    struct FixtureEntity {
        id: u32,
        dna: &'static str,
        attack: u32,
        defense: u32,
        population: u32,
        tech_level: u32,
        efficiency: f32,
        altruism: f32,
        collaboration: f32,
        generation: u32,
        score: f32,
        position: (f32, f32, f32),
        metabolic_toxin: f32,
        energy: f32,
        fuel_consumed: u64,
        fuel_efficiency: f32,
    }

    fn fixture_entity(fixture: FixtureEntity) -> Entity {
        Entity {
            id: fixture.id,
            parent_id: None,
            dna: fixture.dna.to_string(),
            stats: Stats {
                attack: fixture.attack,
                defense: fixture.defense,
                population: fixture.population,
                tech_level: fixture.tech_level,
                efficiency: fixture.efficiency,
            },
            ethics: Ethics {
                altruism: fixture.altruism,
                collaboration: fixture.collaboration,
            },
            generation: fixture.generation,
            score: fixture.score,
            position: fixture.position,
            metabolic_toxin: fixture.metabolic_toxin,
            energy: fixture.energy,
            fuel_consumed: fixture.fuel_consumed,
            fuel_efficiency: fixture.fuel_efficiency,
            last_memory_snapshot: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::parity_fixture::{
        assert_snapshot_close, fixture_entities, fixture_params, run_cpu_reference, snapshot_from,
        CPU_TOLERANCE,
    };
    use super::{
        run_cpu_step, selection_score, ComputeBackend, ComputeStepParams, InteractionKind,
    };
    use crate::evolution::entity::{Entity, Ethics, Stats};

    const CONTRACT_TOLERANCE: f32 = 0.000_01;

    #[test]
    fn cpu_parity_fixture_is_deterministic() {
        let (first_snapshot, first_outcome) = run_cpu_reference(ComputeBackend::CPU);
        let (second_snapshot, second_outcome) = run_cpu_reference(ComputeBackend::CPU);

        assert_eq!(first_outcome.status.active_backend, "CPU");
        assert_eq!(second_outcome.status.active_backend, "CPU");
        assert_snapshot_close(&first_snapshot, &second_snapshot, CPU_TOLERANCE);
    }

    #[test]
    fn cpu_parity_fixture_fields_stay_in_expected_ranges() {
        let (snapshot, outcome) = run_cpu_reference(ComputeBackend::CPU);

        assert_eq!(snapshot.population, 5);
        assert_eq!(snapshot.selection_scores.len(), snapshot.population);
        assert!((0.0..=100.0).contains(&snapshot.avg_score));
        assert!((1.0..=20.0).contains(&snapshot.avg_generation));
        assert_eq!(outcome.status.requested_backend, ComputeBackend::CPU);
        assert_eq!(outcome.status.active_backend, "CPU");

        for entity in &snapshot.entities {
            assert!(entity.id > 0);
            assert!((0.0..=100.0).contains(&entity.energy));
            assert!((0.0..=1.0).contains(&entity.metabolic_toxin));
            assert!((0.0..=100.0).contains(&entity.score));
            assert!(entity.stats_population > 0);
            assert!(entity.position.0.is_finite());
            assert!(entity.position.1.is_finite());
            assert!(entity.position.2.is_finite());
            assert!(entity.position.0.abs() <= 20.0);
            assert!(entity.position.1.abs() <= 20.0);
            assert!(entity.position.2.abs() <= 20.0);
        }
    }

    #[cfg(feature = "cuda")]
    #[test]
    fn cuda_backend_matches_cpu_reference_fixture() {
        let (cpu_snapshot, _) = run_cpu_reference(ComputeBackend::CUDA);
        let mut cuda_entities = fixture_entities();
        let params = fixture_params(ComputeBackend::CUDA);
        let cuda_outcome = match crate::evolution::gpu::run_cuda_step(&mut cuda_entities, &params) {
            Ok(outcome) => outcome,
            Err(reason) => {
                eprintln!("CUDA parity test skipped because backend is unavailable: {reason}");
                return;
            }
        };
        let cuda_snapshot = snapshot_from(&cuda_entities, &cuda_outcome);

        assert_eq!(cuda_outcome.status.active_backend, "CUDA");
        assert_snapshot_close(
            &cuda_snapshot,
            &cpu_snapshot,
            super::parity_fixture::CUDA_TOLERANCE,
        );
    }

    #[test]
    fn cpu_reference_matches_direct_fixture_execution() {
        let mut entities = fixture_entities();
        let params = fixture_params(ComputeBackend::CPU);
        let direct_outcome = run_cpu_step(&mut entities, &params);
        let direct_snapshot = snapshot_from(&entities, &direct_outcome);
        let (reference_snapshot, _) = run_cpu_reference(ComputeBackend::CPU);

        assert_snapshot_close(&direct_snapshot, &reference_snapshot, CPU_TOLERANCE);
    }

    #[test]
    fn cpu_contract_fixture_covers_collision_and_interaction_rules() {
        let params = cpu_contract_params();
        let mut entities = cpu_contract_entities();
        let expected_pre_collision: Vec<_> = entities
            .iter()
            .map(|entity| expected_after_metabolism(entity, &params))
            .collect();

        let outcome = run_cpu_step(&mut entities, &params);

        assert_eq!(outcome.status.requested_backend, ComputeBackend::CPU);
        assert_eq!(outcome.status.active_backend, "CPU");
        assert_eq!(outcome.selection_scores.len(), entities.len());
        assert_eq!(outcome.interactions.len(), 2);

        let helpers_shared_energy =
            (expected_pre_collision[0].energy + expected_pre_collision[1].energy) / 2.0;
        assert_close(
            "helpers share donor energy",
            entities[0].energy,
            helpers_shared_energy,
        );
        assert_close(
            "helpers share receiver energy",
            entities[1].energy,
            helpers_shared_energy,
        );
        assert!(distance_sq(entities[0].position, entities[1].position) < 0.25);
        let aid_event = outcome
            .interactions
            .iter()
            .find(|event| event.source_id == 1_001 && event.target_id == 1_002)
            .expect("cooperative pair should emit an interaction event");
        assert_eq!(aid_event.kind, InteractionKind::ResourceTransfer);
        assert_eq!(aid_event.tick, params.tick);
        assert!(aid_event.source_energy_delta < 0.0);
        assert!(aid_event.target_energy_delta > 0.0);

        assert_close(
            "predator gains capped hunt energy",
            entities[2].energy,
            (expected_pre_collision[2].energy + 20.0).min(100.0),
        );
        assert_close("prey is depleted by predation", entities[3].energy, 0.0);
        assert_close(
            "predation does not rewrite wasm score",
            entities[3].score,
            expected_pre_collision[3].score,
        );
        assert!(distance_sq(entities[2].position, entities[3].position) < 0.25);
        let predation_event = outcome
            .interactions
            .iter()
            .find(|event| event.source_id == 2_001 && event.target_id == 2_002)
            .expect("predation pair should emit an interaction event");
        assert_eq!(predation_event.kind, InteractionKind::Predation);
        assert_eq!(predation_event.tick, params.tick);
        assert!(predation_event.source_energy_delta > 0.0);
        assert!(predation_event.target_energy_delta < 0.0);

        assert_close(
            "distant attacker keeps metabolic energy",
            entities[4].energy,
            expected_pre_collision[4].energy,
        );
        assert_close(
            "distant target keeps metabolic energy",
            entities[5].energy,
            expected_pre_collision[5].energy,
        );
        assert!(distance_sq(entities[4].position, entities[5].position) >= 0.25);

        assert_close(
            "toxin clamps at saturation",
            entities[6].metabolic_toxin,
            1.0,
        );
        assert_close("toxin saturation zeroes score", entities[6].score, 0.0);
        assert!(entities[6].energy.is_finite());

        for (idx, entity) in entities.iter().enumerate() {
            assert_close(
                &format!("entity[{idx}].metabolic_toxin"),
                entity.metabolic_toxin,
                expected_pre_collision[idx].toxin,
            );
            assert!(
                entity.energy.is_finite() && entity.energy <= 100.0,
                "entity[{idx}] energy invariant failed: {}",
                entity.energy
            );
            assert!(
                (0.0..=1.0).contains(&entity.metabolic_toxin),
                "entity[{idx}] toxin invariant failed: {}",
                entity.metabolic_toxin
            );
            assert!(
                entity.score.is_finite() && (0.0..=100.0).contains(&entity.score),
                "entity[{idx}] score invariant failed: {}",
                entity.score
            );
            assert_close(
                &format!("selection_scores[{idx}]"),
                outcome.selection_scores[idx],
                selection_score(entity, &params.winning_rule),
            );
            assert!(
                outcome.selection_scores[idx].is_finite(),
                "entity[{idx}] selection score must be finite",
            );
        }
    }

    #[derive(Debug, Clone, Copy)]
    struct MetabolicExpectation {
        energy: f32,
        toxin: f32,
        score: f32,
    }

    struct ContractEntity {
        id: u32,
        attack: u32,
        defense: u32,
        efficiency: f32,
        altruism: f32,
        collaboration: f32,
        score: f32,
        energy: f32,
        metabolic_toxin: f32,
        position: (f32, f32, f32),
    }

    fn cpu_contract_params() -> ComputeStepParams {
        ComputeStepParams {
            requested_backend: ComputeBackend::CPU,
            entropy_factor: 0.4,
            env_type: "DEEP_SEA".to_string(),
            winning_rule: "ENERGY".to_string(),
            max_entities: 16,
            seed: 0xC011_1510,
            tick: 77,
        }
    }

    fn cpu_contract_entities() -> Vec<Entity> {
        vec![
            contract_entity(ContractEntity {
                id: 1_001,
                attack: 20,
                defense: 80,
                efficiency: 0.90,
                altruism: 0.92,
                collaboration: 0.90,
                score: 10.0,
                energy: 90.0,
                metabolic_toxin: 0.20,
                position: (0.0, 0.0, 0.0),
            }),
            contract_entity(ContractEntity {
                id: 1_002,
                attack: 24,
                defense: 82,
                efficiency: 0.82,
                altruism: 0.88,
                collaboration: 0.86,
                score: 20.0,
                energy: 30.0,
                metabolic_toxin: 0.10,
                position: (0.04, 0.0, 0.0),
            }),
            contract_entity(ContractEntity {
                id: 2_001,
                attack: 125,
                defense: 65,
                efficiency: 0.86,
                altruism: 0.15,
                collaboration: 0.20,
                score: 40.0,
                energy: 70.0,
                metabolic_toxin: 0.20,
                position: (10.0, 0.0, 0.0),
            }),
            contract_entity(ContractEntity {
                id: 2_002,
                attack: 18,
                defense: 60,
                efficiency: 0.76,
                altruism: 0.18,
                collaboration: 0.22,
                score: 32.0,
                energy: 55.0,
                metabolic_toxin: 0.12,
                position: (10.04, 0.0, 0.0),
            }),
            contract_entity(ContractEntity {
                id: 3_001,
                attack: 130,
                defense: 70,
                efficiency: 0.94,
                altruism: 0.10,
                collaboration: 0.10,
                score: 36.0,
                energy: 64.0,
                metabolic_toxin: 0.18,
                position: (20.0, 0.0, 0.0),
            }),
            contract_entity(ContractEntity {
                id: 3_002,
                attack: 12,
                defense: 40,
                efficiency: 0.88,
                altruism: 0.12,
                collaboration: 0.10,
                score: 28.0,
                energy: 48.0,
                metabolic_toxin: 0.16,
                position: (21.25, 0.0, 0.0),
            }),
            contract_entity(ContractEntity {
                id: 4_001,
                attack: 42,
                defense: 42,
                efficiency: 0.12,
                altruism: 0.50,
                collaboration: 0.50,
                score: 77.0,
                energy: 90.0,
                metabolic_toxin: 0.98,
                position: (30.0, 0.0, 0.0),
            }),
        ]
    }

    fn expected_after_metabolism(
        entity: &Entity,
        params: &ComputeStepParams,
    ) -> MetabolicExpectation {
        let entropy_pressure = 0.5 + params.entropy_factor.clamp(0.0, 1.0);
        let mut toxin = entity.metabolic_toxin;
        if entity.stats.efficiency < 0.3 {
            toxin += 0.05 * entropy_pressure;
        } else {
            toxin -= 0.01 / entropy_pressure.max(0.1);
        }
        toxin = toxin.clamp(0.0, 1.0);

        let mut energy = entity.energy;
        energy -= 0.1 + (toxin * (0.35 + params.entropy_factor));
        energy += (entity.score / 50.0).min(0.5);

        let mut score = entity.score;
        if energy <= 0.0 || toxin >= 1.0 {
            score = 0.0;
        }

        MetabolicExpectation {
            energy,
            toxin,
            score,
        }
    }

    fn contract_entity(fixture: ContractEntity) -> Entity {
        Entity {
            id: fixture.id,
            parent_id: None,
            dna: "(module (func (export \"calculate_fitness\") (result i32) i32.const 1))"
                .to_string(),
            stats: Stats {
                attack: fixture.attack,
                defense: fixture.defense,
                population: 1,
                tech_level: 1,
                efficiency: fixture.efficiency,
            },
            ethics: Ethics {
                altruism: fixture.altruism,
                collaboration: fixture.collaboration,
            },
            generation: 1,
            score: fixture.score,
            position: fixture.position,
            metabolic_toxin: fixture.metabolic_toxin,
            energy: fixture.energy,
            fuel_consumed: 0,
            fuel_efficiency: 1.0,
            last_memory_snapshot: Vec::new(),
        }
    }

    fn distance_sq(a: (f32, f32, f32), b: (f32, f32, f32)) -> f32 {
        let dx = a.0 - b.0;
        let dy = a.1 - b.1;
        let dz = a.2 - b.2;
        dx * dx + dy * dy + dz * dz
    }

    fn assert_close(label: &str, actual: f32, expected: f32) {
        assert!(
            (actual - expected).abs() <= CONTRACT_TOLERANCE,
            "{label}: actual {actual} expected {expected}",
        );
    }
}
