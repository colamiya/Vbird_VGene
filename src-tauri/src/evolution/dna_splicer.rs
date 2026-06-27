use rand::Rng;
use std::borrow::Cow;

use crate::evolution::benchmark::BenchmarkTaskId;

pub struct DnaSplicer;

impl DnaSplicer {
    /// 规则 11: 水平基因转移 (Horizontal Gene Transfer)
    /// 将两个个体的 DNA 进行拼接，产生新的变异
    pub fn splice(dna_a: &str, dna_b: &str) -> String {
        let mut rng = rand::rng();

        // 1. 提取语义块 (S-expression 级提取)
        let blocks_a = Self::extract_semantic_blocks(dna_a);
        let blocks_b = Self::extract_semantic_blocks(dna_b);

        if blocks_a.is_empty() || blocks_b.is_empty() {
            return dna_a.to_string();
        }

        // 2. 随机选择块进行交换 (减少分配，使用索引)
        let swap_count = rng.random_range(1..=2.min(blocks_a.len()).min(blocks_b.len()));
        let mut new_blocks: Vec<Cow<str>> = blocks_a.into_iter().map(Cow::Owned).collect();

        for _ in 0..swap_count {
            let idx_a = rng.random_range(0..new_blocks.len());
            let idx_b = rng.random_range(0..blocks_b.len());
            new_blocks[idx_a] = Cow::Owned(blocks_b[idx_b].clone());
        }

        // 🔒 修正：防止产生无指令的僵尸 DNA
        if new_blocks.is_empty() {
            return dna_a.to_string();
        }

        // 3. 预分配内存组装
        Self::assemble_dna_optimized(&new_blocks)
    }

    pub fn splice_for_task(dna_a: &str, dna_b: &str, task_id: BenchmarkTaskId) -> String {
        match task_id {
            BenchmarkTaskId::Freeform => Self::splice(dna_a, dna_b),
            _ => dna_a.to_string(),
        }
    }

    /// 🔒 语义块提取：通过括号计数识别完整的 WAT 指令块 (Law #14)
    fn extract_semantic_blocks(dna: &str) -> Vec<String> {
        let mut blocks = Vec::new();
        let mut bracket_count = 0;
        let mut current_block = String::with_capacity(64);
        let mut in_func = false;

        for line in dna.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with(";;") {
                continue;
            }

            // 识别进入函数体
            if trimmed.starts_with("(func") {
                in_func = true;
                continue;
            }

            // 在函数体内识别完整的 S-expression
            if in_func {
                if trimmed == ")" {
                    in_func = false;
                    continue;
                }

                current_block.push_str(trimmed);
                current_block.push(' ');

                bracket_count += trimmed.matches('(').count() as i32;
                bracket_count -= trimmed.matches(')').count() as i32;

                if bracket_count <= 0 {
                    let block = current_block.trim().to_string();
                    if !block.is_empty() {
                        blocks.push(block);
                    }
                    current_block.clear();
                    bracket_count = 0;
                }
            }
        }
        blocks
    }

    /// 🔒 优化后的组装逻辑：减少内存重分配
    fn assemble_dna_optimized(blocks: &[Cow<str>]) -> String {
        let estimated_size = blocks.iter().map(|b| b.len() + 8).sum::<usize>() + 128;
        let mut result = String::with_capacity(estimated_size);

        result.push_str("(module\n  (func (export \"calculate_fitness\") (result i32)\n");
        for block in blocks {
            result.push_str("    ");
            result.push_str(block);
            result.push('\n');
        }
        result.push_str("  )\n)");
        result
    }
}
