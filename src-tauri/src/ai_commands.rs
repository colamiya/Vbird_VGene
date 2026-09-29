use crate::ollama_http::read_json_limited;
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use tokio::time::Duration;

#[derive(Deserialize)]
struct OllamaTag {
    name: String,
}

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaTag>>,
}

fn normalize_ollama_url(url: &str) -> String {
    let trimmed = url.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        "http://localhost:11434".to_string()
    } else {
        trimmed.to_string()
    }
}

fn extract_json_object(text: &str) -> Option<String> {
    let start = text.find('{')?;
    let mut depth = 0_i32;
    let mut in_string = false;
    let mut escaped = false;

    for (offset, ch) in text[start..].char_indices() {
        if in_string {
            if escaped {
                escaped = false;
                continue;
            }
            if ch == '\\' {
                escaped = true;
                continue;
            }
            if ch == '"' {
                in_string = false;
            }
            continue;
        }

        match ch {
            '"' => in_string = true,
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    let end = start + offset + ch.len_utf8();
                    return Some(text[start..end].to_string());
                }
            }
            _ => {}
        }
    }

    None
}

#[tauri::command]
pub async fn check_ollama_models(ollama_url: String) -> Result<Vec<String>, String> {
    let client = Client::new();
    let api_url = format!("{}/api/tags", normalize_ollama_url(&ollama_url));
    let response = client
        .get(api_url)
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("Ollama 节点连接失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama 节点返回异常状态：{}", response.status()));
    }

    let tags = read_json_limited::<OllamaTagsResponse>(response)
        .await
        .map_err(|e| format!("Ollama 模型列表解析失败：{}", e))?;

    Ok(tags
        .models
        .unwrap_or_default()
        .into_iter()
        .map(|model| model.name)
        .collect())
}

#[tauri::command]
pub async fn generate_divine_mandate(
    ollama_url: String,
    model_name: String,
    command: String,
) -> Result<Value, String> {
    let user_command = command.trim();
    if user_command.is_empty() {
        return Err("神谕指令不能为空。".to_string());
    }

    let model = if model_name.trim().is_empty() {
        "qwen2.5-coder".to_string()
    } else {
        model_name.trim().to_string()
    };
    let prompt = format!(
        "Task: Translate the following natural language command into a VGene environment configuration JSON.\n\
        Command: \"{}\"\n\n\
        Constraints:\n\
        1. Output ONLY the JSON object.\n\
        2. No markdown, no explanations.\n\
        3. JSON schema:\n\
        {{\n\
          \"maxEntities\": number (10-1000),\n\
          \"mutationRate\": number (0.01-0.5),\n\
          \"entropyFactor\": number (0.0-1.0),\n\
          \"winningRule\": \"SURVIVAL\" | \"PREDATION\" | \"CODE_SIZE\",\n\
          \"envType\": \"EARTH\" | \"DEEP_SEA\" | \"SPACE\",\n\
          \"memoryLimit\": string (e.g. \"64KB\", \"1MB\"),\n\
          \"objective\": string (short description)\n\
        }}",
        user_command
    );

    let body = json!({
        "model": model,
        "prompt": prompt,
        "stream": false
    });
    let client = Client::new();
    let api_url = format!("{}/api/generate", normalize_ollama_url(&ollama_url));
    let response = client
        .post(api_url)
        .json(&body)
        .timeout(Duration::from_secs(20))
        .send()
        .await
        .map_err(|e| format!("Ollama 神谕请求失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama 神谕返回异常状态：{}", response.status()));
    }

    let payload = read_json_limited::<Value>(response)
        .await
        .map_err(|e| format!("Ollama 神谕响应解析失败：{}", e))?;
    let response_text = payload
        .get("response")
        .and_then(Value::as_str)
        .ok_or_else(|| "Ollama 神谕响应缺少 response 字段。".to_string())?;
    let config_text = extract_json_object(response_text)
        .ok_or_else(|| "神谕响应未包含 JSON 对象。".to_string())?;
    let config = serde_json::from_str::<Value>(&config_text)
        .map_err(|e| format!("神谕 JSON 解析失败：{}", e))?;

    if !config.is_object() {
        return Err("神谕响应不是配置对象。".to_string());
    }

    Ok(config)
}
