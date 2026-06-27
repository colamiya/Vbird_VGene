use crate::evolution::{
    compute::InteractionEvent,
    entity::{Entity, Ethics},
};
use crate::runtime_files::write_run_log;
use crate::state::{lock_app_state, AppState, LineageRecord};
use serde::Serialize;
use std::sync::Arc;
use tauri::State;

const WORLD_ENTITY_RECORD_BYTES: usize = 40;
const WORLD_STATS_RECORD_BYTES: usize = 12;

#[derive(Serialize)]
pub struct EntityView {
    id: u32,
    position: (f32, f32, f32),
    ethics: Ethics,
    score: f32,
    energy: f32,
    metabolic_toxin: f32,
    generation: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InterventionOutcome {
    kind: String,
    affected: usize,
    affected_entity_ids: Vec<u32>,
    message: String,
}

fn calculate_distance(p1: (f32, f32, f32), p2: (f32, f32, f32)) -> f32 {
    ((p1.0 - p2.0).powi(2) + (p1.1 - p2.1).powi(2) + (p1.2 - p2.2).powi(2)).sqrt()
}

fn intervention_label(kind: &str) -> &'static str {
    match kind {
        "BLESS" => "祝福",
        "POISON" => "投毒",
        "QUARANTINE" => "隔离",
        "EXILE" => "放逐",
        "PIN_OBSERVE" => "钉选观察",
        _ => "未知干预",
    }
}

fn normalize_intervention_kind(kind: &str) -> Result<&'static str, String> {
    match kind {
        "BLESS" | "POISON" | "QUARANTINE" | "EXILE" | "PIN_OBSERVE" => Ok(match kind {
            "BLESS" => "BLESS",
            "POISON" => "POISON",
            "QUARANTINE" => "QUARANTINE",
            "EXILE" => "EXILE",
            "PIN_OBSERVE" => "PIN_OBSERVE",
            _ => unreachable!(),
        }),
        _ => Err(format!("Unknown player intervention kind: {kind}")),
    }
}

fn apply_intervention_to_entities(
    entities: &mut [Entity],
    kind: &str,
    point: (f32, f32, f32),
    entity_id: Option<u32>,
) -> Vec<u32> {
    const RADIUS: f32 = 2.5;
    const MAX_AFFECTED: usize = 24;
    let mut candidates: Vec<(usize, bool, f32)> = entities
        .iter()
        .enumerate()
        .filter_map(|(index, entity)| {
            let targeted = entity_id == Some(entity.id);
            let distance = calculate_distance(entity.position, point);
            let in_radius = distance <= RADIUS;
            if !targeted && !in_radius {
                return None;
            }
            Some((index, targeted, distance))
        })
        .collect();

    candidates.sort_by(|a, b| {
        b.1.cmp(&a.1)
            .then_with(|| a.2.partial_cmp(&b.2).unwrap_or(std::cmp::Ordering::Equal))
    });

    candidates
        .into_iter()
        .take(MAX_AFFECTED)
        .map(|(index, _, _)| {
            let entity = &mut entities[index];
            match kind {
                "BLESS" => {
                    entity.energy = (entity.energy + 25.0).min(100.0);
                    entity.score += 3.0;
                }
                "POISON" => {
                    entity.metabolic_toxin = (entity.metabolic_toxin + 0.18).min(1.0);
                    entity.energy = (entity.energy - 8.0).max(0.0);
                }
                "QUARANTINE" => {
                    entity.stats.defense = entity.stats.defense.saturating_add(20).min(200);
                    entity.ethics.collaboration = (entity.ethics.collaboration + 0.05).min(1.0);
                }
                "EXILE" => {
                    let dx = entity.position.0 - point.0;
                    let dy = entity.position.1 - point.1;
                    let dz = entity.position.2 - point.2;
                    let length = (dx * dx + dy * dy + dz * dz).sqrt().max(0.001);
                    entity.position.0 += dx / length * 4.0;
                    entity.position.1 += dy / length * 4.0;
                    entity.position.2 += dz / length * 4.0;
                    entity.energy = (entity.energy - 5.0).max(0.0);
                    entity.score = (entity.score - 2.0).max(0.0);
                }
                "PIN_OBSERVE" => {}
                _ => {}
            }
            entity.id
        })
        .collect()
}

