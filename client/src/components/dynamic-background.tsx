import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface FloatingElement {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
}

export default function DynamicBackground() {
  const [elements, setElements] = useState<FloatingElement[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Dinamikus elemek generálása
    const generateElements = () => {
      const newElements: FloatingElement[] = [];
      for (let i = 0; i < 12; i++) {
        newElements.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          size: Math.random() * 20 + 10,
          color: `hsl(${Math.random() * 360}, 70%, 60%)`,
          speed: Math.random() * 2 + 0.5
        });
      }
      setElements(newElements);
    };

    generateElements();

    // Egér követése
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', generateElements);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', generateElements);
    };
  }, []);

  useEffect(() => {
    // Animált mozgás
    const interval = setInterval(() => {
      setElements(prev => prev.map(element => ({
        ...element,
        x: (element.x + element.speed) % window.innerWidth,
        y: element.y + Math.sin(Date.now() * 0.001 + element.id) * 0.5
      })));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {/* Gradient háttér */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900" />
      
      {/* Lebegő elemek */}
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute rounded-full opacity-20 dark:opacity-10"
          style={{
            left: element.x,
            top: element.y,
            width: element.size,
            height: element.size,
            background: `radial-gradient(circle, ${element.color}, transparent)`
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Egér körül glowing effekt */}
      <motion.div
        className="absolute w-32 h-32 rounded-full pointer-events-none"
        style={{
          left: mousePosition.x - 64,
          top: mousePosition.y - 64,
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent)',
          filter: 'blur(20px)'
        }}
        animate={{
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Neural network hatás */}
      <svg className="absolute inset-0 w-full h-full opacity-5 dark:opacity-10">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}