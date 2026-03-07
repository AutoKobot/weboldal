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
import { Badge as UiBadge } from "@/components/ui/badge";
import {
  BookOpen, Menu, ArrowRight, Brain, Play, Flame, BarChart3, AlertCircle,
  CheckCircle2, Users, GraduationCap, TrendingUp, Award, Clock, XCircle,
  ChevronRight, FileText, Bot
} from "lucide-react";
import type { Module, Subject } from "@shared/schema";
import AvatarPet from "@/components/avatar-pet";

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
          ) : allModules.length === 0 ? (
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none shadow-lg">
              <CardContent className="p-8">
                <div className="max-w-2xl">
                  <Badge variant="outline" className="mb-4 text-white border-white/50 bg-white/10 uppercase tracking-wide">Szakma kiválasztása</Badge>
                  <h2 className="text-3xl font-bold mb-4">Válassz szakmát a folytatáshoz!</h2>
                  <p className="text-lg opacity-90 mb-6">
                    Még nincs kiválasztott szakmád, vagy a tanár még nem rendelt hozzád tantárgyakat. Válassz szakmát, hogy elérd a modulokat!
                  </p>
                  <Button
                    onClick={() => navigate('/tananyagok')}
                    size="lg"
                    className="bg-white text-amber-700 hover:bg-neutral-100 font-bold"
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
                  <Badge variant="outline" className="mb-3 text-white border-white/50 bg-white/10 uppercase tracking-wide">
                    {allDone ? '🎉 Gratulálunk!' : 'Következő feladatod'}
                  </Badge>
                  <h2 className="text-2xl lg:text-3xl font-bold mb-2">
                    {allDone
                      ? 'Minden modult teljesítettél!'
                      : (nextModule?.title || 'Modul betöltése...')}
                  </h2>
                  <p className="text-white/80 flex items-center mb-6 text-sm lg:text-base">
                    <BookOpen size={16} className="mr-2" />
                    {allDone
                      ? 'Böngéssz a tananyagok között és ismételj!'
                      : `${nextSubject?.name || 'Tantárgy'} • Körülbelül 15 perc`}
                  </p>
                  <Button
                    onClick={() => {
                      if (allDone) {
                        navigate('/tananyagok');
                      } else if (nextModule) {
                        navigate(`/module/${nextModule.id}`);
                      }
                    }}
                    size="lg"
                    className="bg-white text-primary hover:bg-neutral-100 font-bold w-full sm:w-auto"
                    disabled={!nextModule && !allDone}
                  >
                    <Play className="mr-2" fill="currentColor" size={16} />
                    {allDone ? 'Tananyagok böngészése' : 'Folytatás'}
                  </Button>
                </div>
                {/* Összesített haladás */}
                <div className="bg-white/10 backdrop-blur rounded-xl p-5 w-full md:w-64 flex-shrink-0 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Összesített haladás</span>
                    <span className="bg-white/20 text-xs px-2 py-1 rounded-full">{completedCount}/{allModules.length} modul</span>
                  </div>
                  <Progress value={allModules.length > 0 ? Math.round((completedCount / allModules.length) * 100) : 0} className="h-2 mb-3 bg-white/20" indicatorClassName="bg-white" />
                  <p className="text-xs text-white/80">
                    {allDone
                      ? '🏆 Teljes tananyagot elvégezted!'
                      : allModules.length - completedCount > 0
                        ? `Még ${allModules.length - completedCount} modul van hátra!`
                        : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Avatar kísérő */}
          <AvatarPet user={{ ...user, username: user.username ?? '', firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined } as any} />

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

      <div className="flex-1 overflow-auto">
        {/* Fejléc */}
        <header className="bg-white border-b px-6 py-5 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setIsMobileNavOpen(true)} className="lg:hidden">
              <Menu size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="h-7 w-7 text-blue-600" />
                Szia, {user.firstName || 'Tanár'}! 👋
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Az alábbiakban láthatod az osztályaid összefoglaló statisztikáit.</p>
            </div>
            <Button className="ml-auto" onClick={() => navigate('/teacher')}>
              Részletes nézet <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Osztályok", value: totalClasses, sub: null, icon: <Users className="h-5 w-5 text-blue-500" />, bg: "bg-blue-50" },
                { label: "Tanulók", value: totalStudents, sub: `${noActivityStudents.length} még nem kezdte el`, icon: <GraduationCap className="h-5 w-5 text-purple-500" />, bg: "bg-purple-50" },
                { label: "Befejezett modulok", value: totalCompletedModules, sub: totalStudents > 0 ? `${Math.round(totalCompletedModules / totalStudents * 10) / 10} / tanuló` : null, icon: <FileText className="h-5 w-5 text-green-500" />, bg: "bg-green-50" },
                { label: "Átlagos jegy", value: avgGrade !== null ? avgGrade : "–", sub: avgScorePct !== null ? `${avgScorePct}% átlag` : "Még nincs adat", icon: <Award className="h-5 w-5 text-yellow-500" />, bg: "bg-yellow-50" },
              ].map(stat => (
                <Card key={stat.label} className="shadow-sm border-0 ring-1 ring-gray-100">
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                      {stat.icon}
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                    {stat.sub && <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

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
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            {cls.name}
                          </span>
                          <UiBadge variant="secondary">{clsStudents.length} tanuló</UiBadge>
                        </CardTitle>
                        {cls.description && <p className="text-xs text-gray-400">{cls.description}</p>}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Stat sor */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className={`text-2xl font-bold ${gradeColor(cg)}`}>{cg ?? "–"}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Átlagjegy</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-2xl font-bold text-green-600">{totalModulesDone}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Befejezések</p>
                          </div>
                          <div className={`rounded-lg p-3 ${noActivityCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                            <p className={`text-2xl font-bold ${noActivityCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{noActivityCount}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Inaktív</p>
                          </div>
                        </div>

                        {/* Progresz: hány % töltött ki legalább 1 modult */}
                        {clsStudents.length > 0 && (() => {
                          const activeCount = clsStudents.length - noActivityCount;
                          const pct = Math.round((activeCount / clsStudents.length) * 100);
                          return (
                            <div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Aktivitási arány</span>
                                <span>{activeCount}/{clsStudents.length} aktív</span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          );
                        })()}

                        <Button variant="outline" size="sm" className="w-full text-xs"
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
                  <UiBadge variant="destructive" className="ml-1">{noActivityStudents.length}</UiBadge>
                </h2>
                <Card className="shadow-sm border-0 ring-1 ring-red-100">
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {noActivityStudents.map(s => {
                        const cls = teacherClasses.find(c => c.id === s.classId);
                        const displayName = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.username;
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
                              {cls && <UiBadge variant="outline" className="text-xs">{cls.name}</UiBadge>}
                              <UiBadge variant="secondary" className="text-xs">
                                {s.completedModules?.length || 0} modul kész
                              </UiBadge>
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