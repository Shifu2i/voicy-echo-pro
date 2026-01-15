// Native Whisper support - only compiled when feature is enabled
// Falls back to WASM Whisper in the frontend when disabled

#[cfg(feature = "native-whisper")]
mod native {
    use std::path::PathBuf;
    use std::sync::Mutex;
    use tauri::{command, AppHandle, Emitter, Runtime};
    use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

    // Global state for loaded model
    static WHISPER_CTX: Mutex<Option<WhisperContext>> = Mutex::new(None);
    static MODEL_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

    /// Get the models directory for storing Whisper models
    fn get_models_dir() -> Result<PathBuf, String> {
        let data_dir = dirs::data_local_dir()
            .ok_or_else(|| "Could not find local data directory".to_string())?;
        let models_dir = data_dir.join("voice-dictation-widget").join("models");
        std::fs::create_dir_all(&models_dir)
            .map_err(|e| format!("Failed to create models directory: {}", e))?;
        Ok(models_dir)
    }

    /// Check if the Whisper model is already downloaded
    #[command]
    pub fn is_whisper_model_downloaded() -> bool {
        if let Ok(models_dir) = get_models_dir() {
            let model_path = models_dir.join("ggml-base.en.bin");
            model_path.exists()
        } else {
            false
        }
    }

    /// Get the path to the downloaded model
    #[command]
    pub fn get_whisper_model_path() -> Result<String, String> {
        let models_dir = get_models_dir()?;
        let model_path = models_dir.join("ggml-base.en.bin");
        if model_path.exists() {
            Ok(model_path.to_string_lossy().to_string())
        } else {
            Err("Model not downloaded".to_string())
        }
    }

    /// Download the Whisper model with progress updates
    #[command]
    pub async fn download_whisper_model<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
        let models_dir = get_models_dir()?;
        let model_path = models_dir.join("ggml-base.en.bin");
        
        // Check if already downloaded
        if model_path.exists() {
            return Ok(model_path.to_string_lossy().to_string());
        }
        
        // Download from Hugging Face
        let url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";
        
        let _ = app.emit("whisper-download-start", ());
        
        let client = reqwest::Client::new();
        let response = client.get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to start download: {}", e))?;
        
        let total_size = response.content_length().unwrap_or(0);
        let downloaded: u64;
        
        let mut file = std::fs::File::create(&model_path)
            .map_err(|e| format!("Failed to create model file: {}", e))?;
        
        use std::io::Write;
        let bytes = response.bytes().await
            .map_err(|e| format!("Failed to download: {}", e))?;
        
        file.write_all(&bytes)
            .map_err(|e| format!("Failed to write model file: {}", e))?;
        
        downloaded = bytes.len() as u64;
        
        let _ = app.emit("whisper-download-progress", serde_json::json!({
            "downloaded": downloaded,
            "total": total_size,
            "progress": if total_size > 0 { (downloaded as f64 / total_size as f64 * 100.0) as u32 } else { 100 }
        }));
        
        let _ = app.emit("whisper-download-complete", ());
        
