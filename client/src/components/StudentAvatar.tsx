import React, { useEffect, useState } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export function StudentAvatar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: avatar, isLoading } = useQuery({
    queryKey: ['/api/student/avatar'],
    queryFn: async () => {
      const res = await fetch('/api/student/avatar');
      if (!res.ok) throw new Error('Failed to fetch avatar');
      return res.json();
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
        description: "Az éhségszintje nőtt!",
      });
      // Elsütjük a Rive etetés triggert ha van
      if (trigFeed) {
        trigFeed.fire();
      }
    },
    onError: (err: any) => {
      toast({
        title: "Nincs elég XP-d!",
        description: err.message || "Nem sikerült az etetés.",
        variant: "destructive"
      });
    }
  });

  // A Rive komponens beállítása - a letöltött fájlra mutat (vagy ha nincs, hibázik csendben)
  const { RiveComponent, rive } = useRive({
    src: '/avatars/test.riv', // Ezt a fájlt várjuk a public mappába
    stateMachines: 'State Machine 1', 
    autoplay: true,
  });

  // Ha az animációs fájlban lenne egy 'hunger' változó (0-100) és egy 'feed' trigger
  const hungerInput = useStateMachineInput(rive, 'State Machine 1', 'hunger', 100);
  const trigFeed = useStateMachineInput(rive, 'State Machine 1', 'feed');

  useEffect(() => {
    if (avatar && hungerInput) {
      hungerInput.value = avatar.hunger; // Átadjuk az adatbázis éhségszintet a grafikának
    }
  }, [avatar, hungerInput]);

  if (isLoading) return <div className="animate-pulse bg-slate-200 h-64 rounded-xl w-full"></div>;

  return (
    <div className="bg-card rounded-xl p-4 border shadow-sm flex flex-col items-center">
      <h3 className="font-bold text-lg mb-2">My Pet (Teszt)</h3>
      
      {/* Rive Canvas */}
      <div className="w-full max-w-[200px] aspect-square bg-slate-100 dark:bg-slate-800 rounded-2xl border-4 border-primary/20 overflow-hidden relative flex items-center justify-center mb-4">
        
        {/* Maga a canvas, ami kirajzolja a vektort */}
        <RiveComponent className="w-full h-full" />
        
        {/* Placeholder szöveg, amíg tényleg nem töltenek fel egy fájlt a fejlesztők */}
        {!rive && (
          <div className="absolute inset-0 flex items-center justify-center text-center p-3 bg-black/60 text-white flex-col">
            <span className="text-xs">Tölts le egy Rive karaktert, és mentsd ide:</span>
            <code className="text-[10px] mt-2 bg-black/80 px-2 py-1 rounded text-green-400">public/avatars/test.riv</code>
          </div>
        )}
      </div>

      <div className="w-full space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Jóllakottság</span>
            <span className="font-medium">{avatar?.hunger}%</span>
          </div>
          <Progress value={avatar?.hunger} className="h-2" />
        </div>
        
        <Button 
          className="w-full" 
          onClick={() => feedMutation.mutate(50)}
          disabled={feedMutation.isPending || (avatar?.hunger >= 100)}
        >
          🍔 Etetés (50 XP)
        </Button>
      </div>
    </div>
  );
}
