import { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';

interface FastPreloaderProps {
  onComplete?: () => void;
  minDisplayTime?: number;
}

export default function FastPreloader({ onComplete, minDisplayTime = 800 }: FastPreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsComplete(true);
            onComplete?.();
          }, 200);
          return 100;
        }
        return prev + Math.random() * 15 + 5; // Smooth progress
      });
    }, 50);

    // Minimum display time
    const minTimer = setTimeout(() => {
      if (progress >= 100) {
        setIsComplete(true);
        onComplete?.();
      }
    }, minDisplayTime);

    return () => {
      clearInterval(interval);
      clearTimeout(minTimer);
    };
  }, [onComplete, minDisplayTime, progress]);

  if (isComplete) return null;

  return (
    <div className="fixed inset-0 z-50 bg-optimized-gradient flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Animated Logo */}
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center animate-pulse">
            <Brain className="text-white" size={32} />
          </div>
          
          {/* Rotating ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-xl animate-spin"></div>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-800">Global Learning System</h2>
          <p className="text-gray-600 animate-pulse">Rendszer inicializálása...</p>
        </div>
      </div>
    </div>
  );
}