import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { extractTextFromMarkdown, compareSectionCodes } from "@/lib/utils";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import BottomNav from "@/components/bottom-nav";
import ChatInterface from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, PlayCircle, Menu, Play, MessageCircle, FileText, Volume2, Image as ImageIcon, Pause, Brain, Youtube, Headphones, X, Wand2, GraduationCap, Presentation, MonitorPlay, Loader2, Search, Wrench, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Module, Flashcard } from "@shared/schema";
import QuizInterface from "@/components/quiz-interface";
import { FlashcardQuiz } from "@/components/flashcard-quiz";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// import mermaid from 'mermaid'; // Removed for dynamic import to fix init error
import { PresentationPlayer } from "@/components/presentation-player";


// Separate components to avoid TDZ and initialization errors in production
const MathParagraph = (props: any) => {
  const { children } = props;
  const text = String(children || '');
  const isMath = text.includes('\\frac') || text.includes('\\rho') || text.includes('\\text{') || 
                text.includes('\\sigma') || text.includes('\\delta') || text.includes('\\alpha') || 
                text.includes('\\beta') || text.includes('\\lambda') || text.includes('\\omega');
  const isChemical = /^[A-Z][a-z]?(\s*[:=]\s*[A-Z][a-z]?)+$/.test(text);
  const isBracketMath = text.trim().startsWith('[') && text.trim().endsWith(']') && text.includes('\\');

  if (isMath || isChemical || isBracketMath) {
    const formula = text
      .replace(/^\[\s*/, '').replace(/\s*\]$/, '')
      .replace(/^\$\$\s*/, '').replace(/\s*\$\$/, '')
      .replace(/^\\\[\s*/, '').replace(/\s*\\\]$/, '')
      .trim();
      
    const mathUrl = `https://latex.codecogs.com/svg.latex?\\huge&space;\\color{Gray}{${encodeURIComponent(formula)}}`;
    
    return (
      <div className="math-visualizer my-8 flex flex-col items-center">
        <div className="bg-neutral-50/40 p-8 rounded-3xl border border-neutral-100 border-dashed hover:bg-white hover:border-solid hover:shadow-md transition-all duration-500">
          <img src={mathUrl} alt={formula} className="max-h-24 h-auto" />
        </div>
        <span className="text-[9px] uppercase tracking-wider text-neutral-400 mt-3 font-bold opacity-60">Szakmai vázlat / Képlet</span>
      </div>
    );
  }
  // Use div instead of p to prevent invalid nesting when children contain block elements (e.g. MermaidDiagram)
  return <div className="mb-4 leading-relaxed">{children}</div>;
};

