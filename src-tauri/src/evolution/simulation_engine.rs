use crate::evolution::{
    benchmark::{baseline_dna_for_task, BenchmarkTaskId},
    compute::{self, ComputeBackend, ComputeStepParams},
    dna_splicer::DnaSplicer,
    entity::Entity,
    gpu,
    wasm_runtime::WasmEngine,
};
use crate::runtime_files::write_run_log;
use crate::state::{lock_app_state, AppState, LineageRecord};
use dashmap::DashSet;
use rayon::prelude::*;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;

const TASK_SCORE_EPSILON: f32 = 0.000_1;
const RECENT_INTERACTION_LIMIT: usize = 96;

struct MutationInFlightGuard {
    targets: Arc<DashSet<u32>>,
    target_id: u32,
}

struct MutationResult {
    target_id: u32,
    new_dna: String,
    parent: Entity,
}

fn child_generation_from(parent: &Entity) -> u32 {
    parent.generation.saturating_add(1)
}

fn should_attempt_cuda(compute_backend: ComputeBackend) -> bool {
    compute_backend == ComputeBackend::CUDA
}

fn mark_auto_cpu_until_cuda_parity(
    mut outcome: compute::ComputeStepOutcome,
) -> compute::ComputeStepOutcome {
    if outcome.status.fallback_reason.is_none() {
        outcome.status.fallback_reason = Some(
            "Auto 使用 CPU：CUDA 交互 parity 未完成，需手动选择 CUDA 才进入实验模式".to_string(),
        );
    }
    outcome
}

impl Drop for MutationInFlightGuard {
    fn drop(&mut self) {
        self.targets.remove(&self.target_id);
    }
}

fn should_continue(state: &AppState, run_epoch: u64) -> bool {
    let Ok(is_running) = lock_app_state(&state.is_running, "is_running") else {
        write_run_log(
            "Simulation",
            "Stopping loop because is_running lock is poisoned",
        );
        return false;
    };
    let Ok(current_epoch) = lock_app_state(&state.run_epoch, "run_epoch") else {
        write_run_log(
            "Simulation",
            "Stopping loop because run_epoch lock is poisoned",
        );
        return false;
    };
    *is_running && *current_epoch == run_epoch
}

fn compiled_dna_bytes(dna: &str) -> Option<Vec<u8>> {
    wat::parse_str(dna).ok()
}

fn has_executable_dna_change(parent_dna: &str, child_dna: &str) -> bool {
    match (
        compiled_dna_bytes(parent_dna),
        compiled_dna_bytes(child_dna),
    ) {
        (Some(parent), Some(child)) => parent != child,
        _ => parent_dna.trim() != child_dna.trim(),
    }
}

fn mutation_passes_semantic_admission(
    wasm_engine: &WasmEngine,
    task_id: BenchmarkTaskId,
    parent_dna: &str,
    child_dna: &str,
) -> bool {
    if !has_executable_dna_change(parent_dna, child_dna) {
        return false;
    }

    if task_id == BenchmarkTaskId::Freeform {
        return wasm_engine.validate_and_test_for_task(child_dna, task_id);
    }

    let child_score = wasm_engine.score_dna_for_task(child_dna, task_id);
    if child_score.final_score <= 0.0 {
        return false;
    }

    let parent_score = wasm_engine.score_dna_for_task(parent_dna, task_id);
    child_score.final_score + TASK_SCORE_EPSILON >= parent_score.final_score
}

