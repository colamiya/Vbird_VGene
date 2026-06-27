use serde::{Deserialize, Serialize};
use std::hash::{Hash, Hasher};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Entity {
    pub id: u32,
    pub parent_id: Option<u32>, // 父代 ID (谱系追踪)
    pub dna: String,            // WAT格式
    pub stats: Stats,
    pub ethics: Ethics,
    pub generation: u32,
    pub score: f32,
    pub position: (f32, f32, f32),     // x, y, z
    pub metabolic_toxin: f32,          // 代谢毒素 (0.0 - 1.0)
    pub energy: f32,                   // 当前能量
    pub fuel_consumed: u64,            // 累计燃料消耗 (熵增记录)
    pub fuel_efficiency: f32,          // 燃料效率 (得分/消耗)
    pub last_memory_snapshot: Vec<u8>, // 🔒 真实 WASM 内存快照
}

impl Eq for Entity {}

impl Hash for Entity {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.id.hash(state);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Stats {
    pub attack: u32,
    pub defense: u32,
    pub population: u32,
    pub tech_level: u32,
    pub efficiency: f32, // 代码效率
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Ethics {
    pub altruism: f32, // 0.0到1.0（邪恶到善良）
    pub collaboration: f32,
}

impl Entity {
    pub fn new(id: u32, dna: String) -> Self {
        let mut entity = Self {
            id,
            parent_id: None,
            dna,
            stats: Stats {
                attack: 1,
                defense: 1,
                population: 10,
                tech_level: 1,
                efficiency: 1.0,
            },
            ethics: Ethics {
                altruism: rand::random::<f32>(),
                collaboration: rand::random::<f32>(),
            },
            generation: 1,
            score: 0.0,
            position: (
                (rand::random::<f32>() - 0.5) * 20.0,
                (rand::random::<f32>() - 0.5) * 20.0,
                (rand::random::<f32>() - 0.5) * 20.0,
            ),
            metabolic_toxin: 0.0,
            energy: 100.0,
            fuel_consumed: 0,
            fuel_efficiency: 1.0,
            last_memory_snapshot: Vec::new(),
        };
        entity.refresh_strategy_from_dna();
        entity
    }

    pub fn refresh_strategy_from_dna(&mut self) {
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        self.id.hash(&mut hasher);
        self.generation.hash(&mut hasher);
        self.dna.hash(&mut hasher);
        let seed = hasher.finish();

        let attack = ((seed & 0xff) as u32).clamp(8, 140);
        let defense = (((seed >> 8) & 0xff) as u32).clamp(8, 140);
        let collaboration = (((seed >> 16) & 0xffff) as f32 / 65535.0).clamp(0.05, 0.98);
        let altruism = (((seed >> 32) & 0xffff) as f32 / 65535.0).clamp(0.05, 0.98);

        self.stats.attack = attack;
        self.stats.defense = defense;
        self.stats.tech_level = (((seed >> 48) & 0x0f) as u32).max(1);
        self.ethics.collaboration = collaboration;
        self.ethics.altruism = altruism;
    }
}
