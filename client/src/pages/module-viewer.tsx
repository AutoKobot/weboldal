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
import { ArrowLeft, CheckCircle, Menu, Play, MessageCircle, FileText, Volume2, Image as ImageIcon, Pause, Brain, Youtube, Headphones, X, Wand2, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Module, Flashcard } from "@shared/schema";
import QuizInterface from "@/components/quiz-interface";
import { FlashcardQuiz } from "@/components/flashcard-quiz";
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

  const [showQuiz, setShowQuiz] = useState(false);
  const [chatInterfaceKey, setChatInterfaceKey] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Multimédia modal state-ek
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [selectedYoutubeVideo, setSelectedYoutubeVideo] = useState<{ title: string, videoId: string } | null>(null);
  const [contentVersion, setContentVersion] = useState<'concise' | 'detailed'>('concise');
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  // Wikipedia popup state
  const [showWikipediaModal, setShowWikipediaModal] = useState(false);
  const [wikipediaContent, setWikipediaContent] = useState<{ title: string, content: string, url: string } | null>(null);
  const [isLoadingWikipedia, setIsLoadingWikipedia] = useState(false);

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

  // Wikipedia content fetcher
  const fetchWikipediaContent = async (wikipediaUrl: string) => {
    setIsLoadingWikipedia(true);
    try {
      // Extract article title from URL
      const urlParts = wikipediaUrl.split('/');
      let articleTitle = decodeURIComponent(urlParts[urlParts.length - 1]);

      console.log(`Fetching Wikipedia content for: "${articleTitle}"`);

      // Use backend proxy with improved search capabilities
      const response = await fetch(`/api/wikipedia/${encodeURIComponent(articleTitle)}`);

      if (response.ok) {
        const data = await response.json();

        setWikipediaContent({
          title: data.title || articleTitle,
          content: data.content || 'Nincs elérhető tartalom',
          url: data.url || wikipediaUrl
        });
        setShowWikipediaModal(true);

        console.log(`Successfully loaded Wikipedia content for: "${data.title}"`);
      } else {
        const errorData = await response.json();
        console.log(`Wikipedia fetch failed: ${errorData.error} for "${articleTitle}"`);

        // Show user-friendly error with suggestions
        setWikipediaContent({
          title: articleTitle,
          content: `Sajnos nem található Wikipedia tartalom ehhez a kifejezéshez: "${articleTitle}"\n\n${errorData.suggestion || 'Próbálj meg egyszerűbb vagy általánosabb kifejezéseket használni.'}`,
          url: wikipediaUrl
        });
        setShowWikipediaModal(true);

        toast({
          title: "Wikipedia tartalom nem található",
          description: "A keresett kifejezéshez nincs elérhető Wikipedia cikk",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Wikipedia fetch error:', error);

      // Show error content in modal instead of just toast
      setWikipediaContent({
        title: "Hiba történt",
        content: "Hálózati hiba történt a Wikipedia tartalom betöltése során. Kérjük, próbáld meg később újra.",
        url: wikipediaUrl
      });
      setShowWikipediaModal(true);

      toast({
        title: "Hálózati hiba",
        description: "Nem sikerült kapcsolódni a Wikipedia-hoz",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWikipedia(false);
    }
  };



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
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
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

  // Get all modules to check for next module
  const { data: allModules = [] } = useQuery<Module[]>({
    queryKey: ['/api/public/modules', module?.subjectId],
    queryFn: async () => {
      if (!module?.subjectId) return [];
      const response = await fetch(`/api/public/modules?subjectId=${module.subjectId}`);
      if (!response.ok) throw new Error('Failed to fetch modules');
      return response.json();
    },
    enabled: !!module?.subjectId && !moduleLoading,
    retry: false,
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
      // Clear all cache and force fresh data fetch
      queryClient.clear();

      // Force immediate refresh of user data to get updated completed_modules
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });

      // Show success message
      toast({
        title: "Gratulálunk!",
        description: "Sikeresen befejezted ezt a modult! A következő modul most már elérhető.",
      });

      // Force page refresh after a short delay to ensure data sync
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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
        description: "Nem sikerült befejezni a modult",
        variant: "destructive",
      });
    },
  });

  const regenerateModuleMutation = useMutation({
    mutationFn: async () => {
      setIsRegenerating(true);
      const response = await apiRequest('POST', `/api/admin/modules/${moduleId}/regenerate-ai`, {
        title: module?.title || '',
        content: module?.content || ''
      });
      return response.json();
    },
    onSuccess: async () => {
      // Clear all cache immediately
      queryClient.clear();

      // Force refetch of the current module
      await queryClient.refetchQueries({
        queryKey: [`/api/modules/${moduleId}`],
        type: 'active'
      });

      // Also invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/modules'] });

      toast({
        title: "AI Újragenerálás sikeres!",
        description: "A modul tartalmát sikeresen frissítette az AI - Wikipedia linkekkel és videókkal bővítve.",
      });
      setIsRegenerating(false);

      // Force component re-render by updating key
      setChatInterfaceKey(prev => prev + 1);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Nincs engedély",
          description: "Jelentkezz be újra a folytatáshoz.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Újragenerálás sikertelen",
        description: "Az AI nem tudta frissíteni a modul tartalmát.",
        variant: "destructive",
      });
      setIsRegenerating(false);
    },
  });

  const handleBackNavigation = () => {
    if (module?.subjectId) {
      setLocation(`/subjects/${module.subjectId}/modules`);
    } else {
      setLocation('/subjects');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (moduleLoading) {
    return (
      <div className="flex min-h-screen bg-student-warm">
        <div className="hidden lg:block">
          <Sidebar user={user} />
        </div>
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
        <header className="bg-student-warm shadow-sm border-b border-neutral-100 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="text-neutral-700"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-neutral-700">Modul</h1>
            <div className="w-6"></div>
          </div>
        </header>

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

            {/* Multimédia oldalsáv */}
            {module && (
              <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 flex flex-col gap-2">
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
              </div>
            )}

            {/* Module Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline">#{module.moduleNumber}. modul</Badge>
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
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom styling for markdown elements
                        h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-primary">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-primary">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-primary">{children}</h3>,
                        p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic mb-4 bg-student-warm py-2">{children}</blockquote>,
                        pre: ({ children }) => <pre className="bg-neutral-100 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                        strong: ({ children }) => {
                          // Convert strong text to Wikipedia links for key concepts
                          const text = String(children);

                          // Common cooking ingredients and technical terms that should get Wikipedia links
                          const importantTerms = [
                            'paprika', 'paradicsom', 'hagyma', 'kolbász', 'lecsó', 'tojás', 'olaj',
                            'só', 'bors', 'pirospaprika', 'cukor', 'fokhagyma', 'zöldpaprika',
                            'kápiapaprika', 'szalonna', 'tejföl', 'liszt', 'vaj', 'tej', 'sajt'
                          ];

                          // Check if this text is an important term
                          const isImportantTerm = importantTerms.some(term =>
                            text.toLowerCase().includes(term.toLowerCase())
                          );

                          // Also check against key concepts data
                          let keyConceptsData = [];
                          try {
                            keyConceptsData = module.keyConceptsData ?
                              (typeof module.keyConceptsData === 'string' ?
                                JSON.parse(module.keyConceptsData) :
                                module.keyConceptsData) : [];
                          } catch (e) {
                            // If parsing fails, just use empty array
                          }

                          const matchingConcept = keyConceptsData.find((concept: any) =>
                            concept.concept && text.toLowerCase().includes(concept.concept.toLowerCase())
                          );

                          if (isImportantTerm || matchingConcept) {
                            const wikipediaUrl = `https://hu.wikipedia.org/wiki/${encodeURIComponent(text)}`;
                            return (
                              <a
                                href={wikipediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-primary hover:text-blue-600 hover:underline transition-colors inline-flex items-center gap-1"
                                title={`Wikipedia: ${text}`}
                              >
                                {children}
                                <span className="text-xs">🔗</span>
                              </a>
                            );
                          }

                          return <strong className="font-semibold text-primary">{children}</strong>;
                        },
                        em: ({ children }) => <em className="italic">{children}</em>,
                        table: ({ children }) => <table className="w-full border-collapse border border-neutral-300 mb-4">{children}</table>,
                        th: ({ children }) => <th className="border border-neutral-300 px-4 py-2 bg-neutral-100 font-semibold">{children}</th>,
                        td: ({ children }) => <td className="border border-neutral-300 px-4 py-2">{children}</td>,
                        a: ({ href, children }) => {
                          // Check if this is a Wikipedia link
                          if (href && href.includes('hu.wikipedia.org/wiki/')) {
                            return (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  fetchWikipediaContent(href);
                                }}
                                className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 font-medium"
                              >
                                {children}
                                <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-medium">W</span>
                              </button>
                            );
                          }
                          // Regular external links
                          return <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
                        },
                        code: ({ className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const language = match ? match[1] : '';

                          if (language === 'mermaid') {
                            return (
                              <div className="mermaid bg-student-warm p-4 border rounded-lg my-4">
                                {String(children).replace(/\n$/, '')}
                              </div>
                            );
                          }

                          return (
                            <code className="bg-neutral-100 px-2 py-1 rounded text-sm font-mono" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {(() => {
                        // AI enhanced modules: use selected version
                        if (module.conciseContent || module.detailedContent) {
                          if (contentVersion === 'concise' && module.conciseContent) {
                            return module.conciseContent;
                          }
                          if (contentVersion === 'detailed' && module.detailedContent) {
                            return module.detailedContent;
                          }
                          // Fallback to available content
                          return module.detailedContent || module.conciseContent;
                        }
                        // Regular modules: use original content
                        return module.content;
                      })()}
                    </ReactMarkdown>

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
                            <h3 className="text-lg font-semibold mb-4 text-primary flex items-center">
                              <Youtube className="w-5 h-5 mr-2" />
                              Kulcsfogalmak videókkal
                            </h3>
                            {keyConceptsData.map((concept: any, index: number) => (
                              <div key={index} className="mb-6 p-4 bg-student-warm rounded-lg">
                                <h4 className="font-semibold text-neutral-800 mb-2">{concept.concept}</h4>
                                <p className="text-neutral-700 mb-3">{concept.definition}</p>
                                {concept.youtubeVideos && concept.youtubeVideos.length > 0 && (
                                  <div className="space-y-2">
                                    <h5 className="text-sm font-medium text-neutral-600">Kapcsolódó videók:</h5>
                                    {concept.youtubeVideos.map((video: any, videoIndex: number) => (
                                      <button
                                        key={videoIndex}
                                        onClick={() => {
                                          setSelectedYoutubeVideo({
                                            title: video.title,
                                            videoId: video.videoId
                                          });
                                          setShowYoutubeModal(true);
                                        }}
                                        className="flex items-center gap-3 p-3 bg-student-warm rounded border hover:border-red-300 hover:bg-red-50 transition-colors w-full text-left"
                                      >
                                        <Youtube className="w-5 h-5 text-red-600 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-neutral-900 truncate">
                                            {video.title}
                                          </div>
                                          <div className="text-xs text-neutral-600 line-clamp-2">
                                            {video.description}
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
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
                .sort((a, b) => a.moduleNumber - b.moduleNumber);

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
          <div className="flex justify-center">
            <img
              src={module?.imageUrl || ''}
              alt="Modul illusztráció"
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
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
              <video
                src={module.videoUrl}
                controls
                className="w-full h-full rounded-lg"
                preload="metadata"
              >
                A böngésződ nem támogatja a videó lejátszást.
              </video>
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
    </div>
  );
}
