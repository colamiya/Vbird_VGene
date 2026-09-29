use crate::evolution::benchmark::{baseline_dna_for_task, BenchmarkTaskId, PHASE1_PROMPT_CONTEXT};
use crate::evolution::entity::Entity;
use crate::evolution::wasm_runtime::parse_wat_bounded;
use crate::ollama_http::read_json_limited;
use rand::Rng;
use reqwest::Client;
use serde_json::json;

#[derive(Clone)]
pub enum MutationMode {
    Local,
    Ollama { url: String, model: String },
}

#[derive(Clone)]
pub struct MutationEngine {
    mode: MutationMode,
    client: Client,
}

impl MutationEngine {
    pub fn new(mode: MutationMode) -> Self {
        Self {
            mode,
            client: Client::new(),
        }
    }

    pub fn set_mode(&mut self, mode: MutationMode) {
        self.mode = mode;
    }

    pub async fn mutate_for_task(&self, parent: &Entity, task_id: BenchmarkTaskId) -> String {
        match &self.mode {
            MutationMode::Local => self.mutate_local(parent, task_id),
            MutationMode::Ollama { url, model } => {
                self.mutate_ollama(parent, url, model, task_id).await
            }
        }
    }

    pub fn in_flight_limit(&self) -> usize {
        match &self.mode {
            MutationMode::Local => std::thread::available_parallelism()
                .map(|count| count.get())
                .unwrap_or(2)
                .clamp(2, 8),
            MutationMode::Ollama { .. } => 2,
        }
    }

