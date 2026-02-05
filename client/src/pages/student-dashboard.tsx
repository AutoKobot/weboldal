import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ChatInterface from "@/components/chat-interface";
import ModuleCard from "@/components/module-card";
import ProgressCard from "@/components/progress-card";
import DynamicBackground from "@/components/dynamic-background";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, MessageSquare, Menu } from "lucide-react";
import type { Module } from "@shared/schema";

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

  // Calculate which modules are unlocked based on completed modules
  const getUnlockedModules = (modules: Module[], completedModules: number[]) => {
    if (!modules.length) return new Set<number>();
    
    // Sort modules by creation order (assuming ID order represents learning sequence)
    const sortedModules = [...modules].sort((a, b) => a.id - b.id);
    const unlockedModules = new Set<number>();
    
    // First module is always unlocked
    if (sortedModules.length > 0) {
      unlockedModules.add(sortedModules[0].id);
    }
    
    // Unlock subsequent modules if previous ones are completed
    for (let i = 1; i < sortedModules.length; i++) {
      const previousModule = sortedModules[i - 1];
      if (completedModules.includes(previousModule.id)) {
        unlockedModules.add(sortedModules[i].id);
      }
    }
    
    return unlockedModules;
  };

  const completedModules = user.completedModules || [];
  const unlockedModules = getUnlockedModules(modules, completedModules);
  const totalModules = modules.length;
  const overallProgress = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

  return (
    <div className="flex min-h-screen bg-neutral-50 relative">
      <DynamicBackground />
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
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-neutral-700 mb-2">
              Üdvözlünk, {user.firstName || user.email}!
            </h2>
            <p className="text-neutral-400">Folytasd a tanulást ott, ahol abbahagytad</p>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              value={42}
              subtitle="üzenet"
              icon={MessageSquare}
              color="primary"
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
                {modules.map((module: Module) => (
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
