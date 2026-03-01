import React from 'react';
import { Brain, Target, TrendingUp, Shield } from 'lucide-react';

interface PresentationSlideshowProps {
  variant?: 'light' | 'dark';
}

export default function PresentationSlideshow({ variant = 'light' }: PresentationSlideshowProps) {
  const blocks = [
    {
      icon: Brain,
      title: "AI asszisztens",
      description: "Minden tanuló saját személyes korrepetitorral rendelkezik.",
      example: "Pl. ha elakadsz egy programozási feladatban vagy nehezen ismersz fel egy villanyszerelési hibát, az AI lépésről lépésre elmagyarázza a megoldást.",
      color: "from-blue-500 to-cyan-500",
      shadow: "shadow-cyan-500/20"
    },
    {
      icon: Target,
      title: "Adaptív tanulási útvonal",
      description: "A rendszer felméri a tudásszintedet, és dinamikusan hozzád igazodik.",
      example: "Pl. a rendszer felismeri, ha a matek egy része nehezen megy, és extra gyakorló feladatokat ad, míg a már biztosan elsajátított anyagokat gyorsabban átveszi.",
      color: "from-purple-500 to-pink-500",
      shadow: "shadow-purple-500/20"
    },
    {
      icon: TrendingUp,
      title: "Tanári analitika",
      description: "Átfogó rálátás a diákok fejlődésére és az osztály előrehaladására.",
      example: "Pl. a tanár valós időben látja a műszerfalon (dashboard), hogy melyik diáknak hány százalékon áll a modulja, és hol akadt el legtöbbet.",
      color: "from-orange-500 to-red-500",
      shadow: "shadow-orange-500/20"
    },
    {
      icon: Shield,
      title: "Iskolai admin eszközök",
      description: "Teljes intézményi menedzsment egy helyen az igazgatónak.",
      example: "Pl. az igazgató egy kattintással átlátja az összes osztály előrehaladását, és automatizált riportokat generálhat a fenntartó felé.",
      color: "from-green-500 to-emerald-500",
      shadow: "shadow-green-500/20"
    }
  ];

  const isDark = variant === 'dark';

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 text-left">
      {blocks.map((block, index) => (
        <div
          key={index}
          className={`
            border rounded-2xl p-6 sm:p-8 transition-all duration-300 relative group overflow-hidden
            ${isDark
              ? 'bg-black/40 border-white/10 hover:bg-black/60 shadow-lg'
              : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}
          `}
        >
          {/* Subtle background glow effect on hover */}
          <div className={`
            absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${block.color} 
            rounded-full -mr-10 -mt-10 blur-3xl transition-opacity duration-300
            ${isDark ? 'opacity-10 group-hover:opacity-20' : 'opacity-[0.05] group-hover:opacity-10'}
          `}></div>

          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-white shadow-lg
            bg-gradient-to-br ${block.color} ${isDark ? block.shadow : 'shadow-black/5'}
          `}>
            <block.icon size={28} />
          </div>

          <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {block.title}
          </h3>

          <p className={`mb-5 font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {block.description}
          </p>

          <div className={`
            rounded-xl p-4 sm:p-5 border
            ${isDark
              ? 'bg-white/5 border-white/10 text-gray-300 block'
              : 'bg-gray-50 border-gray-100 text-gray-700 block'}
          `}>
            <p className="text-sm leading-relaxed">
              <strong className={`block mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Konkrét példa:
              </strong>
              {block.example}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}