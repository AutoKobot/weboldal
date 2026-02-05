import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ChatInterface from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Menu, Play, MessageCircle, FileText, Volume2, Image as ImageIcon, Pause, Brain, Youtube, Headphones, X, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Module } from "@shared/schema";
import QuizInterface from "@/components/quiz-interface";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';

export default function ModuleViewer() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [showPodcastPlayer, setShowPodcastPlayer] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string>('');
  const [contentVersion, setContentVersion] = useState<'concise' | 'detailed'>('concise');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showWikipediaModal, setShowWikipediaModal] = useState(false);
  const [wikipediaContent, setWikipediaContent] = useState<{title: string, content: string, url: string} | null>(null);
  const [isLoadingWikipedia, setIsLoadingWikipedia] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  // Universal DOM change observer for Mermaid re-rendering
  useEffect(() => {
    const renderMermaidDiagrams = async () => {
      const mermaidElements = document.querySelectorAll('code.language-mermaid, .mermaid');
      if (mermaidElements.length > 0) {
        console.log(`DOM changed: Re-rendering ${mermaidElements.length} Mermaid diagrams`);
        
        // Convert code blocks to mermaid divs if needed
        mermaidElements.forEach((element, index) => {
          if (element.tagName === 'CODE' && element.textContent) {
            const mermaidDiv = document.createElement('div');
            mermaidDiv.className = 'mermaid';
            mermaidDiv.textContent = element.textContent;
            mermaidDiv.id = `mermaid-diagram-dom-${index}`;
            element.parentNode?.insertBefore(mermaidDiv, element);
            if (element instanceof HTMLElement) {
              element.style.display = 'none';
            }
          }
        });
        
        // Re-run mermaid
        setTimeout(async () => {
          const mermaidDivs = document.querySelectorAll('.mermaid');
          if (mermaidDivs.length > 0) {
            try {
              await mermaid.run({
                querySelector: '.mermaid'
              });
              console.log('DOM changed: Mermaid diagrams re-rendered successfully');
            } catch (error) {
              console.warn('DOM changed: mermaid.run() failed, trying mermaid.init():', error);
              await mermaid.init(undefined, mermaidDivs as any);
              console.log('DOM changed: Mermaid diagrams re-rendered with mermaid.init()');
            }
          }
        }, 100);
      }
    };

    // Create MutationObserver to watch for DOM changes
    let lastRenderTime = 0;
    const observer = new MutationObserver((mutations) => {
      let shouldRerender = false;
      
      mutations.forEach((mutation) => {
        // Only trigger on significant content changes
        if (mutation.type === 'childList') {
          // Check if added nodes contain mermaid content
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.classList?.contains('prose') || 
                  element.querySelector?.('code.language-mermaid, .mermaid') ||
                  element.textContent?.includes('mermaid')) {
                shouldRerender = true;
              }
            }
          });
        }
      });
      
      if (shouldRerender) {
        const now = Date.now();
        // Prevent excessive rendering (max once per 1000ms)
        if (now - lastRenderTime > 1000) {
          lastRenderTime = now;
          setTimeout(() => {
            renderMermaidDiagrams();
          }, 300);
        }
      }
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const moduleId = parseInt(params.id as string);

  console.log('ModuleViewer params:', params);
  console.log('ModuleViewer moduleId:', moduleId);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: module, isLoading: moduleLoading } = useQuery<Module>({
    queryKey: [`/api/modules/${moduleId}`],
    retry: false,
  });

  // Get all modules to check for next module
  const { data: allModules = [] } = useQuery<Module[]>({
    queryKey: ['/api/public/modules', module?.subjectId],
    queryFn: async () => {
      if (!module?.subjectId) return [];
      const response = await fetch(`/api/public/modules?subjectId=${module.subjectId}`);
      if (!response.ok) throw new Error('Failed to fetch modules');
      return response.json();
    },
    enabled: !!module?.subjectId,
    retry: false,
  });

  // Mermaid rendering for SPA environment
  useEffect(() => {
    const renderMermaidDiagrams = async () => {
      try {
        // Initialize mermaid if not already done
        mermaid.initialize({ 
          startOnLoad: false, // We'll handle rendering manually
          theme: 'default',
          securityLevel: 'loose',
        });
        
        // Find all possible mermaid selectors
        const possibleSelectors = [
          '.language-mermaid',
          'code[class*="language-mermaid"]',
          'pre code.language-mermaid',
          '.mermaid',
          'code.mermaid'
        ];
        
        let mermaidElements: Element[] = [];
        
        for (const selector of possibleSelectors) {
          const elements = document.querySelectorAll(selector);
          mermaidElements = mermaidElements.concat(Array.from(elements));
        }
        
        // Remove duplicates
        mermaidElements = Array.from(new Set(mermaidElements));
        
        console.log(`Found ${mermaidElements.length} potential Mermaid diagrams`);
        console.log('Mermaid elements:', mermaidElements);
        
        if (mermaidElements.length > 0) {
          // Convert code blocks to mermaid divs if needed
          mermaidElements.forEach((element, index) => {
            if (element.tagName === 'CODE' && element.textContent) {
              const mermaidDiv = document.createElement('div');
              mermaidDiv.className = 'mermaid';
              mermaidDiv.textContent = element.textContent;
              mermaidDiv.id = `mermaid-diagram-${index}`;
              element.parentNode?.insertBefore(mermaidDiv, element);
              if (element instanceof HTMLElement) {
                element.style.display = 'none'; // Hide original code block
              }
            }
          });
          
          // Now run mermaid on the converted elements
          const mermaidDivs = document.querySelectorAll('.mermaid');
          console.log(`Processing ${mermaidDivs.length} Mermaid divs`);
          
          if (mermaidDivs.length > 0) {
            try {
              await mermaid.run({
                querySelector: '.mermaid'
              });
              console.log('Mermaid diagrams rendered successfully with mermaid.run()');
            } catch (runError) {
              console.warn('mermaid.run() failed, trying mermaid.init():', runError);
              await mermaid.init(undefined, mermaidDivs as any);
              console.log('Mermaid diagrams rendered successfully with mermaid.init()');
            }
          }
        } else {
          console.log('No Mermaid diagrams found in DOM');
        }
      } catch (error) {
        console.warn('Mermaid rendering failed:', error);
      }
    };
    
    // Wait for DOM to be updated with content
    const timer = setTimeout(renderMermaidDiagrams, 500);
    return () => clearTimeout(timer);
  }, [module?.content, contentVersion]);

  const completeModuleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/modules/${moduleId}/complete`);
    },
    onSuccess: async () => {
      // Clear all cache and force fresh data fetch
      queryClient.clear();
      
      // Force immediate refresh of user data to get updated completed_modules
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Modul befejezve!",
        description: "Sikeresen teljesítetted ezt a modult.",
        duration: 3000,
      });

      // Find the next module
      if (module && allModules.length > 0) {
        const sortedModules = allModules
          .filter(m => m.subjectId === module.subjectId)
          .sort((a, b) => a.moduleNumber - b.moduleNumber);
        
        const currentIndex = sortedModules.findIndex(m => m.id === module.id);
        if (currentIndex !== -1 && currentIndex < sortedModules.length - 1) {
          const nextModule = sortedModules[currentIndex + 1];
          setTimeout(() => {
            setLocation(`/modules/${nextModule.id}`);
          }, 1000);
        } else {
          setTimeout(() => {
            setLocation(`/subjects/${module.subjectId}`);
          }, 1000);
        }
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Hiba",
        description: "Nem sikerült befejezni a modult. Próbáld újra!",
        variant: "destructive",
      });
    },
  });

  const regenerateModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/modules/${moduleId}/ai-regenerate`, {
        title: module?.title,
        content: module?.content,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/modules/${moduleId}`] });
      toast({
        title: "AI regenerálás sikeres!",
        description: "A modul frissítve lett AI-val bővített tartalommal.",
      });
      setIsRegenerating(false);
    },
    onError: (error) => {
      console.error('AI regeneration error:', error);
      toast({
        title: "Hiba az AI regenerálás során",
        description: "Nem sikerült regenerálni a modult.",
        variant: "destructive",
      });
      setIsRegenerating(false);
    },
  });

  const handleRegenerateModule = () => {
    setIsRegenerating(true);
    regenerateModuleMutation.mutate();
  };

  const handleBackToSubject = () => {
    if (module?.subjectId) {
      setLocation(`/subjects/${module.subjectId}`);
    } else {
      setLocation('/');
    }
  };

  const playAudio = async (text: string) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
        setIsPlaying(false);
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text.slice(0, 1000), // Limit text length
          voice: 'Bella'
        }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      setCurrentAudio(audio);
      setIsPlaying(true);
      await audio.play();
    } catch (error) {
      console.error('Audio playback error:', error);
      toast({
        title: "Hang lejátszási hiba",
        description: "Nem sikerült lejátszani a hangot.",
        variant: "destructive",
      });
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  };

  if (isLoading || moduleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Modul betöltése...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Modul nem található</h1>
            <Button onClick={() => setLocation('/')}>Vissza a főoldalra</Button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = user?.completedModules?.includes(module.id) || false;

  // Determine which content to show
  const hasEnhancedContent = module.conciseContent || module.detailedContent;
  let displayContent = '';
  
  if (hasEnhancedContent) {
    if (contentVersion === 'concise' && module.conciseContent) {
      displayContent = module.conciseContent;
    } else if (contentVersion === 'detailed' && module.detailedContent) {
      displayContent = module.detailedContent;
    } else {
      // Fallback to available content
      displayContent = module.detailedContent || module.conciseContent || module.content;
    }
  } else {
    displayContent = module.content;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 lg:grid lg:grid-cols-[256px_1fr]">
        <div className="hidden lg:block">
          <Sidebar user={user!} />
        </div>
        
        <div className="min-h-screen overflow-auto">
          <MobileNav user={user!} isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
          
          <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsMobileNavOpen(true)}
                >
                  <Menu className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleBackToSubject}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Vissza a tananyaghoz
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                {module.imageUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImageModal(true)}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Kép
                  </Button>
                )}
                
                {module.youtubeUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowYoutubeModal(true)}
                  >
                    <Youtube className="h-4 w-4 mr-2" />
                    YouTube
                  </Button>
                )}
                
                {module.videoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVideoModal(true)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Videó
                  </Button>
                )}
                
                {module.audioUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAudioModal(true)}
                  >
                    <Headphones className="h-4 w-4 mr-2" />
                    Hang
                  </Button>
                )}

                {module.podcastUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPodcastModal(true)}
                    className="hidden sm:flex"
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    {module.podcastUrl.includes('spotify') ? 'Spotify' : 
                     module.podcastUrl.includes('youtube') ? 'YouTube' : 'Podcast'}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChatOpen(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Szabolcs AI
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">
                        Modul {module.moduleNumber}
                      </Badge>
                      {isCompleted && (
                        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Befejezve
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasEnhancedContent && (
                        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                          <Button
                            variant={contentVersion === 'concise' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setContentVersion('concise')}
                            className="text-xs"
                          >
                            Tömör
                          </Button>
                          <Button
                            variant={contentVersion === 'detailed' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setContentVersion('detailed')}
                            className="text-xs"
                          >
                            Részletes
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateModule}
                        disabled={isRegenerating}
                        className="flex items-center gap-2"
                      >
                        <Wand2 className="h-4 w-4" />
                        {isRegenerating ? 'AI Regenerálás...' : 'AI Regenerálás'}
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{module.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={mermaidRef} className="prose prose-neutral max-w-none dark:prose-invert">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom styling for markdown elements
                        h1: ({children}) => <h1 className="text-2xl font-bold mb-4 text-primary">{children}</h1>,
                        h2: ({children}) => <h2 className="text-xl font-semibold mb-3 text-primary">{children}</h2>,
                        h3: ({children}) => <h3 className="text-lg font-medium mb-2 text-primary">{children}</h3>,
                        p: ({children}) => <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                        li: ({children}) => <li className="text-gray-700 dark:text-gray-300">{children}</li>,
                        blockquote: ({children}) => (
                          <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 bg-blue-50 dark:bg-blue-900/20 py-2">
                            {children}
                          </blockquote>
                        ),
                        code: ({className, children, ...props}) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const language = match ? match[1] : '';
                          
                          if (language === 'mermaid') {
                            return (
                              <div className="mermaid bg-white p-4 border rounded-lg my-4">
                                {String(children).replace(/\n$/, '')}
                              </div>
                            );
                          }
                          
                          return (
                            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono" {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: ({children}) => (
                          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {displayContent}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      onClick={() => playAudio(displayContent)}
                      disabled={isPlaying}
                      variant="outline"
                      size="sm"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Lejátszás...
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4 mr-2" />
                          Felolvasás
                        </>
                      )}
                    </Button>

                    {isPlaying && (
                      <Button
                        onClick={stopAudio}
                        variant="outline"
                        size="sm"
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Állj
                      </Button>
                    )}

                    <Button
                      onClick={() => setShowQuiz(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      Kvíz
                    </Button>

                    {!isCompleted && (
                      <Button
                        onClick={() => completeModuleMutation.mutate()}
                        disabled={completeModuleMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {completeModuleMutation.isPending ? 'Befejezés...' : 'Modul befejezése'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

      {/* Modals */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modul kép</DialogTitle>
          </DialogHeader>
          {module.imageUrl && (
            <img 
              src={module.imageUrl} 
              alt={module.title}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showYoutubeModal} onOpenChange={setShowYoutubeModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>YouTube videó</DialogTitle>
          </DialogHeader>
          {module.youtubeUrl && (
            <div className="aspect-video">
              <iframe 
                src={module.youtubeUrl?.replace('watch?v=', 'embed/') || ''}
                className="w-full h-full rounded-lg"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Videó</DialogTitle>
          </DialogHeader>
          {module.videoUrl && (
            <video 
              src={module.videoUrl} 
              controls 
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAudioModal} onOpenChange={setShowAudioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hang</DialogTitle>
          </DialogHeader>
          {module.audioUrl && (
            <audio 
              src={module.audioUrl} 
              controls 
              className="w-full"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPodcastModal} onOpenChange={setShowPodcastModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Podcast</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPodcastModal(false)}
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          {module.podcastUrl && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {module.podcastUrl.includes('spotify') ? 'Spotify podcast megnyitása...' : 
                 module.podcastUrl.includes('youtube') ? 'YouTube podcast megnyitása...' : 'Podcast megnyitása...'}
              </p>
              <Button
                onClick={() => module?.podcastUrl && window.open(module.podcastUrl, '_blank')}
                className="w-full"
              >
                Podcast megnyitása külső oldalon
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modals - Outside grid layout */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modul kép</DialogTitle>
          </DialogHeader>
          {module?.imageUrl && (
            <img 
              src={module.imageUrl} 
              alt={module.title}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPodcastPlayer} onOpenChange={setShowPodcastPlayer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Podcast lejátszás</DialogTitle>
          </DialogHeader>
          {module?.podcastUrl && (
            <audio 
              controls 
              className="w-full"
              src={module.podcastUrl}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Videó lejátszás</DialogTitle>
          </DialogHeader>
          {selectedVideoUrl && (
            <iframe
              width="100%"
              height="400"
              src={selectedVideoUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </DialogContent>
      </Dialog>

      {isChatOpen && (
        <ChatInterface 
          userId={user?.id || ''}
          moduleId={moduleId}
        />
      )}

      </div>

      {isChatOpen && (
        <ChatInterface 
          userId={user?.id || ''}
          moduleId={moduleId}
        />
      )}

      {showQuiz && (
        <QuizInterface
          moduleId={moduleId}
          moduleTitle={module?.title || ''}
          onModuleComplete={() => setShowQuiz(false)}
        />
      )}
    </>
  );
}