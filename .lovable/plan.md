
# Plan: Maximize Voice Recognition Power with WebGPU Acceleration

## Overview
This plan upgrades the voice dictation app to use the most powerful Whisper models available while leveraging WebGPU for hardware acceleration. The result will be significantly improved transcription accuracy with faster processing on modern browsers.

## Current Limitations
- Using `whisper-tiny.en` (~75MB) - the smallest and least accurate model
- Running exclusively on WASM (CPU) - missing 10-100x potential speedup from WebGPU
- VOSK preview using small model (9.85% word error rate)
- No automatic hardware detection or adaptive model selection

## Proposed Upgrades

### 1. Enable WebGPU with Automatic Fallback
- Add WebGPU capability detection
- Automatically use GPU acceleration when available (~70%+ of modern browsers)
- Gracefully fall back to WASM for older browsers
- Display current acceleration mode (GPU/CPU) to users

### 2. Upgrade to Larger Whisper Models

**New Model Tiers:**

| Tier | Model | Size | Accuracy | Best For |
|------|-------|------|----------|----------|
| **Performance** (Default) | `onnx-community/whisper-small.en` | ~244MB | ~2x better than tiny | WebGPU users - best balance |
| **Maximum** | `distil-whisper/distil-large-v3.5-ONNX` | ~400MB | Near large-v3 quality | Users wanting highest accuracy |
| **Balanced** | `onnx-community/whisper-base.en` | ~147MB | Good accuracy | Limited bandwidth users |
| **Fast** (Legacy) | `onnx-community/whisper-tiny.en` | ~75MB | Basic | Fallback/low-end devices |

### 3. Intelligent Model Selection
- Auto-select model based on:
  - WebGPU availability
  - Network speed (first-time download consideration)
  - User preference in settings
- Allow users to choose between "Fast", "Balanced", "Performance", and "Maximum" quality modes

### 4. Optimize Data Types for WebGPU
- Use `fp16` (half precision) on WebGPU for 2x memory reduction with minimal accuracy loss
- Use `q8` (8-bit quantization) on WASM for smaller memory footprint
- Apply per-component dtype optimization for larger models

### 5. Enhanced Settings UI
- Add visual indicator showing current acceleration (GPU vs CPU)
- Show estimated download sizes and time
- Allow switching between model tiers
- Show real-time accuracy comparison

## Technical Changes

### Files to Modify:

1. **`src/utils/modelConfig.ts`**
   - Add new model configurations for small, base, and distil-large-v3
   - Add WebGPU capability detection
   - Implement per-device dtype selection (fp16 for GPU, q8 for CPU)

2. **`src/services/whisperRecognition.ts`**
   - Attempt WebGPU device first, fallback to WASM
   - Use appropriate dtype based on device
   - Add streaming progress for larger model downloads

3. **`src/components/VoiceRecorder.tsx`**
   - Display GPU/CPU acceleration status
   - Show model tier being used

4. **`src/pages/Settings.tsx`**
   - Update model selection UI with new tiers
   - Add WebGPU status indicator
   - Show estimated download sizes

5. **`src/components/ModelLoader.tsx`**
   - Update to show which acceleration is active
   - Improve progress UI for larger downloads

## Expected Results

| Metric | Before | After (WebGPU + small.en) |
|--------|--------|---------------------------|
| Model Size | 75MB | 244MB |
| Word Error Rate | ~10% | ~5% |
| Processing Speed | CPU only | 10-100x faster with GPU |
| Accuracy | Basic | Professional quality |

## Rollout Strategy

1. **Phase 1**: Enable WebGPU detection and automatic usage
2. **Phase 2**: Upgrade default model to `whisper-small.en`
3. **Phase 3**: Add distil-large-v3 as premium tier option
4. **Phase 4**: Implement intelligent auto-selection based on device capabilities

## Compatibility Notes

- WebGPU works in Chrome 113+, Edge 113+, and Safari 18+
- Firefox requires enabling `dom.webgpu.enabled` flag
- Automatic fallback ensures all users get working transcription
- Larger models will be cached locally after first download
