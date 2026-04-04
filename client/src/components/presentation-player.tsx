import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, MonitorPlay, HelpCircle, Volume2, VolumeX, Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";
import { FBXAvatar } from "./FBXAvatar";
import { AVATARS } from "@/lib/avatars";
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
  interactiveType?: string;
  interactiveData?: any;
}

interface PresentationPlayerProps {
  slides: Slide[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleTitle: string;
}

// Interactive Component Handler
function InteractiveContent({ slide }: { slide: Slide }) {
  if (!slide.interactiveType || !slide.interactiveData) return null;

  switch (slide.interactiveType) {
    case 'quiz':
      return <SlideQuiz data={slide.interactiveData} />;
    case 'drag-drop':
      return <SlideDragDrop data={slide.interactiveData} />;
    case 'hotspot':
      return <SlideHotspots data={slide.interactiveData} imageUrl={slide.imageUrl} />;
    default:
      return (
        <div className="p-6 bg-blue-900/10 border border-blue-900/30 rounded-2xl flex items-center gap-4">
          <HelpCircle className="w-8 h-8 text-blue-400" />
          <div>
             <p className="font-bold text-blue-300 uppercase text-xs tracking-widest text-left">Elemezni való egység</p>
             <p className="text-sm text-blue-100/60 text-left">Interaktív feladat: {slide.interactiveType}</p>
          </div>
        </div>
      );
  }
}

export function PresentationPlayer({ slides, open, onOpenChange, moduleTitle }: PresentationPlayerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const volume = useAudioAnalyzer(audioRef);

  const currentSlide = slides?.[currentSlideIndex];
  const currentAvatarDef = AVATARS[0];
  const avatarUrl = `/avatars/${currentAvatarDef.filename}`;

  // AudioContext resume segédfüggvény – böngésző autoplay policy megkerülése
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

  // Audio lejátszó logika – slide váltáskor és play/pause állapotkor fut le
  useEffect(() => {
    if (!open || !audioRef.current || !currentSlide) return;
    const audio = audioRef.current;

    if (currentSlide.narrationAudioUrl) {
      // Ha a URL relatív, adjuk hozzá a host-ot
      const rawUrl = currentSlide.narrationAudioUrl;
      const fullUrl = rawUrl.startsWith('http')
        ? rawUrl
        : `${window.location.protocol}//${window.location.host}${rawUrl}`;

      // Csak akkor töltjük újra, ha más a forrás
      if (audio.src !== fullUrl) {
        audio.src = fullUrl;
        audio.load();
      }
      audio.muted = isMuted;

      if (isPlaying) {
        // Mindig próbáljuk resume-olni az AudioContext-et lejátszás előtt
        resumeAudioContext().then(() => {
          audio.play().catch(err => {
            console.warn("Audio lejátszás megakadályozva (autoplay policy):", err);
          });
        });
      } else {
        audio.pause();
      }

      audio.onended = () => {
        if (autoAdvance && currentSlideIndex < slides.length - 1) {
          setTimeout(() => setCurrentSlideIndex(prev => prev + 1), 1500);
        } else if (currentSlideIndex === slides.length - 1) {
          setIsPlaying(false);
        }
      };

      // Hangfájl hiba esetén: 4.5 mp után következő dia
      audio.onerror = () => {
        console.warn("Hangfájl nem töltődött be, automatikus továbblépés:", fullUrl);
        if (autoAdvance && isPlaying) {
          setTimeout(() => {
            if (currentSlideIndex < slides.length - 1) {
              setCurrentSlideIndex(prev => prev + 1);
            } else {
              setIsPlaying(false);
            }
          }, 4500);
        }
      };
    } else {
      // Nincs hangfájl: ha auto-advance be van kapcsolva, időzítővel lépünk tovább
      audio.pause();
      if (isPlaying && autoAdvance && currentSlideIndex < slides.length - 1) {
        const timer = setTimeout(() => setCurrentSlideIndex(prev => prev + 1), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentSlideIndex, open, isPlaying, isMuted, currentSlide?.narrationAudioUrl, autoAdvance]);

  // Megnyitáskor: nullázzuk a prezit és indítjuk a lejátszást
  useEffect(() => {
    if (open) {
      setCurrentSlideIndex(0);
      setHasStarted(false);
      setIsPlaying(false);
    } else {
      setIsPlaying(false);
      setHasStarted(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    }
  }, [open]);

  if (!slides || slides.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-none w-screen h-screen p-0 m-0 overflow-hidden bg-slate-950 border-none shadow-none rounded-none flex flex-col items-center justify-center text-center z-[999]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 max-w-md p-8"
          >
            <div className="bg-slate-900 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-slate-800 shadow-2xl">
              <MonitorPlay className="w-12 h-12 text-slate-600" />
            </div>
            <h3 className="text-3xl font-bold text-white">Nincs még prezentáció</h3>
            <p className="text-slate-400 text-lg leading-relaxed">
              Ehhez a modulhoz még nem generáltad le az AI alapú, interaktív prezentációt. Menj az Admin felületre és kattints az AI Újragenerálás gombra!
            </p>
            <Button 
              onClick={() => onOpenChange(false)}
              className="bg-blue-600 hover:bg-blue-500 rounded-xl mt-8 min-w-[12rem] h-12"
            >
              Bezárás
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }

  const nextSlide = () => currentSlideIndex < slides.length - 1 && setCurrentSlideIndex(currentSlideIndex + 1);
  const prevSlide = () => currentSlideIndex > 0 && setCurrentSlideIndex(currentSlideIndex - 1);
  const togglePlay = async () => {
    await resumeAudioContext(); // Böngésző autoplay policy feloldása user interactionnál
    setIsPlaying(prev => !prev);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 m-0 overflow-hidden bg-slate-950 border-none shadow-none rounded-none flex flex-col focus:outline-none z-[999]">
        
        {/* Start Screen Overlay */}
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

        <audio ref={audioRef} style={{ display: 'none' }} crossOrigin="anonymous" />

        {/* Header - Compact */}
        <div className="bg-slate-900/95 p-3 px-6 border-b border-slate-800 flex items-center justify-between z-10 backdrop-blur-md shrink-0 h-16">
          <div className="flex items-center gap-3">
            <MonitorPlay className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-bold text-slate-200 text-sm leading-none">{moduleTitle}</h3>
              <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider font-light">Automata AI Narrált Prezentáció</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-800/50 rounded-lg px-2 py-1 gap-1 border border-slate-700/50">
              <Button variant="ghost" size="icon" onClick={togglePlay} className="h-7 w-7 text-slate-400 hover:text-white rounded-md transition-all">
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-7 w-7 text-slate-400 hover:text-white rounded-md transition-all">
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
            
            <Badge variant="outline" className="font-mono text-slate-500 border-slate-800">
              {currentSlideIndex + 1} / {slides.length}
            </Badge>
            
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Slide Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col p-4 md:p-10 pt-6 bg-slate-950">
          
          {/* Avatar - Bottom Left Safe Position */}
          <div className="absolute bottom-6 left-6 w-48 h-64 z-20 pointer-events-none overflow-visible">
            <FBXAvatar 
              url={avatarUrl} 
              className="w-full h-full"
              volume={volume}
              isMoving={false}
              direction={1}
            />
            {isPlaying && volume > 0.05 && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-1 items-end h-6">
                <motion.div initial={{ height: 0 }} animate={{ height: '40%' }} className="w-1 bg-blue-500 rounded-full" transition={{ repeat: Infinity, duration: 0.3, repeatType: 'reverse' }} />
                <motion.div initial={{ height: 0 }} animate={{ height: '80%' }} className="w-1 bg-blue-400 rounded-full" transition={{ repeat: Infinity, duration: 0.4, repeatType: 'reverse' }} />
              </div>
            )}
          </div>

          <div className="w-full h-full max-w-[1400px] mx-auto flex flex-col relative z-0">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentSlideIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full w-full flex flex-col justify-center"
              >
                {currentSlide.type === "title" ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center space-y-8">
                    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
                      <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight">
                        {currentSlide.title}
                      </h1>
                      {currentSlide.subtitle && (
                        <p className="text-xl md:text-2xl text-blue-400 font-medium tracking-wide">
                          {currentSlide.subtitle}
                        </p>
                      )}
                    </motion.div>
                  </div>
                ) : (
                  <div className={`h-full w-full grid gap-10 items-center ${(!currentSlide.imageUrl || !currentSlide.layout.includes('image')) ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                    
                    <div className={`flex flex-col justify-center space-y-6 ${(!currentSlide.imageUrl || !currentSlide.layout.includes('image')) ? 'col-span-full max-w-4xl mx-auto' : (currentSlide.layout === 'split-right-image' ? 'order-1' : 'order-2')}`}>
                      <div className="space-y-3">
                        <Badge variant="outline" className="text-blue-500 border-blue-900/40 bg-blue-900/10 uppercase tracking-widest text-[10px] px-3 py-1">
                          Slide {currentSlideIndex + 1}
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
                          {currentSlide.title}
                        </h2>
                      </div>
                      
                      <div className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed overflow-y-auto max-h-[30vh] custom-scrollbar pr-2">
                        {currentSlide.content.includes('<li>') || currentSlide.content.includes('<p>') ? (
                          <div dangerouslySetInnerHTML={{ __html: currentSlide.content }} />
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {currentSlide.content}
                          </ReactMarkdown>
                        )}
                      </div>

                      <div className="shrink-0 max-h-[40vh] overflow-y-auto custom-scrollbar">
                        <InteractiveContent slide={currentSlide} />
                      </div>
                    </div>

                    {currentSlide.layout.includes('image') && currentSlide.imageUrl && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`h-full flex items-center justify-center ${currentSlide.layout === 'split-right-image' ? 'order-2' : 'order-1'}`}
                      >
                        <div className="relative w-full h-[55vh] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-slate-900">
                          <img 
                            src={currentSlide.imageUrl} 
                            alt="Visual" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer - Compact */}
        <div className="bg-slate-900/95 p-4 border-t border-slate-800 flex items-center justify-between backdrop-blur-md shrink-0 h-20 px-8">
          <Button 
            onClick={prevSlide} 
            disabled={currentSlideIndex === 0}
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-800 min-w-[10rem] h-12 rounded-xl text-md font-semibold transition-all"
          >
            <ChevronLeft className="mr-2 w-5 h-5" /> Előző
          </Button>

          <div className="flex gap-2.5 px-4">
            {slides.map((_, i) => (
              <motion.div 
                key={i} 
                animate={{ 
                  width: i === currentSlideIndex ? '2.5rem' : '0.6rem',
                  backgroundColor: i === currentSlideIndex ? '#3b82f6' : (i < currentSlideIndex ? '#2563eb44' : '#1e293b')
                }}
                className="h-1.5 rounded-full transition-all"
              />
            ))}
          </div>

          <Button 
            onClick={nextSlide} 
            disabled={currentSlideIndex === slides.length - 1}
            className="bg-blue-600 hover:bg-blue-500 text-white min-w-[10rem] h-12 rounded-xl shadow-lg shadow-blue-900/20 text-md font-semibold transition-all active:scale-95"
          >
            {currentSlideIndex === slides.length - 1 ? 'Befejezés' : 'Következő'} <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