fn apply_player_intervention_to_state(
    state: &AppState,
    kind: &str,
    point: (f32, f32, f32),
    entity_id: Option<u32>,
) -> Result<InterventionOutcome, String> {
    let normalized_kind = normalize_intervention_kind(kind)?;
    let is_running = *lock_app_state(&state.is_running, "is_running")?;
    if !is_running {
        return Err("Simulation is not running; player interventions are disabled.".to_string());
    }
    write_run_log(
        "Simulation",
        &format!(
            "Player intervention {} at coordinates: ({}, {}, {}), entity: {:?}",
            normalized_kind, point.0, point.1, point.2, entity_id
        ),
    );
    let mut entities = lock_app_state(&state.entities, "entities")?;
    let affected_entity_ids =
        apply_intervention_to_entities(&mut entities, normalized_kind, point, entity_id);
    let affected = affected_entity_ids.len();
    Ok(InterventionOutcome {
        kind: normalized_kind.to_string(),
        affected,
        affected_entity_ids,
        message: format!(
            "{}影响了 {} 个实体，坐标 ({:.1}, {:.1}, {:.1})。",
            intervention_label(normalized_kind),
            affected,
            point.0,
            point.1,
            point.2
        ),
    })
}

#[tauri::command]
pub fn get_world_binary(state: State<'_, Arc<AppState>>) -> Result<Vec<u8>, String> {
    let entities = lock_app_state(&state.entities, "entities")?;
    let mut buffer =
        Vec::with_capacity(entities.len() * WORLD_ENTITY_RECORD_BYTES + WORLD_STATS_RECORD_BYTES);

    for e in entities.iter() {
        buffer.extend_from_slice(&e.id.to_le_bytes());
        buffer.extend_from_slice(&e.position.0.to_le_bytes());
        buffer.extend_from_slice(&e.position.1.to_le_bytes());
        buffer.extend_from_slice(&e.position.2.to_le_bytes());
        buffer.extend_from_slice(&e.ethics.altruism.to_le_bytes());
        buffer.extend_from_slice(&e.ethics.collaboration.to_le_bytes());
        buffer.extend_from_slice(&e.score.to_le_bytes());
        buffer.extend_from_slice(&e.energy.to_le_bytes());
        buffer.extend_from_slice(&e.metabolic_toxin.to_le_bytes());
        buffer.extend_from_slice(&e.generation.to_le_bytes());
    }

    if !entities.is_empty() {
        let scores: Vec<i32> = entities.iter().map(|e| (e.score / 10.0) as i32).collect();
        let mut counts = std::collections::HashMap::new();
        for s in scores {
            *counts.entry(s).or_insert(0) += 1;
        }

        let mut entropy = 0.0;
        let len = entities.len() as f32;
        for &count in counts.values() {
            let p = count as f32 / len;
            entropy -= p * p.log2();
        }
        let normalized_entropy = (entropy / 5.0).min(1.0) * 100.0;

        let avg_score: f32 = entities.iter().map(|e| e.score).sum::<f32>() / len;
        let avg_gen: f32 = entities.iter().map(|e| e.generation as f32).sum::<f32>() / len;

        buffer.extend_from_slice(&normalized_entropy.to_le_bytes());
        buffer.extend_from_slice(&avg_score.to_le_bytes());
        buffer.extend_from_slice(&avg_gen.to_le_bytes());
    }

    // Phase 1 returns raw binary because the frontend parses this buffer directly.
    // Compression can return only after the protocol carries an explicit codec header.
    Ok(buffer)
}

#[tauri::command]
pub async fn get_world_state(state: State<'_, Arc<AppState>>) -> Result<Vec<EntityView>, String> {
    let entities = lock_app_state(&state.entities, "entities")?;
    Ok(entities
        .iter()
        .map(|e| EntityView {
            id: e.id,
            position: e.position,
            ethics: e.ethics.clone(),
            score: e.score,
            energy: e.energy,
            metabolic_toxin: e.metabolic_toxin,
            generation: e.generation,
        })
        .collect())
}

