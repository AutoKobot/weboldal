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
  const [selectedType, setSelectedType] = useState<"theory" | "practical" | null>(null);

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
  });

  // Ha pontosan 1 szakma van elérhető és nincs URL paraméter → automatikusan kiválasztjuk
  useEffect(() => {
    if (
      professions.length === 1 &&
      !selectedProfession &&
      !new URLSearchParams(window.location.search).get('profession')
    ) {
      setSelectedProfession(professions[0].id);
      navigate(`/tananyagok?profession=${professions[0].id}`);
    }
  }, [professions, selectedProfession]);

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
    setSelectedType(null);
    navigate('/tananyagok');
  };

  const handleBackToCategories = () => {
    setSelectedType(null);
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
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    1. Válassza ki a szakmát
                  </h2>
                  <p className="text-slate-500 font-medium">Kezdje el szakmai karrierjét a megfelelő irány kiválasztásával</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 uppercase tracking-widest text-[10px] font-bold">Összesen {professions.length} szakma</Badge>
              </div>

              {professionsLoading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent shadow-xl"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {professions.map((profession: Profession) => {
                    const IconComponent = getIconForProfession(profession);
                    const hasAssignedProfessions = user?.assignedProfessionIds && user.assignedProfessionIds.length > 0;
                    const isAccessible = user?.role === 'admin' || user?.role === 'teacher' ||
                      (!hasAssignedProfessions && user?.role === 'student') ||
                      (hasAssignedProfessions && user?.assignedProfessionIds?.includes(profession.id));

                    return (
                      <Card
                        key={profession.id}
                        className={`relative overflow-hidden group transition-all duration-500 border-none shadow-xl h-full flex flex-col ${isAccessible
                            ? "cursor-pointer hover:shadow-2xl hover:shadow-primary/20"
                            : "opacity-60 cursor-not-allowed grayscale"
                          }`}
                        onClick={() => isAccessible && handleProfessionSelect(profession.id)}
                      >
                        {/* Decorative background for card */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700"></div>
                        
                        <CardHeader className="pb-4 relative z-10">
                          <div className="flex items-start justify-between">
                            <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-white/10 p-0 overflow-hidden">
                              {profession.iconUrl ? (
                                <img
                                  src={profession.iconUrl}
                                  alt={profession.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <IconComponent className="text-primary w-10 h-10" />
                              )}
                            </div>
                            <div className={`p-2 rounded-full ${isAccessible ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-400'}`}>
                              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                          
                          <div className="mt-6">
                            <CardTitle className="text-xl font-black text-slate-900 leading-tight mb-2 tracking-tight group-hover:text-primary transition-colors">
                              {profession.name}
                            </CardTitle>
                            {isAccessible && <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold text-[9px] px-2 py-0">ELÉRHETŐ</Badge>}
                          </div>
                        </CardHeader>

                        <CardContent className="flex flex-col flex-grow relative z-10">
                          <div className="flex-grow">
                            {profession.description && (
                              <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6 font-medium">
                                {profession.description}
                              </p>
                            )}
                          </div>

                          <Button
                            className={`w-full py-6 rounded-xl font-black transition-all ${isAccessible
                                ? "bg-slate-900 hover:bg-primary text-white shadow-lg"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed"
                              }`}
                            disabled={!isAccessible}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAccessible) {
                                handleProfessionSelect(profession.id);
                              }
                            }}
                          >
                            <BookOpen className="mr-2 h-5 w-5" />
                            Szakmai Program
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Category Selection or Subject List */}
          {selectedProfession && (
            <div>
              {!selectedType ? (
                // --- KATEGÓRIA VÁLASZTÁS (Elmélet vs Gyakorlat) ---
                <div>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        Válasszon képzéstípust
                      </h2>
                      <p className="text-slate-500 font-medium">A kiválasztott szakma elméleti vagy gyakorlati moduljai</p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleBackToProfessions}
                      className="flex items-center space-x-2 text-slate-500 hover:text-primary font-bold transition-colors"
                    >
                      <ArrowLeft size={18} />
                      <span>Vissza a szakmákhoz</span>
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Elméleti Képzés Kártya */}
                    <Card 
                      className="group cursor-pointer relative overflow-hidden bg-slate-900 border-none shadow-2xl transition-all duration-500 hover:shadow-blue-500/20"
                      onClick={() => setSelectedType("theory")}
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-600/20 transition-all"></div>
                      
                      <div className="p-10 flex flex-col items-center text-center relative z-10">
                        <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(37,99,235,0.4)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                          <BookOpen className="text-white w-12 h-12" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Elméleti Képzés</h3>
                        <p className="text-slate-400 text-lg leading-relaxed font-light mb-8 max-w-xs">
                          Szakmai tananyagok, interaktív bemutatók és vizsgakövetelmények.
                        </p>
                        <Button className="bg-white text-slate-950 hover:bg-blue-50 font-black px-8 py-6 rounded-xl shadow-xl transition-all group-hover:px-10">
                          Kezdés <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </Card>

                    {/* Gyakorlati Képzés Kártya */}
                    <Card 
                      className="group cursor-pointer relative overflow-hidden bg-slate-950 border-none shadow-2xl transition-all duration-500 hover:shadow-orange-500/20"
                      onClick={() => setSelectedType("practical")}
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-orange-600/20 transition-all"></div>

                      <div className="p-10 flex flex-col items-center text-center relative z-10">
                        <div className="w-24 h-24 bg-orange-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(249,115,22,0.4)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                          <Wrench className="text-white w-12 h-12" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Gyakorlati Képzés</h3>
                        <p className="text-slate-400 text-lg leading-relaxed font-light mb-8 max-w-xs">
                          Műhelymunka, szerelési útmutatók és gyakorlati értékelések.
                        </p>
                        <Button className="bg-orange-600 text-white hover:bg-orange-500 font-black px-8 py-6 rounded-xl shadow-xl transition-all group-hover:px-10">
                          Kezdés <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                // --- TANTÁRGYAK LISTÁZÁSA ---
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-neutral-800">
                      {selectedType === "theory" ? "Elméleti tantárgyak" : "Gyakorlati tantárgyak"}
                    </h2>
                    <Button
                      variant="outline"
                      onClick={handleBackToCategories}
                      className="flex items-center space-x-2"
                    >
                      <ArrowLeft size={16} />
                      <span>Vissza a kategóriákhoz</span>
                    </Button>
                  </div>

                  {subjectsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...subjects]
                        .filter(s => (s.type || "theory") === selectedType)
                        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                        .map((subject: Subject) => (
                        <Card
                          key={subject.id}
                          className="glassmorphism gradient-overlay hover-lift transition-all duration-300 cursor-pointer flex flex-col h-full interactive-element border-white/20"
                          onClick={() => handleSubjectSelect(subject.id)}
                        >
                          <CardHeader className="pb-3 flex-shrink-0">
                            <div className="flex items-start space-x-3">
                              <div className={`w-16 h-16 bg-gradient-to-br ${selectedType === 'theory' ? 'from-secondary to-green-700' : 'from-orange-400 to-red-600'} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                                {selectedType === 'theory' ? <BookOpen className="text-white" size={28} /> : <Wrench className="text-white" size={28} />}
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
                              className={`w-full mt-auto transition-colors ${selectedType === 'theory' ? 'bg-secondary hover:bg-secondary/90' : 'bg-orange-600 hover:bg-orange-700'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubjectSelect(subject.id);
                              }}
                            >
                              {selectedType === 'theory' ? <BookOpen className="mr-2" size={16} /> : <Wrench className="mr-2" size={16} />}
                              {selectedType === 'theory' ? 'Tananyagok megtekintése' : 'Feladatok megtekintése'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}

                      {subjects.filter((s: any) => (s.type || "theory") === selectedType).length === 0 && (
                        <div className="col-span-full text-center py-12">
                          {selectedType === 'theory' ? (
                            <BookOpen className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                          ) : (
                            <Wrench className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                          )}
                          <h3 className="text-lg font-medium text-neutral-900 mb-2">
                            Nincsenek elérhető {selectedType === 'theory' ? 'elméleti' : 'gyakorlati'} tantárgyak
                          </h3>
                          <p className="text-neutral-600">Jelenleg nincsenek ide tartozó tantárgyak hozzárendelve ehhez a szakmához.</p>
                        </div>
                      )}
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