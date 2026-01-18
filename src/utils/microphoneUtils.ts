/**
 * Microphone utility functions with graceful fallback support
 * for both browser and Tauri desktop app environments
 */

export interface MicrophoneResult {
  stream: MediaStream;
  usedFallback: boolean;
  deviceId?: string;
}

const DEFAULT_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Get microphone stream with graceful fallback to default device
 * If the saved device ID is invalid, falls back to default and clears the saved ID
 */
export const getMicrophoneStream = async (
  savedDeviceId?: string | null
): Promise<MicrophoneResult> => {
  const deviceId = savedDeviceId || localStorage.getItem('selectedMicrophoneId') || undefined;
  
  // Try with saved device first
  if (deviceId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...DEFAULT_AUDIO_CONSTRAINTS,
          deviceId: { exact: deviceId },
        }
      });
      return { stream, usedFallback: false, deviceId };
    } catch (deviceError: any) {
      console.warn(`[Microphone] Saved device (${deviceId}) not available:`, deviceError.name);
      // Clear invalid device ID
      localStorage.removeItem('selectedMicrophoneId');
    }
  }
  
  // Fallback to default microphone
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: DEFAULT_AUDIO_CONSTRAINTS
  });
  
  return { 
    stream, 
    usedFallback: !!deviceId, 
    deviceId: undefined 
  };
};

/**
 * Get user-friendly error message for microphone errors
 */
export const getMicrophoneErrorMessage = (error: any): string => {
  if (error.name === 'NotAllowedError') {
    return 'Microphone access denied. Please allow microphone in browser settings.';
  } else if (error.name === 'NotFoundError') {
    return 'No microphone found. Please connect a microphone.';
  } else if (error.name === 'NotReadableError') {
    return 'Microphone is in use by another application.';
  } else if (error.name === 'OverconstrainedError') {
    return 'Selected microphone is not available.';
  } else if (error.name === 'SecurityError') {
    return 'Microphone access blocked by security settings.';
  } else {
    return `Could not access microphone: ${error.message || 'Unknown error'}`;
  }
};

/**
 * Validate if a device ID is still available
 */
export const isDeviceAvailable = async (deviceId: string): Promise<boolean> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(
      device => device.kind === 'audioinput' && device.deviceId === deviceId
    );
  } catch {
    return false;
  }
};

/**
 * Get list of available audio input devices
 */
export const getAudioInputDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch {
    return [];
  }
};

/**
 * Validate and clean up saved microphone preference
 * Call this on app startup or settings page load
 */
export const validateSavedMicrophone = async (): Promise<void> => {
  const savedId = localStorage.getItem('selectedMicrophoneId');
  if (savedId) {
    const isAvailable = await isDeviceAvailable(savedId);
    if (!isAvailable) {
      console.log('[Microphone] Saved device no longer available, clearing preference');
      localStorage.removeItem('selectedMicrophoneId');
    }
  }
};
