use rand::Rng;

pub struct DnaSplicer;

impl DnaSplicer {
    /// 规则 11: 水平基因转移 (Horizontal Gene Transfer)
    /// 将两个个体的 DNA 进行拼接，产生新的变异
    pub fn splice(dna_a: &str, dna_b: &str) -> String {
        let mut rng = rand::thread_rng();
        
        // 1. 提取函数体内的完整语句块
        let blocks_a = Self::extract_blocks(dna_a);
        let blocks_b = Self::extract_blocks(dna_b);
        
        if blocks_a.is_empty() || blocks_b.is_empty() {
            return dna_a.to_string();
        }
        
        // 2. 随机选择一个块进行交换
        let swap_count = rng.gen_range(1..=2.min(blocks_a.len()).min(blocks_b.len()));
        let mut new_blocks = blocks_a.clone();
        
        for _ in 0..swap_count {
            let idx_a = rng.gen_range(0..new_blocks.len());
            let idx_b = rng.gen_range(0..blocks_b.len());
            new_blocks[idx_a] = blocks_b[idx_b].clone();
        }
        
        // 3. 重新组装
        Self::assemble_dna(&new_blocks)
    }
    
    fn extract_blocks(dna: &str) -> Vec<String> {
        // 简化版：按行分割语句，但排除定义行
        dna.lines()
            .filter(|line| {
                let trimmed = line.trim();
                !trimmed.is_empty() 
                    && !trimmed.starts_with("(module") 
                    && !trimmed.starts_with("(func") 
                    && !trimmed.starts_with(")") 
                    && !trimmed.starts_with(";;") // 排除注释
            })
            .map(|s| s.trim().to_string())
            .collect()
    }
    
    fn assemble_dna(blocks: &[String]) -> String {
        let mut result = String::from("(module\n  (func (export \"calculate_fitness\") (result i32)\n");
        for block in blocks {
            result.push_str("    ");
            result.push_str(block);
            result.push('\n');
        }
        result.push_str("  )\n)");
        result
    }
}