// Completely isolated Mermaid renderer using an iframe to bypass React/Vite/CSS conflicts
const MermaidDiagram = ({ chart }: { chart: string }) => {
  const [height, setHeight] = useState(150);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const chartText = (chart || '').trim();

  // Listen for resize messages from the iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.source === iframeRef.current?.contentWindow && e.data?.type === 'mermaid-resize') {
        if (e.data.height && e.data.height > 50) {
          setHeight(e.data.height + 40);
        }
        setLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Fallback loading removal
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!chartText) return null;

  // Safe escaping for inserting into HTML body
  const safeChart = chartText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // HTML document with ES Module import for Mermaid v10+
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          margin: 0; padding: 20px; 
          display: flex; justify-content: center; align-items: center; 
          font-family: 'Inter', sans-serif; background: transparent; overflow: hidden;
        }
        .mermaid { display: flex; justify-content: center; width: 100%; }
        svg { max-width: 100%; height: auto !important; }
        .error-box { color: #d97706; background: #fffbeb; padding: 12px; border: 1px solid #fcd34d; border-radius: 8px; font-size: 12px; font-family: monospace; white-space: pre-wrap; width: 100%; }
      </style>
    </head>
    <body>
      <div class="mermaid" id="container">${safeChart}</div>
      <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        
        try {
          mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
          await mermaid.run({ nodes: [document.getElementById('container')] });
          
          setTimeout(() => {
            const svg = document.querySelector('svg');
            const height = svg ? svg.getBoundingClientRect().height : document.body.scrollHeight;
            window.parent.postMessage({ type: 'mermaid-resize', height }, '*');
          }, 300);
        } catch (err) {
          document.body.innerHTML = '<div class="error-box">⚠ Diagram renderelési hiba:<br><br>' + err.message + '</div>';
          window.parent.postMessage({ type: 'mermaid-resize', height: document.body.scrollHeight }, '*');
        }
      </script>
    </body>
    </html>
  `;

  return (
    <div className="mermaid-visualizer my-8 flex flex-col items-center w-full">
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm w-full relative flex justify-center overflow-hidden min-h-[100px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center -z-10 bg-neutral-50/50">
             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-300" />
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          style={{ width: '100%', height: `${height}px`, border: 'none', transition: 'height 0.3s ease-out' }}
          title="Szakmai Folyamatábra"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <span className="text-[10px] uppercase tracking-widest text-neutral-400 mt-3 font-semibold italic">Szakmai folyamatábra</span>
    </div>
  );
};


const CodeComponent = ({ className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  if (language === 'mermaid') { 
    return <MermaidDiagram chart={String(children)} />;
  }
  
  if (language === 'svg') { 
    return (
      <div className="svg-visualizer my-6 flex flex-col items-center">
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm overflow-hidden" dangerouslySetInnerHTML={{ __html: String(children) }} />
        <span className="text-[10px] uppercase tracking-widest text-neutral-400 mt-3 font-semibold italic">Technikai illusztráció</span>
      </div>
    ); 
  }
  
  return (<code className="bg-neutral-100 px-2 py-1 rounded text-sm font-mono" {...props}>{children}</code>);
}

export default function ModuleViewer() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const moduleId = parseInt(params.id as string);

  const { data: module, isLoading: moduleLoading } = useQuery<Module>({
    queryKey: [`/api/modules/${moduleId}`],
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [chatInterfaceKey, setChatInterfaceKey] = useState(0);

  const toGoogleDrivePreviewUrl = (url: string): string => {
    const driveMatch = url.match(/\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    return url;
  };

  const isGoogleDriveUrl = (url: string): boolean => {
    return url?.includes('drive.google.com') || url?.includes('docs.google.com');
  };

  const toDirectImageUrl = (url: string): string => {
    if (!url) return url;
    const driveMatch = url.match(/\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    return url;
  };

  const toDirectVideoUrl = (url: string): string => {
    if (!url) return url;
    const driveMatch = url.match(/\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    return url;
  };

  const toPresentationEmbedUrl = (url: string): string => {
    if (!url) return '';
    const slidesMatch = url.match(/\/presentation\/d\/([^/]+)/);
    if (slidesMatch) {
      return `https://docs.google.com/presentation/d/${slidesMatch[1]}/embed?start=false&loop=false&delayms=3000`;
    }
    if (url.toLowerCase().endsWith('.pdf')) return url;
    const driveMatch = url.match(/\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    if (url.toLowerCase().includes('.pptx') || url.toLowerCase().includes('.ppt')) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showInteractivePresentationModal, setShowInteractivePresentationModal] = useState(false);
  const [selectedYoutubeVideo, setSelectedYoutubeVideo] = useState<{ title: string, videoId: string } | null>(null);
  const [contentVersion, setContentVersion] = useState<'concise' | 'detailed'>('concise');
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [showWikipediaModal, setShowWikipediaModal] = useState(false);
  const [wikipediaContent, setWikipediaContent] = useState<{ title: string, content: string, url: string } | null>(null);
  const [isLoadingWikipedia, setIsLoadingWikipedia] = useState(false);

  useEffect(() => {
    const renderMermaidDiagrams = async () => {
      const mermaidElements = document.querySelectorAll('code.language-mermaid, .mermaid');
      if (mermaidElements.length > 0) {
        const m = await import('mermaid');
        const mermaid = m.default;
        mermaidElements.forEach((element, index) => {
          if (element.tagName === 'CODE' && element.textContent) {
            const mermaidDiv = document.createElement('div');
            mermaidDiv.className = 'mermaid';
            mermaidDiv.textContent = element.textContent;
            mermaidDiv.id = `mermaid-diagram-dom-${index}`;
            element.parentNode?.insertBefore(mermaidDiv, element);
            if (element instanceof HTMLElement) element.style.display = 'none';
          }
        });

        setTimeout(async () => {
          const mermaidDivs = document.querySelectorAll('.mermaid');
          if (mermaidDivs.length > 0) {
            try {
              await mermaid.run({ querySelector: '.mermaid' });
            } catch (error) {
              await mermaid.init(undefined, mermaidDivs as any);
            }
          }
        }, 100);
      }
    };

    const observer = new MutationObserver((mutations) => {
      let shouldRerender = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.classList?.contains('prose') || element.querySelector?.('code.language-mermaid, .mermaid')) {
                shouldRerender = true;
              }
            }
          });
        }
      });

      if (shouldRerender) {
        setTimeout(renderMermaidDiagrams, 300);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const mermaidDivs = document.querySelectorAll('.mermaid');
      if (mermaidDivs.length > 0) {
        const m = await import('mermaid');
        const mermaid = m.default;
        mermaid.run({ querySelector: '.mermaid', suppressErrors: true }).catch(() => {
          mermaid.init(undefined, '.mermaid');
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [module?.id, contentVersion, showFlashcards, isRegenerating]);

  const fetchWikipediaContent = async (wikipediaUrl: string) => {
    setIsLoadingWikipedia(true);
    try {
      const urlParts = wikipediaUrl.split('/');
      let articleTitle = decodeURIComponent(urlParts[urlParts.length - 1]);
      const response = await fetch(`/api/wikipedia/${encodeURIComponent(articleTitle)}`);
      if (response.ok) {
        const data = await response.json();
        setWikipediaContent({
          title: data.title || articleTitle,
          content: data.content || 'Nincs elérhető tartalom',
          url: data.url || wikipediaUrl
        });
        setShowWikipediaModal(true);
      }
    } catch (error) {
      toast({ title: "Hiba", description: "Hiba a Wikipedia betöltésekor", variant: "destructive" });
    } finally {
      setIsLoadingWikipedia(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({ title: "Nincs bejelentkezve", description: "Jelentkezz be a folytatáshoz.", variant: "destructive" });
      setTimeout(() => setLocation("/"), 500);
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const { data: allModules = [] } = useQuery<Module[]>({
    queryKey: ['/api/public/modules', module?.subjectId],
    queryFn: async () => {
      if (!module?.subjectId) return [];
      const response = await fetch(`/api/public/modules?subjectId=${module.subjectId}`);
      return response.json();
    },
    enabled: !!module?.subjectId && !moduleLoading,
  });

  const { data: flashcards = [] } = useQuery<Flashcard[]>({
    queryKey: [`/api/modules/${moduleId}/flashcards`],
    enabled: !!module,
  });

  const completeModuleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/modules/${moduleId}/complete`);
    },
    onSuccess: async () => {
      queryClient.clear();
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: "Gratulálunk!", description: "Sikeresen befejezted ezt a modult!" });
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (error) => {
      toast({ title: "Hiba", description: "Nem sikerült befejezni a modult", variant: "destructive" });
    },
  });

  const regenerateModuleMutation = useMutation({
    mutationFn: async () => {
      setIsRegenerating(true);
      const response = await apiRequest('POST', `/api/ai/modules/${moduleId}/regenerate`, {
        title: module?.title || '',
        content: module?.content || ''
      });
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/modules/${moduleId}`] });
      toast({ title: "Sikeres újragenerálás!", description: "A modul frissült." });
      setIsRegenerating(false);
      setChatInterfaceKey(prev => prev + 1);
    },
    onError: () => {
      toast({ title: "Hiba", description: "Újragenerálás sikertelen", variant: "destructive" });
      setIsRegenerating(false);
    },
  });

  const handleBackNavigation = () => {
    if (module?.subjectId) setLocation(`/subjects/${module.subjectId}/modules`);
    else setLocation('/subjects');
  };

  const stopReadAloud = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsReadingAloud(false);
  };

  const handleReadAloud = () => {
    if (isReadingAloud) { stopReadAloud(); return; }
    if (!window.speechSynthesis) {
      toast({ title: "Hiba", description: "Nem támogatott böngésző", variant: "destructive" });
      return;
    }

    let contentToRead = module?.content || "";
    if (contentVersion === 'concise' && module?.conciseContent) contentToRead = module.conciseContent;
    else if (contentVersion === 'detailed' && module?.detailedContent) contentToRead = module.detailedContent;

    const textToRead = extractTextFromMarkdown(contentToRead);
    const utterance = new SpeechSynthesisUtterance(`${module?.title}. ${textToRead}`);
    utterance.lang = 'hu-HU';
    utterance.rate = 0.9;
    utterance.onend = () => setIsReadingAloud(false);
    utterance.onerror = () => setIsReadingAloud(false);
    
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsReadingAloud(true);
  };

  useEffect(() => {
    return () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); };
  }, []);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (moduleLoading) {
    return (
      <div className="flex min-h-screen bg-student-warm">
        <Sidebar user={user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-neutral-600">Modul betöltése...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex min-h-screen bg-student-warm">
        <div className="hidden lg:block">
          <Sidebar user={user} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-neutral-700 mb-2">Modul nem található</h2>
            <p className="text-neutral-500 mb-4">A keresett modul nem létezik vagy nem elérhető.</p>
            <Button onClick={() => setLocation("/")}>
              Vissza a főoldalra
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = user.completedModules?.includes(moduleId) || false;

  return (
    <div className="flex min-h-screen bg-student-warm">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar user={user} />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        user={user}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Mobile Header */}
        {/* Mobile Header - Sticky and Premium */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-neutral-100 lg:hidden px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="p-2 hover:bg-neutral-100 rounded-xl flex-shrink-0"
              aria-label="Vissza a tananyagokhoz"
              title="Vissza"
            >
              <ArrowLeft size={20} className="text-neutral-500" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black text-neutral-800 truncate leading-tight tracking-tight uppercase">
                {module.title}
              </h1>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest truncate">
                {module.sectionCode || `#${module.moduleNumber}. modul`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileNavOpen(true)}
              className="p-2 hover:bg-neutral-100 rounded-xl flex-shrink-0"
              aria-label="Beállítások megnyitása"
              title="Beállítások"
            >
              <Settings size={20} className="text-neutral-500" />
            </Button>
          </div>
        </header>

        {/* Mobile Multimedia Bar - Horizontal Scrollable */}
        <div className="lg:hidden flex items-center gap-3 overflow-x-auto px-4 py-3 bg-white border-b border-neutral-50 scrollbar-hide">
          {module.imageUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImageModal(true)}
              className="flex-shrink-0 gap-2 bg-blue-50/50 border-blue-100 text-blue-700 h-9 rounded-xl px-3 font-bold text-xs"
            >
              <ImageIcon size={14} /> Kép
            </Button>
          )}
          {module.youtubeUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowYoutubeModal(true)}
              className="flex-shrink-0 gap-2 bg-red-50/50 border-red-100 text-red-700 h-9 rounded-xl px-3 font-bold text-xs"
            >
              <Youtube size={14} /> Videó
            </Button>
          )}
          {module.videoUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVideoModal(true)}
              className="flex-shrink-0 gap-2 bg-purple-50/50 border-purple-100 text-purple-700 h-9 rounded-xl px-3 font-bold text-xs"
            >
              <Play size={14} /> Demo
            </Button>
          )}
          {module.audioUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAudioModal(true)}
              className="flex-shrink-0 gap-2 bg-green-50/50 border-green-100 text-green-700 h-9 rounded-xl px-3 font-bold text-xs"
            >
              <Volume2 size={14} /> Hang
            </Button>
          )}
          {module.podcastUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPodcastModal(true)}
              className="flex-shrink-0 gap-2 bg-orange-50/50 border-orange-100 text-orange-700 h-9 rounded-xl px-3 font-bold text-xs"
            >
              <Headphones size={14} /> Podcast
            </Button>
          )}
          {module.presentationUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPresentationModal(true)}
              className="flex-shrink-0 gap-2 bg-indigo-50/50 border-indigo-100 text-indigo-700 h-9 rounded-xl px-3 font-bold text-xs"
            >
              <Presentation size={14} /> Prezi
            </Button>
          )}
          {Boolean(module.presentationData) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInteractivePresentationModal(true)}
              className="flex-shrink-0 gap-2 bg-slate-900 border-blue-600 text-blue-400 h-9 rounded-xl px-3 font-bold text-xs animate-pulse"
            >
              <MonitorPlay size={14} /> Interaktív AI
            </Button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex flex-col">
          {/* Module Content */}
          <main className="flex-1 p-4 lg:p-8 relative">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={handleBackNavigation}
              className="mb-6"
            >
              <ArrowLeft className="mr-2" size={16} />
              Vissza
            </Button>

            {/* Multimédia oldalsáv - Csak Desktopon fixált */}
            {module && (
              <div className="hidden lg:flex fixed right-6 top-1/2 transform -translate-y-1/2 z-40 flex-col gap-3">
                {module.imageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImageModal(true)}
                    className="w-12 h-12 rounded-full bg-student-warm shadow-lg hover:shadow-xl border-2 border-neutral-200 hover:border-blue-300"
                    title="Kép megtekintése"
                  >
                    <ImageIcon size={18} className="text-neutral-600" />
                  </Button>
                )}

                {module.youtubeUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowYoutubeModal(true)}
                    className="w-12 h-12 rounded-full bg-student-warm shadow-lg hover:shadow-xl border-2 border-neutral-200 hover:border-red-300"
                    title="YouTube videó megtekintése"
                  >
                    <Youtube size={18} className="text-red-600" />
                  </Button>
                )}

                {module.videoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoModal(true)}
                    className="w-12 h-12 rounded-full bg-student-warm shadow-lg hover:shadow-xl border-2 border-neutral-200 hover:border-purple-300"
                    title="Videó lejátszása"
                  >
                    <Play size={18} className="text-purple-600" />
                  </Button>
                )}

                {module.audioUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAudioModal(true)}
                    className="w-12 h-12 rounded-full bg-student-warm shadow-lg hover:shadow-xl border-2 border-neutral-200 hover:border-green-300"
                    title="Hang lejátszása"
                  >
                    <Volume2 size={18} className="text-green-600" />
                  </Button>
                )}

                {module.podcastUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPodcastModal(true)}
                    className="w-12 h-12 rounded-full bg-student-warm shadow-lg hover:shadow-xl border-2 border-neutral-200 hover:border-orange-300"
                    title="Podcast meghallgatása"
                  >
                    <Headphones size={18} className="text-orange-600" />
                  </Button>
                )}

                {module.presentationUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPresentationModal(true)}
                    className="w-12 h-12 rounded-full bg-student-warm shadow-lg hover:shadow-xl border-2 border-neutral-200 hover:border-blue-500"
                    title="Prezentáció (PPTX/PDF) megtekintése"
                  >
                    <Presentation size={18} className="text-blue-500" />
                  </Button>
                )}

                {Boolean(module.presentationData) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInteractivePresentationModal(true)}
                    className="w-12 h-12 rounded-full bg-slate-900 shadow-lg hover:shadow-xl border-2 border-blue-600 hover:border-blue-400 animate-pulse"
                    title="Interaktív AI Prezentáció megtekintése"
                  >
                    <MonitorPlay size={18} className="text-blue-400" />
                  </Button>
                )}
              </div>
            )}

            {/* Module Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline">
                  {module.sectionCode ? `${module.sectionCode}` : `#${module.moduleNumber}. modul`}
                </Badge>
                {isCompleted && (
                  <Badge className="bg-secondary text-secondary-foreground">
                    <CheckCircle className="mr-1" size={14} />
                    Befejezve
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-neutral-800 mb-2">{module.title}</h1>
            </div>

            {/* Multimédia tartalmak csak az oldalsáv ikonokon keresztül elérhetők */}





            {/* Module Content */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tananyag</CardTitle>
                  <div className="flex gap-2">
                    {/* Content version selector for AI-enhanced modules */}
                    {(module.conciseContent || module.detailedContent) && (
                      <>
                        <Button
                          variant={(!showFlashcards && contentVersion === 'concise') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setShowFlashcards(false);
                            setContentVersion('concise');
                          }}
                          disabled={!module.conciseContent}
                          className="text-xs"
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          Tömör
                        </Button>
                        <Button
                          variant={(!showFlashcards && contentVersion === 'detailed') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setShowFlashcards(false);
                            setContentVersion('detailed');
                          }}
                          disabled={!module.detailedContent}
                          className="text-xs"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Részletes
                        </Button>
                      </>
                    )}
                    {flashcards.length > 0 && (
                      <Button
                        variant={showFlashcards ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowFlashcards(!showFlashcards)}
                        className="text-xs"
                      >
                        <GraduationCap className="w-3 h-3 mr-1" />
                        Tanulókártyák
                      </Button>
                    )}
                    <Button
                      variant={isReadingAloud ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleReadAloud}
                      className={`text-xs ${isReadingAloud ? "bg-amber-100 text-amber-700 border-amber-300 animate-pulse hover:bg-amber-200" : ""}`}
                    >
                      {isReadingAloud ? <Pause className="w-3 h-3 mr-1" /> : <Volume2 className="w-3 h-3 mr-1" />}
                      {isReadingAloud ? "Stop" : "Felolvasás"}
                    </Button>
                    {/* AI Regenerate button for admins */}
                    {user?.role === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => regenerateModuleMutation.mutate()}
                        disabled={isRegenerating}
                        className="text-xs"
                      >
                        {isRegenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                            Újragenerálás...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3 mr-1" />
                            AI Újragenerálás
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showFlashcards ? (
                  <div className="py-8">
                    <FlashcardQuiz flashcards={flashcards} />
                  </div>
                ) : (
                  <div ref={mermaidRef} className="prose prose-neutral max-w-none dark:prose-invert">
                    {(module.type !== 'practical' || (module.content && module.content.length > 50)) && (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-primary">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-primary">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-primary">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic mb-4 bg-student-warm py-2">{children}</blockquote>,
                          pre: ({ children }) => <pre className="bg-neutral-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                          strong: ({ children }) => {
                            const text = String(children);
                            const importantTerms = ['paprika', 'paradicsom', 'hagyma', 'kolbász', 'lecsó', 'tojás', 'olaj', 'só', 'bors', 'pirospaprika', 'cukor', 'fokhagyma', 'zöldpaprika', 'kápiapaprika', 'szalonna', 'tejföl', 'liszt', 'vaj', 'tej', 'sajt', 'hegesztés', 'ívhegesztés', 'elektróda', 'fém', 'ötvözet', 'acél'];
                            const isImportantTerm = importantTerms.some(term => text.toLowerCase().includes(term.toLowerCase()));
                            let keyConceptsData = [];
                            try { keyConceptsData = module.keyConceptsData ? (typeof module.keyConceptsData === 'string' ? JSON.parse(module.keyConceptsData) : module.keyConceptsData) : []; } catch (e) {}
                            const matchingConcept = keyConceptsData.find((concept: any) => concept.concept && text.toLowerCase().includes(concept.concept.toLowerCase()));
                            if (isImportantTerm || matchingConcept) {
                              const wikipediaUrl = `https://hu.wikipedia.org/wiki/${encodeURIComponent(text)}`;
                              return (<a href={wikipediaUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:text-blue-600 hover:underline transition-colors inline-flex items-center gap-1" title={`Wikipedia: ${text}`}>{children}<span className="text-xs">🔗</span></a>);
                            }
                            return <strong className="font-semibold text-primary">{children}</strong>;
                          },
                          em: ({ children }) => <em className="italic">{children}</em>,
                          table: ({ children }) => <table className="w-full border-collapse border border-neutral-300 mb-4">{children}</table>,
                          th: ({ children }) => <th className="border border-neutral-300 px-4 py-2 bg-neutral-100 font-semibold">{children}</th>,
                          td: ({ children }) => <td className="border border-neutral-300 px-4 py-2">{children}</td>,
                          img: ({ src, alt }) => (
                            <div className="flex flex-col items-center my-8">
                              <div className="bg-white p-2 rounded-2xl shadow-md border border-neutral-100 overflow-hidden max-w-full">
                                <img src={src} alt={alt} className="max-w-full h-auto rounded-xl hover:scale-[1.02] transition-transform duration-500" loading="lazy" />
                              </div>
                              {alt && <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mt-3 italic">{alt}</p>}
                            </div>
                          ),
                          a: ({ href, children }) => {
                            if (href && href.includes('hu.wikipedia.org/wiki/')) {
                              return (<button onClick={(e) => { e.preventDefault(); fetchWikipediaContent(href); }} className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium">{children}<span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-medium">W</span></button>);
                            }
                            return <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
                          },
                          code: CodeComponent,
                          p: MathParagraph
                        }}
                      >
                        {(() => {
                          let rawContent = "";
                          if (module.conciseContent || module.detailedContent) {
                            if (contentVersion === 'concise' && module.conciseContent) rawContent = module.conciseContent;
                            else if (contentVersion === 'detailed' && module.detailedContent) rawContent = module.detailedContent;
                            else rawContent = module.detailedContent || module.conciseContent || "";
                          } else { rawContent = module.content || ""; }
                          return rawContent
                            .replace(/<div align="center">/g, '')
                            .replace(/<\/div>/g, '')
                            .replace(/<p>/g, '\n\n')
                            .replace(/<\/p>/g, '\n\n')
                            .replace(/<em>/g, '*')
                            .replace(/<\/em>/g, '*')
                            .replace(/<br\s*\/?>/g, '\n')
                            .replace(/\\\[/g, '$$') 
                            .replace(/\\\]/g, '$$')
                            .replace(/\[\s*\\text/g, '$$ \\text')
                            .replace(/\\text\{([^}]+)\}\s*\]/g, '\\text{$1} $$')
                            .replace(/\n\s*\n/g, '\n\n') // Remove excessive empty lines
                            .trim();
                        })()}
                      </ReactMarkdown>
                    )}

                    {/* Practical Tasks Section */}
                    {module.type === 'practical' && !!module.practicalTasks && Array.isArray(module.practicalTasks) && module.practicalTasks.length > 0 && (
                      <div className={`${module.content && module.content.length > 50 ? "mt-8 pt-6 border-t border-neutral-100" : ""}`}>
                        <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                          <Wrench className="text-orange-600" size={20} />
                          Gyakorlati Feladatok
                        </h3>
                        <div className="grid gap-3">
                          {module.practicalTasks.map((task: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-4 bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50 hover:bg-orange-50 transition-all shadow-sm">
                              <span className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                                {idx + 1}
                              </span>
                              <p className="text-neutral-700 leading-relaxed font-semibold text-lg">{task}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Concepts with YouTube Videos */}
                    {(() => {
                      try {
                        const keyConceptsData = typeof module.keyConceptsData === 'string'
                          ? JSON.parse(module.keyConceptsData)
                          : module.keyConceptsData;

                        if (!keyConceptsData || !Array.isArray(keyConceptsData) || keyConceptsData.length === 0) {
                          return null;
                        }

                        return (
                          <div className="mt-8 border-t pt-6">
                            <h3 className="text-xl font-bold mb-6 text-primary flex items-center gap-2">
                              <PlayCircle className="text-red-600" />
                              Kulcsfogalmak videókkal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {keyConceptsData?.map((concept: any, index: number) => (
                                <div key={index} className="flex flex-col bg-student-warm rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                  <div className="p-4 border-b border-neutral-100">
                                    <h4 className="font-bold text-neutral-800 mb-1">{concept.concept}</h4>
                                    <p className="text-sm text-neutral-600 italic line-clamp-3">{concept.definition}</p>
                                  </div>
                                  
                                  <div className="flex-1 bg-neutral-50/50">
                                    {concept.youtubeVideos && concept.youtubeVideos.length > 0 ? (
                                      <div className="space-y-1">
                                        {concept.youtubeVideos?.slice(0, 2).map((video: any, videoIndex: number) => (
                                          <button
                                            key={videoIndex}
                                            onClick={() => {
                                              setSelectedYoutubeVideo({
                                                title: video.title,
                                                videoId: video.videoId
                                              });
                                              setShowYoutubeModal(true);
                                            }}
                                            className="flex items-center gap-3 p-3 w-full text-left hover:bg-red-50 group transition-colors"
                                          >
                                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-600 transition-colors">
                                              <Youtube className="w-5 h-5 text-red-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-semibold text-neutral-900 truncate">
                                                {video.title}
                                              </div>
                                              <div className="text-xs text-neutral-500 line-clamp-1">
                                                Megtekintés a YouTube-on
                                              </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                      ) : (
                                        <div className="p-6 flex flex-col items-center justify-center text-center">
                                          <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mb-2">
                                            <Search className="w-5 h-5 text-neutral-400" />
                                          </div>
                                          <p className="text-xs font-medium text-neutral-500 mb-2">Nem találtunk konkrét videót</p>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 text-xs gap-1.5 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
                                            onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(concept.concept + ' oktatás')}`, '_blank')}
                                          >
                                            <Youtube className="w-3.5 h-3.5" />
                                            Keresés a YouTube-on
                                          </Button>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error('Error parsing key concepts data:', error);
                        return null;
                      }
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Module Navigation */}
            {(() => {
              const currentModule = allModules.find(m => m.id === moduleId);
              if (!currentModule) return null;

              const subjectModules = allModules
                .filter(m => m.subjectId === currentModule.subjectId)
                .sort((a, b) => compareSectionCodes(a.sectionCode, b.sectionCode) || (a.moduleNumber - b.moduleNumber));

              const currentIndex = subjectModules.findIndex(m => m.id === moduleId);
              const previousModule = subjectModules[currentIndex - 1];
              const nextModule = subjectModules[currentIndex + 1];
              const completedModules = user?.completedModules || [];
              const isCurrentCompleted = completedModules.includes(moduleId);
              // A következő modul akkor nyílik ki, ha az aktuális modul befejezett
              // De első esetben (nincs előző modul) mindig nyitott
              const isNextUnlocked = !nextModule || isCurrentCompleted;

              // Debug logging
              console.log('Progressive unlocking debug:', {
                moduleId,
                nextModuleId: nextModule?.id,
                completedModules,
                isCurrentCompleted,
                isNextUnlocked
              });

              return (
                <div className="flex justify-between items-center mb-6 p-4 bg-student-warm rounded-lg">
                  <div>
                    {previousModule ? (
                      <Button
                        variant="outline"
                        onClick={() => setLocation(`/module/${previousModule.id}`)}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft size={16} />
                        Előző: {previousModule.title}
                      </Button>
                    ) : (
                      <div></div>
                    )}
                  </div>

                  <div className="text-center">
                    <span className="text-sm text-neutral-500">
                      {currentIndex + 1} / {subjectModules.length} modul
                    </span>
                  </div>

                  <div>
                    {nextModule ? (
                      <Button
                        variant={isNextUnlocked ? "default" : "outline"}
                        onClick={() => {
                          if (isNextUnlocked) {
                            setLocation(`/module/${nextModule.id}`);
                          } else {
                            toast({
                              title: "Modul zárolva",
                              description: "Először fejezd be ezt a modult a tudáspróbával.",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="flex items-center gap-2"
                        disabled={!isNextUnlocked}
                      >
                        Következő: {nextModule.title}
                        <ArrowLeft size={16} className="rotate-180" />
                      </Button>
                    ) : (
                      <div></div>
                    )}
                  </div>
                </div>
              );
            })()}




          </main>

          {/* Chat Section - Below module content */}
          <section className="border-t border-neutral-200 bg-student-warm">
            <div className="p-4 bg-student-warm border-b border-neutral-100">
              <div className="max-w-4xl mx-auto">
                <h3 className="font-semibold text-neutral-700">AI Tanár</h3>
                <p className="text-sm text-neutral-500">Beszélgess a modulról, kérj magyarázatot vagy indítsd el a tudáspróbát!</p>
              </div>
            </div>
            <div className="p-4">
              <div className="max-w-4xl mx-auto">
                <ChatInterface
                  key={chatInterfaceKey}
                  userId={user.id}
                  moduleId={moduleId}
                  onQuizStart={() => setShowQuiz(true)}
                />
              </div>
            </div>
          </section>

          {/* Tudáspróba most modal ablakban jelenik meg */}
        </div>
      </div>

      {/* Multimédia Modal ablakok */}

      {/* Kép Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Illusztráció</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center min-h-[300px]">
            {module?.imageUrl && isGoogleDriveUrl(module.imageUrl) ? (
              // Google Drive képek: iframe preview a legmegbízhatóbb módszer
              <iframe
                src={toGoogleDrivePreviewUrl(module.imageUrl)}
                className="w-full h-[70vh] rounded-lg border-0"
                allow="autoplay"
                title="Modul illusztráció"
              />
            ) : (
              // Normál URL-ek: img tag
              <img
                src={toDirectImageUrl(module?.imageUrl || '')}
                alt="Modul illusztráció"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.onerror = null;
                  t.src = '';
                  t.alt = 'A kép nem tölthető be.';
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* YouTube Modal */}
      <Dialog open={showYoutubeModal} onOpenChange={setShowYoutubeModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedYoutubeVideo?.title || 'YouTube Videó'}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            {selectedYoutubeVideo?.videoId && (
              <iframe
                src={`https://www.youtube.com/embed/${selectedYoutubeVideo.videoId}`}
                className="w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube videó"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Videó Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Videó</DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            {module?.videoUrl && (
              <>
                {module.videoUrl.includes('drive.google.com') ? (
                  // Google Drive videó → iframe embed
                  <iframe
                    src={toPresentationEmbedUrl(module.videoUrl).replace('/embed?', '/preview?') || `https://drive.google.com/file/d/${module.videoUrl.match(/\/file\/d\/([^/]+)/)?.[1]}/preview`}
                    className="w-full h-full rounded-lg border-0"
                    allow="autoplay"
                    title="Videó"
                  />
                ) : (
                  <video
                    src={toDirectVideoUrl(module.videoUrl)}
                    controls
                    className="w-full h-full rounded-lg"
                    preload="metadata"
                  >
                    A böngésződ nem támogatja a videó lejátszást.
                  </video>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Audio Modal */}
      <Dialog open={showAudioModal} onOpenChange={setShowAudioModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hang lejátszás</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {module?.audioUrl && (
              <audio
                src={module.audioUrl}
                controls
                className="w-full"
                preload="metadata"
              >
                A böngésződ nem támogatja a hang lejátszást.
              </audio>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Podcast Modal */}
      <Dialog open={showPodcastModal} onOpenChange={setShowPodcastModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Podcast</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {module?.podcastUrl && (
              <div>
                <p className="text-sm text-neutral-600 mb-3">Podcast link:</p>
                <a
                  href={module.podcastUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {module.podcastUrl}
                </a>
                <Button
                  onClick={() => module.podcastUrl && window.open(module.podcastUrl, '_blank')}
                  className="mt-3 w-full"
                >
                  Podcast megnyitása
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prezentáció (PPTX/PDF) Modal */}
      <Dialog open={showPresentationModal} onOpenChange={setShowPresentationModal}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col gap-0 overflow-hidden">
          {/* Header sáv */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-white flex-shrink-0">
            <DialogTitle className="text-base font-semibold">Prezentáció megtekintése</DialogTitle>
            <div className="flex items-center gap-2">
              <p className="text-xs text-neutral-400 hidden sm:block">
                {module?.presentationUrl?.toLowerCase().endsWith('.pdf')
                  ? "PDF – natív böngésző megjelenítő"
                  : "PPTX – Office Online (publikus elérés szükséges)"}
              </p>
              <a href={module?.presentationUrl || '#'} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Letöltés
                </Button>
              </a>
            </div>
          </div>

          {/* Az iframe a teljes remaining space-t foglalja el */}
          <div className="flex-1 w-full relative bg-neutral-100 overflow-hidden min-h-0">
            {module?.presentationUrl ? (() => {
              const embedUrl = toPresentationEmbedUrl(module.presentationUrl);
              const isGoogleSlides = module.presentationUrl.includes('/presentation/d/');
              const isPdf = module.presentationUrl.toLowerCase().endsWith('.pdf');
              return (
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  title={isGoogleSlides ? "Google Slides" : isPdf ? "PDF Megtekintő" : "Prezentáció Megtekintő"}
                  allow="autoplay"
                />
              );
            })() : (
              <div className="flex items-center justify-center h-full">
                <p className="text-neutral-500">Nem található prezentáció.</p>
              </div>
            )}
          </div>
          {/* Típus felirat a headerben */}
        </DialogContent>
      </Dialog>


      {/* Wikipedia Modal */}
      <Dialog open={showWikipediaModal} onOpenChange={setShowWikipediaModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-xs font-bold">W</span>
              </div>
              {wikipediaContent?.title || 'Wikipedia'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingWikipedia ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3">Wikipedia tartalom betöltése...</span>
              </div>
            ) : wikipediaContent ? (
              <>
                <div className="prose prose-sm max-w-none">
                  {wikipediaContent.content.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-700 leading-relaxed mb-3">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <a
                    href={wikipediaContent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Teljes cikk megtekintése →
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWikipediaModal(false)}
                  >
                    Bezárás
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Nem sikerült betölteni a Wikipedia tartalmat
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tudáspróba Modal */}
      <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tudáspróba - {module?.title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <QuizInterface
              moduleId={moduleId}
              moduleTitle={module?.title || ''}
              onModuleComplete={() => {
                // Refresh user data and module data to show completion status
                queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId] });
                queryClient.invalidateQueries({ queryKey: ['/api/public/modules'] });
                setShowQuiz(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <PresentationPlayer
        open={showInteractivePresentationModal}
        onOpenChange={setShowInteractivePresentationModal}
        slides={(() => {
          if (!module.presentationData) return [];
          try {
            return typeof module.presentationData === 'string' 
              ? JSON.parse(module.presentationData) 
              : module.presentationData;
          } catch (e) {
            console.error("Error parsing presentationData:", e);
            return [];
          }
        })() as any[]}
        moduleTitle={module.title}
      />
      <BottomNav />
    </div>
  );
}
