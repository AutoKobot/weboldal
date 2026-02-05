import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { presentationImages } from '@/assets/presentation-images';

interface Slide {
  background: string;
  image: string;
}

const slides: Slide[] = [
  {
    background: "linear-gradient(135deg, #4a90e2 0%, #7b68ee 100%)",
    image: presentationImages.slide1
  },
  {
    background: "linear-gradient(135deg, #5a67d8 0%, #667eea 100%)",
    image: presentationImages.slide2
  },
  {
    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    image: presentationImages.slide3
  },
  {
    background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    image: presentationImages.slide4
  },
  {
    background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    image: presentationImages.slide5
  },
  {
    background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    image: presentationImages.slide6
  },
  {
    background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    image: presentationImages.slide7
  },
  {
    background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    image: presentationImages.slide8
  },
  {
    background: "linear-gradient(135deg, #e0c3fc 0%, #9bb5ff 100%)",
    image: presentationImages.slide9
  }
];

function PresentationSlideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isPlaying || isHovered) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, isHovered]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div 
      className="relative w-full max-w-3xl h-[32rem] rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slide Content */}
      <div
        className="w-full h-full flex items-center justify-center text-white relative transition-all duration-500 ease-in-out"
        style={{ background: slides[currentSlide].background }}
      >
        {/* Background Image */}
        <div className="absolute inset-0 opacity-95 overflow-hidden">
          <img 
            src={slides[currentSlide].image}
            alt={`Slide ${currentSlide + 1}`}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Slide Number */}
        <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
          {currentSlide + 1} / {slides.length}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute inset-0 flex items-center justify-between opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={prevSlide}
          className="ml-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} />
        </button>
        
        <button
          onClick={nextSlide}
          className="mr-4 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Play/Pause Button */}
      <div className="absolute bottom-4 left-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentSlide 
                ? 'bg-white' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default PresentationSlideshow;