import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle, Loader2, Cpu, Zap, Clock } from 'lucide-react';
import { loadModel, isModelLoaded, VoskProgress } from '@/services/voskRecognition';
import { getActiveDevice } from '@/services/whisperRecognition';

interface ModelLoaderProps {
  onModelReady: () => void;
}

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round(bytes / 1024 / 1024)}MB`;
};

export const ModelLoader = ({ onModelReady }: ModelLoaderProps) => {
  const [progress, setProgress] = useState<VoskProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<'webgpu' | 'wasm' | 'native'>('wasm');

  useEffect(() => {
    if (isModelLoaded()) {
      setStatus('ready');
      setDevice(getActiveDevice());
      onModelReady();
      return;
    }

    setStatus('loading');
    
    loadModel((progress) => {
      setProgress(progress);
    })
      .then(() => {
        setStatus('ready');
        setDevice(getActiveDevice());
        onModelReady();
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Failed to load voice recognition model');
      });
  }, [onModelReady]);

  if (status === 'ready') {
    const isGPU = device === 'webgpu';
    const isNative = device === 'native';
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Offline voice ready</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isNative || isGPU ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          {isNative ? <Zap className="h-3 w-3" /> : isGPU ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
          {isNative ? 'Native' : isGPU ? 'GPU' : 'CPU'}
        </span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-xs underline text-muted-foreground hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasProgress = progress && progress.total && progress.total > 0;

  return (
    <div className="p-4 rounded-xl bg-card border border-border smooth-transition">
      <div className="flex items-center gap-3 mb-3">
        {progress ? (
          <Download className="h-5 w-5 text-primary animate-pulse" />
        ) : (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            {progress ? 'Downloading voice model...' : 'Loading voice model...'}
          </p>
          <p className="text-xs text-muted-foreground">
            One-time download, cached for offline use
          </p>
        </div>
      </div>
      
      {hasProgress && (
        <div className="space-y-2">
          <Progress value={progress.percent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(progress.loaded!)} / {formatBytes(progress.total!)}</span>
            <div className="flex items-center gap-2">
              {progress.estimatedTimeRemaining !== undefined && progress.estimatedTimeRemaining > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(progress.estimatedTimeRemaining)} left
                </span>
              )}
              <span>{progress.percent}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
