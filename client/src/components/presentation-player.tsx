import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, MonitorPlay, HelpCircle, Volume2, VolumeX, Play, Pause, RotateCcw, ImageOff, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

import { SlideQuiz } from "./presentation-interactive/SlideQuiz";
import { SlideDragDrop } from "./presentation-interactive/SlideDragDrop";
import { SlideHotspots } from "./presentation-interactive/SlideHotspots";

interface Slide {
  id: number;
  type: string;
  title: string;
  subtitle?: string;
  content: string;
  narration?: string;
  narrationAudioUrl?: string;
  layout: string;
  imageUrl?: string;
  imageUrls?: string[];
  interactiveType?: string;
  interactiveData?: any;
}

interface PresentationPlayerProps {
  slides: Slide[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleTitle: string;
}

function SlideImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Reset when src changes (slide navigation)
  useEffect(() => {
    setStatus('loading');
  }, [src]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-slate-900/60 rounded-[2rem]">
          <ImageOff className="w-12 h-12 text-slate-500" />
          <p className="text-slate-500 text-sm text-center px-4">A kép nem elérhető</p>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-105 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}

function InteractiveContent({ slide, onComplete }: { slide: Slide, onComplete?: () => void }) {
  if (!slide?.interactiveType || slide.interactiveType === 'none' || !slide.interactiveData) return null;

  switch (slide.interactiveType) {
    case 'quiz':
      return <SlideQuiz data={slide.interactiveData} onComplete={onComplete} />;
    case 'drag-drop':
      return <SlideDragDrop data={slide.interactiveData} onComplete={onComplete} />;
    case 'hotspot':
      return <SlideHotspots data={slide.interactiveData} imageUrl={slide.imageUrl} onComplete={onComplete} />;
    default:
      return null;
  }
}

export function PresentationPlayer({ slides = [], open, onOpenChange, moduleTitle }: PresentationPlayerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isInteractiveCompleted, setIsInteractiveCompleted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const currentSlide = slides?.[currentSlideIndex];

  const resumeAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new Ctx() as AudioContext;
      }
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch (e) {
      console.warn('AudioContext resume failed:', e);
    }
  };

  // 1. Reset logic
  useEffect(() => {
    if (open) {
      setCurrentSlideIndex(0);
      setHasStarted(false);
      setIsPlaying(false);
      setIsInteractiveCompleted(false);
    } else {
      setIsPlaying(false);
      setHasStarted(false);
      setIsInteractiveCompleted(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }
  }, [open]);

  // 2. Audio & Navigation Loop
  useEffect(() => {
    if (!open || !audioRef.current || !currentSlide || !hasStarted) return;
    const audio = audioRef.current;

    // Cleanup function for canplay listener
    let onCanPlay: (() => void) | null = null;
    const cleanupCanPlay = () => {
      if (onCanPlay) {
        audio.removeEventListener('canplay', onCanPlay);
        onCanPlay = null;
      }
    };

    if (currentSlide.narrationAudioUrl) {
      const rawUrl = currentSlide.narrationAudioUrl;
      const fullUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${window.location.protocol}//${window.location.host}${rawUrl}`;

      // Compare only the path+search part to avoid false mismatches between
      // relative (/uploads/...) and absolute (http://host/uploads/...) URLs
      const normalizeUrl = (u: string) => {
        try { return new URL(u).pathname + new URL(u).search; } catch { return u; }
      };
      const currentNorm = audio.src ? normalizeUrl(audio.src) : '';
      const newNorm = normalizeUrl(fullUrl);

      const srcChanged = currentNorm !== newNorm;
      if (srcChanged) {
        cleanupCanPlay(); // Remove any pending canplay listener before loading new src
        audio.src = fullUrl;
        audio.load();
      }
      audio.muted = isMuted;

      if (isPlaying) {
        if (srcChanged) {
          // Wait for audio to be ready before playing (prevents NotSupportedError race condition)
          onCanPlay = () => {
            cleanupCanPlay();
            resumeAudioContext().then(() => {
              audio.play().catch(err => console.warn("Autoplay blocked:", err));
            });
          };
          audio.addEventListener('canplay', onCanPlay);
        } else if (audio.paused) {
          resumeAudioContext().then(() => {
            audio.play().catch(err => console.warn("Autoplay blocked:", err));
          });
        }
      } else {
        audio.pause();
      }

      audio.onended = () => {
        const isInteractive = currentSlide.interactiveType && currentSlide.interactiveType !== 'none';
        const isSummary = currentSlide.type === 'summary';
        
        if (autoAdvance && !isInteractive && !isSummary && currentSlideIndex < slides.length - 1) {
          // Increase delay to 3 seconds for better experience
          setTimeout(() => setCurrentSlideIndex(prev => prev + 1), 3000);
        } else {
          // Explicitly stop playing when we reach an interactive slide or the end
          setIsPlaying(false);
        }
      };

      audio.onerror = (e: any) => {
        const target = e.target as HTMLAudioElement;
        console.error(`[Audio] Failed to load audio source: ${target?.src || 'unknown'}`);
        cleanupCanPlay();
        if (autoAdvance && isPlaying && currentSlideIndex < slides.length - 1) {
          setTimeout(() => setCurrentSlideIndex(prev => prev + 1), 2000);
        }
      };
    } else {
      // No audio for this slide – auto-advance after delay (only if not interactive)
      audio.pause();
      const isInteractive = currentSlide.interactiveType && currentSlide.interactiveType !== 'none';
      if (isPlaying && autoAdvance && !isInteractive && currentSlideIndex < slides.length - 1) {
        const timer = setTimeout(() => setCurrentSlideIndex(prev => prev + 1), 5000);
        return () => { clearTimeout(timer); cleanupCanPlay(); };
      }
    }

    return () => cleanupCanPlay();
  }, [open, currentSlideIndex, isPlaying, isMuted, slides.length, currentSlide, autoAdvance, hasStarted]);

  useEffect(() => {
    setIsInteractiveCompleted(false);
  }, [currentSlideIndex]);

  // Mandatory checks AFTER hooks
  if (!open) return null;

  if (!slides || slides.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[70vw] w-full h-[80vh] p-0 bg-slate-950 border-slate-800 overflow-hidden outline-none flex items-center justify-center">
          <div className="sr-only">
            <DialogTitle>Nincs tartalom</DialogTitle>
            <DialogDescription>Ehhez a modulhoz még nem készült interaktív prezentáció.</DialogDescription>
          </div>
          <div className="text-center space-y-6 max-w-md p-12 bg-slate-900/50 rounded-[3rem] border border-slate-800 shadow-2xl backdrop-blur-xl">
             <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                <HelpCircle className="w-10 h-10 text-blue-500 animate-pulse" />
             </div>
             <div className="space-y-3">
               <h3 className="text-3xl font-black text-white tracking-tight">Nincs tartalom</h3>
               <p className="text-slate-400 text-lg leading-relaxed">Ehhez a modulhoz még nem készült interaktív prezentáció. Próbáld meg az újragenerálást!</p>
             </div>
             <Button 
               onClick={() => onOpenChange(false)} 
               className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-10 py-6 text-lg font-bold transition-all shadow-lg shadow-blue-600/20"
             >
               Vissza a modulhoz
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const nextSlide = () => currentSlideIndex < slides.length - 1 && setCurrentSlideIndex(currentSlideIndex + 1);
  const prevSlide = () => currentSlideIndex > 0 && setCurrentSlideIndex(currentSlideIndex - 1);
  const togglePlay = async () => {
    await resumeAudioContext();
    setIsPlaying(prev => !prev);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 m-0 overflow-hidden bg-slate-950 border-none shadow-none rounded-none flex flex-col focus:outline-none z-[999]">
        {/* Accessibility Title + Description (Required by Radix) */}
        <div className="sr-only">
          <DialogTitle>{moduleTitle || "Szakmai Prezentáció"}</DialogTitle>
          <DialogDescription>Interaktív AI prezentáció hanggal és animációkkal.</DialogDescription>
        </div>
        
        {!hasStarted && (
          <div className="absolute inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 p-12 bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl max-w-lg"
            >
              <div className="w-24 h-24 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(37,99,235,0.3)]">
                <Play className="w-10 h-10 ml-2" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-white tracking-tight">Készen állsz?</h2>
                <p className="text-slate-400 text-lg">A prezentáció hanggal és interaktív elemekkel felszerelve indul.</p>
              </div>
              <Button 
                size="lg"
                className="w-full text-lg h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 font-semibold transition-all hover:scale-105 active:scale-95"
                onClick={async () => {
                  await resumeAudioContext();
                  setHasStarted(true);
                  setIsPlaying(true);
                }}
              >
                <Play className="w-5 h-5 mr-3" /> Prezentáció indítása
              </Button>
            </motion.div>
          </div>
        )}

        <audio ref={audioRef} className="hidden" />
        
        <div className="h-20 bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-8 z-50 shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <MonitorPlay className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">{moduleTitle || "Szakmai Prezentáció"}</h2>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs py-0 px-2.5 h-5">AI Segédlet</Badge>
                <span className="text-slate-500 text-xs font-medium">Modul {currentSlideIndex + 1} / {slides.length}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMuted(prev => !prev)}
              className="w-11 h-11 rounded-xl bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="w-11 h-11 rounded-xl bg-slate-800/40 border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all font-bold"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-950/40">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlideIndex}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full h-full min-h-full px-8 py-10"
              >
                {currentSlide && (
                  <div className={`grid h-full w-full gap-10 max-w-[1400px] mx-auto 
                    ${currentSlide?.layout === 'split-right-image' || currentSlide?.layout === 'grid' ? 'lg:grid-cols-[1.1fr,1fr]' : 'grid-cols-1'}`}
                  >
                    <div className="flex flex-col justify-center min-w-0 order-1">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Badge className="mb-4 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-xs">
                          {currentSlide?.subtitle || "Interaktív Tananyag"}
                        </Badge>
                        <h1 className="text-4xl lg:text-5xl font-black text-white mb-8 leading-[1.15] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                          {currentSlide?.title}
                        </h1>
                        <div className="prose prose-invert prose-lg max-w-none 
                          prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-5
                          prose-headings:text-white prose-headings:font-bold
                          prose-strong:text-blue-400 prose-strong:font-bold
                          prose-ul:my-6 prose-li:my-2 prose-li:text-slate-300"
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {currentSlide?.content || ""}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                      
                      <div className="mt-10">
                        <InteractiveContent 
                          slide={currentSlide} 
                          onComplete={() => setIsInteractiveCompleted(true)}
                        />
                      </div>
                    </div>

                    {(currentSlide?.imageUrl || (currentSlide?.imageUrls && currentSlide.imageUrls.length > 0)) && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        className={`h-full flex items-center justify-center order-2 min-w-0`}
                      >
                        <div className={`grid gap-4 w-full h-[60vh] lg:h-[65vh] max-w-full 
                          ${(currentSlide?.imageUrls?.length || 1) > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
                        >
                          {currentSlide?.imageUrls && currentSlide.imageUrls.length > 0 ? (
                            currentSlide.imageUrls.map((url: string, idx: number) => (
                              <div key={idx} className="relative rounded-[2rem] overflow-hidden shadow-xl border-2 border-slate-800/40 bg-slate-900/50 flex items-center justify-center group h-full">
                                <SlideImage src={url} alt={`Visual ${idx + 1}`} />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent pointer-events-none" />
                              </div>
                            ))
                          ) : (
                            <div className="relative rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)] border-4 border-slate-800/40 bg-slate-900/50 flex items-center justify-center group h-full">
                              <SlideImage src={currentSlide?.imageUrl || ''} alt="Visual" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent pointer-events-none" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-slate-900/95 p-4 border-t border-slate-800 flex items-center justify-between backdrop-blur-md shrink-0 h-20 px-8">
          <Button 
            onClick={prevSlide} 
            disabled={currentSlideIndex === 0}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-800 min-w-[10rem] h-12 rounded-xl text-md font-semibold transition-all"
          >
            <ChevronLeft className="mr-2 w-5 h-5" /> Előző
          </Button>

          <div className="flex gap-3 px-6">
            {slides.map((_, i) => (
              <motion.div 
                key={i} 
                animate={{ 
                  width: i === currentSlideIndex ? '2.5rem' : '0.6rem',
                  backgroundColor: i === currentSlideIndex ? '#3b82f6' : (i < currentSlideIndex ? '#2563eb66' : '#1e293b')
                }}
                className="h-1.5 rounded-full transition-all"
              />
            ))}
          </div>

          <Button 
            onClick={nextSlide} 
            disabled={currentSlideIndex === slides.length - 1}
            className={`min-w-[10rem] h-12 rounded-xl shadow-xl text-md font-bold transition-all active:scale-95 flex items-center justify-center gap-2
              ${isInteractiveCompleted 
                ? 'bg-green-600 hover:bg-green-500 shadow-green-900/20 animate-bounce' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}
            `}
          >
            {currentSlideIndex === slides.length - 1 ? 'Befejezés' : 'Következő'} 
            <ChevronRight className={`w-5 h-5 ${isInteractiveCompleted ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