pub async fn run(state: Arc<AppState>, run_epoch: u64) {
    write_run_log("Simulation", "Core simulation loop initialized and running");
    let (tx, mut rx) = mpsc::channel::<MutationResult>(100);
    let in_flight_mutations = Arc::new(DashSet::<u32>::new());
    let mut tick: u64 = 0;

    loop {
        if !should_continue(&state, run_epoch) {
            break;
        }

        let (
            throttle_ms,
            task_id,
            mutation_rate,
            entropy_factor,
            winning_rule,
            env_type,
            max_entities,
            compute_backend,
        ) = {
            let Ok(config) = lock_app_state(&state.env_config, "env_config") else {
                write_run_log(
                    "Simulation",
                    "Stopping loop because env_config lock is poisoned",
                );
                break;
            };
            (
                config.evolution_throttle,
                config.task_id,
                config.mutation_rate.clamp(0.001, 1.0),
                config.entropy_factor.clamp(0.0, 1.0),
                config.winning_rule.clone(),
                config.env_type.clone(),
                config.max_entities,
                config.compute_backend,
            )
        };
        let predation_bias = if winning_rule == "PREDATION" {
            1.25
        } else {
            1.0
        };
        let mutation_in_flight_limit = lock_app_state(&state.mutation_engine, "mutation_engine")
            .map(|engine| engine.in_flight_limit())
            .unwrap_or(1);

        if !should_continue(&state, run_epoch) {
            break;
        }

        let mut updates = Vec::new();
        while let Ok(update) = rx.try_recv() {
            updates.push(update);
        }

        if !should_continue(&state, run_epoch) {
            break;
        }

        if !updates.is_empty() {
            let Ok(mut entities) = lock_app_state(&state.entities, "entities") else {
                write_run_log(
                    "Simulation",
                    "Skipping DNA updates because entities lock is poisoned",
                );
                break;
            };
            let Ok(mut history) = lock_app_state(&state.lineage_history, "lineage_history") else {
                write_run_log(
                    "Simulation",
                    "Skipping DNA updates because lineage lock is poisoned",
                );
                break;
            };
            let mut fame_candidates = Vec::new();
            for update in updates {
                if let Some(entity) = entities.iter_mut().find(|e| e.id == update.target_id) {
                    if !state.crash_registry.is_blacklisted(&update.new_dna) {
                        let child_generation = child_generation_from(&update.parent);
                        entity.parent_id = Some(update.parent.id);
                        entity.dna = update.new_dna.clone();
                        entity.generation = child_generation;
                        entity.energy = 100.0;
                        entity.metabolic_toxin = 0.0;
                        entity.refresh_strategy_from_dna();

                        history.push(LineageRecord {
                            id: update.target_id,
                            parent_id: Some(update.parent.id),
                            generation: child_generation,
                            score: update.parent.score,
                            dna_preview: update.new_dna.chars().take(50).collect(),
                        });
                        if update.parent.score > 90.0 {
                            fame_candidates.push(update.parent);
                        }
                    }
                }
            }
            if history.len() > 1000 {
                let overflow = history.len() - 1000;
                history.drain(0..overflow);
            }
            drop(history);
            drop(entities);

            if !fame_candidates.is_empty() {
                let Ok(mut fame) = lock_app_state(&state.hall_of_fame, "hall_of_fame") else {
                    write_run_log(
                        "Simulation",
                        "Skipping hall of fame write because fame lock is poisoned",
                    );
                    break;
                };
                for parent in fame_candidates {
                    if !fame.iter().any(|e| e.id == parent.id) {
                        fame.push(parent);
                    }
                }
                if fame.len() > 10 {
                    fame.sort_by(|a, b| {
                        b.score
                            .partial_cmp(&a.score)
                            .unwrap_or(std::cmp::Ordering::Equal)
                    });
                    fame.truncate(10);
                }
            }
        }

        if !should_continue(&state, run_epoch) {
            break;
        }

        let sleep_ms;
        {
            let Ok(mut entities) = lock_app_state(&state.entities, "entities") else {
                write_run_log(
                    "Simulation",
                    "Stopping loop because entities lock is poisoned",
                );
                break;
            };
            let wasm_engine = &state.wasm_engine;

            let (total_energy, _max_gen) = entities.iter().fold((0.0, 0), |(e, g), ent| {
                (e + ent.energy, g.max(ent.generation))
            });
            let avg_energy = if entities.is_empty() {
                0.0
            } else {
                total_energy / entities.len() as f32
            };

            let entity_cap = lock_app_state(&state.compute_status, "compute_status")
                .map(|status| {
                    if status.effective_entity_cap > 0 {
                        status.effective_entity_cap
                    } else {
                        max_entities
                    }
                })
                .unwrap_or(max_entities);
            let predator_threshold = 85.0 - entropy_factor * 30.0;
            if avg_energy > predator_threshold && entities.len() < entity_cap {
                let mut predator = Entity::new(
                    rand::random::<u32>(),
                    baseline_dna_for_task(task_id).to_string(),
                );
                predator.stats.attack = 120;
                predator.ethics.altruism = 0.0;
                entities.push(predator);
            }

            entities.par_iter_mut().for_each(|entity| {
                match wasm_engine.execute_entity_for_task(entity, task_id) {
                    Ok(score) => {
                        entity.score = score;
                    }
                    Err(_) => {
                        entity.score = 0.0;
                        entity.energy -= 10.0;
                    }
                }
            });

            let compute_params = ComputeStepParams {
                requested_backend: compute_backend,
                entropy_factor,
                env_type: env_type.clone(),
                winning_rule: winning_rule.clone(),
                max_entities,
                seed: rand::random::<u32>(),
                tick,
            };
            tick = tick.wrapping_add(1);
            let compute_start = Instant::now();
            let outcome = if should_attempt_cuda(compute_backend) {
                match gpu::run_cuda_step(&mut entities, &compute_params) {
                    Ok(outcome) => outcome,
                    Err(reason) => {
                        let mut outcome = compute::run_cpu_step(&mut entities, &compute_params);
                        outcome.status = gpu::fallback_status(
                            &compute_params,
                            reason,
                            compute_start.elapsed().as_secs_f32() * 1000.0,
                        );
                        outcome
                    }
                }
            } else if compute_backend == ComputeBackend::Auto {
                mark_auto_cpu_until_cuda_parity(compute::run_cpu_step(
                    &mut entities,
                    &compute_params,
                ))
            } else {
                compute::run_cpu_step(&mut entities, &compute_params)
            };

            sleep_ms =
                compute::throttle_with_adaptive_scale(throttle_ms, outcome.status.adaptive_scale);
            if let Ok(mut status) = lock_app_state(&state.compute_status, "compute_status") {
                *status = outcome.status.clone();
            } else {
                write_run_log(
                    "Compute",
                    "Skipping compute status write because compute_status lock is poisoned",
                );
            }

            if !outcome.interactions.is_empty() {
                if let Ok(mut recent_interactions) =
                    lock_app_state(&state.recent_interactions, "recent_interactions")
                {
                    recent_interactions.extend(outcome.interactions.iter().cloned());
                    if recent_interactions.len() > RECENT_INTERACTION_LIMIT {
                        let overflow = recent_interactions.len() - RECENT_INTERACTION_LIMIT;
                        recent_interactions.drain(0..overflow);
                    }
                } else {
                    write_run_log(
                        "Compute",
                        "Skipping interaction event write because recent_interactions lock is poisoned",
                    );
                }
            }

            let selection_scores = if outcome.selection_scores.len() == entities.len() {
                outcome.selection_scores
            } else {
                entities
                    .iter()
                    .map(|entity| compute::selection_score(entity, &winning_rule))
                    .collect()
            };

            if outcome.status.active_backend == "CUDA" {
                write_run_log(
                    "Compute",
                    &format!(
                        "CUDA tick completed in {:.3}ms; adaptive scale {:.2}; cap {}",
                        outcome.status.last_kernel_ms,
                        outcome.status.adaptive_scale,
                        outcome.status.effective_entity_cap
                    ),
                );
            } else if let Some(reason) = &outcome.status.fallback_reason {
                if compute_backend == ComputeBackend::CUDA {
                    write_run_log("Compute", &format!("CUDA fallback to CPU: {reason}"));
                }
            }

            let count = entities.len();
            if count > 10 {
                let mut sorted_indices: Vec<usize> = (0..count).collect();
                sorted_indices.sort_by(|&a, &b| {
                    selection_scores[b]
                        .partial_cmp(&selection_scores[a])
                        .unwrap_or(std::cmp::Ordering::Equal)
                });

                let elite_count =
                    ((count as f32 * mutation_rate.min(0.25) * predation_bias).round() as usize)
                        .clamp(1, count / 2);
                let bottom_indices: Vec<u32> = sorted_indices[count - elite_count..]
                    .iter()
                    .map(|&i| entities[i].id)
                    .collect();
                let top_entities: Vec<Entity> = sorted_indices[..elite_count]
                    .iter()
                    .map(|&i| entities[i].clone())
                    .collect();
                let available_mutation_slots =
                    mutation_in_flight_limit.saturating_sub(in_flight_mutations.len());
                let mut spawned_mutations = 0usize;

                for i in 0..elite_count {
                    if spawned_mutations >= available_mutation_slots {
                        break;
                    }
                    let parent = top_entities[i].clone();
                    let target_id = bottom_indices[i];
                    if !in_flight_mutations.insert(target_id) {
                        continue;
                    }
                    spawned_mutations += 1;
                    let tx_clone = tx.clone();
                    let state_clone = state.clone();
                    let in_flight_mutations_clone = in_flight_mutations.clone();
                    let task_id_for_validation = task_id;
                    let run_epoch_for_validation = run_epoch;

                    tokio::spawn(async move {
                        let _in_flight_guard = MutationInFlightGuard {
                            targets: in_flight_mutations_clone,
                            target_id,
                        };
                        let engine = {
                            let Ok(guard) =
                                lock_app_state(&state_clone.mutation_engine, "mutation_engine")
                            else {
                                write_run_log(
                                    "Mutation",
                                    "Skipping mutation because mutation_engine lock is poisoned",
                                );
                                return;
                            };
                            guard.clone()
                        };

                        let mut new_dna = engine
                            .mutate_for_task(&parent, task_id_for_validation)
                            .await;

                        if !should_continue(&state_clone, run_epoch_for_validation) {
                            return;
                        }

                        let wasm_engine = state_clone.wasm_engine.clone();
                        let is_valid = !state_clone.crash_registry.is_blacklisted(&new_dna)
                            && wasm_engine
                                .validate_and_test_for_task(&new_dna, task_id_for_validation);

                        if !is_valid {
                            state_clone.crash_registry.report_crash(&new_dna);

                            new_dna = match lock_app_state(&state_clone.entities, "entities") {
                                Ok(entities) if entities.len() > 2 => {
                                    let other_parent =
                                        &entities[rand::random_range(0..entities.len())];
                                    DnaSplicer::splice_for_task(
                                        &parent.dna,
                                        &other_parent.dna,
                                        task_id_for_validation,
                                    )
                                }
                                Ok(_) => parent.dna.clone(),
                                Err(_) => {
                                    write_run_log(
                                        "Mutation",
                                        "Falling back to parent DNA because entities lock is poisoned",
                                    );
                                    parent.dna.clone()
                                }
                            };

                            if !state_clone.crash_registry.is_blacklisted(&new_dna)
                                && !wasm_engine
                                    .validate_and_test_for_task(&new_dna, task_id_for_validation)
                            {
                                state_clone.crash_registry.report_crash(&new_dna);
                                new_dna = parent.dna.clone();
                            }
                        }

                        if !should_continue(&state_clone, run_epoch_for_validation) {
                            return;
                        }
                        if !mutation_passes_semantic_admission(
                            wasm_engine.as_ref(),
                            task_id_for_validation,
                            &parent.dna,
                            &new_dna,
                        ) {
                            return;
                        }

                        let _ = tx_clone
                            .send(MutationResult {
                                target_id,
                                new_dna,
                                parent,
                            })
                            .await;
                    });
                }
            }
        }

        tokio::time::sleep(Duration::from_millis(sleep_ms)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::{
        child_generation_from, has_executable_dna_change, mark_auto_cpu_until_cuda_parity,
        mutation_passes_semantic_admission, should_attempt_cuda,
    };
    use crate::evolution::benchmark::{baseline_dna_for_task, BenchmarkTaskId};
    use crate::evolution::compute::{ComputeBackend, ComputeStatus, ComputeStepOutcome};
    use crate::evolution::entity::Entity;
    use crate::evolution::wasm_runtime::WasmEngine;

    fn append_unused_helper(dna: &str) -> String {
        let trimmed = dna.trim_end();
        let module_end = trimmed.rfind(')').expect("test dna should be a module");
        format!(
            "{}\n  (func $unused_semantic_noise (result i32)\n    i32.const 7\n  )\n{}",
            &trimmed[..module_end],
            &trimmed[module_end..],
        )
    }

    #[test]
    fn executable_dna_change_rejects_comment_only_mutation() {
        let parent = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 10
  )
)"#;
        let child = format!("{}\n;; vgene-local-variant:1:1:1", parent);

        assert!(
            !has_executable_dna_change(parent, &child),
            "comment-only WAT changes must not enter lineage as real evolution",
        );
    }

    #[test]
    fn executable_dna_change_accepts_compiled_variant() {
        let parent = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 10
  )
)"#;
        let child = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 10
  )
  (func $vgene_local_variant_test (result i32)
    i32.const 1
  )
)"#;

        assert!(
            has_executable_dna_change(parent, child),
            "compiled helper variants should count as executable DNA changes",
        );
    }

    #[test]
    fn task_admission_rejects_unused_helper_variant() {
        let engine = WasmEngine::new().unwrap();
        let parent = baseline_dna_for_task(BenchmarkTaskId::SortI32);
        let child = append_unused_helper(parent);

        assert!(
            has_executable_dna_change(parent, &child),
            "helper-only child should still differ at compiled wasm level",
        );
        assert!(
            !mutation_passes_semantic_admission(&engine, BenchmarkTaskId::SortI32, parent, &child,),
            "task admission must reject larger behavior-equivalent helper-only DNA",
        );
    }

    #[test]
    fn task_admission_accepts_child_not_worse_than_parent() {
        let engine = WasmEngine::new().unwrap();
        let weak_parent = r#"(module
  (memory (export "memory") 1)
  (func (export "calculate_fitness") (result i32)
    i32.const 1
  )
  (func (export "sort_i32") (param $ptr i32) (param $len i32) (result i32)
    i32.const 1
  )
)"#;
        let child = baseline_dna_for_task(BenchmarkTaskId::SortI32);

        assert!(
            mutation_passes_semantic_admission(
                &engine,
                BenchmarkTaskId::SortI32,
                weak_parent,
                child,
            ),
            "baseline child should be admitted over a weaker task parent",
        );
    }

    #[test]
    fn freeform_admission_requires_valid_executable_change() {
        let engine = WasmEngine::new().unwrap();
        let parent = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 10
  )
)"#;
        let comment_only_child = format!("{}\n;; no compiled change", parent);
        let executable_child = r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 11
  )
)"#;

        assert!(!mutation_passes_semantic_admission(
            &engine,
            BenchmarkTaskId::Freeform,
            parent,
            &comment_only_child,
        ));
        assert!(mutation_passes_semantic_admission(
            &engine,
            BenchmarkTaskId::Freeform,
            parent,
            executable_child,
        ));
    }

    #[test]
    fn mutation_child_generation_follows_parent_generation() {
        let mut parent = Entity::new(
            9,
            r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 10
  )
)"#
            .to_string(),
        );
        parent.generation = 10;

        assert_eq!(child_generation_from(&parent), 11);
    }

    #[test]
    fn auto_backend_does_not_attempt_cuda_until_parity_is_verified() {
        assert!(!should_attempt_cuda(ComputeBackend::Auto));
        assert!(!should_attempt_cuda(ComputeBackend::CPU));
        assert!(should_attempt_cuda(ComputeBackend::CUDA));
    }

    #[test]
    fn auto_backend_status_explains_cpu_parity_gate() {
        let outcome = ComputeStepOutcome {
            selection_scores: Vec::new(),
            status: ComputeStatus {
                requested_backend: ComputeBackend::Auto,
                active_backend: "CPU".to_string(),
                fallback_reason: None,
                ..ComputeStatus::default()
            },
            interactions: Vec::new(),
        };

        let marked = mark_auto_cpu_until_cuda_parity(outcome);

        assert_eq!(marked.status.active_backend, "CPU");
        assert!(marked
            .status
            .fallback_reason
            .as_deref()
            .unwrap_or_default()
            .contains("CUDA 交互 parity"),);
    }
}
