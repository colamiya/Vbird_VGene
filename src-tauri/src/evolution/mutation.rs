use crate::evolution::entity::Entity;
use reqwest::Client;
use serde_json::json;
use rand::Rng;

#[derive(Clone)]
pub enum MutationMode {
    LocalMock,
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

    pub async fn mutate(&self, parent: &Entity) -> String {
        match &self.mode {
            MutationMode::LocalMock => self.mutate_local(parent),
            MutationMode::Ollama { url, model } => self.mutate_ollama(parent, url, model).await,
        }
    }

    fn mutate_local(&self, parent: &Entity) -> String {
        let mut rng = rand::rng();
        if rng.random_bool(0.1) {
            return r#"(module
  (func (export "calculate_fitness") (result i32)
    i32.const 42
  )
)"#.to_string();
        }
        parent.dna.clone()
    }

    async fn mutate_ollama(&self, parent: &Entity, url: &str, model: &str) -> String {
        use tokio::time::{timeout, Duration};

        let prompt = format!(
            "Task: Mutate the following WebAssembly Text (WAT) code to improve its efficiency or logical complexity.\n\
            Constraints:\n\
            1. Output ONLY the valid (module ...) code block.\n\
            2. Do NOT include any explanations, markdown code blocks, or preamble.\n\
            3. The output must be valid WAT and must export a function named 'calculate_fitness' that returns an i32.\n\n\
            Current DNA:\n\
            {}",
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
            let request = self.client
                .post(&api_url)
                .json(&body)
                .timeout(Duration::from_secs(10)); // reqwest 自带超时
            
            match timeout(Duration::from_secs(12), request.send()).await {
                Ok(Ok(res)) => {
                    if let Ok(json) = res.json::<serde_json::Value>().await {
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
