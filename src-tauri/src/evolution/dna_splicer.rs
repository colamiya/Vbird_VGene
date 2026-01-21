use rand::Rng;

pub struct DnaSplicer;

impl DnaSplicer {
    /// 规则 11: 水平基因转移 (Horizontal Gene Transfer)
    /// 将两个个体的 DNA 进行拼接，产生新的变异
    pub fn splice(dna_a: &str, dna_b: &str) -> String {
        let mut rng = rand::thread_rng();
        
        // 简单的基于行的拼接逻辑 (针对 WAT 格式)
        let lines_a: Vec<&str> = dna_a.lines().collect();
        let lines_b: Vec<&str> = dna_b.lines().collect();

        if lines_a.len() < 3 || lines_b.len() < 3 {
            return dna_a.to_string();
        }

        // 提取核心逻辑行 (排除 module 和 func 定义头尾)
        let core_a = &lines_a[1..lines_a.len()-1];
        let core_b = &lines_b[1..lines_b.len()-1];

        let mut new_core = Vec::new();
        let split_point = rng.gen_range(0..core_a.len().max(1));
        
        for i in 0..split_point {
            if i < core_a.len() {
                new_core.push(core_a[i]);
            }
        }
        for i in split_point..core_b.len() {
            new_core.push(core_b[i]);
        }

        // 重新组装
        let mut result = String::from("(module\n");
        result.push_str("  (func (export \"calculate_fitness\") (result i32)\n");
        for line in new_core {
            result.push_str("    ");
            result.push_str(line.trim());
            result.push('\n');
        }
        result.push_str("  )\n)");
        
        result
    }
}
