import { useEffect, useRef, useState } from 'react';

export function useAudioAnalyzer(audioRef: React.RefObject<HTMLAudioElement>) {
  const [volume, setVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const initAnalyzer = () => {
      // Create context if it doesn't exist
      if (!audioContextRef.current) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current!;
      
      // We need to create a new source if the element changed or we haven't created one yet
      // BUT: createMediaElementSource can only be called ONCE per element.
      // So we track the last element we attached to.
      try {
        if (!analyserRef.current) {
          const analyser = context.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;
          
          const bufferLength = analyser.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
          
          // CRITICAL: Connect analyzer to speakers!
          analyser.connect(context.destination);
        }

        // Attach source to the CURRENT audio element
        if (sourceRef.current) {
          // If we already have a source, we might need to disconnect/reconnect 
          // depending on if it's the SAME element.
          // In some browsers, we can't easily swap elements on one source.
        }
        
        // Simply try to create the source. If it fails, it might already be attached (which is fine).
        if (audioRef.current && !sourceRef.current) {
          const source = context.createMediaElementSource(audioRef.current);
          source.connect(analyserRef.current);
          sourceRef.current = source;
          console.log("Audio source successfully connected to analyzer and speakers.");
        }
      } catch (err) {
        console.warn("Audio Analyzer initialization warning (may already be connected):", err);
      }
    };

    const updateVolume = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Kiszámoljuk az átlagos hangerőt (intenzitást)
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
      
      // Normalizáljuk 0-1 közé
      setVolume(average / 128);
      
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    const handlePlay = () => {
      initAnalyzer();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      updateVolume();
    };

    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setVolume(0);
    };

    const audio = audioRef.current;
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioRef]);

  return volume;
}
