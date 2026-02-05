import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ProgressCard from "@/components/progress-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, TrendingUp, Award, Menu } from "lucide-react";
import type { Module } from "@shared/schema";

export default function ProgressPage() {
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const { data: modules = [] } = useQuery({
    queryKey: ['/api/modules'],
    retry: false,
  });

  if (!user) return null;

  const completedModules = user.completedModules?.length || 0;
  const totalModules = modules.length || 0;
  const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  return (
    <div className="min-h-screen bg-student-warm flex">
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>
      
      <MobileNav 
        isOpen={isMobileNavOpen} 
        onClose={() => setIsMobileNavOpen(false)} 
        user={user}
      />
      
      <main className="flex-1 lg:ml-0">
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
            <h1 className="text-3xl font-bold text-neutral-800 mb-2">Tanulmányi Előrehaladás</h1>
            <p className="text-neutral-600">Kövesd nyomon a tanulási eredményeidet és haladásodat.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <ProgressCard
              title="Befejezett Modulok"
              value={completedModules}
              subtitle={`${totalModules} modulból`}
              icon={BookOpen}
              color="primary"
            />
            <ProgressCard
              title="Teljesítés"
              value={Math.round(progressPercentage)}
              subtitle="százalék"
              icon={TrendingUp}
              color="secondary"
            />
            <ProgressCard
              title="Tanulmányi Idő"
              value={completedModules * 30}
              subtitle="perc"
              icon={Clock}
              color="accent"
            />
            <ProgressCard
              title="Szerzett Pontok"
              value={completedModules * 100}
              subtitle="pont"
              icon={Award}
              color="primary"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Általános Haladás</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Teljes Előrehaladás</span>
                      <span className="text-sm text-neutral-600">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                  <div className="text-sm text-neutral-600">
                    {completedModules} / {totalModules} modul befejezve
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legutóbbi Aktivitás</CardTitle>
              </CardHeader>
              <CardContent>
                {completedModules > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Modul befejezve</span>
                      <span className="text-xs text-neutral-500 ml-auto">Ma</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Új tananyag elkezdve</span>
                      <span className="text-xs text-neutral-500 ml-auto">Tegnap</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-neutral-600 text-sm">Még nincs tanulmányi aktivitás. Kezdj el egy modult a tanulás megkezdéséhez!</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}