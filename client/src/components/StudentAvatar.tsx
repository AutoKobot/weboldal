import React, { useEffect } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Ghost, Lock, Zap } from 'lucide-react';
import { AVATARS } from '@/lib/avatars';
import { useAuth } from '@/hooks/useAuth';

export function StudentAvatar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userXp = user?.xp || 0;

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

  // Keresd meg a megfelelő Rive fájlt, vagy fallback a 'test.riv'
  const currentAvatarDef = avatar ? AVATARS.find(a => a.id === avatar.avatarType) : null;
  const riveFileName = currentAvatarDef ? currentAvatarDef.filename : 'test.riv';

  const { RiveComponent, rive } = useRive({
    src: `/avatars/${riveFileName}`,
    stateMachines: 'State Machine 1', 
    autoplay: true,
  });

  // State Machine inputs (ha támogatja a letöltött fájl)
  const hungerInput = useStateMachineInput(rive, 'State Machine 1', 'hunger', 100);
  const levelInput = useStateMachineInput(rive, 'State Machine 1', 'level', 1);
  const trigFeed = useStateMachineInput(rive, 'State Machine 1', 'feed');

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
      
      {/* Rive Canvas */}
      <div className="w-full max-w-[200px] aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl border-4 border-primary/20 overflow-hidden relative flex items-center justify-center mb-4">
        
        <RiveComponent className="w-full h-full" />
        
        {!rive && (
          <div className="absolute inset-0 flex items-center justify-center text-center p-3 bg-black/60 text-white flex-col">
            <span className="text-[10px] opacity-80 mb-1">Hiányzó fájl:</span>
            <code className="text-[10px] bg-black px-2 py-1 rounded text-red-300 break-all w-[90%] font-mono">
              public/avatars/{riveFileName}
            </code>
          </div>
        )}
      </div>

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
