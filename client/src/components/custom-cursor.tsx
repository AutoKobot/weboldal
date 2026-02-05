import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // Check if device supports mouse (not mobile)
    const isMobile = window.matchMedia('(hover: none)').matches;
    if (isMobile) return;

    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    // Add event listeners
    document.addEventListener('mousemove', updateMousePosition);
    
    // Add hover listeners to interactive elements
    const interactiveElements = document.querySelectorAll('button, a, input, [role="button"]');
    interactiveElements.forEach(element => {
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      document.removeEventListener('mousemove', updateMousePosition);
      interactiveElements.forEach(element => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  // Don't render on mobile devices
  if (window.matchMedia('(hover: none)').matches) {
    return null;
  }

  return (
    <>
      {/* Cursor dot */}
      <div
        className="custom-cursor-dot"
        style={{
          left: mousePosition.x - 4,
          top: mousePosition.y - 4,
          transform: isHovering ? 'scale(1.5)' : 'scale(1)',
          background: isHovering ? '#8b5cf6' : '#3b82f6'
        }}
      />
      
      {/* Cursor ring */}
      <div
        className="custom-cursor-ring"
        style={{
          left: mousePosition.x - (isHovering ? 25 : 20),
          top: mousePosition.y - (isHovering ? 25 : 20),
          width: isHovering ? 50 : 40,
          height: isHovering ? 50 : 40,
          borderColor: isHovering ? 'rgba(139, 92, 246, 0.6)' : 'rgba(59, 130, 246, 0.3)'
        }}
      />
    </>
  );
}