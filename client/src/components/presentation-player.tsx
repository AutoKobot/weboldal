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
  const [isMuted, setIsMuted] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const volume = useAudioAnalyzer(audioRef);

  const currentSlide = slides[currentSlideIndex];
  const currentAvatarDef = AVATARS[0];
  const avatarUrl = `/avatars/${currentAvatarDef.filename}`;

  useEffect(() => {
    if (!open || !audioRef.current || !currentSlide) return;
    const audio = audioRef.current;

    if (currentSlide.narrationAudioUrl) {
      const fullUrl = `${window.location.protocol}//${window.location.host}${currentSlide.narrationAudioUrl}`;
      if (audio.src !== fullUrl) {
        audio.src = fullUrl;
        audio.load();
      }
      audio.muted = isMuted;

      if (isPlaying) {
        audio.play().catch(err => console.warn("Autoplay was prevented."));
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
    } else {
      audio.pause();
    }
  }, [currentSlideIndex, open, isPlaying, isMuted, currentSlide?.narrationAudioUrl]);

  useEffect(() => {
    if (open) {
      setCurrentSlideIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [open]);

  if (!slides || slides.length === 0) return null;

  const nextSlide = () => currentSlideIndex < slides.length - 1 && setCurrentSlideIndex(currentSlideIndex + 1);
  const prevSlide = () => currentSlideIndex > 0 && setCurrentSlideIndex(currentSlideIndex - 1);
  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 m-0 overflow-hidden bg-slate-950 border-none shadow-none rounded-none flex flex-col focus:outline-none z-[999]">
        
        <audio ref={audioRef} style={{ display: 'none' }} crossOrigin="anonymous" />

        {/* Header */}
        <div className="bg-slate-900/90 p-4 border-b border-slate-800 flex items-center justify-between z-10 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/20"
            >
              <MonitorPlay className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h3 className="font-bold text-slate-100 leading-none">{moduleTitle}</h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-medium">Automata AI Narrált Prezentáció</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center bg-slate-800/80 rounded-full px-2 py-1 gap-1 border border-slate-700">
              <Button variant="ghost" size="icon" onClick={togglePlay} className="h-8 w-8 text-slate-300 hover:text-white rounded-full transition-all">
                {isPlaying ? <Pause className="w-4 h-4 shadow-sm" /> : <Play className="w-4 h-4 shadow-sm" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-8 w-8 text-slate-300 hover:text-white rounded-full transition-all">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <div className="h-4 w-[1px] bg-slate-700 mx-1" />
              <Button variant="ghost" size="icon" onClick={() => { setCurrentSlideIndex(0); setIsPlaying(true); }} className="h-8 w-8 text-slate-300 hover:text-white rounded-full transition-all">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            
            <Badge variant="secondary" className="font-bold text-slate-300 bg-slate-800/80 border-slate-700 hidden sm:flex">
              {currentSlideIndex + 1} / {slides.length}
            </Badge>
            
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-red-900/20 ml-2 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Slide Content Area - Takes all space */}
        <div className="flex-1 relative overflow-hidden flex flex-col p-4 md:p-12 bg-slate-950">
          
          {/* Avatar Container - Fixed position */}
          <div className="absolute bottom-8 left-8 w-56 h-80 z-20 pointer-events-none drop-shadow-[0_10px_50px_rgba(37,99,235,0.3)]">
            <FBXAvatar 
              url={avatarUrl} 
              className="w-full h-full"
              volume={volume}
              isMoving={false}
              direction={1}
            />
            {isPlaying && volume > 0.05 && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1 items-end h-8">
                <motion.div initial={{ height: 0 }} animate={{ height: '50%' }} className="w-1.5 bg-blue-500 rounded-full" transition={{ repeat: Infinity, duration: 0.3, repeatType: 'reverse' }} />
                <motion.div initial={{ height: 0 }} animate={{ height: '90%' }} className="w-1.5 bg-blue-400 rounded-full" transition={{ repeat: Infinity, duration: 0.4, repeatType: 'reverse' }} />
                <motion.div initial={{ height: 0 }} animate={{ height: '70%' }} className="w-1.5 bg-blue-600 rounded-full" transition={{ repeat: Infinity, duration: 0.35, repeatType: 'reverse' }} />
              </div>
            )}
          </div>

          <div className="w-full h-full max-w-[1600px] mx-auto flex flex-col relative z-0">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentSlideIndex}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.6, ease: "circOut" }}
                className="h-full w-full flex flex-col justify-center"
              >
                {currentSlide.type === "title" ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center space-y-12">
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-5xl">
                      <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-none">
                        {currentSlide.title}
                      </h1>
                      {currentSlide.subtitle && (
                        <p className="text-3xl md:text-4xl text-blue-400 font-medium tracking-wide">
                          {currentSlide.subtitle}
                        </p>
                      )}
                    </motion.div>
                  </div>
                ) : (
                  <div className={`h-full w-full grid gap-16 items-center ${(!currentSlide.imageUrl || !currentSlide.layout.includes('image')) ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                    
                    <div className={`flex flex-col justify-center space-y-10 ${(!currentSlide.imageUrl || !currentSlide.layout.includes('image')) ? 'col-span-full max-w-4xl mx-auto' : (currentSlide.layout === 'split-right-image' ? 'order-1' : 'order-2')}`}>
                      <div className="space-y-4">
                        <Badge variant="outline" className="text-blue-500 border-blue-900/50 bg-blue-900/20 uppercase tracking-[0.5em] text-xs px-4 py-1.5">
                          Slide {currentSlideIndex + 1}
                        </Badge>
                        <h2 className="text-5xl md:text-7xl font-black text-white leading-[1.1]">
                          {currentSlide.title}
                        </h2>
                      </div>
                      
                      <div className="prose prose-invert prose-2xl max-w-none text-slate-300 leading-relaxed overflow-y-auto max-h-[40vh] custom-scrollbar pr-4">
                        {currentSlide.content.includes('<li>') || currentSlide.content.includes('<p>') ? (
                          <div dangerouslySetInnerHTML={{ __html: currentSlide.content }} />
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {currentSlide.content}
                          </ReactMarkdown>
                        )}
                      </div>

                      <div className="shrink-0 max-h-[45vh]">
                        <InteractiveContent slide={currentSlide} />
                      </div>
                    </div>

                    {currentSlide.layout.includes('image') && currentSlide.imageUrl && (
                      <motion.div 
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`h-full flex items-center justify-center ${currentSlide.layout === 'split-right-image' ? 'order-2' : 'order-1'}`}
                      >
                        <div className="relative w-full h-[70vh] rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border-[16px] border-slate-900">
                          <img 
                            src={currentSlide.imageUrl} 
                            alt="Visual" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-40"></div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900/90 p-8 border-t border-slate-800 flex items-center justify-between backdrop-blur-md shrink-0">
          <Button 
            onClick={prevSlide} 
            disabled={currentSlideIndex === 0}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white min-w-[14rem] h-14 rounded-2xl text-lg font-bold transition-all"
          >
            <ChevronLeft className="mr-2 w-6 h-6" /> Előző
          </Button>

          <div className="flex gap-3 px-8">
            {slides.map((_, i) => (
              <motion.div 
                key={i} 
                animate={{ 
                  width: i === currentSlideIndex ? '4rem' : '0.8rem',
                  backgroundColor: i === currentSlideIndex ? '#3b82f6' : (i < currentSlideIndex ? '#2563eb44' : '#1e293b')
                }}
                className="h-2 rounded-full transition-all"
              />
            ))}
          </div>

          <Button 
            onClick={nextSlide} 
            disabled={currentSlideIndex === slides.length - 1}
            className="bg-blue-600 hover:bg-blue-500 text-white min-w-[14rem] h-14 rounded-2xl shadow-xl shadow-blue-900/40 text-lg font-bold transition-all active:scale-95"
          >
            {currentSlideIndex === slides.length - 1 ? 'Befejezés' : 'Következő'} <ChevronRight className="ml-2 w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
