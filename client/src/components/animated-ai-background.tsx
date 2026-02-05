import { useEffect, useState } from 'react';
import aiHumanImage from "@assets/image_1749224411277.png";

export default function AnimatedAIBackground() {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Preload image for instant display
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.src = aiHumanImage;
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-0">
      {/* Instant gradient background - no loading delay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Immediate visual content with CSS animations */}
        <div className="absolute inset-0">
          {/* CSS-only animated particles */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-bounce"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-500 rounded-full opacity-40 animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/3 w-3 h-3 bg-cyan-300 rounded-full opacity-30 animate-ping"></div>
          <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-indigo-400 rounded-full opacity-50 animate-bounce"></div>
          
          {/* Animated connecting lines */}
          <div className="absolute top-1/2 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-30 animate-pulse"></div>
          <div className="absolute top-2/5 left-1/3 right-1/3 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-20 animate-pulse delay-500"></div>
        </div>
        
        {/* Image Container with lazy loading */}
        <div className="relative w-full h-full flex items-center justify-center">
          {imageLoaded && (
            // AI Background with optimized loading
            <div className="image-wrapper w-full h-full relative animate-fade-in">
              {/* Professional AI and Human heads from provided image */}
              <div className="w-full h-full relative overflow-hidden">
                {/* Background image - optimized with lazy loading */}
                <img 
                  src={aiHumanImage} 
                  alt="AI and Human interaction" 
                  className="w-full h-full object-cover opacity-85"
                  loading="lazy"
                  decoding="async"
                  style={{ 
                    willChange: 'auto'
                  }}
                />
                
                {/* Overlay for additional effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/30 via-transparent to-slate-900/30"></div>
                
                {/* Thought transfer beams between foreheads */}
                <div className="absolute top-[35%] left-[30%] right-[30%] h-0.5 bg-gradient-to-r from-cyan-400 via-white to-orange-400 opacity-50 animate-pulse"></div>
                <div className="absolute top-[37%] left-[32%] right-[32%] h-px bg-gradient-to-r from-blue-300 via-purple-400 to-yellow-300 opacity-60 animate-pulse"></div>
                
                {/* Zigzag energy beams between foreheads */}
                {[...Array(8)].map((_, index) => (
                  <div
                    key={`zigzag-${index}`}
                    className="absolute w-1 h-px bg-cyan-300 opacity-70"
                    style={{
                      top: `${35 + (index % 3) * 1}%`,
                      left: `${30 + index * 5}%`,
                      transform: `rotate(${Math.sin(index) * 15}deg)`,
                      animation: `zigzagEnergy ${1.5 + index * 0.2}s infinite linear`,
                      animationDelay: `${index * 0.2}s`
                    }}
                  />
                ))}
                
                {/* Pulsing energy orbs traveling between foreheads */}
                {[...Array(5)].map((_, index) => (
                  <div
                    key={`energy-orb-${index}`}
                    className="absolute w-2 h-2 bg-white rounded-full opacity-80 shadow-lg"
                    style={{
                      top: `${35.5 + (index % 2) * 0.5}%`,
                      left: '30%',
                      animation: `thoughtTransfer ${2.5 + index * 0.3}s infinite linear`,
                      animationDelay: `${index * 0.8}s`,
                      boxShadow: '0 0 8px cyan, 0 0 16px blue'
                    }}
                  />
                ))}
                
                {/* Brain activity glow around AI forehead */}
                <div className="absolute left-[20%] top-[30%] w-16 h-8 bg-cyan-400/20 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute left-[20%] top-[32%] w-12 h-6 bg-blue-500/30 rounded-full blur-md animate-ping"></div>
                
                {/* Human consciousness glow around human forehead */}
                <div className="absolute right-[20%] top-[30%] w-16 h-8 bg-orange-400/20 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute right-[20%] top-[32%] w-12 h-6 bg-yellow-500/30 rounded-full blur-md animate-ping"></div>
                
                {/* Floating thought particles */}
                {[...Array(6)].map((_, index) => (
                  <div
                    key={`thought-${index}`}
                    className="absolute w-1 h-1 bg-white rounded-full opacity-60"
                    style={{
                      top: `${33 + (index % 4) * 2}%`,
                      left: `${35 + index * 4}%`,
                      animation: `floatThought ${3 + index * 0.5}s infinite ease-in-out`,
                      animationDelay: `${index * 0.7}s`
                    }}
                  />
                ))}
                
                {/* Knowledge exchange symbols */}
                <div className="absolute left-[42%] top-[35%] text-cyan-300 text-sm opacity-70 animate-bounce" style={{animationDelay: '0.3s'}}>⚡</div>
                <div className="absolute left-[48%] top-[38%] text-white text-xs opacity-60 animate-bounce" style={{animationDelay: '1.1s'}}>💭</div>
                <div className="absolute right-[42%] top-[35%] text-orange-300 text-sm opacity-70 animate-bounce" style={{animationDelay: '1.8s'}}>✨</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        .loading-spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-left-color: #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .image-wrapper {
          position: relative;
          border-radius: 15px;
          overflow: hidden;
        }

        .data-pulse {
          position: absolute;
          width: 6px;
          height: 6px;
          background: radial-gradient(circle, rgba(0, 255, 255, 1) 0%, rgba(0, 255, 255, 0.5) 50%, rgba(0, 255, 255, 0) 100%);
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(0, 255, 255, 0.9);
          animation: movePulse 3s infinite linear;
          pointer-events: none;
        }

        @keyframes movePulse {
          0% {
            left: 20%;
            opacity: 0;
            transform: translateY(0px);
          }
          15% {
            opacity: 1;
          }
          50% {
            transform: translateY(3px);
          }
          85% {
            opacity: 1;
          }
          100% {
            left: 80%;
            opacity: 0;
            transform: translateY(0px);
          }
        }

        .mouth-glow {
          position: absolute;
          width: 12px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.7);
          box-shadow: 0 0 10px 5px rgba(255, 255, 255, 0.6), 0 0 20px 10px rgba(0, 255, 255, 0.3);
          opacity: 0;
          transform: scale(0.8);
          pointer-events: none;
        }

        .robot-mouth-glow {
          left: 25%;
          top: 55%;
          animation: robotSpeak 4s infinite ease-in-out;
        }

        @keyframes robotSpeak {
          0%, 45%, 100% {
            opacity: 0;
            transform: scale(0.8);
          }
          10% {
            opacity: 1;
            transform: scale(1.0);
          }
          35% {
            opacity: 1;
            transform: scale(0.9);
          }
        }

        .human-mouth-glow {
          left: 70%;
          top: 55%;
          animation: humanSpeak 4s infinite ease-in-out;
        }

        @keyframes humanSpeak {
          0%, 5% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.0);
          }
          75% {
            opacity: 1;
            transform: scale(0.9);
          }
          95%, 100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }

        @keyframes zigzagEnergy {
          0% {
            opacity: 0;
            transform: translateX(0) rotate(0deg);
          }
          25% {
            opacity: 1;
            transform: translateX(10px) rotate(15deg);
          }
          50% {
            opacity: 0.8;
            transform: translateX(-5px) rotate(-10deg);
          }
          75% {
            opacity: 1;
            transform: translateX(15px) rotate(20deg);
          }
          100% {
            opacity: 0;
            transform: translateX(20px) rotate(0deg);
          }
        }

        @keyframes thoughtTransfer {
          0% {
            left: 30%;
            opacity: 0;
            transform: scale(0.5);
          }
          20% {
            opacity: 1;
            transform: scale(1);
          }
          80% {
            opacity: 1;
            transform: scale(0.8);
          }
          100% {
            left: 70%;
            opacity: 0;
            transform: scale(0.3);
          }
        }

        @keyframes floatThought {
          0%, 100% {
            transform: translateY(0px) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(-8px) scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}