        Ok(model_path.to_string_lossy().to_string())
    }

    /// Load the Whisper model into memory
    #[command]
    pub fn load_whisper_model() -> Result<(), String> {
        let models_dir = get_models_dir()?;
        let model_path = models_dir.join("ggml-base.en.bin");
        
        if !model_path.exists() {
            return Err("Model not downloaded. Call download_whisper_model first.".to_string());
        }
        
        let ctx = WhisperContext::new_with_params(
            model_path.to_str().ok_or("Invalid model path")?,
            WhisperContextParameters::default()
        ).map_err(|e| format!("Failed to load Whisper model: {}", e))?;
        
        let mut whisper_ctx = WHISPER_CTX.lock().map_err(|_| "Lock poisoned")?;
        *whisper_ctx = Some(ctx);
        
        let mut stored_path = MODEL_PATH.lock().map_err(|_| "Lock poisoned")?;
        *stored_path = Some(model_path);
        
        Ok(())
    }

    /// Check if Whisper model is loaded
    #[command]
    pub fn is_whisper_loaded() -> bool {
        WHISPER_CTX.lock().map(|ctx| ctx.is_some()).unwrap_or(false)
    }

    /// Transcribe audio data using native Whisper
    /// Expects raw PCM audio data at 16kHz mono
    #[command]
    pub fn transcribe_audio_native(audio_data: Vec<f32>) -> Result<String, String> {
        let whisper_ctx = WHISPER_CTX.lock().map_err(|_| "Lock poisoned")?;
        let ctx = whisper_ctx.as_ref()
            .ok_or("Whisper model not loaded. Call load_whisper_model first.")?;
        
        let mut state = ctx.create_state()
            .map_err(|e| format!("Failed to create Whisper state: {}", e))?;
        
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        
        // Configure for English
        params.set_language(Some("en"));
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_suppress_blank(true);
        params.set_single_segment(false);
        
        // Run inference
        state.full(params, &audio_data)
            .map_err(|e| format!("Transcription failed: {}", e))?;
        
        // Collect all segments
        let num_segments = state.full_n_segments()
            .map_err(|e| format!("Failed to get segment count: {}", e))?;
        
        let mut result = String::new();
        for i in 0..num_segments {
            if let Ok(segment) = state.full_get_segment_text(i) {
                result.push_str(&segment);
                result.push(' ');
            }
        }
        
        Ok(result.trim().to_string())
    }

    /// Transcribe audio from a WAV file path
    #[command]
    pub fn transcribe_audio_file(file_path: String) -> Result<String, String> {
        // Read WAV file
        let mut reader = hound::WavReader::open(&file_path)
            .map_err(|e| format!("Failed to open audio file: {}", e))?;
        
        let spec = reader.spec();
        
        // Convert to f32 samples
        let samples: Vec<f32> = if spec.bits_per_sample == 16 {
            reader.samples::<i16>()
                .filter_map(|s| s.ok())
                .map(|s| s as f32 / 32768.0)
                .collect()
        } else {
            reader.samples::<i32>()
                .filter_map(|s| s.ok())
                .map(|s| s as f32 / 2147483648.0)
                .collect()
        };
        
        // Resample to 16kHz if needed
        let samples = if spec.sample_rate != 16000 {
            let ratio = 16000.0 / spec.sample_rate as f32;
            let new_len = (samples.len() as f32 * ratio) as usize;
            let mut resampled = Vec::with_capacity(new_len);
            for i in 0..new_len {
                let src_idx = (i as f32 / ratio) as usize;
                if src_idx < samples.len() {
                    resampled.push(samples[src_idx]);
                }
            }
            resampled
        } else {
            samples
        };
        
        // Convert stereo to mono if needed
        let samples = if spec.channels == 2 {
            samples.chunks(2)
                .map(|chunk| (chunk[0] + chunk.get(1).unwrap_or(&0.0)) / 2.0)
                .collect()
        } else {
            samples
        };
        
        transcribe_audio_native(samples)
    }

    /// Unload the Whisper model from memory
    #[command]
    pub fn unload_whisper_model() -> Result<(), String> {
        let mut whisper_ctx = WHISPER_CTX.lock().map_err(|_| "Lock poisoned")?;
        *whisper_ctx = None;
        
        let mut stored_path = MODEL_PATH.lock().map_err(|_| "Lock poisoned")?;
        *stored_path = None;
        
        Ok(())
    }
}

// Re-export native commands when feature is enabled
#[cfg(feature = "native-whisper")]
pub use native::*;

// Stub implementations when native whisper is disabled
// These allow the app to compile and run, falling back to WASM Whisper

#[cfg(not(feature = "native-whisper"))]
use tauri::command;

#[cfg(not(feature = "native-whisper"))]
#[command]
pub fn is_whisper_model_downloaded() -> bool {
    false
}

#[cfg(not(feature = "native-whisper"))]
#[command]
pub fn get_whisper_model_path() -> Result<String, String> {
    Err("Native Whisper not enabled. Using WASM fallback.".to_string())
}

#[cfg(not(feature = "native-whisper"))]
#[command]
pub async fn download_whisper_model() -> Result<String, String> {
    Err("Native Whisper not enabled. Using WASM fallback.".to_string())
}

#[cfg(not(feature = "native-whisper"))]
#[command]
pub fn load_whisper_model() -> Result<(), String> {
    Err("Native Whisper not enabled. Using WASM fallback.".to_string())
}

#[cfg(not(feature = "native-whisper"))]
#[command]
pub fn is_whisper_loaded() -> bool {
    false
}

#[cfg(not(feature = "native-whisper"))]
#[command]
pub fn transcribe_audio_native(_audio_data: Vec<f32>) -> Result<String, String> {
    Err("Native Whisper not enabled. Using WASM fallback.".to_string())
}

#[cfg(not(feature = "native-whisper"))]
#[command]
pub fn transcribe_audio_file(_file_path: String) -> Result<String, String> {
    Err("Native Whisper not enabled. Using WASM fallback.".to_string())
}

#[cfg(not(feature = "native-whisper"))]
#[command]
pub fn unload_whisper_model() -> Result<(), String> {
    Ok(())
}