    fn mutate_local(&self, parent: &Entity, task_id: BenchmarkTaskId) -> String {
        let mut rng = rand::rng();
        let nonce = rng.random::<u32>();
        let variant_tag = local_variant_tag(parent, nonce);

        if task_id != BenchmarkTaskId::Freeform {
            if let Some(mutated) = mutate_task_fitness_const(&parent.dna, parent, nonce) {
                return mutated;
            }
            if let Some(mutated) =
                mutate_task_fitness_const(baseline_dna_for_task(task_id), parent, nonce)
            {
                return mutated;
            }
            return parent.dna.clone();
        }

        if rng.random_bool(0.1) {
            return format!(
                "{}{}",
                r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 42
  )
)"#,
                variant_tag
            );
        }
        append_local_compiled_variant(&parent.dna, &variant_tag, parent, nonce)
    }

    fn task_abi_prompt(task_id: BenchmarkTaskId) -> &'static str {
        match task_id {
            BenchmarkTaskId::Freeform => {
                "Current task: freeform. The module must export calculate_fitness() -> i32."
            }
            BenchmarkTaskId::SortI32 => {
                "Current task: sort_i32. The module must export memory, calculate_fitness() -> i32, and sort_i32(ptr, len) -> i32. sort_i32 must sort little-endian i32 values in-place in ascending order and return 1 on success."
            }
            BenchmarkTaskId::Rle => {
                "Current task: rle. The module must export memory, calculate_fitness() -> i32, and rle_encode(in_ptr, in_len, out_ptr, out_cap) -> i32. rle_encode must write value/count byte pairs and return the written byte length, or -1 if output capacity is too small."
            }
            BenchmarkTaskId::SumI32 => {
                "Current task: sum_i32. The module must export memory, calculate_fitness() -> i32, and sum_i32(ptr, len) -> i32. sum_i32 must return the signed sum of little-endian i32 values."
            }
            BenchmarkTaskId::MaxI32 => {
                "Current task: max_i32. The module must export memory, calculate_fitness() -> i32, and max_i32(ptr, len) -> i32. max_i32 must return the maximum signed i32 value, or 0 for empty input."
            }
            BenchmarkTaskId::FindI32 => {
                "Current task: find_i32. The module must export memory, calculate_fitness() -> i32, and find_i32(ptr, len, target) -> i32. Return the first matching index, or -1."
            }
            BenchmarkTaskId::Checksum8 => {
                "Current task: checksum8. The module must export memory, calculate_fitness() -> i32, and checksum8(ptr, len) -> i32. Return the low 8 bits of the byte sum."
            }
            BenchmarkTaskId::CountByte => {
                "Current task: count_byte. The module must export memory, calculate_fitness() -> i32, and count_byte(ptr, len, value) -> i32. Return how many bytes equal value & 255."
            }
        }
    }

    async fn mutate_ollama(
        &self,
        parent: &Entity,
        url: &str,
        model: &str,
        task_id: BenchmarkTaskId,
    ) -> String {
        use tokio::time::{timeout, Duration};

        let prompt = format!(
            "Task: Mutate the following WebAssembly Text (WAT) code to improve its efficiency or logical complexity.\n\
            Useful-work context:\n\
            {}\n\n\
            Selected task ABI:\n\
            {}\n\n\
            Constraints:\n\
            1. Output ONLY the valid (module ...) code block.\n\
            2. Do NOT include any explanations, markdown code blocks, or preamble.\n\
            3. The output must be valid WAT and must satisfy the selected task ABI exactly.\n\n\
            Current DNA:\n\
            {}",
            PHASE1_PROMPT_CONTEXT,
            Self::task_abi_prompt(task_id),
            parent.dna
        );

        let body = json!({
            "model": model,
            "prompt": prompt,
            "stream": false
        });

        let api_url = format!("{}/api/generate", url);

        // 🔒 最多重试 3 次，每次超时 10 秒
        for attempt in 0..3 {
            let request = self
                .client
                .post(&api_url)
                .json(&body)
                .timeout(Duration::from_secs(10)); // reqwest 自带超时

            match timeout(Duration::from_secs(12), request.send()).await {
                Ok(Ok(res)) => {
                    if let Ok(json) = read_json_limited::<serde_json::Value>(res).await {
                        if let Some(response_text) = json["response"].as_str() {
                            let cleaned = self.extract_wat(response_text);
                            if !cleaned.is_empty() {
                                return cleaned;
                            }
                        }
                    }
                }
                Ok(Err(e)) => {
                    eprintln!("Ollama request failed (attempt {}): {}", attempt + 1, e);
                }
                Err(_) => {
                    eprintln!("Ollama request timeout (attempt {})", attempt + 1);
                }
            }

            // 指数退避: 100ms, 200ms, 400ms
            tokio::time::sleep(Duration::from_millis(100 * 2_u64.pow(attempt))).await;
        }

        eprintln!("Ollama mutation failed after 3 attempts, using parent DNA");
        parent.dna.clone()
    }

    fn extract_wat(&self, text: &str) -> String {
        // 🔒 增强的 WAT 提取逻辑：支持括号计数以处理嵌套 (Law #14)
        if let Some(start) = text.find("(module") {
            let mut count = 0;
            let mut end = 0;
            let bytes = text.as_bytes();

            for i in start..bytes.len() {
                if bytes[i] == b'(' {
                    count += 1;
                } else if bytes[i] == b')' {
                    count -= 1;
                    if count == 0 {
                        end = i;
                        break;
                    }
                }
            }

            if end > start {
                return text[start..=end].to_string();
            }
        }

        // 如果没找到，尝试清理常见的 Markdown 包裹
        text.replace("```wat", "")
            .replace("```wasm", "")
            .replace("```", "")
            .trim()
            .to_string()
    }
}

fn local_variant_tag(parent: &Entity, nonce: u32) -> String {
    format!(
        "\n  ;; vgene-local-variant:{}:{}:{}",
        parent.id, parent.generation, nonce
    )
}

fn append_local_compiled_variant(
    dna: &str,
    variant_tag: &str,
    parent: &Entity,
    nonce: u32,
) -> String {
    let trimmed = dna.trim_end();
    let helper_name = format!(
        "$vgene_local_variant_{}_{}_{}",
        parent.id, parent.generation, nonce
    );
    let helper_value = ((parent.id ^ nonce) % 997) as i32;
    let helper = format!(
        r#"
  (func {helper_name} (result i32)
    i32.const {helper_value}
  )
"#,
    );

    if let Some(module_end) = trimmed.rfind(')') {
        format!(
            "{}{}{}{}",
            &trimmed[..module_end],
            variant_tag,
            helper,
            &trimmed[module_end..],
        )
    } else {
        format!("{}{}", trimmed, variant_tag)
    }
}

