import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';

interface MicTestProps {
  deviceId?: string;
}

export const MicTest = ({ deviceId }: MicTestProps) => {
  const [isTesting, setIsTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const startTest = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsTesting(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setLevel(Math.min(100, (avg / 128) * 100));
        
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.error('Failed to start mic test:', error);
    }
  };

  const stopTest = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    analyserRef.current = null;
    setIsTesting(false);
    setLevel(0);
  };

  useEffect(() => {
    return () => {
      stopTest();
    };
  }, []);

  return (
    <div className="mt-3 space-y-2">
      <Button
        onClick={isTesting ? stopTest : startTest}
        variant={isTesting ? 'destructive' : 'outline'}
        size="sm"
        className="w-full"
      >
        {isTesting ? (
          <>
            <Square className="mr-2 h-4 w-4" />
            Stop Test
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            Test Microphone
          </>
        )}
      </Button>
      
      {isTesting && (
        <div className="space-y-1">
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-75"
              style={{ width: `${level}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {level > 10 ? 'Microphone is working!' : 'Speak to test...'}
          </p>
        </div>
      )}
    </div>
  );
};
