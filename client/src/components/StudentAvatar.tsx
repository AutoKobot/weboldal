import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Ghost, Lock, Zap } from 'lucide-react';
import { AVATARS, AvatarDefinition } from '@/lib/avatars';
import { useAuth } from '@/hooks/useAuth';
import { FBXAvatar } from './FBXAvatar';

export function StudentAvatar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userXp = user?.xp || 0;
  const [isFeeding, setIsFeeding] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  
  // Bolyongás állapota
  const [petPos, setPetPos] = useState({ x: -1000, y: -1000 }); // Kezdetben képernyőn kívül, amíg a méret nincs kiszámolva
  const [petScaleX, setPetScaleX] = useState(1);
  const [isWandering, setIsWandering] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Képernyőmérethez igazodás
  const [winSize, setWinSize] = useState({ w: 1000, h: 800 });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateSize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
      window.addEventListener('resize', updateSize);
      updateSize();
      
      // Kezdeti pozíció a képernyő jobb alsó sarka felé
      setPetPos({ x: window.innerWidth - 180, y: window.innerHeight - 180 });
      setIsReady(true);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  // Időszakos bóklászás logika
  useEffect(() => {
    if (!isWandering) return;
    
    const interval = setInterval(() => {
      // 30% eséllyel megáll pihenni
      if (Math.random() < 0.3) return;
      
      // Véletlenszerű X pozíció
      const newX = Math.max(20, Math.random() * (winSize.w - 150));
      // Véletlenszerű Y pozíció az alsó szegmensben (képernyő alsó 30%-a)
      const bottomArea = winSize.h * 0.3;
      const newY = winSize.h - 150 - (Math.random() * bottomArea);
      
      // Forduljon abba az irányba, amerre megy
      setPetScaleX(newX > petPos.x ? 1 : -1);
      
      setPetPos({ x: newX, y: newY });
    }, 4000 + Math.random() * 4000);
    
    return () => clearInterval(interval);
  }, [petPos.x, winSize.w, winSize.h, isWandering]);

  // Mozgás detektálása az animációhoz
  useEffect(() => {
    if (!isReady) return;
    setIsMoving(true);
    const timer = setTimeout(() => setIsMoving(false), 4000); // A rugós animáció kb ennyi ideig tart
    return () => clearTimeout(timer);
  }, [petPos, isReady]);

  const { data: avatar, isLoading } = useQuery({
    queryKey: ['/api/student/avatar'],
    queryFn: async () => {
      const res = await fetch('/api/student/avatar');
      if (!res.ok) throw new Error('Failed to fetch avatar');
      return res.json();
    }
  });

  const selectMutation = useMutation({
    mutationFn: async (avatarType: string) => {
      const res = await apiRequest('POST', '/api/student/avatar/select', { avatarType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student/avatar'] });
      toast({
        title: "Sikeres választás!",
        description: "Új tanulótársat választottál!",
      });
    }
  });

  const reviveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/student/avatar/revive');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student/avatar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }); 
      toast({
        title: "Újraélesztve!",
        description: "A karaktered visszatért!",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Sikertelen újraélesztés",
        description: "Nincs elég XP-d (1000 szükséges).",
        variant: "destructive"
      });
    }
  });

  const feedMutation = useMutation({
    mutationFn: async (xpCost: number) => {
      const res = await apiRequest('POST', '/api/student/avatar/feed', { xpCost });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student/avatar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] }); 
      toast({
        title: "Megetetted az avatárt!",
        description: "Erősödött és jóllakott!",
      });
      // Vizuális "ugrás" effekt bekapcsolása CSS-el
      setIsFeeding(true);
      setTimeout(() => setIsFeeding(false), 800);
      
      if (trigFeed) {
        trigFeed.fire();
      }
    },
    onError: (err: any) => {
      toast({
        title: "Nincs elég XP-d!",
        description: "Tanulj még az etetéshez.",
        variant: "destructive"
      });
    }
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', '/api/student/avatar/release');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student/avatar'] });
      toast({
        title: "Elengedted az avatárt!",
        description: "Most választhatsz egy újat.",
      });
    }
  });

  const triggerAction = (action: string) => {
    setCurrentAction(action);
    // Visszaállás idle-be az animáció hossza után (kb 5 mp)
    setTimeout(() => setCurrentAction(null), 5000);
  };

  // Keresd meg a megfelelő fájlt
  const currentAvatarDef = avatar ? AVATARS.find(a => a.id === avatar.avatarType) : (null as AvatarDefinition | null);
  const fileName = currentAvatarDef ? currentAvatarDef.filename : AVATARS[0].filename;
  const isFBX = (currentAvatarDef || AVATARS[0])?.type === 'fbx';

  const { RiveComponent, rive } = useRive({
    src: isFBX ? '' : `/avatars/${fileName}`,
    autoplay: true,
  });

  // State Machine inputs (ha támogatja a letöltött fájl)
  const hungerInput = useStateMachineInput(rive, 'State Machine 1', 'hunger', 100);
  const levelInput = useStateMachineInput(rive, 'State Machine 1', 'level', 1);
  const trigFeed = useStateMachineInput(rive, 'State Machine 1', 'feed');

  // Próbáljuk meg BÁRMILYEN animációt vagy State Machine-t elindítani, amit a fájl tartalmaz!
  useEffect(() => {
    if (rive) {
      const states = rive.stateMachineNames || [];
      const anims = rive.animationNames || [];
      console.log('Rive betöltve. StateMachines:', states, 'Animations:', anims);
      
      if (states.length > 0) {
        try { rive.play(states); } catch(e) {}
      } else if (anims.length > 0) {
        try { rive.play(anims); } catch(e) {}
      }
    }
  }, [rive]);

  useEffect(() => {
    if (avatar && hungerInput) {
      hungerInput.value = avatar.hunger;
    }
    if (avatar && levelInput) {
      levelInput.value = avatar.level;
    }
  }, [avatar, hungerInput, levelInput]);

  if (isLoading) return <div className="animate-pulse bg-slate-200 h-64 rounded-xl w-full"></div>;

  // Ha Még NINCS avatár (Kiválasztó képernyő)
  if (!avatar) {
    return (
      <div className="bg-card rounded-xl p-6 border shadow-sm w-full">
        <h3 className="font-bold text-lg mb-4 text-primary">Válassz magadnak tanulótársat!</h3>
        <p className="text-sm text-neutral-500 mb-6">A kiválasztott jószág kísérni fog, és etetheted XP-ből.</p>
        
        <div className="space-y-4">
          {AVATARS.map((def) => {
            const isLocked = userXp < def.unlockXP;
            
            return (
              <div key={def.id} className="flex flex-col p-3 border rounded-lg bg-neutral-50 relative overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold">{def.name}</span>
                  <div className="flex items-center text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-600">
                    <Zap size={12} className="mr-1" />
                    <span>{def.unlockXP} XP</span>
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mb-3">{def.description}</p>
                
                <Button 
                  size="sm" 
                  disabled={isLocked || selectMutation.isPending}
                  onClick={() => selectMutation.mutate(def.id)}
                  className="w-full"
                >
                  {isLocked ? <><Lock size={14} className="mr-2"/> Lezárva (még kell {def.unlockXP - userXp} XP)</> : "Kiválasztás"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Ha SZELLEM (Meghalt)
  if (avatar && !avatar.isAlive) {
    return (
       <div className="bg-card rounded-xl p-4 border shadow-sm flex flex-col items-center">
         <h3 className="font-bold text-xl text-red-500 mb-2">{currentAvatarDef?.name || "Karakter"} (Szellem)</h3>
         <Ghost size={64} className="text-neutral-400 my-6 animate-pulse" />
         <p className="text-center text-sm text-neutral-500 mb-4">
           Az avatárod túl régóta nem kapott enni, így szellemmé változott. 
           Csak extra tanulással tudod visszaállítani az élő sorba!
         </p>
         <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700" 
            onClick={() => reviveMutation.mutate()}
            disabled={reviveMutation.isPending}
         >
           Szellem Űzés (1000 XP)
         </Button>
       </div>
    );
  }

  // Élő Avatár állapota
  return (
    <div className="bg-card rounded-xl p-4 border shadow-sm flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">{currentAvatarDef?.name || "Karakter"}</h3>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-bold border border-primary/20">
          Tapasztalat Szint: Lvl {avatar.level}
        </span>
      </div>
      
      {/* Játékos "Bázis" a Dashboardon */}
      <div className="w-full max-w-[200px] aspect-square bg-slate-100 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-primary/30 flex flex-col items-center justify-center mb-4 text-center p-4">
        <div className="text-4xl mb-2 opacity-50">🧭</div>
        <p className="text-xs text-neutral-500 font-medium whitespace-pre-wrap">A kiválasztott segítőd jelenleg a képernyőn vándorol!</p>
        <p className="text-[10px] text-neutral-400 mt-2">Itt bármikor pihentetheted.</p>
      </div>

      {/* Szabadon Lebegegő (Fixed) Kiber-Macska / Avatár */}
      {isReady && avatar.isAlive && (
        <motion.div 
          className="fixed z-[100000] w-[220px] h-[220px] pointer-events-none select-none outline-none border-none !bg-transparent"
          style={{ 
            left: 0, 
            top: 0,
            background: 'transparent',
            filter: avatar.hunger < 30 ? 'grayscale(40%) sepia(20%)' : 'none'
          }}
          animate={!isDragging ? { 
            opacity: 1,
            x: petPos.x, 
            y: petPos.y,
            scaleX: isFBX ? 1 : petScaleX,
            scaleY: isFeeding ? [1, 1.15, 0.9, 1] : 1,
            rotate: isFeeding ? [-5, 5, 0] : (avatar.hunger < 30 ? [-2, 2, -2, 2, 0] : 0)
          } : { opacity: 1, scaleX: isFBX ? 1 : petScaleX }}
          transition={{ 
            x: { type: "spring", stiffness: 30, damping: 20 },
            y: { type: "spring", stiffness: 30, damping: 20 },
            rotate: avatar.hunger < 30 ? { repeat: Infinity, duration: 2 } : { duration: 0.5 },
            opacity: { duration: 0.5 }
          }}
          drag
          dragConstraints={{ 
            left: 20, 
            right: winSize.w - 240, 
            top: 20, 
            bottom: winSize.h - 240 
          }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragStart={() => {
            setIsWandering(false);
            setIsDragging(true);
          }}
          onDragEnd={(e, info) => {
            setPetPos({ x: info.point.x - 110, y: info.point.y - 110 });
            setIsDragging(false);
            setIsWandering(true);
          }}
          onMouseEnter={() => !isDragging && setIsWandering(false)}
          onMouseLeave={() => !isDragging && setIsWandering(true)}
        >
          <motion.div 
            className="w-full h-full relative cursor-grab active:cursor-grabbing transition-shadow duration-300 pointer-events-auto outline-none border-none ring-0 focus:ring-0 focus:outline-none !bg-transparent"
            style={{ background: 'transparent' }}
          >
            {isFBX ? (
              <FBXAvatar 
                url={`/avatars/${fileName}`} 
                className="w-full h-full cursor-pointer !bg-transparent" 
                isFeeding={isFeeding}
                isMoving={isMoving}
                isHungry={avatar.hunger < 30}
                currentAction={currentAction}
                animationUrls={currentAvatarDef?.animations}
                direction={petScaleX}
              />
            ) : (
              <RiveComponent 
                className="w-full h-full cursor-pointer !bg-transparent" 
                style={{ background: 'transparent' }} 
              />
            )}
            
            {/* Éhezés ikon a feje felett, ha baj van */}
            {avatar.hunger < 30 && (
              <div className="absolute -top-4 -right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-bounce shadow-sm font-bold border border-white">
                Éhes! 🍖
              </div>
            )}
            
            {!rive && !isFBX && (
              <div className="absolute inset-0 flex items-center justify-center text-center p-2 bg-black/60 text-white flex-col rounded-xl pointer-events-none">
                <span className="text-[9px] opacity-80">Fájl hiba</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      <div className="w-full space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-neutral-600">Jóllakottság</span>
            <span className="font-bold text-green-600">{avatar.hunger}%</span>
          </div>
          <Progress value={avatar.hunger} className="h-2.5 bg-neutral-100 [&>div]:bg-green-500" />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
           <Button 
             variant="outline"
             onClick={() => feedMutation.mutate(20)}
             disabled={feedMutation.isPending || avatar.hunger >= 100}
           >
             Nasi (20 XP)
           </Button>
           <Button 
             onClick={() => feedMutation.mutate(50)}
             disabled={feedMutation.isPending || avatar.hunger >= 100}
           >
             Főétel (50 XP)
           </Button>
        </div>

        {isFBX && currentAvatarDef?.animations && (
          <div className="w-full mt-4 pt-4 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-3 text-left">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center">
                <Zap size={10} className="mr-1 text-orange-400" />
                Extra Mozdulatok
              </span>
              {user?.username === 'BorgaI74' && (
                <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-bold">VIP ACCESS</span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
              {Object.keys(currentAvatarDef.animations).map(key => {
                if (['idle', 'walk', 'feed', 'sad'].includes(key)) return null;
                const isLocked = user?.username !== 'BorgaI74' && userXp < 500;
                const isActive = currentAction === key;
                return (
                  <Button 
                    key={key} 
                    size="sm" 
                    variant={isActive ? "default" : "outline"}
                    className={`text-[9px] h-7 px-2 flex-grow min-w-[60px] ${isActive ? 'bg-primary text-white border-primary' : 'bg-white text-neutral-600'}`}
                    onClick={() => triggerAction(key)}
                    disabled={isLocked}
                  >
                    {isLocked ? <Lock size={8} className="mr-1 opacity-50" /> : null}
                    {key.split('_').pop()?.toUpperCase() || key.toUpperCase()}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs text-neutral-400 mt-2"
          onClick={() => {
            if (confirm('Biztos elengeded ezt az avatárt, hogy egy másikat válassz? A szintje elvész!')) {
              releaseMutation.mutate();
            }
          }}
          disabled={releaseMutation.isPending}
        >
          Másik avatár választása
        </Button>
      </div>
    </div>
  );
}
