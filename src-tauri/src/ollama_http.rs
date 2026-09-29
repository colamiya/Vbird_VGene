use reqwest::Response;
use serde::de::DeserializeOwned;

pub(crate) const MAX_OLLAMA_RESPONSE_BYTES: usize = 256 * 1024;

fn append_bounded(body: &mut Vec<u8>, chunk: &[u8]) -> Result<(), String> {
    if body.len().saturating_add(chunk.len()) > MAX_OLLAMA_RESPONSE_BYTES {
        return Err(format!(
            "Ollama 响应超过 {} KiB 安全上限。",
            MAX_OLLAMA_RESPONSE_BYTES / 1024
        ));
    }
    body.extend_from_slice(chunk);
    Ok(())
}

pub(crate) async fn read_json_limited<T: DeserializeOwned>(
    mut response: Response,
) -> Result<T, String> {
    if response
        .content_length()
        .is_some_and(|length| length > MAX_OLLAMA_RESPONSE_BYTES as u64)
    {
        return Err(format!(
            "Ollama 响应超过 {} KiB 安全上限。",
            MAX_OLLAMA_RESPONSE_BYTES / 1024
        ));
    }

    let mut body = Vec::with_capacity(
        response
            .content_length()
            .unwrap_or(0)
            .min(MAX_OLLAMA_RESPONSE_BYTES as u64) as usize,
    );
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("读取 Ollama 响应失败：{error}"))?
    {
        append_bounded(&mut body, &chunk)?;
    }

    serde_json::from_slice(&body).map_err(|error| format!("解析 Ollama JSON 失败：{error}"))
}

#[cfg(test)]
mod tests {
    use super::{append_bounded, MAX_OLLAMA_RESPONSE_BYTES};

    #[test]
    fn accepts_response_at_exact_limit() {
        let mut body = Vec::new();
        append_bounded(&mut body, &vec![0; MAX_OLLAMA_RESPONSE_BYTES])
            .expect("exact response limit should be accepted");
        assert_eq!(body.len(), MAX_OLLAMA_RESPONSE_BYTES);
    }

    #[test]
    fn rejects_response_over_limit_without_appending_chunk() {
        let mut body = vec![0; MAX_OLLAMA_RESPONSE_BYTES];
        assert!(append_bounded(&mut body, &[1]).is_err());
        assert_eq!(body.len(), MAX_OLLAMA_RESPONSE_BYTES);
    }
}
