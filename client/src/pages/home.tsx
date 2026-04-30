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
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Menu, ArrowRight, Brain, Play, Flame, BarChart3, AlertCircle,
  CheckCircle2, Users, GraduationCap, TrendingUp, Award, Clock, XCircle,
  ChevronRight, FileText, Bot, MessageSquare, Wrench, Search, Sparkles
} from "lucide-react";
import type { Module, Subject } from "@shared/schema";
import { StudentAvatar } from "@/components/StudentAvatar";

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
    queryFn: async () => {
      const res = await fetch('/api/public/modules');
      if (!res.ok) throw new Error('Failed to fetch modules');
      return res.json();
    },
    retry: false
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/public/subjects'],
    queryFn: async () => {
      const res = await fetch('/api/public/subjects');
      if (!res.ok) throw new Error('Failed to fetch subjects');
      return res.json();
    },
    retry: false
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ['/api/student/test-results'],
    queryFn: async () => {
      const response = await fetch('/api/student/test-results');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user && user.role === 'student',
  });

  if (!user) return null;

  // Ha tanár, akkor gazdag statisztikai home oldal
  if (user.role === 'teacher') {
    return <TeacherHomeDashboard user={user} navigate={navigate} isMobileNavOpen={isMobileNavOpen} setIsMobileNavOpen={setIsMobileNavOpen} />;
  }

  // Ha nem diák és nem tanár, egyszerűsített nézet (admin stb.)
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

  // Valódi adatok számítása
  // allModules: az összes modul amit a diák láthat (selectedProfessionId alapján szűrve a szerveren)
  // Ha nincs selectedProfessionId, próbáljuk az assignedProfessionIds-t

  // Következő modul – az első ami még nincs kész, és publish-olt
  const completedSet = new Set(user.completedModules || []);
  const allDone = allModules.length > 0 && allModules.every(m => completedSet.has(m.id));
  // nextModule: ha van be nem fejezett → az, ha minden kész → null (áttérünk ismétlés módba)
  const nextModule = allDone
    ? null
    : (allModules.find(m => !completedSet.has(m.id) && m.isPublished !== false) ?? allModules[0]);
  const nextSubject = nextModule ? subjects.find(s => s.id === nextModule?.subjectId) : null;

  // Valódi subject progress: hány modul van kész az adott tantárgyban
  const topSubjects = subjects.slice(0, 3).map(s => {
    const subjectModules = allModules.filter(m => m.subjectId === s.id);
    const doneInSubject = subjectModules.filter(m => completedSet.has(m.id)).length;
    const progress = subjectModules.length > 0
      ? Math.round((doneInSubject / subjectModules.length) * 100)
      : 0;
    return { ...s, progress, doneCount: doneInSubject, totalCount: subjectModules.length };
  });

  // Valódi befejezett modulok – utolsó 3 a completedModules tömbből (fordítva, legfrissebb első)
  const lastCompletedModules = [...(user.completedModules || [])]
    .reverse()
    .slice(0, 3)
    .map(id => allModules.find(m => m.id === id))
    .filter(Boolean) as Module[];

  // Heti teljesítmény: az utolsó 7 napban befejezett modulok
  // (egyszerűsített: completedModules utolsó elemei, max weeklyGoal)
  const weeklyCompleted = Math.min(completedCount, weeklyGoal);
  const weeklyProgress = (weeklyCompleted / weeklyGoal) * 100;

  // Streak és XP
  const streakDays = user.currentStreak || 0;
  const xp = user.xp || 0;
  const currentLevel = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const nextLevelXP = Math.pow(currentLevel, 2) * 100;
  const currentLevelBaseXP = Math.pow(currentLevel - 1, 2) * 100;
  const progressToNextLevel = ((xp - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100;

  // Átlagjegy számítás
  const scoreToGrade = (score: number) => {
    if (score >= 95) return 5;
    if (score >= 80) return 4;
    if (score >= 70) return 3;
    if (score >= 60) return 2;
    return 1;
  };
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const calculateAverageGrade = (results: any[]) => {
    if (results.length === 0) return null;
    const sum = results.reduce((acc: number, r: any) => acc + scoreToGrade(r.score), 0);
    return (sum / results.length).toFixed(1);
  };

  const weeklyResults = testResults.filter((r: any) => new Date(r.createdAt) >= oneWeekAgo);
  const monthlyResults = testResults.filter((r: any) => new Date(r.createdAt) >= oneMonthAgo);
  const weeklyAvg = calculateAverageGrade(weeklyResults);
  const monthlyAvg = calculateAverageGrade(monthlyResults);
  const displayGrade = weeklyAvg !== null ? weeklyAvg : (monthlyAvg !== null ? monthlyAvg : "N/A");
  const gradeLabel = weeklyAvg !== null ? "Heti átlag" : (monthlyAvg !== null ? "Havi átlag" : "Nincs teszt");


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
            <Card className="relative overflow-hidden bg-slate-900 border-none shadow-2xl group transition-all duration-500 hover:shadow-cyan-500/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/30 transition-colors"></div>
              <CardContent className="p-8 relative z-10">
                <div className="max-w-2xl">
                  <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-widest text-[10px] font-bold">Kezdd itt</Badge>
                  <h2 className="text-3xl lg:text-4xl font-black text-white mb-4 tracking-tight">Üdv a fedélzeten, {user.firstName}!</h2>
                  <p className="text-lg text-slate-300 mb-8 leading-relaxed font-light">
                    A legjobb, amit most tehetsz, hogy kiválasztod a szakmád és elkezded az első tantárgyad moduljait. 
                    <span className="text-cyan-400 font-medium"> Szakmai utad itt veszi kezdetét.</span>
                  </p>
                  <Button
                    onClick={() => navigate('/tananyagok')}
                    size="lg"
                    className="bg-white text-slate-950 hover:bg-cyan-50 font-black px-8 py-6 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95"
                  >
                    Szakma kiválasztása <ArrowRight className="ml-2" size={20} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : allModules.length === 0 ? (
            <Card className="relative overflow-hidden bg-slate-900 border-none shadow-2xl group transition-all duration-500 hover:shadow-orange-500/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-orange-500/30 transition-colors"></div>
              <CardContent className="p-8 relative z-10">
                <div className="max-w-2xl">
                  <Badge className="mb-4 bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-widest text-[10px] font-bold">Szakma kiválasztása</Badge>
                  <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Válassz szakmát a folytatáshoz!</h2>
                  <p className="text-lg text-slate-300 mb-8 leading-relaxed font-light">
                    Még nincs kiválasztott szakmád, vagy a tanár még nem rendelt hozzád tantárgyakat. 
                    Válassz szakmát, hogy elérd a <span className="text-orange-400 font-medium">prémium AI modulokat!</span>
                  </p>
                  <Button
                    onClick={() => navigate('/tananyagok')}
                    size="lg"
                    className="bg-orange-500 text-white hover:bg-orange-400 font-black px-8 py-6 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95"
                  >
                    Szakma keresése <Search className="ml-2" size={20} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="relative overflow-hidden bg-slate-950 border-none shadow-2xl group transition-all duration-500 hover:shadow-indigo-500/20">
              {/* Decorative backgrounds */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none group-hover:bg-indigo-600/30 transition-all duration-1000"></div>
              <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>

              <CardContent className="p-6 lg:p-10 relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest text-[10px] font-bold">
                      {allDone ? '🎉 Gratulálunk!' : 'Következő feladatod'}
                    </Badge>
                    {!allDone && <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 uppercase tracking-widest text-[10px] font-bold">AKTÍV</Badge>}
                  </div>

                  <h2 className="text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
                    {allDone
                      ? 'Minden modult teljesítettél!'
                      : (nextModule?.title || 'Modul betöltése...')}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 mb-8 text-slate-400 font-medium">
                    <div className="flex items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                      <BookOpen size={16} className="mr-2 text-indigo-400" />
                      <span className="text-sm">{allDone ? 'Böngéssz tovább' : (nextSubject?.name || 'Tantárgy')}</span>
                    </div>
                    {!allDone && (
                      <div className="flex items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                        <Clock size={16} className="mr-2 text-blue-400" />
                        <span className="text-sm">~15 perc</span>
                      </div>
                    )}
                    <div className="flex items-center bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
                      <Sparkles size={16} className="mr-2 text-yellow-400" />
                      <span className="text-sm">AI Generált</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (allDone) {
                        navigate('/tananyagok');
                      } else if (nextModule) {
                        navigate(`/module/${nextModule.id}`);
                      }
                    }}
                    size="lg"
                    className="bg-white text-slate-950 hover:bg-indigo-50 font-black px-10 py-7 text-lg rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 group/btn w-full sm:w-auto"
                    disabled={!nextModule && !allDone}
                  >
                    <Play className="mr-2 fill-slate-950 group-hover/btn:scale-110 transition-transform" size={20} />
                    {allDone ? 'Tananyagok böngészése' : 'Tanulás folytatása'}
                  </Button>
                </div>

                {/* Összesített haladás Glass Look */}
                <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 w-full md:w-80 flex-shrink-0 border border-white/10 shadow-2xl relative overflow-hidden group/progress">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover/progress:bg-white/10"></div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-white tracking-wide text-sm">Kurzus Haladás</span>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-bold px-2 py-0">
                      {completedCount}/{allModules.length}
                    </Badge>
                  </div>

                  <div className="relative h-4 w-full bg-white/10 rounded-full overflow-hidden mb-4 p-[2px]">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                      style={{ width: `${allModules.length > 0 ? Math.round((completedCount / allModules.length) * 100) : 0}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">
                      {allDone
                        ? '🏆 Teljesítve'
                        : `${allModules.length - completedCount} modul van hátra`}
                    </p>
                    <span className="text-xl font-black text-white">
                      {allModules.length > 0 ? Math.round((completedCount / allModules.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Új Student Avatar Rendszer (Rive) */}
          <div className="w-full max-w-md mx-auto">
            <StudentAvatar />
          </div>

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
                      <span className="text-neutral-500">
                        {(sub as any).doneCount ?? 0}/{(sub as any).totalCount ?? 0} modul &bull; {sub.progress}%
                      </span>
                    </div>
                    <Progress value={sub.progress} className="h-2" />
                  </div>
                )) : (
                  <p className="text-neutral-500 text-sm">Válassz szakmát, hogy itt láthasd a tantárgyak előrehaladását!</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm mb-2 ${streakDays > 0 ? 'bg-orange-500' : 'bg-gray-300'}`}>
                      <Flame size={24} />
                    </div>
                    {streakDays > 0 ? (
                      <>
                        <h3 className="text-xl font-black text-orange-600 leading-none">{streakDays} napos</h3>
                        <p className="text-xs font-medium text-orange-700/80 mt-1">tanulási sorozat</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-base font-bold text-gray-500 leading-none">Kezdd el!</h3>
                        <p className="text-xs text-gray-400 mt-1">Nincs aktivitás sorozatod</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm mb-2 bg-blue-500">
                      <Award size={24} />
                    </div>
                    <h3 className="text-xl font-black text-blue-600 leading-none">{displayGrade}</h3>
                    <p className="text-xs font-bold text-blue-700 mt-1">Átlagos érdemjegy</p>
                    <p className="text-[10px] text-blue-600/80">{gradeLabel}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm mb-2 bg-purple-500">
                      <Clock size={24} />
                    </div>
                    <h3 className="text-xl font-black text-purple-600 leading-none">{Math.floor(completedCount * 1.5)} óra</h3>
                    <p className="text-xs font-bold text-purple-700 mt-1">Tanulási idő</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm mb-2 bg-amber-500">
                      <Bot size={24} />
                    </div>
                    <h3 className="text-xl font-black text-amber-600 leading-none">{completedCount * 2} db</h3>
                    <p className="text-xs font-bold text-amber-700 mt-1">AI beszélgetések</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200 shadow-sm">
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-indigo-700">Szint {currentLevel}</span>
                    <span className="text-xs text-indigo-600/80 font-medium">{xp} / {nextLevelXP} XP</span>
                  </div>
                  <Progress value={progressToNextLevel} className="h-2.5 bg-indigo-200/50" />
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
                        <li
                          key={m.id}
                          className="flex items-center justify-between text-sm cursor-pointer hover:bg-neutral-50 p-2 -mx-2 rounded-md transition-colors"
                          onClick={() => navigate(`/module/${m.id}`)}
                          title="Kattints az újbóli megtekintéshez"
                        >
                          <div className="flex items-start">
                            <CheckCircle2 className="mr-2 text-green-500 flex-shrink-0 mt-0.5" size={16} />
                            <span className="text-neutral-700 font-medium line-clamp-2">{m.title}</span>
                          </div>
                          <ChevronRight size={16} className="text-neutral-400 flex-shrink-0 ml-2" />
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
          <Card className="relative overflow-hidden bg-slate-900 border-none shadow-2xl group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-blue-600/20 transition-all duration-700"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="flex flex-col md:flex-row relative z-10">
              <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-2xl mr-4 border border-blue-500/30">
                    <Brain className="text-blue-400" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">AI Tanulási Asszisztens</h3>
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Mindig rendelkezésedre áll</p>
                  </div>
                </div>
                <p className="text-slate-300 mb-8 text-lg leading-relaxed font-light">
                  A chatbotod 24/7 elérhető, hogy a tananyaggal kapcsolatban a segítségedre legyen. 
                  <span className="text-white font-medium"> Azonnali válaszok, mélyebb megértés.</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={() => navigate('/chat')}
                    size="lg"
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-6 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95"
                  >
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Beszélgetés Indítása
                  </Button>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md md:w-1/2 p-8 md:p-12 border-t md:border-t-0 md:border-l border-white/10">
                <div className="space-y-8">
                  <div>
                    <h4 className="flex items-center font-black text-cyan-400 text-sm mb-4 uppercase tracking-widest">
                      <div className="w-6 h-6 rounded-full bg-cyan-400/20 flex items-center justify-center mr-3 border border-cyan-400/30">
                        <CheckCircle2 size={12} />
                      </div>
                      Mire KIVÁLÓ:
                    </h4>
                    <ul className="space-y-3">
                      {[
                        "Bonyolult szakmai fogalmak egyszerűsítése",
                        "Egyéni gyakorlófeladatok generálása",
                        "Személyre szabott tanulási tippek"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center text-slate-300 text-sm group/li">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-3 group-hover/li:scale-150 transition-transform"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-2">
                    <h4 className="flex items-center font-black text-rose-400 text-sm mb-4 uppercase tracking-widest">
                      <div className="w-6 h-6 rounded-full bg-rose-400/20 flex items-center justify-center mr-3 border border-rose-400/30">
                        <AlertCircle size={12} />
                      </div>
                      Mire NEM való:
                    </h4>
                    <ul className="space-y-3">
                      {[
                        "Vizsgák és tesztek megoldása helyetted",
                        "Házi feladatok önálló megírása",
                        "Nem szakmai beszélgetések"
                      ].map((item, i) => (
                        <li key={i} className="flex items-center text-slate-400 text-sm group/li">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-3 group-hover/li:scale-150 transition-transform"></div>
                          {item}
                        </li>
                      ))}
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


// ─── TANÁRI STATISZTIKAI DASHBOARD ─────────────────────────────────────────
interface TeacherStudent {
  id: string; username: string; firstName?: string; lastName?: string;
  completedModules: number[]; classId?: number;
  testResults?: { id: number; moduleId: number; score: number; passed: boolean; createdAt: string }[];
}
interface TeacherClass { id: number; name: string; description?: string; }

function TeacherHomeDashboard({ user, navigate, isMobileNavOpen, setIsMobileNavOpen }: {
  user: any; navigate: (path: string) => void;
  isMobileNavOpen: boolean; setIsMobileNavOpen: (v: boolean) => void;
}) {
  const { data: homeStats, isLoading } = useQuery<{
    classes: TeacherClass[];
    students: TeacherStudent[];
  }>({
    queryKey: ["/api/teacher/home-stats"],
    retry: false,
  });

  const { data: practicalGradesSummary = [] } = useQuery<any[]>({
    queryKey: ["/api/practical-grades/teacher-summary"],
    queryFn: async () => {
      // Fetch all students' practical grades via teacher endpoint
      const res = await fetch('/api/teacher/students');
      if (!res.ok) return [];
      const students = await res.json();
      const allGrades: any[] = [];
      for (const s of students.slice(0, 5)) {
        const gr = await fetch(`/api/practical-grades/student/${s.id}`);
        if (gr.ok) {
          const g = await gr.json();
          g.forEach((grade: any) => allGrades.push({ ...grade, studentName: `${s.lastName || ''} ${s.firstName || ''}`.trim() || s.username }));
        }
      }
      return allGrades;
    },
    retry: false,
  });

  const teacherClasses = homeStats?.classes ?? [];
  const students = homeStats?.students ?? [];

  // ── Összesített statisztikák ────────────────────────────────────────────
  const totalStudents = students.length;
  const totalClasses = teacherClasses.length;

  // Összes befejezett modul száma
  const totalCompletedModules = students.reduce((sum, s) => sum + (s.completedModules?.length || 0), 0);

  // Átlagos százalékos eredmény → átlagjegy (ha vannak tesztek, ha nincsenek, a modul befejezések alapján)
  const allScores = students.flatMap(s => s.testResults?.map(t => t.score) || []);
  const avgScore = allScores.length > 0
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : null;
  const scoreToGrade = (s: number) => s >= 95 ? 5 : s >= 80 ? 4 : s >= 70 ? 3 : s >= 60 ? 2 : 1;
  const avgGrade = avgScore !== null ? scoreToGrade(avgScore) : null;
  const avgScorePct = avgScore !== null ? Math.round(avgScore) : null;

  // Tanulók akik NEM fejeztek be egyetlen modult sem
  const noActivityStudents = students.filter(s => !s.completedModules || s.completedModules.length === 0);

  // ── Osztályonkénti statisztikák ─────────────────────────────────────────
  const classStats = teacherClasses.map(cls => {
    const clsStudents = students.filter(s => s.classId === cls.id);
    const clsScores = clsStudents.flatMap(s => s.testResults?.map(t => t.score) || []);
    const clsAvg = clsScores.length > 0 ? clsScores.reduce((a, b) => a + b, 0) / clsScores.length : null;
    const clsModulesDone = clsStudents.reduce((sum, s) => sum + (s.completedModules?.length || 0), 0);
    const clsNoActivity = clsStudents.filter(s => !s.completedModules || s.completedModules.length === 0);
    return {
      cls,
      students: clsStudents,
      avgScore: clsAvg,
      avgScorePct: clsAvg !== null ? Math.round(clsAvg) : null,
      avgGrade: clsAvg !== null ? scoreToGrade(clsAvg) : null,
      totalModulesDone: clsModulesDone,
      noActivityCount: clsNoActivity.length,
    };
  });

  const gradeColor = (g: number | null) => {
    if (!g) return "text-gray-400";
    if (g === 5) return "text-green-600";
    if (g === 4) return "text-blue-600";
    if (g === 3) return "text-yellow-600";
    if (g === 2) return "text-orange-500";
    return "text-red-600";
  };


  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar user={user} />
        </div>
      </div>
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} user={user} />

      <div className="flex-1 overflow-auto bg-slate-50/50">
        {/* Fejléc */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setIsMobileNavOpen(true)} className="lg:hidden hover:bg-slate-100">
                <Menu size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                  <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  Üdvözlöm, {user.lastName} {user.firstName}!
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-0.5">Vezérlőpult • {new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="hidden md:flex bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
                onClick={() => navigate('/teacher/content')}
              >
                <Bot className="mr-2 h-4 w-4 text-blue-600" />
                AI Tartalomkezelő
              </Button>
              <Button size="sm" className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95" onClick={() => navigate('/teacher')}>
                Részletes Statisztika <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto space-y-8">

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm">Statisztikák betöltése...</p>
              </div>
            </div>
          ) : (<>

            {/* ── Összesítő kártyák ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Aktív Osztályok", value: totalClasses, sub: "Kezelt csoportok", icon: <Users className="h-6 w-6 text-blue-600" />, bg: "bg-blue-50", border: "border-blue-100" },
                { label: "Összes Tanuló", value: totalStudents, sub: `${noActivityStudents.length} inaktív`, icon: <GraduationCap className="h-6 w-6 text-purple-600" />, bg: "bg-purple-50", border: "border-purple-100" },
                { label: "Befejezett Modulok", value: totalCompletedModules, sub: "Sikeres teljesítések", icon: <FileText className="h-6 w-6 text-green-600" />, bg: "bg-green-50", border: "border-green-100" },
                { label: "Tanulmányi Átlag", value: avgGrade !== null ? avgGrade.toFixed(1) : "–", sub: avgScorePct !== null ? `${avgScorePct}% teljesítmény` : "Nincs adat", icon: <Award className="h-6 w-6 text-amber-600" />, bg: "bg-amber-50", border: "border-amber-100" },
              ].map(stat => (
                <Card key={stat.label} className={`relative overflow-hidden shadow-sm border ${stat.border} hover:shadow-md transition-all duration-300 group`}>
                  <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-full blur-3xl -mr-12 -mt-12 opacity-50 group-hover:opacity-80 transition-opacity`}></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h3>
                        {stat.sub && <p className="text-xs text-slate-500 font-medium mt-1">{stat.sub}</p>}
                      </div>
                      <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                        {stat.icon}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Legutóbbi Gyakorlati Jegyek ── */}
            {practicalGradesSummary.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  Legutóbbi Gyakorlati Értékelések
                </h2>
                <Card className="shadow-sm border-0 ring-1 ring-blue-100">
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {practicalGradesSummary.slice(0, 8).map((g: any) => (
                        <div key={g.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50/30">
                          <div className="flex items-center gap-3">
                            <div className={[
                              'w-8 h-8 rounded-full flex items-center justify-center font-black text-sm',
                              g.grade === 5 ? 'bg-green-100 text-green-700' :
                              g.grade === 4 ? 'bg-blue-100 text-blue-700' :
                              g.grade === 3 ? 'bg-yellow-100 text-yellow-700' :
                              g.grade === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            ].join(' ')}>
                              {g.grade}
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900">{g.studentName}</p>
                              <p className="text-xs text-gray-400">{new Date(g.createdAt).toLocaleDateString('hu-HU')}</p>
                            </div>
                          </div>
                          {g.comment && <p className="text-xs text-gray-500 italic truncate max-w-[200px]">{g.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Osztályonkénti részletes statisztikák ── */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Osztályok áttekintése
              </h2>
              {classStats.length === 0 ? (
                <Card className="p-8 text-center text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Nincs hozzárendelt osztály. Az iskolai adminisztrátor rendelhet hozzá osztályokat.</p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {classStats.map(({ cls, students: clsStudents, avgGrade: cg, totalModulesDone, noActivityCount }) => (
                    <Card key={cls.id} className="shadow-sm border-0 ring-1 ring-gray-100 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2 pt-3 px-4">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2 font-bold truncate">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            {cls.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{clsStudents.length} tanuló</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-3">
                        {/* Stat sor */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-gray-50 rounded-md p-2">
                            <p className={`text-xl font-black ${gradeColor(cg)}`}>{cg ?? "–"}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-medium">Átlag</p>
                          </div>
                          <div className="bg-gray-50 rounded-md p-2">
                            <p className="text-xl font-black text-green-600">{totalModulesDone}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-medium">Kész</p>
                          </div>
                          <div className={`rounded-md p-2 ${noActivityCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                            <p className={`text-xl font-black ${noActivityCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{noActivityCount}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-medium">Inaktív</p>
                          </div>
                        </div>

                        {/* Progresz */}
                        {clsStudents.length > 0 && (() => {
                          const activeCount = clsStudents.length - noActivityCount;
                          const pct = Math.round((activeCount / clsStudents.length) * 100);
                          return (
                            <div>
                              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5 font-medium">
                                <span>Aktivitási arány</span>
                                <span>{activeCount}/{clsStudents.length}</span>
                              </div>
                              <Progress value={pct} className="h-1" />
                            </div>
                          );
                        })()}

                        <Button variant="outline" size="sm" className="w-full text-[10px] h-7"
                          onClick={() => navigate('/teacher')}>
                          Részletek <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* ── Tanulók akik nem kezdtek még el egyetlen modult sem ── */}
            {noActivityStudents.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Még nem kezdett el egy modult sem ({noActivityStudents.length} tanuló)
                  <Badge variant="destructive" className="ml-1">{noActivityStudents.length}</Badge>
                </h2>
                <Card className="shadow-sm border-0 ring-1 ring-red-100">
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {noActivityStudents.map(s => {
                        const cls = teacherClasses.find(c => c.id === s.classId);
                        const displayName = s.lastName && s.firstName ? `${s.lastName} ${s.firstName}` : s.username;
                        return (
                          <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-red-50/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold flex-shrink-0">
                                {(s.firstName?.[0] || s.username?.[0] || '?').toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-gray-900">{displayName}</p>
                                <p className="text-xs text-gray-400">@{s.username}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {cls && <Badge variant="outline" className="text-xs">{cls.name}</Badge>}
                              <Badge variant="secondary" className="text-xs">
                                {s.completedModules?.length || 0} modul kész
                              </Badge>
                              <XCircle className="h-4 w-4 text-red-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Ha mindenki töltött ki tesztet ── */}
            {noActivityStudents.length === 0 && totalStudents > 0 && (
              <Card className="border-0 ring-1 ring-green-200 bg-green-50">
                <CardContent className="p-5 flex items-center gap-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">Minden tanuló kitöltött legalább egy tesztet! 🎉</p>
                    <p className="text-sm text-green-600">Kiválóan halad az osztály munkája.</p>
                  </div>
                </CardContent>
              </Card>
            )}

          </>)}

        </main>
      </div>
    </div>
  );
}
