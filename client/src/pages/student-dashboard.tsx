import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useProgress } from "@/hooks/useProgress";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ChatInterface from "@/components/chat-interface";
import ModuleCard from "@/components/module-card";
import ProgressCard from "@/components/progress-card";
import DynamicBackground from "@/components/dynamic-background";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, MessageSquare, Menu, Award, Flame } from "lucide-react";
import { StudentAvatar } from "@/components/StudentAvatar";
import type { Module, Profession } from "@shared/schema";
import ClassAnnouncementModal from "@/components/ClassAnnouncementModal";

export default function StudentDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const { data: professions = [], isLoading: professionsLoading } = useQuery<Profession[]>({
    queryKey: ['/api/public/professions'],
    queryFn: async () => {
      const res = await fetch('/api/public/professions');
      if (!res.ok) throw new Error('Failed to fetch professions');
      return res.json();
    },
    retry: false,
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ['/api/public/modules'],
    queryFn: async () => {
      const response = await fetch('/api/public/modules');
      if (!response.ok) throw new Error('Failed to fetch modules');
      return response.json();
    },
    retry: false,
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['/api/chat/messages'],
    queryFn: async () => {
      const response = await fetch('/api/chat/messages');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ['/api/student/test-results'],
    queryFn: async () => {
      const response = await fetch('/api/student/test-results');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
  });

  const { data: practicalGrades = [], isLoading: practicalLoading } = useQuery<any[]>({
    queryKey: ['/api/student/practical-grades'],
    queryFn: async () => {
      const res = await fetch('/api/student/practical-grades');
      if (!res.ok) throw new Error('Failed to fetch practical grades');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ['/api/public/subjects'],
    queryFn: async () => {
      const response = await fetch('/api/public/subjects');
      if (!response.ok) return [];
      return response.json();
    }
  });

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

  const completedModules = user.completedModules || [];
  
  // Categorize modules by type
  const theoryModules = modules.filter(m => {
    const subject = subjects.find(s => s.id === m.subjectId);
    return !subject || subject.type === 'theory' || !subject.type;
  });
  
  const practicalModules = modules.filter(m => {
    const subject = subjects.find(s => s.id === m.subjectId);
    return subject?.type === 'practical';
  });

  const { unlockedModules: unlockedTheory, overallProgress: theoryProgress } = useProgress(theoryModules, completedModules);
  const { unlockedModules: unlockedPractical, overallProgress: practicalProgress } = useProgress(practicalModules, completedModules);

  // Calculate Average Grades
  const scoreToGrade = (score: number) => {
    if (score >= 95) return 5;
    if (score >= 80) return 4;
    if (score >= 70) return 3;
    if (score >= 60) return 2;
    return 1;
  };

  const calculateAverageGrade = (results: any[]) => {
    if (results.length === 0) return null;
    const sum = results.reduce((acc, r) => acc + scoreToGrade(r.score), 0);
    return (sum / results.length).toFixed(1);
  };

  const calculatePracticalAverage = (grades: any[]) => {
    if (grades.length === 0) return null;
    const sum = grades.reduce((acc, g) => acc + g.grade, 0);
    return (sum / grades.length).toFixed(1);
  };

  const theoryAvg = calculateAverageGrade(testResults);
  const practicalAvg = calculatePracticalAverage(practicalGrades);

  // XP and Level Calculation
  const xp = user.xp || 0;
  const currentLevel = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const nextLevelXP = Math.pow(currentLevel, 2) * 100;
  const currentLevelBaseXP = Math.pow(currentLevel - 1, 2) * 100;
  const progressToNextLevel = ((xp - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100;

  return (
    <div className="flex min-h-screen bg-neutral-50 relative">
      <DynamicBackground />
      <ClassAnnouncementModal />
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        user={user}
      />

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-neutral-100 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setIsMobileNavOpen(true)} className="text-neutral-700">
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-neutral-700">Global Learning System</h1>
            <div className="w-6"></div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Üdvözlés és XP */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <StudentAvatar />
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block w-px h-10 bg-neutral-200"></div>

                  <div className="flex flex-col min-w-[150px]">
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-primary">Szint {currentLevel}</span>
                      <span className="text-xs text-neutral-500 font-medium">{xp} / {nextLevelXP} XP</span>
                    </div>
                    <Progress value={progressToNextLevel} className="h-2.5 bg-neutral-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <ProgressCard
                title="Befejezett modulok"
                value={completedModules.length}
                subtitle={`${modules.length}-ből`}
                icon={BookOpen}
                color="secondary"
              />
              <ProgressCard
                title="Tanulási idő"
                value={Math.floor(completedModules.length * 2.5)}
                subtitle="óra összesen"
                icon={Clock}
                color="accent"
              />
              <ProgressCard
                title="AI beszélgetések"
                value={chatMessages.length}
                subtitle="üzenet"
                icon={MessageSquare}
                color="primary"
              />
              <ProgressCard
                title="Átlagos érdemjegy"
                value={(theoryAvg || practicalAvg || 'N/A') as any}
                subtitle="Összesített"
                icon={Award}
                color="secondary"
              />
            </div>

            {/* Overall Progress */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-neutral-700">
                    Általános haladás
                  </CardTitle>
                  <span className="text-lg font-semibold text-primary">
                    {Math.round(((theoryProgress + practicalProgress) / 2))}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={(theoryProgress + practicalProgress) / 2} className="mb-3" />
                <p className="text-sm text-neutral-400">
                  {completedModules.length} modul a {modules.length}-ből teljesítve
                </p>
              </CardContent>
            </Card>

            {/* Modules Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-neutral-700">Elérhető modulok</h3>
              </div>

              {modulesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                      <div className="h-48 bg-neutral-200 rounded-lg mb-4"></div>
                      <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                      <div className="h-3 bg-neutral-200 rounded mb-4"></div>
                      <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...modules].sort((a, b) => a.moduleNumber - b.moduleNumber).map((module: Module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      isCompleted={completedModules.includes(module.id)}
                      userRole="student"
                      isUnlocked={unlockedTheory.has(module.id) || unlockedPractical.has(module.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* AI Tutor Section */}
            <ChatInterface userId={user.id} />
          </div>
        </main>
      </div>
    </div>
  );
}

