import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, GripVertical, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Pair {
  item: string;
  match: string;
}

interface DragDropProps {
  data: {
    pairs: Pair[];
    instructions: string;
  };
}

export function SlideDragDrop({ data }: DragDropProps) {
  const [items, setItems] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  
  // Initialize with shuffled items
  useEffect(() => {
    if (data.pairs) {
      const shuffledItems = [...data.pairs].map(p => p.item).sort(() => Math.random() - 0.5);
      const shuffledTargets = [...data.pairs].map(p => p.match).sort(() => Math.random() - 0.5);
      setItems(shuffledItems);
      setTargets(shuffledTargets);
    }
  }, [data.pairs]);

  const [activeItem, setActiveItem] = useState<string | null>(null);

  const handleMatch = (item: string, target: string) => {
    const pair = data.pairs.find(p => p.item === item);
    if (pair && pair.match === target) {
      const newMatches = { ...matches, [item]: target };
      setMatches(newMatches);
      setItems(items.filter(i => i !== item));
      
      if (Object.keys(newMatches).length === data.pairs.length) {
        setIsComplete(true);
      }
    }
  };

  return (
    <Card className="bg-slate-900/40 border-slate-800 shadow-xl backdrop-blur-md overflow-hidden border-l-4 border-l-blue-500 min-h-[300px]">
      <CardContent className="p-6 flex flex-col h-full gap-8">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          <h4 className="text-xl font-bold text-white leading-tight">{data.instructions || "Párosítsd a fogalmakat!"}</h4>
        </div>

        <div className="grid grid-cols-2 gap-12 flex-1 items-stretch">
          {/* Items to drag */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Fogalmak</p>
            <AnimatePresence>
              {items.map((item, i) => (
                <motion.div
                  key={item}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={1}
                  onDragStart={() => setActiveItem(item)}
                  onDragEnd={(e, info) => {
                    // Check if dropped near a target (simplified logic for demonstration)
                    const elements = document.elementsFromPoint(info.point.x, info.point.y);
                    const targetEl = elements.find(el => el.getAttribute('data-target'));
                    if (targetEl) {
                      const targetMatch = targetEl.getAttribute('data-target');
                      if (targetMatch) handleMatch(item, targetMatch);
                    }
                    setActiveItem(null);
                  }}
                  className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl cursor-grab active:cursor-grabbing flex items-center gap-3 hover:bg-blue-600/30 transition-colors"
                >
                  <GripVertical className="w-4 h-4 text-blue-500/50" />
                  <span className="text-sm font-bold text-blue-100">{item}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {items.length === 0 && !isComplete && (
              <div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 italic">
                Sikeres párosítás...
              </div>
            )}
          </div>

          {/* Targets to drop to */}
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Definíciók</p>
            {targets.map((target, i) => {
              const matchedItem = Object.keys(matches).find(k => matches[k] === target);
              
              return (
                <div 
                  key={target} 
                  data-target={target}
                  className={`p-4 min-h-[60px] rounded-2xl border-2 transition-all duration-300 flex items-center relative gap-3 ${matchedItem ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-slate-800/20 border-slate-700/50 hover:border-slate-600'}`}
                >
                  <div className="flex-1">
                    <p className="text-xs text-slate-300 leading-relaxed">{target}</p>
                  </div>
                  
                  {matchedItem ? (
                     <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -left-4 top-1/2 -translate-y-1/2 bg-green-500 p-1.5 rounded-full shadow-lg">
                       <CheckCircle2 className="w-4 h-4 text-white" />
                     </motion.div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-700/50" />
                  )}

                  {matchedItem && (
                    <Badge variant="outline" className="bg-green-500/20 border-green-500/30 text-green-400 font-bold">
                       {matchedItem}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 text-center"
            >
              <p className="text-white font-bold text-lg mb-1 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-400" /> Gratulálunk! Mindent jól párosítottál.
              </p>
              <p className="text-green-300/80 text-sm italic">Sikeresen elsajátítottad ezeket az összefüggéseket.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
