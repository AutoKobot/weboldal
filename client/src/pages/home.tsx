import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import OnboardingWizard from "@/components/onboarding-wizard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Menu, ArrowRight, Brain, Play, Flame, BarChart3, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Module, Subject } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenKey = `onboarding_seen_${user?.id}`;
    const hasSeen = localStorage.getItem(hasSeenKey) === 'true';
    setHasSeenOnboarding(hasSeen);

    // Show onboarding for new users
    if (!hasSeen && user) {
      setTimeout(() => setShowOnboarding(true), 1000);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_seen_${user.id}`, 'true');
      setHasSeenOnboarding(true);
    }
    setShowOnboarding(false);
    navigate('/tananyagok');
  };

  const { data: allModules = [] } = useQuery<Module[]>({
    queryKey: ['/api/public/modules'],
    retry: false
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/public/subjects'],
    retry: false
  });

  if (!user) return null;

  // Ha nem diák, akkor egy egyszerűsített nem-diák view
  if (user.role !== 'student') {
    return (
      <div className="flex min-h-screen bg-student-warm">
        <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
          <div className="sticky top-0 h-screen overflow-y-auto">
            <Sidebar user={user} />
          </div>
        </div>
        <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} user={user} />
        <div className="flex-1 overflow-auto p-6">
          <header className="flex items-center space-x-4 mb-8">
            <Button variant="ghost" size="sm" onClick={() => setIsMobileNavOpen(true)} className="lg:hidden flex-shrink-0">
              <Menu size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">Üdvözlünk, {user.firstName || 'Kolléga'}!</h1>
              <p className="text-neutral-600">A Global Learning System vezérlőpultja.</p>
            </div>
          </header>
          <Card>
            <CardHeader>
              <CardTitle>Admin / Tanár Áttekintés</CardTitle>
            </CardHeader>
            <CardContent>
              Válaszd ki a megfelelő menüpontot a bal oldali sávból a diákok és tartalmak kezeléséhez.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // DIÁK MŰSZERFAL (Student Dashboard)
  const completedCount = user.completedModules?.length || 0;
  const isBeginner = completedCount === 0;
  const weeklyGoal = 3;
  const weeklyCompleted = completedCount % weeklyGoal; // Mock adat
  const weeklyProgress = (weeklyCompleted / weeklyGoal) * 100;
  const streakDays = Math.max(1, completedCount % 5 + 1); // Mock adat

  // Következő/Ajánlott modul keresése (mock logika első sorban, ha isBeginner: első modul. egyébiránt egy ami még nincs kész)
  const nextModule = allModules.find(m => !(user.completedModules || []).includes(m.id)) || allModules[0];
  const nextSubject = nextModule ? subjects.find(s => s.id === nextModule.subjectId) : null;

  const topSubjects = subjects.slice(0, 3).map((s, idx) => ({
    ...s,
    progress: Math.min(100, (completedCount * 15) + (idx * 10)) // Mock progresszés
  }));

  const lastCompletedModules = (user.completedModules || [])
    .slice(-3)
    .map(id => allModules.find(m => m.id === id))
    .filter(Boolean) as Module[];

  return (
    <div className="flex min-h-screen bg-student-warm">
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
        <header className="bg-white shadow-sm border-b border-neutral-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileNavOpen(true)}
                className="lg:hidden flex-shrink-0"
              >
                <Menu size={20} />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl lg:text-2xl font-bold text-neutral-800 truncate">
                  Szia, {user.firstName || 'Tanuló'}! 👋
                </h1>
                <p className="text-sm lg:text-base text-neutral-600 truncate">
                  Itt láthatod, hogy hol tartasz és mi a következő lépés.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">

          {/* Main Top Section: Next Task or Start Here */}
          {isBeginner ? (
            <Card className="bg-gradient-to-br from-primary to-blue-700 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="max-w-2xl">
                  <Badge variant="outline" className="mb-4 text-white border-white/50 bg-white/10 uppercase tracking-wide">Kezdd itt</Badge>
                  <h2 className="text-3xl font-bold mb-4">Üdv a fedélzeten!</h2>
                  <p className="text-lg opacity-90 mb-6">
                    A legjobb, amit most tehetsz, hogy kiválasztod a szakmád és elkezded az első tantárgyad moduljait. Szakmai utad itt veszi kezdetét.
                  </p>
                  <Button
                    onClick={() => navigate('/tananyagok')}
                    size="lg"
                    className="bg-white text-primary hover:bg-neutral-100 font-bold"
                  >
                    Szakma és Modulok kiválasztása <ArrowRight className="ml-2" size={20} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-indigo-600 to-primary text-white border-none shadow-lg">
              <CardContent className="p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <Badge variant="outline" className="mb-3 text-white border-white/50 bg-white/10 uppercase tracking-wide">Következő feladatod</Badge>
                  <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                    {nextModule?.title || "Következő modul betöltése..."}
                  </h2>
                  <p className="text-white/80 flex items-center mb-6 text-sm lg:text-base">
                    <BookOpen size={16} className="mr-2" />
                    {nextSubject?.name || "Tantárgy"} &bull; Körülbelül 15 perc
                  </p>
                  <Button
                    onClick={() => nextModule && navigate(`/modules/${nextModule.id}`)}
                    size="lg"
                    className="bg-white text-primary hover:bg-neutral-100 font-bold w-full sm:w-auto"
                  >
                    <Play className="mr-2" fill="currentColor" size={16} /> Folytatás
                  </Button>
                </div>
                {/* Weekly Goal Mini-Progress */}
                <div className="bg-white/10 backdrop-blur rounded-xl p-5 w-full md:w-64 flex-shrink-0 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Heti célod</span>
                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">{weeklyCompleted}/{weeklyGoal} kész</span>
                  </div>
                  <Progress value={weeklyProgress} className="h-2 mb-3 bg-white/20" indicatorClassName="bg-white" />
                  <p className="text-xs text-white/80">
                    Még {weeklyGoal - weeklyCompleted} modul, és eléred a heti célod!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vizuális Haladás & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 shadow-sm border-neutral-200">
              <CardHeader className="pb-3 border-b border-neutral-100 mb-4">
                <CardTitle className="flex items-center text-lg">
                  <BarChart3 className="mr-2 text-primary" size={20} />
                  Legfontosabb tantárgyaid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {topSubjects.length > 0 ? topSubjects.map(sub => (
                  <div key={sub.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-neutral-700">{sub.name}</span>
                      <span className="text-neutral-500">{sub.progress}%</span>
                    </div>
                    <Progress value={sub.progress} className="h-2" />
                  </div>
                )) : (
                  <p className="text-neutral-500 text-sm">Folytasd a tanulást, hogy itt lásd a tantárgyak előrehaladását!</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 shadow-sm">
                <CardContent className="p-6 flex items-center space-x-4">
                  <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0">
                    <Flame size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-orange-600 leading-none">{streakDays} napos</h3>
                    <p className="text-sm font-medium text-orange-700/80 mt-1">tanulási sorozat!</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-neutral-200 h-[calc(100%-80px)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-neutral-800">Utoljára befejezett</CardTitle>
                </CardHeader>
                <CardContent>
                  {lastCompletedModules.length > 0 ? (
                    <ul className="space-y-3">
                      {lastCompletedModules.map(m => (
                        <li key={m.id} className="flex items-start text-sm">
                          <CheckCircle2 className="mr-2 text-green-500 flex-shrink-0 mt-0.5" size={16} />
                          <span className="text-neutral-700 line-clamp-2">{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-neutral-500">Még nincs befejezett modulod. Kezdd el most!</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Info Block */}
          <Card className="bg-[#f8fafc] border-blue-100 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="p-6 md:p-8 md:w-1/2 flex flex-col justify-center">
                <div className="flex items-center mb-4 text-blue-700">
                  <Brain className="mr-2" size={24} />
                  <h3 className="text-xl font-bold">Miben segít az AI Asszisztens?</h3>
                </div>
                <p className="text-neutral-600 mb-6 text-sm lg:text-base leading-relaxed">
                  A chatbotod mindig rendelkezésre áll, hogy a tananyaggal kapcsolatban a segítségedre legyen. Nem helyettesít téged, de nagyszerű tanulótárs!
                </p>
                <Button
                  onClick={() => navigate('/chat')}
                  variant="outline"
                  className="w-fit border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  Indítsd el a Chatet
                </Button>
              </div>

              <div className="bg-white md:w-1/2 p-6 md:p-8 border-t md:border-t-0 md:border-l border-blue-50">
                <div className="space-y-4">
                  <div>
                    <h4 className="flex items-center font-bold text-green-700 text-sm mb-2 uppercase tracking-wide">
                      <CheckCircle2 size={16} className="mr-2" /> Mire KIVÁLÓ:
                    </h4>
                    <ul className="text-sm text-neutral-600 space-y-2 ml-6 list-disc marker:text-green-500">
                      <li>Bonyolult fogalmak érthető, egyszerű elmagyarázása</li>
                      <li>Kvízhez és vizsgához való felkészítő gyakorlófeladatok generálása</li>
                      <li>Konkrét, a tananyaghoz vagy szakmához kapcsolódó példák</li>
                    </ul>
                  </div>
                  <div className="pt-2">
                    <h4 className="flex items-center font-bold text-red-700 text-sm mb-2 uppercase tracking-wide">
                      <AlertCircle size={16} className="mr-2" /> Mire NEM használható:
                    </h4>
                    <ul className="text-sm text-neutral-600 space-y-2 ml-6 list-disc marker:text-red-400">
                      <li>Nem írja meg helyetted a házi feladatot</li>
                      <li>Nem oldja meg önállóan a vizsgateszteket</li>
                      <li>Puszkázásra nem alkalmas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </main>
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        userName={user.firstName || user.username || 'Tanuló'}
      />
    </div>
  );
}

// Komponens definícióhoz tartozó import pótlás, egyedi Badge-re a ShadcnUI-ból
function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "secondary" | "destructive" | "outline" }) {
  const baseStyle = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
  };
  return (
    <div className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}