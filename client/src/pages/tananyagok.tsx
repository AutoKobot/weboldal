import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import DynamicBackground from "@/components/dynamic-background";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, ArrowRight, GraduationCap, ArrowLeft, Wrench, HardHat, Cpu, Hammer, Zap, Car, Briefcase, Heart, Utensils, Building } from "lucide-react";
import type { Profession, Subject } from "@shared/schema";

export default function TananyagokPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedProfession, setSelectedProfession] = useState<number | null>(null);

  // Check URL for profession parameter and auto-select class profession
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const professionParam = urlParams.get('profession');
    
    // Always start with profession selection view first
    if (professionParam) {
      setSelectedProfession(parseInt(professionParam));
    } else {
      // Always start with null to show profession selection
      setSelectedProfession(null);
    }
  }, [location, user]);

  const { data: professions = [], isLoading: professionsLoading } = useQuery<Profession[]>({
    queryKey: ['/api/public/professions'],
    retry: false,
    select: (data) => {
      // Sort professions to show user's assigned profession first
      if (user?.assignedProfessionIds && user.assignedProfessionIds.length > 0) {
        const assignedId = user.assignedProfessionIds[0];
        const assigned = data.find(p => p.id === assignedId);
        const others = data.filter(p => p.id !== assignedId);
        return assigned ? [assigned, ...others] : data;
      }
      return data;
    },
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['/api/public/subjects', selectedProfession],
    queryFn: async () => {
      if (!selectedProfession) return [];
      const response = await fetch(`/api/public/subjects?professionId=${selectedProfession}`);
      if (!response.ok) throw new Error('Failed to fetch subjects');
      return response.json();
    },
    enabled: !!selectedProfession,
    retry: false,
  });

  if (!user) return null;

  const { toast } = useToast();

  // Mutation for students to select their first profession
  const selectProfessionMutation = useMutation({
    mutationFn: async (professionId: number) => {
      const res = await apiRequest("POST", `/api/student/select-profession`, {
        professionId
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Szakma kiválasztva",
        description: "A szakma sikeresen hozzárendelve a profiljához.",
      });
    },
    onError: (error: Error) => {
      console.error('Profession selection error:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült kiválasztani a szakmát.",
        variant: "destructive",
      });
    },
  });

  const handleProfessionSelect = (professionId: number) => {
    const hasAssignedProfessions = user?.assignedProfessionIds && user.assignedProfessionIds.length > 0;
    const isInClass = user?.classId;
    
    // Ellenőrizzük, hogy a diák hozzáférhet-e ehhez a szakmához
    const isAccessible = user?.role === 'admin' || user?.role === 'teacher' || 
      (!hasAssignedProfessions && user?.role === 'student') ||
      (hasAssignedProfessions && user?.assignedProfessionIds?.includes(professionId));
    
    if (!isAccessible) {
      toast({
        title: "Hozzáférés megtagadva",
        description: "Ön nem férhet hozzá ehhez a szakmához.",
        variant: "destructive",
      });
      return;
    }
    
    // Ha a tanuló még nem választott szakmát és nincs osztályban, automatikusan hozzárendeljük
    if (user?.role === 'student' && !hasAssignedProfessions && !isInClass) {
      selectProfessionMutation.mutate(professionId);
    }
    
    setSelectedProfession(professionId);
    // Update URL with profession parameter
    navigate(`/tananyagok?profession=${professionId}`);
  };

  // Icon mapping for professions
  const getIconForProfession = (profession: Profession) => {
    if (profession.iconName) {
      const iconMap: { [key: string]: any } = {
        'wrench': Wrench,
        'hard-hat': HardHat,
        'cpu': Cpu,
        'hammer': Hammer,
        'zap': Zap,
        'car': Car,
        'briefcase': Briefcase,
        'heart': Heart,
        'utensils': Utensils,
        'building': Building,
        'graduation-cap': GraduationCap
      };
      return iconMap[profession.iconName] || GraduationCap;
    }
    return GraduationCap;
  };

  const handleSubjectSelect = (subjectId: number) => {
    navigate(`/subjects/${subjectId}/modules`);
  };

  const handleBackToProfessions = () => {
    setSelectedProfession(null);
    navigate('/tananyagok');
  };

  return (
    <div className="flex min-h-screen bg-student-warm relative">
      <DynamicBackground />
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar user={user} />
        </div>
      </div>
      
      <MobileNav 
        isOpen={isMobileNavOpen} 
        onClose={() => setIsMobileNavOpen(false)} 
        user={user} 
      />
      
      <div className="flex-1 overflow-auto">
        <header className="bg-student-warm shadow-sm border-b border-neutral-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileNavOpen(true)}
                className="lg:hidden"
              >
                <Menu size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-neutral-800">
                  {selectedProfession ? "Tananyagok" : "Szakmák"}
                </h1>
                <p className="text-neutral-600">
                  {selectedProfession ? "Válassza ki a tantárgyat és kezdje a tanulást" : "Válassza ki a szakmát és kezdje a tanulást"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Profession Selection */}
          {!selectedProfession && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-800 mb-4">
                1. Válassza ki a szakmát
              </h2>
              {professionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {professions.map((profession: Profession) => {
                    const IconComponent = getIconForProfession(profession);
                    // Ha admin vagy tanár, minden elérhető
                    // Ha tanuló és nincs még hozzárendelt szakma, minden választható
                    // Ha tanuló és már van hozzárendelt szakma, csak azok érhetők el
                    const hasAssignedProfessions = user?.assignedProfessionIds && user.assignedProfessionIds.length > 0;
                    const isAccessible = user?.role === 'admin' || user?.role === 'teacher' || 
                      (!hasAssignedProfessions && user?.role === 'student') ||
                      (hasAssignedProfessions && user?.assignedProfessionIds?.includes(profession.id));
                    
                    return (
                      <Card 
                        key={profession.id}
                        className={`neumorphism hover-lift gradient-overlay transition-all duration-300 flex flex-col h-full ${
                          isAccessible 
                            ? "cursor-pointer interactive-element" 
                            : "opacity-50 cursor-not-allowed"
                        } border-0`}
                        onClick={() => isAccessible && handleProfessionSelect(profession.id)}
                      >
                        <CardHeader className="pb-3 flex-shrink-0">
                          <div className="flex items-start space-x-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              {profession.iconUrl ? (
                                <img 
                                  src={profession.iconUrl} 
                                  alt={profession.name}
                                  className="w-10 h-10 object-contain"
                                />
                              ) : (
                                <IconComponent className="text-white" size={28} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                              <CardTitle className="text-base font-bold text-neutral-800 leading-tight break-words">
                                {profession.name}
                              </CardTitle>
                            </div>
                            <ArrowRight className="text-neutral-400 flex-shrink-0 mt-1" size={18} />
                          </div>
                        </CardHeader>
                        
                        <CardContent className="flex flex-col flex-grow">
                          <div className="flex-grow">
                            {profession.description && (
                              <p className="text-neutral-600 text-sm leading-relaxed line-clamp-3 mb-4">
                                {profession.description}
                              </p>
                            )}
                          </div>
                          
                          <Button 
                            className={`w-full mt-auto transition-colors ${
                              isAccessible 
                                ? "bg-primary hover:bg-primary/90" 
                                : "bg-neutral-300 cursor-not-allowed"
                            }`}
                            disabled={!isAccessible}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAccessible) {
                                handleProfessionSelect(profession.id);
                              }
                            }}
                          >
                            <BookOpen className="mr-2" size={16} />
                            Tantárgyak megtekintése
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subject Selection */}
          {selectedProfession && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-neutral-800">
                  2. Válassza ki a tantárgyat
                </h2>
                <Button
                  variant="outline"
                  onClick={handleBackToProfessions}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft size={16} />
                  <span>Vissza a szakmákhoz</span>
                </Button>
              </div>

              {subjectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjects.map((subject: Subject) => (
                    <Card 
                      key={subject.id}
                      className="glassmorphism gradient-overlay hover-lift transition-all duration-300 cursor-pointer flex flex-col h-full interactive-element border-white/20"
                      onClick={() => handleSubjectSelect(subject.id)}
                    >
                      <CardHeader className="pb-3 flex-shrink-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-16 h-16 bg-gradient-to-br from-secondary to-green-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <BookOpen className="text-white" size={28} />
                          </div>
                          <div className="flex-1 min-w-0 pr-2">
                            <CardTitle className="text-base font-bold text-neutral-800 leading-tight break-words">
                              {subject.name}
                            </CardTitle>
                          </div>
                          <ArrowRight className="text-neutral-400 flex-shrink-0 mt-1" size={18} />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="flex flex-col flex-grow">
                        <div className="flex-grow">
                          {subject.description && (
                            <p className="text-neutral-600 text-sm leading-relaxed line-clamp-3 mb-4">
                              {subject.description}
                            </p>
                          )}
                        </div>
                        
                        <Button 
                          className="w-full mt-auto bg-secondary hover:bg-secondary/90 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubjectSelect(subject.id);
                          }}
                        >
                          <BookOpen className="mr-2" size={16} />
                          Modulok megtekintése
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {subjects.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <BookOpen className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                      <h3 className="text-lg font-medium text-neutral-900 mb-2">Nincsenek elérhető tantárgyak</h3>
                      <p className="text-neutral-600">Jelenleg nincsenek tantárgyak hozzárendelve ehhez a szakmához.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}