#[tauri::command]
pub async fn get_lineage(state: State<'_, Arc<AppState>>) -> Result<Vec<LineageRecord>, String> {
    let history = lock_app_state(&state.lineage_history, "lineage_history")?;
    Ok(history.clone())
}

#[tauri::command]
pub async fn get_recent_interactions(
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<InteractionEvent>, String> {
    let interactions = lock_app_state(&state.recent_interactions, "recent_interactions")?;
    Ok(interactions.clone())
}

#[tauri::command]
pub async fn get_hall_of_fame(state: State<'_, Arc<AppState>>) -> Result<Vec<Entity>, String> {
    let fame = lock_app_state(&state.hall_of_fame, "hall_of_fame")?;
    Ok(fame.clone())
}

#[tauri::command]
pub async fn interfere_at(
    state: State<'_, Arc<AppState>>,
    x: f32,
    y: f32,
    z: f32,
) -> Result<String, String> {
    let outcome =
        apply_player_intervention_to_state(state.inner().as_ref(), "BLESS", (x, y, z), None)?;
    write_run_log(
        "Simulation",
        &format!(
            "Deprecated interfere_at forwarded to apply_player_intervention: affected {}",
            outcome.affected
        ),
    );
    Ok(outcome.message)
}

#[tauri::command]
pub async fn apply_player_intervention(
    state: State<'_, Arc<AppState>>,
    kind: String,
    x: f32,
    y: f32,
    z: f32,
    entity_id: Option<u32>,
) -> Result<InterventionOutcome, String> {
    apply_player_intervention_to_state(state.inner().as_ref(), &kind, (x, y, z), entity_id)
}

#[tauri::command]
pub async fn get_entity_detail(
    state: State<'_, Arc<AppState>>,
    entity_id: u32,
) -> Result<Entity, String> {
    let entities = lock_app_state(&state.entities, "entities")?;
    entities
        .iter()
        .find(|e| e.id == entity_id)
        .cloned()
        .ok_or_else(|| "Entity not found".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_entity(id: u32, position: (f32, f32, f32)) -> Entity {
        let mut entity = Entity::new(
            id,
            "(module (func (export \"calculate_fitness\") (result i32) i32.const 1))".to_string(),
        );
        entity.position = position;
        entity.energy = 50.0;
        entity.score = 10.0;
        entity.metabolic_toxin = 0.1;
        entity.stats.defense = 10;
        entity.ethics.collaboration = 0.2;
        entity
    }

    #[test]
    fn intervention_returns_exact_mutated_entity_ids() {
        let mut entities = vec![
            test_entity(1, (0.0, 0.0, 0.0)),
            test_entity(2, (1.0, 0.0, 0.0)),
            test_entity(3, (4.0, 0.0, 0.0)),
        ];

        let affected =
            apply_intervention_to_entities(&mut entities, "BLESS", (0.0, 0.0, 0.0), None);

        assert_eq!(affected, vec![1, 2]);
        assert_eq!(entities[0].energy, 75.0);
        assert_eq!(entities[0].score, 13.0);
        assert_eq!(entities[1].energy, 75.0);
        assert_eq!(entities[1].score, 13.0);
        assert_eq!(entities[2].energy, 50.0);
        assert_eq!(entities[2].score, 10.0);
    }

    #[test]
    fn explicit_target_is_not_crowded_out_by_radius_limit() {
        let mut entities: Vec<Entity> = (1..=30)
            .map(|id| test_entity(id, (0.1 + id as f32 * 0.001, 0.0, 0.0)))
            .collect();
        entities.push(test_entity(99, (30.0, 0.0, 0.0)));

        let affected =
            apply_intervention_to_entities(&mut entities, "POISON", (0.0, 0.0, 0.0), Some(99));

        assert_eq!(affected.len(), 24);
        assert_eq!(affected[0], 99);
        assert!(affected.contains(&1));
        assert!(!affected.contains(&24));
        let target = entities
            .iter()
            .find(|entity| entity.id == 99)
            .expect("target exists");
        assert!((target.metabolic_toxin - 0.28).abs() < f32::EPSILON);
        assert_eq!(target.energy, 42.0);
    }

    #[test]
    fn radius_hits_are_sorted_by_distance_not_input_order() {
        let mut entities = vec![
            test_entity(30, (2.4, 0.0, 0.0)),
            test_entity(10, (0.5, 0.0, 0.0)),
            test_entity(20, (1.5, 0.0, 0.0)),
        ];

        let affected =
            apply_intervention_to_entities(&mut entities, "BLESS", (0.0, 0.0, 0.0), None);

        assert_eq!(affected, vec![10, 20, 30]);
    }

    #[test]
    fn no_radius_hit_without_target_returns_empty_and_preserves_entities() {
        let mut entities = vec![
            test_entity(1, (10.0, 0.0, 0.0)),
            test_entity(2, (-10.0, 0.0, 0.0)),
        ];
        let before = entities.clone();

        let affected =
            apply_intervention_to_entities(&mut entities, "BLESS", (0.0, 0.0, 0.0), None);

        assert!(affected.is_empty());
        assert_eq!(entities, before);
    }

    #[test]
    fn quarantine_and_exile_mutate_only_returned_entities() {
        let mut quarantine_entities = vec![
            test_entity(1, (0.0, 0.0, 0.0)),
            test_entity(2, (5.0, 0.0, 0.0)),
        ];
        quarantine_entities[0].stats.defense = 190;
        quarantine_entities[0].ethics.collaboration = 0.98;

        let quarantined = apply_intervention_to_entities(
            &mut quarantine_entities,
            "QUARANTINE",
            (0.0, 0.0, 0.0),
            None,
        );

        assert_eq!(quarantined, vec![1]);
        assert_eq!(quarantine_entities[0].stats.defense, 200);
        assert_eq!(quarantine_entities[0].ethics.collaboration, 1.0);
        assert_eq!(quarantine_entities[1].stats.defense, 10);
        assert_eq!(quarantine_entities[1].ethics.collaboration, 0.2);

        let mut exile_entities = vec![
            test_entity(3, (1.0, 0.0, 0.0)),
            test_entity(4, (6.0, 0.0, 0.0)),
        ];
        exile_entities[0].score = 1.0;

        let exiled =
            apply_intervention_to_entities(&mut exile_entities, "EXILE", (0.0, 0.0, 0.0), None);

        assert_eq!(exiled, vec![3]);
        assert!(exile_entities[0].position.0 > 1.0);
        assert_eq!(exile_entities[0].energy, 45.0);
        assert_eq!(exile_entities[0].score, 0.0);
        assert_eq!(exile_entities[1].position, (6.0, 0.0, 0.0));
        assert_eq!(exile_entities[1].energy, 50.0);
    }

    #[test]
    fn pin_observe_reports_real_ids_without_mutating_values() {
        let mut entities = vec![
            test_entity(10, (0.0, 0.0, 0.0)),
            test_entity(11, (2.0, 0.0, 0.0)),
            test_entity(12, (3.5, 0.0, 0.0)),
        ];
        let before = entities.clone();

        let affected =
            apply_intervention_to_entities(&mut entities, "PIN_OBSERVE", (0.0, 0.0, 0.0), None);

        assert_eq!(affected, vec![10, 11]);
        assert_eq!(entities, before);
    }

    #[test]
    fn intervention_core_rejects_paused_world() {
        let state = AppState::new().unwrap();
        let result = apply_player_intervention_to_state(&state, "BLESS", (0.0, 0.0, 0.0), None);

        assert!(result.is_err());
    }

    #[test]
    fn intervention_core_returns_structured_outcome() {
        let state = AppState::new().unwrap();
        *lock_app_state(&state.is_running, "is_running").unwrap() = true;
        *lock_app_state(&state.entities, "entities").unwrap() = vec![
            test_entity(1, (0.0, 0.0, 0.0)),
            test_entity(2, (4.0, 0.0, 0.0)),
        ];

        let outcome =
            apply_player_intervention_to_state(&state, "BLESS", (0.0, 0.0, 0.0), None).unwrap();

        assert_eq!(outcome.kind, "BLESS");
        assert_eq!(outcome.affected, 1);
        assert_eq!(outcome.affected_entity_ids, vec![1]);
    }
}
