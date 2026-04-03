import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Maximize2, MonitorPlay, HelpCircle, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Slide {
  id: number;
  type: string;
  title: string;
  subtitle?: string;
  content: string;
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

export function PresentationPlayer({ slides, open, onOpenChange, moduleTitle }: PresentationPlayerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (!slides || slides.length === 0) return null;

  const currentSlide = slides[currentSlideIndex];

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-slate-950 border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/50 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <MonitorPlay className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 leading-none">{moduleTitle}</h3>
              <p className="text-xs text-slate-400 mt-1">Interaktív AI Prezentáció</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Slide Content Area */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-6 md:p-12">
          
          <div className="w-full h-full max-w-5xl transition-all duration-300 transform">
            {/* Title Slide Layout */}
            {currentSlide.type === "title" ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="space-y-4 max-w-2xl">
                  <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight">
                    {currentSlide.title}
                  </h1>
                  {currentSlide.subtitle && (
                    <p className="text-xl md:text-2xl text-blue-400 font-medium">
                      {currentSlide.subtitle}
                    </p>
                  )}
                </div>
                {currentSlide.imageUrl && (
                  <div className="mt-8 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 max-h-64">
                    <img src={currentSlide.imageUrl} alt={currentSlide.title} className="object-cover w-full h-full" />
                  </div>
                )}
              </div>
            ) : (
              /* Standard Slide Layouts */
              <div className={`h-full grid gap-8 ${currentSlide.layout.includes('split') ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                
                {/* Text Side */}
                <div className={`flex flex-col justify-center space-y-6 ${(!currentSlide.imageUrl || !currentSlide.layout.includes('image')) ? 'col-span-full max-w-3xl mx-auto' : (currentSlide.layout === 'split-right-image' ? 'order-1' : 'order-1 md:order-2')}`}>
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-blue-400 border-blue-900/50 bg-blue-900/10">
                      Slide {currentSlideIndex + 1}
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                      {currentSlide.title}
                    </h2>
                  </div>
                  
                  <div className="prose prose-invert prose-slate max-w-none prose-p:text-lg prose-p:text-slate-300 prose-li:text-slate-300">
                    {/* Handle both Markdown and raw HTML content */}
                    {currentSlide.content.includes('<li>') || currentSlide.content.includes('<p>') ? (
                      <div dangerouslySetInnerHTML={{ __html: currentSlide.content }} />
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentSlide.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Interactive Hint */}
                  {currentSlide.interactiveType && (
                    <Card className="bg-blue-900/10 border-blue-900/50 mt-4">
                      <CardContent className="p-4 flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-blue-400" />
                        <span className="text-sm text-blue-300 font-medium">
                          Interaktív elem: {currentSlide.interactiveType.toUpperCase()}
                        </span>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Media/Image Side - Only show if image exists */}
                {currentSlide.layout.includes('image') && currentSlide.imageUrl && (
                  <div className={`flex items-center justify-center ${currentSlide.layout === 'split-right-image' ? 'order-2' : 'order-1 md:order-1'}`}>
                    <div className="relative group w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-900">
                      <img 
                        src={currentSlide.imageUrl} 
                        alt="Slide illustration" 
                        className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer / Controls */}
        <div className="bg-slate-900/50 p-6 border-t border-slate-800 flex items-center justify-between">
          <Button 
            onClick={prevSlide} 
            disabled={currentSlideIndex === 0}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white min-w-[12rem]"
          >
            <ChevronLeft className="mr-2 w-5 h-5" /> Előző dia
          </Button>

          <div className="hidden md:flex gap-1.5">
            {slides.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlideIndex ? 'w-8 bg-blue-500' : 'w-2 bg-slate-800'}`}
              />
            ))}
          </div>

          <Button 
            onClick={nextSlide} 
            disabled={currentSlideIndex === slides.length - 1}
            className="bg-blue-600 hover:bg-blue-500 text-white min-w-[12rem]"
          >
            {currentSlideIndex === slides.length - 1 ? 'Vége' : 'Következő dia'}
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
