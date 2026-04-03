import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Info, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Point {
  x: number;
  y: number;
  label: string;
  title: string;
}

interface HotspotProps {
  data: {
    points: Point[];
  };
  imageUrl?: string;
}

export function SlideHotspots({ data, imageUrl }: HotspotProps) {
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-5 h-5 text-blue-400" />
        <h4 className="text-xl font-bold text-white leading-tight">Fedezd fel a részleteket!</h4>
      </div>

      <div className="relative flex-1 rounded-3xl overflow-hidden border-8 border-slate-900 group shadow-2xl bg-slate-900/40">
        {imageUrl ? (
          <img src={imageUrl} alt="Diagram" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-800 italic">
             Nincs alap ábra.
          </div>
        )}
        
        {/* Hotspots overlay */}
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] group-hover:backdrop-blur-none transition-all">
          {data.points?.map((p, i) => (
             <motion.button
               key={i}
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               whileHover={{ scale: 1.2 }}
               onClick={() => setSelectedPoint(p)}
               className={`absolute w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all duration-300 ${selectedPoint?.title === p.title ? 'bg-blue-500 scale-125 z-20' : 'bg-blue-600/60 hover:bg-blue-500 z-10'}`}
               style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
             >
               <motion.span 
                 initial={{ scale: 1, opacity: 0.8 }}
                 animate={{ scale: 2.2, opacity: 0 }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                 className="absolute inset-0 rounded-full bg-white/60"
               />
               <Info className="w-4 h-4 text-white" />
             </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {selectedPoint && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-4 left-4 right-4 z-30"
            >
              <Card className="bg-slate-950/90 border-blue-500/50 backdrop-blur-xl shadow-[0_-20px_40px_rgba(37,99,235,0.2)]">
                <CardContent className="p-4 relative">
                  <button 
                    onClick={() => setSelectedPoint(null)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <Badge className="bg-blue-600 text-[9px] mb-2 uppercase tracking-widest">{selectedPoint.title}</Badge>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">{selectedPoint.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {!selectedPoint && (
        <p className="text-xs text-center text-slate-500 italic">Kattints a pulzáló kék pontokra a több információért!</p>
      )}
    </div>
  );
}
