import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Play, Clock, ArrowRight, Brain, FileText, Wand2, HelpCircle, Wrench } from "lucide-react";
import type { Module } from "@shared/schema";

interface ModuleCardProps {
  module: Module;
  isCompleted: boolean;
  userRole: string;
  progress?: number;
  isUnlocked: boolean;
}

export default function ModuleCard({
  module,
  isCompleted,
  userRole,
  progress = 0,
  isUnlocked
}: ModuleCardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewVersion, setPreviewVersion] = useState<'concise' | 'detailed'>('detailed');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRegeneratingQuizzes, setIsRegeneratingQuizzes] = useState(false);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);

  const completeModuleMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/modules/${module.id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Gratulálunk!",
        description: "Sikeresen befejezted ezt a modult!",
      });
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
      const response = await apiRequest('POST', `/api/ai/modules/${module.id}/regenerate`, {
        title: module.title,
        content: module.content
      });
      return response.json();
    },
    onSuccess: async () => {
      // Clear cache and force refetch with correct keys used in dashboards
      queryClient.invalidateQueries({ queryKey: ['/api/public/modules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/subjects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/professions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] }); // legacy
      
      toast({
        title: "AI Újragenerálás sikeres!",
        description: "A modul tartalmát sikeresen frissítette az AI - webes keresési eredményekkel és videókkal bővítve.",
      });
      setIsRegenerating(false);
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

  const regenerateQuizzesMutation = useMutation({
    mutationFn: async () => {
      setIsRegeneratingQuizzes(true);
      const response = await apiRequest('POST', `/api/ai/modules/${module.id}/regenerate-quizzes`);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Sikeresen sorba állítva!",
        description: "A tesztkérdések újragenerálása elkezdődött a háttérben.",
      });
      setIsRegeneratingQuizzes(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Nincs engedély",
          description: "Jelentkezz be újra a folytatáshoz.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Hiba",
        description: "Nem sikerült sorba állítani az újragenerálást.",
        variant: "destructive",
      });
      setIsRegeneratingQuizzes(false);
    },
  });

  const generatePresentationMutation = useMutation({
    mutationFn: async () => {
      setIsGeneratingPresentation(true);
      const response = await apiRequest('POST', `/api/ai/modules/${module.id}/generate-presentation`);
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Siker!",
        description: "Az interaktív HTML generálás elindítva a háttérben.",
      });
      setIsGeneratingPresentation(false);
    },
    onError: (error) => {
      toast({
        title: "Hiba",
        description: "Nem sikerült elindítani a generálást.",
        variant: "destructive",
      });
      setIsGeneratingPresentation(false);
    },
  });

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if module is accessible
    if (!isAccessible) {
      if (!isUnlocked) {
        toast({
          title: "Modul zárolva",
          description: "Először az előző modulokat kell befejezned.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Modul nem elérhető",
          description: "Ez a modul még nem lett közzétéve.",
          variant: "destructive",
        });
      }
      return;
    }

    setLocation(`/module/${module.id}`);
  };

  const getStatusIcon = () => {
    if (isCompleted) {
      return <CheckCircle className="text-green-500" size={20} />;
    }
    if (!isUnlocked && userRole !== 'admin' && userRole !== 'teacher') {
      return <Clock className="text-neutral-400" size={20} />;
    }
    if (progress > 0) {
      return <Play className="text-blue-500" size={20} />;
    }
    return <Play className="text-primary" size={20} />;
  };

  const getStatusText = () => {
    if (isCompleted) return "Befejezve";
    if (!isUnlocked && userRole !== 'admin' && userRole !== 'teacher') return "Zárolva";
    if (progress > 0) return "Folyamatban";
    if (!module.isPublished && userRole !== 'admin' && userRole !== 'teacher') return "Nem közzétéve";
    return "Elérhető";
  };

  const getStatusColor = () => {
    if (isCompleted) return "text-green-500";
    if (!isUnlocked && userRole !== 'admin' && userRole !== 'teacher') return "text-neutral-400";
    if (progress > 0) return "text-blue-500";
    if (!module.isPublished && userRole !== 'admin' && userRole !== 'teacher') return "text-neutral-400";
    return "text-primary";
  };

  const isAccessible = (userRole === 'admin' || userRole === 'teacher') || (module.isPublished && (isUnlocked || isCompleted));

  return (
    <Card
      className="rounded-lg border text-card-foreground shadow-sm glassmorphism gradient-overlay hover-lift transition-all duration-300 flex flex-col h-full cursor-pointer border-white/20 bg-[#d1ae9924]"
      onClick={isAccessible ? handleCardClick : undefined}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start space-x-3">
          <div className={`w-16 h-16 bg-gradient-to-br ${module.type === 'practical' ? 'from-orange-400 to-orange-600' : 'from-blue-400 to-blue-600'} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
            {module.imageUrl ? (
              <img
                src={module.imageUrl}
                alt={module.title}
                className="w-12 h-12 object-cover rounded-lg"
              />
            ) : (
              <span className="text-white text-lg font-bold text-center px-1 break-all">
                {module.sectionCode ? module.sectionCode.split('.').slice(-2).join('.') : `#${module.moduleNumber}`}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] h-4 font-mono bg-white/50">
                {module.sectionCode || `${module.moduleNumber}. modul`}
              </Badge>
              
              {module.type === 'practical' ? (
                <Badge className="bg-orange-600 text-white text-[10px] h-4 border-none hover:bg-orange-700">
                  <Wrench size={10} className="mr-1" /> GYAKORLAT
                </Badge>
              ) : (
                <Badge className="bg-blue-600 text-white text-[10px] h-4 border-none hover:bg-blue-700">
                  <Brain size={10} className="mr-1" /> ELMÉLET
                </Badge>
              )}

              {/* Practical Tasks Indicator */}
              {Array.isArray(module.practicalTasks) && module.practicalTasks.length > 0 && module.type !== 'practical' && (
                <Badge variant="outline" className="text-[10px] h-4 border-orange-200 text-orange-700 bg-orange-50">
                  + Feladatok
                </Badge>
              )}
              {getStatusIcon()}
            </div>
            <CardTitle className="text-base font-bold text-neutral-800 leading-tight break-words">
              {module.title.replace(/^\s*[\d.]+[a-z]?\s*[-.]*\s*/i, '').trim()}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {module.suggestedHours && (
                <Badge variant="outline" className="text-[10px] h-4 flex items-center gap-1 bg-slate-50/50 text-slate-600 border-neutral-200">
                  <Clock className="h-2.5 w-2.5" /> {module.suggestedHours} óra
                </Badge>
              )}
              {module.updatedAt && (
                <p className="text-[9px] text-neutral-400">
                  Utolsó frissítés: {new Date(module.updatedAt).toLocaleDateString('hu-HU')}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow">
        <div className="flex-grow">
          {/* Version selector for AI Enhanced modules */}
          {(module.conciseContent || module.detailedContent) && (
            <div className="flex gap-1 mb-3">
              <Button
                variant={previewVersion === 'concise' ? 'default' : 'outline'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewVersion('concise');
                }}
                disabled={!module.conciseContent}
                className="text-xs h-6 px-2"
              >
                <Brain className="w-3 h-3 mr-1" />
                Tömör
              </Button>
              <Button
                variant={previewVersion === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewVersion('detailed');
                }}
                disabled={!module.detailedContent}
                className="text-xs h-6 px-2"
              >
                <FileText className="w-3 h-3 mr-1" />
                Részletes
              </Button>
            </div>
          )}

          <p className="text-neutral-600 text-sm leading-relaxed line-clamp-3 mb-4">
            {(() => {
              // AI enhanced modules: use selected preview version
              if (module.conciseContent || module.detailedContent) {
                let content = '';
                if (previewVersion === 'concise' && module.conciseContent) {
                  content = module.conciseContent;
                } else if (previewVersion === 'detailed' && module.detailedContent) {
                  content = module.detailedContent;
                } else {
                  content = module.detailedContent || module.conciseContent || module.content || '';
                }
                // Remove HTML tags and Wikipedia links
                const cleanContent = content
                  ?.replace(/<[^>]*>/g, '') // Remove HTML tags
                  ?.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links [text](url) -> text
                  ?.replace(/https?:\/\/[^\s]+/g, '') // Remove standalone URLs
                  ?.replace(/\s+/g, ' ') // Normalize whitespace
                  ?.trim() || '';
                return cleanContent.substring(0, 150) + (cleanContent.length > 150 ? '...' : '');
              }
              // Regular modules: use original content
              const cleanContent = (module.content || '')
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
                .replace(/https?:\/\/[^\s]+/g, '') // Remove standalone URLs
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
              return cleanContent.substring(0, 150) + (cleanContent.length > 150 ? '...' : '');
            })()}
          </p>

          {/* Progress Bar (for in-progress modules) */}
          {progress > 0 && progress < 100 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-400">Haladás</span>
                <span className="text-xs font-medium text-accent">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Admin Options */}
          {userRole === 'admin' && (
            <div className="mb-4 p-2 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between text-xs mb-2">
                <Badge variant={module.isPublished ? "default" : "secondary"}>
                  {module.isPublished ? "Publikálva" : "Tervezet"}
                </Badge>
                <span className="text-neutral-400">Admin nézet</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    regenerateModuleMutation.mutate();
                  }}
                  disabled={isRegenerating || isRegeneratingQuizzes}
                  className="flex-1 text-xs h-7 px-1 min-w-[80px]"
                  title="A teljes modul (írásos tartalom, videók, Wikipédia linkek) újragenerálása"
                >
                  {isRegenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      AI...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 mr-1" />
                      AI Modul
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    regenerateQuizzesMutation.mutate();
                  }}
                  disabled={isRegenerating || isRegeneratingQuizzes}
                  className="flex-1 text-xs h-7 px-1 min-w-[80px]"
                  title="Csak a tesztkérdések újragenerálása"
                >
                  {isRegeneratingQuizzes ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      Tesztek...
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-3 h-3 mr-1" />
                      AI Teszt
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    generatePresentationMutation.mutate();
                  }}
                  disabled={isGeneratingPresentation}
                  className="w-full text-xs h-7 px-1 mt-1"
                  title="Interaktív HTML prezentáció generálása"
                >
                  {isGeneratingPresentation ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      HTML...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1" />
                      Interaktív HTML
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button
          className={`w-full mt-auto bg-accent hover:bg-accent/90 transition-colors ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          onClick={isAccessible ? handleCardClick : undefined}
          disabled={!isAccessible}
        >
          {isCompleted ? (
            <>
              <CheckCircle className="mr-2" size={16} />
              Újra megtekintés
            </>
          ) : isAccessible ? (
            <>
              <Play className="mr-2" size={16} />
              Tanulás indítása
            </>
          ) : (
            <>
              <Clock className="mr-2" size={16} />
              Hamarosan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
