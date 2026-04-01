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
import type { Module } from "@shared/schema";
import ClassAnnouncementModal from "@/components/ClassAnnouncementModal";

export default function StudentDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
  const { unlockedModules, overallProgress, totalModules } = useProgress(modules, completedModules);

  // Calculate Average Grades
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
    const sum = results.reduce((acc, r) => acc + scoreToGrade(r.score), 0);
    return (sum / results.length).toFixed(1);
  };

  const weeklyResults = testResults.filter((r: any) => new Date(r.createdAt) >= oneWeekAgo);
  const monthlyResults = testResults.filter((r: any) => new Date(r.createdAt) >= oneMonthAgo);

  const weeklyAvg = calculateAverageGrade(weeklyResults);
  const monthlyAvg = calculateAverageGrade(monthlyResults);
  const displayGrade = weeklyAvg !== null ? weeklyAvg : (monthlyAvg !== null ? monthlyAvg : "N/A");
  const gradeLabel = weeklyAvg !== null ? "Heti átlag" : (monthlyAvg !== null ? "Havi átlag" : "Nincs teszt");

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
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        user={user}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm border-b border-neutral-100 lg:hidden">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="text-neutral-700"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-neutral-700">Global Learning System</h1>
            <div className="w-6"></div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Welcome Section with Avatar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 flex flex-col justify-center">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-neutral-700 mb-2">
                    Üdvözlünk, {user.firstName || user.email}!
                  </h2>
                  <p className="text-neutral-400">Folytasd a tanulást ott, ahol abbahagytad</p>
                </div>
                <div className="mt-4 md:mt-0 bg-white p-4 rounded-xl shadow-sm border border-neutral-100 flex items-center space-x-6">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-2 text-orange-500 font-bold text-lg">
                      <Flame size={24} className={(user.currentStreak || 0) > 0 ? "fill-orange-500" : ""} />
                      <span>{user.currentStreak || 0} nap</span>
                    </div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Tűz</span>
                  </div>

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
            
            <div className="lg:col-span-1">
              <StudentAvatar />
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <ProgressCard
              title="Befejezett modulok"
              value={completedModules.length}
              subtitle={`${totalModules}-ből`}
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
              value={displayGrade as any}
              subtitle={gradeLabel}
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
                  {overallProgress}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={overallProgress} className="mb-3" />
              <p className="text-sm text-neutral-400">
                {completedModules.length} modul a {totalModules}-ből teljesítve
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
                    isUnlocked={unlockedModules.has(module.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* AI Tutor Section */}
          <ChatInterface userId={user.id} />
        </main>
      </div>
    </div>
  );
}
