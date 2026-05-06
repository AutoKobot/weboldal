import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, RotateCcw, ZoomIn, ZoomOut, Maximize2, 
  Volume2, VolumeX, ChevronRight, ChevronLeft, HelpCircle, Award
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface MindMapNode {
  id: string;
  label: string;
  description: string;
  narration: string;
  audioUrl?: string | null;
  color?: string;
  children?: MindMapNode[];
}

interface PositionedNode {
  node: MindMapNode;
  id: string;
  x: number;
  y: number;
  depth: number;
  parentX?: number;
  parentY?: number;
}

interface MindMapPlayerProps {
  data: MindMapNode;
  moduleTitle: string;
  onComplete?: () => void;
}

export default function MindMapPlayer({ data, moduleTitle, onComplete }: MindMapPlayerProps) {
  const [activeNodeId, setActiveNodeId] = useState<string>('root');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showHelp, setShowHelp] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 1. Flatten tree and calculate nodes positions using a center-outward radial layout
  const positionedNodes = useMemo(() => {
    const nodesList: PositionedNode[] = [];
    const centerX = 600;
    const centerY = 500;

    const traverse = (
      node: MindMapNode, 
      depth: number, 
      angleStart: number, 
      angleEnd: number, 
      parentX?: number, 
      parentY?: number
    ) => {
      let x = centerX;
      let y = centerY;

      if (depth > 0) {
        // Calculate radial coordinates
        const distance = depth === 1 ? 190 : 340;
        const angle = angleStart + (angleEnd - angleStart) / 2;
        x = centerX + Math.cos(angle) * distance;
        y = centerY + Math.sin(angle) * distance;
      }

      nodesList.push({
        node,
        id: node.id,
        x,
        y,
        depth,
        parentX,
        parentY
      });

      if (node.children && node.children.length > 0) {
        const count = node.children.length;
        const slice = (angleEnd - angleStart) / count;
        
        node.children.forEach((child, index) => {
          const childStart = angleStart + slice * index;
          const childEnd = childStart + slice;
          traverse(child, depth + 1, childStart, childEnd, x, y);
        });
      }
    };

    // Traverse starting with 360-degree radial slice
    traverse(data, 0, 0, 2 * Math.PI);
    return nodesList;
  }, [data]);

  // 2. Pre-order traversal list to determine playback sequence
  const playbackSequence = useMemo(() => {
    const seq: string[] = [];
    const traverse = (node: MindMapNode) => {
      seq.push(node.id);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(data);
    return seq;
  }, [data]);

  const activeIndex = playbackSequence.indexOf(activeNodeId);
  const activeNode = useMemo(() => {
    return positionedNodes.find(n => n.id === activeNodeId)?.node;
  }, [positionedNodes, activeNodeId]);

  // 3. Audio Handlers
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (activeNode?.audioUrl) {
      const audio = new Audio(activeNode.audioUrl);
      audio.muted = isMuted;
      audio.volume = volume;
      audioRef.current = audio;

      audio.onended = () => {
        handleNext();
      };

      if (isPlaying) {
        audio.play().catch(err => console.log("Audio play deferred:", err));
      }
    } else {
      audioRef.current = null;
    }

    // Auto-pan camera to the active node
    centerOnNode(activeNodeId);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [activeNodeId, activeNode?.audioUrl]);

  // Synchronize playback state
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Synchronize volume & mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // 4. Navigation controls
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (activeIndex < playbackSequence.length - 1) {
      setActiveNodeId(playbackSequence[activeIndex + 1]);
    } else {
      setIsPlaying(false);
      if (onComplete) onComplete();
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveNodeId(playbackSequence[activeIndex - 1]);
    }
  };

  const handleRestart = () => {
    setActiveNodeId('root');
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  const handleNodeClick = (nodeId: string) => {
    setActiveNodeId(nodeId);
    setIsPlaying(true);
  };

  // 5. Camera (Pan / Zoom) systems
  const centerOnNode = (nodeId: string) => {
    const node = positionedNodes.find(n => n.id === nodeId);
    if (node && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const vx = rect.width / 2;
      const vy = rect.height / 2;
      // Pan to node smoothly
      setPan({
        x: vx - node.x * zoom,
        y: vy - node.y * zoom
      });
    }
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => {
      const nextZoom = Math.max(0.4, Math.min(2.0, prev * factor));
      // Readjust pan around the viewport center
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        setPan(prevPan => ({
          x: cx - (cx - prevPan.x) * (nextZoom / prev),
          y: cy - (cy - prevPan.y) * (nextZoom / prev)
        }));
      }
      return nextZoom;
    });
  };

  const resetView = () => {
    setZoom(0.8);
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPan({
        x: rect.width / 2 - 600 * 0.8,
        y: rect.height / 2 - 500 * 0.8
      });
    }
  };

  useEffect(() => {
    resetView();
    // Delay slightly to wait for DOM size calculations
    const t = setTimeout(resetView, 300);
    return () => clearTimeout(t);
  }, []);

  // 6. Canvas Drag & Drop Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click drag
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  return (
    <div className="relative flex flex-col h-[750px] w-full bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 overflow-hidden select-none shadow-2xl">
      
      {/* HUD - TOP BAR */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/90 to-transparent backdrop-blur-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full animate-pulse">
              Élő Elmetérkép
            </span>
            <span className="text-xs text-slate-400">Interaktív tanulási mód</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-1">{moduleTitle}</h2>
        </div>

        {/* HUD Navigation Progress */}
        <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800/80 rounded-full px-4 py-1.5 backdrop-blur-md">
          <button 
            onClick={handlePrev} 
            disabled={activeIndex === 0}
            className="p-1 hover:text-indigo-400 disabled:opacity-30 transition-colors"
            title="Előző"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-semibold text-slate-300 min-w-[50px] text-center">
            {activeIndex + 1} / {playbackSequence.length}
          </span>
          <button 
            onClick={handleNext} 
            disabled={activeIndex === playbackSequence.length - 1}
            className="p-1 hover:text-indigo-400 disabled:opacity-30 transition-colors"
            title="Következő"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowHelp(true)}
            className="bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 rounded-full h-9 w-9 text-slate-300"
          >
            <HelpCircle size={18} />
          </Button>
        </div>
      </div>

      {/* INFINITE CANVAS FOR MIND MAP RENDERING */}
      <div 
        ref={canvasRef}
        className="relative flex-1 cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <div 
          className="absolute inset-0 transition-transform duration-500 ease-out"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0px 0px'
          }}
        >
          {/* SVG CONNECTIONS (Flowing Data Streams) */}
          <svg className="absolute overflow-visible w-full h-full pointer-events-none" style={{ left: 0, top: 0 }}>
            <defs>
              <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {positionedNodes.map(item => {
              if (item.depth === 0 || item.parentX === undefined || item.parentY === undefined) return null;
              
              const isActiveBranch = activeNodeId === item.id || activeNodeId === item.node.children?.map(c => c.id).find(id => id === activeNodeId);
              const branchColor = item.node.color || (item.depth === 1 ? '#3b82f6' : '#10b981');
              
              // Smooth bezier curve for connecting lines
              const midX = (item.parentX + item.x) / 2;
              const pathD = `M ${item.parentX} ${item.parentY} C ${midX} ${item.parentY}, ${midX} ${item.y}, ${item.x} ${item.y}`;

              return (
                <g key={`branch-${item.id}`}>
                  {/* Thick Glow under active branches */}
                  {isActiveBranch && (
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke={branchColor} 
                      strokeWidth="6" 
                      opacity="0.3" 
                      filter="url(#glow-blue)"
                    />
                  )}

                  {/* Base branch line */}
                  <path 
                    d={pathD} 
                    fill="none" 
                    stroke={branchColor} 
                    strokeWidth={isActiveBranch ? "3" : "1.5"} 
                    opacity={isActiveBranch ? "0.9" : "0.35"} 
                    className="transition-all duration-300"
                  />

                  {/* Flowing animated pulse */}
                  {isPlaying && isActiveBranch && (
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke="#ffffff" 
                      strokeWidth="2.5" 
                      strokeDasharray="10, 15" 
                      style={{
                        animation: 'mindMapFlow 1.5s linear infinite',
                        filter: 'drop-shadow(0px 0px 4px #ffffff)'
                      }}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* NODES RENDERING */}
          {positionedNodes.map(item => {
            const isActive = activeNodeId === item.id;
            const nodeColor = item.node.color || (item.depth === 0 ? '#6366f1' : item.depth === 1 ? '#3b82f6' : '#10b981');
            
            return (
              <div
                key={`node-${item.id}`}
                className="absolute"
                style={{
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Node wrapper with click handler */}
                <div 
                  onClick={() => handleNodeClick(item.id)}
                  className={`relative flex flex-col items-center justify-center p-4 min-w-[130px] max-w-[190px] text-center rounded-xl border cursor-pointer transition-all duration-300 ${
                    isActive 
                      ? 'bg-slate-900/90 shadow-2xl scale-110 z-30' 
                      : 'bg-slate-950/70 opacity-80 hover:opacity-100 hover:scale-105 hover:bg-slate-900/60 z-20'
                  }`}
                  style={{
                    borderColor: isActive ? nodeColor : `${nodeColor}40`,
                    boxShadow: isActive ? `0 0 20px ${nodeColor}40, inset 0 0 10px ${nodeColor}20` : 'none',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  {/* Glowing pulsing dot for active node */}
                  {isActive && (
                    <span 
                      className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: nodeColor }}></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5" style={{ backgroundColor: nodeColor }}></span>
                    </span>
                  )}

                  {/* Level Tag */}
                  <span 
                    className="text-[9px] font-bold uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded-md"
                    style={{ 
                      backgroundColor: `${nodeColor}15`, 
                      color: nodeColor,
                      border: `1px solid ${nodeColor}30` 
                    }}
                  >
                    {item.depth === 0 ? 'Főtéma' : item.depth === 1 ? 'Főág' : 'Részlet'}
                  </span>

                  {/* Label */}
                  <h4 className={`font-bold tracking-wide transition-colors leading-tight ${isActive ? 'text-slate-100 text-sm' : 'text-slate-300 text-xs'}`}>
                    {item.node.label}
                  </h4>

                  {/* Floating description only on active node */}
                  {isActive && (
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-snug animate-fade-in max-h-[45px] overflow-hidden line-clamp-2">
                      {item.node.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING SUB-PANEL - BOTTOM ACTIVE NODE NARRATION CARD */}
      <div className="absolute bottom-16 left-4 right-4 z-10 bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md shadow-2xl flex items-center gap-4 animate-slide-up">
        <div 
          className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-slate-100"
          style={{ backgroundColor: activeNode?.color || '#6366f1' }}
        >
          <Award size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Aktív magyarázat</h3>
          <p className="text-sm font-semibold text-slate-100 truncate mt-0.5">{activeNode?.label}</p>
          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {activeNode?.narration}
          </p>
        </div>
      </div>

      {/* CONTROLS HUD BAR (PLAYBACK + VIEWPORT CONTROLS) */}
      <div className="z-10 flex items-center justify-between p-4 bg-slate-950 border-t border-slate-900">
        
        {/* CAMERA CONTROLS */}
        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleZoom(1.2)} 
            className="hover:bg-slate-900 text-slate-400 h-8 w-8"
            title="Nagyítás"
          >
            <ZoomIn size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleZoom(0.8)} 
            className="hover:bg-slate-900 text-slate-400 h-8 w-8"
            title="Kicsinyítés"
          >
            <ZoomOut size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={resetView} 
            className="hover:bg-slate-900 text-slate-400 h-8 w-8"
            title="Nézet Alaphelyzetbe"
          >
            <Maximize2 size={16} />
          </Button>
        </div>

        {/* PLAYBACK CONTROL BUTTONS */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRestart}
            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 h-10 w-10 rounded-full"
            title="Újraindítás az elejétől"
          >
            <RotateCcw size={18} />
          </Button>

          <Button
            onClick={handlePlayPause}
            className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 h-12 w-12 rounded-full shadow-lg hover:shadow-indigo-500/20"
          >
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} className="ml-0.5" fill="currentColor" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 h-10 w-10 rounded-full"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </Button>
        </div>

        {/* VOLUME HUD SLIDER */}
        <div className="hidden sm:flex items-center gap-2 w-32">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Hangerő</span>
          <Slider 
            value={[isMuted ? 0 : volume * 100]} 
            max={100} 
            step={5} 
            onValueChange={(val) => {
              setVolume(val[0] / 100);
              if (val[0] > 0) setIsMuted(false);
            }}
            className="flex-1 cursor-pointer"
          />
        </div>
      </div>

      {/* HELP INSTRUCTIONAL MODAL */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-indigo-400">
              <HelpCircle size={20} /> Hogyan használd az Élő Elmetérképet?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-slate-300 leading-relaxed pt-2">
            <p>
              Az **Élő Elmetérkép** egy forradalmi, interaktív vizuális tanulási mód, amely összekapcsolja az elmetérkép folyamatos kirajzolását és a hangos felolvasást:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-slate-100">Automata lejátszás:</strong> A lejátszás gombbal indíthatod el a vázlat végigjárását. A rendszer magától rajzolja fel az újabb ágakat és olvassa fel a magyarázatukat.
              </li>
              <li>
                <strong className="text-slate-100">Önálló felfedezés:</strong> Bármikor rákattinthatsz bármelyik csomópontra, hogy azonnal oda ugorj, és meghallgasd az adott fogalom részletes magyarázatát.
              </li>
              <li>
                <strong className="text-slate-100">Kamera mozgatása:</strong> Egérrel húzva szabadon navigálhatsz és körülnézhetsz a végtelenített vásznon. Használhatod a görgetőt is a nagyításhoz és kicsinyítéshez!
              </li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* GLOBAL KEYFRAME ANIMATION INJECTION */}
      <style>{`
        @keyframes mindMapFlow {
          from {
            stroke-dashoffset: 50;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