fn mutate_task_fitness_const(dna: &str, parent: &Entity, nonce: u32) -> Option<String> {
    let marker = "(export \"calculate_fitness\")";
    let marker_start = dna.find(marker)?;
    let search_start = marker_start + marker.len();
    let const_relative = dna[search_start..].find("i32.const")?;
    let const_start = search_start + const_relative;
    let value_start = const_start + "i32.const".len();
    let bytes = dna.as_bytes();
    let mut literal_start = value_start;
    while bytes
        .get(literal_start)
        .is_some_and(u8::is_ascii_whitespace)
    {
        literal_start += 1;
    }

    let mut literal_end = literal_start;
    if bytes.get(literal_end) == Some(&b'-') {
        literal_end += 1;
    }
    while bytes.get(literal_end).is_some_and(u8::is_ascii_digit) {
        literal_end += 1;
    }
    if literal_end == literal_start
        || (literal_end == literal_start + 1 && bytes[literal_start] == b'-')
    {
        return None;
    }

    let previous = dna[literal_start..literal_end].parse::<i32>().ok()?;
    let next = task_fitness_variant_value(previous, parent, nonce);
    let mut mutated = String::with_capacity(dna.len());
    mutated.push_str(&dna[..literal_start]);
    mutated.push_str(&next.to_string());
    mutated.push_str(&dna[literal_end..]);

    if parse_wat_bounded(&mutated).is_none() {
        return None;
    }
    Some(mutated)
}

fn task_fitness_variant_value(previous: i32, parent: &Entity, nonce: u32) -> i32 {
    let seed = parent
        .id
        .wrapping_mul(31)
        .wrapping_add(parent.generation.wrapping_mul(17))
        ^ nonce;
    let mut next = 16 + (seed % 48) as i32;
    if next == previous {
        next = if next < 63 { next + 1 } else { 16 };
    }
    next
}

#[cfg(test)]
mod tests {
    use super::{MutationEngine, MutationMode};
    use crate::evolution::benchmark::{baseline_dna_for_task, BenchmarkTaskId, PHASE1_TASKS};
    use crate::evolution::entity::Entity;
    use crate::evolution::wasm_runtime::WasmEngine;

    #[tokio::test]
    async fn local_task_mutation_produces_valid_compiled_variants() {
        let engine = MutationEngine::new(MutationMode::Local);
        let wasm_engine = WasmEngine::new().expect("wasm engine should initialize");

        for task in PHASE1_TASKS
            .iter()
            .map(|task| task.id)
            .filter(|task| *task != BenchmarkTaskId::Freeform)
        {
            let parent = Entity::new(7, baseline_dna_for_task(task).to_string());
            let mutated = engine.mutate_for_task(&parent, task).await;

            assert!(
                wasm_engine.validate_and_test_for_task(&mutated, task),
                "local mutation must keep task ABI valid for {:?}",
                task,
            );
            assert_ne!(
                wat::parse_str(&parent.dna).expect("baseline should compile"),
                wat::parse_str(&mutated).expect("mutated dna should compile"),
                "local mutation must change compiled wasm for {:?}",
                task,
            );
        }
    }

    #[tokio::test]
    async fn local_freeform_mutation_changes_compiled_dna() {
        let engine = MutationEngine::new(MutationMode::Local);
        let parent = Entity::new(
            3,
            baseline_dna_for_task(BenchmarkTaskId::Freeform).to_string(),
        );
        let mutated = engine
            .mutate_for_task(&parent, BenchmarkTaskId::Freeform)
            .await;

        assert_ne!(
            wat::parse_str(&parent.dna).expect("baseline should compile"),
            wat::parse_str(&mutated).expect("mutated dna should compile"),
            "local freeform mutation must change compiled wasm",
        );
    }

    #[tokio::test]
    async fn local_task_mutation_passes_non_regression_score_gate() {
        let engine = MutationEngine::new(MutationMode::Local);
        let wasm_engine = WasmEngine::new().expect("wasm engine should initialize");

        for task in PHASE1_TASKS
            .iter()
            .map(|task| task.id)
            .filter(|task| *task != BenchmarkTaskId::Freeform)
        {
            let parent = Entity::new(11, baseline_dna_for_task(task).to_string());
            let mutated = engine.mutate_for_task(&parent, task).await;
            let parent_score = wasm_engine.score_dna_for_task(&parent.dna, task);
            let mutated_score = wasm_engine.score_dna_for_task(&mutated, task);

            assert!(
                mutated_score.final_score + 0.000_1 >= parent_score.final_score,
                "local task mutation must not regress useful-work score for {:?}: parent {} child {}",
                task,
                parent_score.final_score,
                mutated_score.final_score,
            );
        }
    }
}
