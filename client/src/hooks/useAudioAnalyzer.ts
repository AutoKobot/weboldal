import { useEffect, useRef, useState } from 'react';

export function useAudioAnalyzer(audioRef: React.RefObject<HTMLAudioElement>) {
  const [volume, setVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animationFrameRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Exportált resume függvény, amit a player hívhat user interactionnál
  const ensureContextReady = () => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;

    const initAnalyzer = () => {
      // AudioContext létrehozása, ha még nem létezik
      if (!audioContextRef.current) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current!;

      // Suspended context esetén azonnal resume-olunk
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }

      try {
        if (!analyserRef.current) {
          const analyser = context.createAnalyser();
          analyser.fftSize = 256;
          analyserRef.current = analyser;

          const bufferLength = analyser.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);

          // FONTOS: Az analyser-t kötjük a hangszórókhoz!
          analyser.connect(context.destination);
        }

        // Csak egyszer hozunk létre forráscsomópontot az audio elemhez
        if (audioRef.current && !sourceRef.current) {
          const source = context.createMediaElementSource(audioRef.current);
          source.connect(analyserRef.current!);
          sourceRef.current = source;
          console.log('Audio source connected to analyzer and speakers.');
        }
      } catch (err) {
        console.warn('Audio Analyzer init warning (element may already be connected):', err);
      }
    };

    const updateVolume = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const average = sum / dataArrayRef.current.length;
      setVolume(average / 128);

      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    const handlePlay = () => {
      // Inicializáljuk az AudioContext-et lejátszáskor (user interaction garantált)
      initAnalyzer();
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
