import { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  stream: MediaStream | null;
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export const AudioWaveform = ({ 
  stream, 
  isActive, 
  barCount = 32,
  className = '' 
}: AudioWaveformProps) => {
  const [levels, setLevels] = useState<number[]>(new Array(barCount).fill(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !isActive) {
      setLevels(new Array(barCount).fill(0));
      return;
    }

    try {
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevels = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Sample the frequency data to get bar levels
        const newLevels: number[] = [];
        const step = Math.floor(dataArray.length / barCount);
        
        for (let i = 0; i < barCount; i++) {
          const index = Math.min(i * step, dataArray.length - 1);
          // Normalize to 0-1 range with some amplification
          const value = Math.min(1, (dataArray[index] / 255) * 1.5);
          newLevels.push(value);
        }
        
        setLevels(newLevels);
        animationRef.current = requestAnimationFrame(updateLevels);
      };

      updateLevels();
    } catch (error) {
      console.error('Failed to create audio analyser:', error);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stream, isActive, barCount]);

  if (!isActive) return null;

  return (
    <div className={`flex items-center justify-center gap-0.5 h-12 ${className}`}>
      {levels.map((level, index) => (
        <div
          key={index}
          className="w-1 bg-primary rounded-full transition-all duration-75"
          style={{
            height: `${Math.max(4, level * 48)}px`,
            opacity: 0.4 + level * 0.6,
          }}
        />
      ))}
    </div>
  );
};
