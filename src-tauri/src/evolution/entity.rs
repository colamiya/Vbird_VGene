use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: u32,
    pub parent_id: Option<u32>, // 父代 ID (谱系追踪)
    pub dna: String, // WAT格式
    pub stats: Stats,
    pub ethics: Ethics,
    pub generation: u32,
    pub score: f32,
    pub position: (f32, f32, f32), // x, y, z
    pub metabolic_toxin: f32, // 代谢毒素 (0.0 - 1.0)
    pub energy: f32, // 当前能量
    pub fuel_consumed: u64, // 累计燃料消耗 (熵增记录)
    pub fuel_efficiency: f32, // 燃料效率 (得分/消耗)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stats {
    pub attack: u32,
    pub defense: u32,
    pub population: u32,
    pub tech_level: u32,
    pub efficiency: f32, // 代码效率
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ethics {
    pub altruism: f32, // 0.0到1.0（邪恶到善良）
    pub collaboration: f32,
}

impl Entity {
    pub fn new(id: u32, dna: String) -> Self {
        Self {
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
        }
    }
}
