import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import ProgressCard from "@/components/progress-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, TrendingUp, Award, Menu, Wrench, CheckCircle } from "lucide-react";
import type { Module, PracticalGrade } from "@shared/schema";

export default function ProgressPage() {
  const { user } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const { data: modules = [] as Module[] } = useQuery<Module[]>({
    queryKey: ['/api/modules'],
    retry: false,
  });

  const { data: practicalGrades = [] } = useQuery<PracticalGrade[]>({
    queryKey: ["/api/practical-grades/student", user?.id],
    enabled: !!user?.id,
  });

  if (!user) return null;

  const completedModules = user.completedModules?.length || 0;
  const totalModules = modules.length || 0;
  const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  // Calculate practical average
  const practicalAverage = practicalGrades.length > 0
    ? (practicalGrades.reduce((sum, g) => sum + g.grade, 0) / practicalGrades.length).toFixed(2)
    : "0.00";

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

          <div className="mt-8">
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Wrench className="h-5 w-5 text-blue-500" />
                    Gyakorlati Napló (Ellenőrző)
                  </CardTitle>
                  <p className="text-sm text-neutral-600 mt-1">Az oktatók által manuálisan értékelt gyakorlati feladatok</p>
                </div>
                {practicalGrades.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-neutral-500 uppercase font-semibold">Gyakorlati Átlag</p>
                    <p className="text-2xl font-bold text-blue-600">{practicalAverage}</p>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-4">
                {practicalGrades.length > 0 ? (
                  <div className="space-y-4">
                    {practicalGrades.map((grade) => {
                      const mod = modules.find(m => m.id === grade.moduleId);
                      return (
                        <div key={grade.id} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm flex items-start gap-4">
                          <div className={[
                            'flex items-center justify-center h-12 w-12 rounded-full font-bold text-xl shadow-inner',
                            grade.grade === 5 ? 'bg-green-100 text-green-700 border border-green-200' :
                            grade.grade === 4 ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            grade.grade === 3 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                            grade.grade === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                            'bg-red-100 text-red-700 border border-red-200'
                          ].join(' ')}>
                            {grade.grade}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-neutral-900">{mod?.title || 'Ismeretlen feladat'}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                                {new Date(grade.createdAt!).toLocaleDateString('hu-HU')}
                              </span>
                            </div>
                            {grade.comment && (
                              <p className="text-sm text-neutral-700 mt-3 italic bg-neutral-50 p-3 rounded-lg border-l-2 border-neutral-300">
                                &ldquo;{grade.comment}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                    <Wrench className="h-10 w-10 mx-auto text-neutral-300 mb-3" />
                    <p className="text-neutral-500 font-medium">Még nincsenek gyakorlati érdemjegyeid.</p>
                    <p className="text-sm text-neutral-400 mt-1">A tanáraid itt fogják értékelni a fizikai munkadarabokat és gyakorlati feladatokat.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}