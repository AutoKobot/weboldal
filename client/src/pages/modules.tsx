import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ModuleCard from "@/components/module-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, ArrowLeft } from "lucide-react";
import type { Module, Subject } from "@shared/schema";

export default function ModulesPage() {
  const { user } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  const subjectId = params.subjectId ? parseInt(params.subjectId) : undefined;

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['/api/public/modules', subjectId],
    queryFn: async () => {
      const url = subjectId ? `/api/public/modules?subjectId=${subjectId}` : '/api/public/modules';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch modules');
      return response.json();
    },
    retry: false,
  });

  const { data: subject } = useQuery({
    queryKey: ['/api/public/subject', subjectId],
    queryFn: async () => {
      if (!subjectId) return null;
      const response = await fetch(`/api/public/subjects?subjectId=${subjectId}`);
      if (!response.ok) throw new Error('Failed to fetch subject');
      const subjects = await response.json();
      return subjects.find((s: Subject) => s.id === subjectId) || null;
    },
    enabled: !!subjectId,
    retry: false,
  });

  const navigateBackToSubjects = () => {
    if (subject?.professionId) {
      navigate(`/tananyagok?profession=${subject.professionId}`);
    } else {
      navigate("/tananyagok");
    }
  };

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

  const completedModules = user?.completedModules || [];
  const unlockedModules = getUnlockedModules(modules, completedModules);

  if (!user) return null;

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
      
      <main className="flex-1 overflow-auto">
        <header className="bg-student-warm shadow-sm p-4 lg:hidden">
          <button 
            onClick={() => setIsMobileNavOpen(true)}
            className="p-2 rounded-lg hover:bg-neutral-100"
          >
            <Menu size={24} />
          </button>
        </header>

        <div className="p-6">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              {subjectId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={navigateBackToSubjects}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft size={16} />
                  <span>Vissza a tantárgyakhoz</span>
                </Button>
              )}
            </div>
            <h1 className="text-3xl font-bold text-neutral-800 mb-2">
              {subject?.name ? `${subject.name} - Modulok` : 'Tananyagok'}
            </h1>
            <p className="text-neutral-600">Böngészd át az elérhető tananyagokat és kezdj tanulni!</p>
          </div>

          {modulesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-neutral-200 rounded mb-4"></div>
                    <div className="h-8 bg-neutral-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : modules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module: Module) => (
                <ModuleCard 
                  key={module.id} 
                  module={module} 
                  isCompleted={user.completedModules?.includes(module.id) || false}
                  userRole={user.role || 'student'}
                  isUnlocked={user.role === 'admin' || unlockedModules.has(module.id)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-800 mb-2">Még nincsenek tananyagok</h3>
              <p className="text-neutral-600">Hamarosan új tananyagokat adunk hozzá. Kérjük, látogass vissza később!</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}