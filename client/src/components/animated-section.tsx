import { ReactNode } from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-left' | 'fade-right';
  delay?: number;
}

export default function AnimatedSection({ 
  children, 
  className = '', 
  animation = 'fade-up',
  delay = 0 
}: AnimatedSectionProps) {
  const { ref, isInView } = useScrollAnimation({ threshold: 0.1 });

  const animationClass = {
    'fade-up': 'animate-on-scroll',
    'fade-left': 'animate-on-scroll-left',
    'fade-right': 'animate-on-scroll-left'
  }[animation];

  return (
    <div
      ref={ref as any}
      className={`${animationClass} ${isInView ? 'in-view' : ''} ${className}`}
      style={{ 
        animationDelay: `${delay}ms`,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}