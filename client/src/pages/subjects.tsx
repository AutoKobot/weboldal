import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, ArrowRight } from "lucide-react";
import type { Subject } from "@shared/schema";

export default function SubjectsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"theory" | "practical" | null>(null);

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['/api/public/subjects', user?.selectedProfessionId],
    queryFn: async () => {
      if (!user?.selectedProfessionId) return [];
      const params = new URLSearchParams({ professionId: user.selectedProfessionId.toString() });
      const response = await fetch(`/api/public/subjects?${params}`);
      if (!response.ok) throw new Error('Failed to fetch subjects');
      return response.json();
    },
    retry: false,
    enabled: !!user?.selectedProfessionId,
  });

  if (!user) return null;

  const handleSubjectSelect = (subjectId: number) => {
    navigate(`/subjects/${subjectId}/modules`);
  };

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
                  {selectedType === "theory" ? "Elméleti képzés" : selectedType === "practical" ? "Gyakorlati képzés" : "Képzési forma"}
                </h1>
                <p className="text-neutral-600">
                  {selectedType ? "Válassza ki a tanulni kívánt tantárgyat" : "Válasszon az elméleti és gyakorlati modulok közül"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {subjectsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !selectedType ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
              <Card 
                className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-primary/50 group"
                onClick={() => setSelectedType("theory")}
              >
                <CardHeader className="text-center pb-2">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="text-blue-600 w-10 h-10" />
                  </div>
                  <CardTitle className="text-2xl">Elméleti képzés</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-600">
                  <p>Szakmai elméleti tananyagok, fogalmak és modulok elsajátítása.</p>
                  <Button className="mt-6 w-full" variant="outline">Tovább az elmélethez</Button>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-green-600/50 group"
                onClick={() => setSelectedType("practical")}
              >
                <CardHeader className="text-center pb-2">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <div className="text-green-600 text-4xl">🛠️</div>
                  </div>
                  <CardTitle className="text-2xl">Gyakorlati képzés</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-neutral-600">
                  <p>Gyakorlati feladatok, műhelymunka és valós szakmai szituációk.</p>
                  <Button className="mt-6 w-full" variant="outline">Tovább a gyakorlathoz</Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div>
              <Button 
                variant="ghost" 
                className="mb-6" 
                onClick={() => setSelectedType(null)}
              >
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                Vissza a kategóriákhoz
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...subjects]
                  .filter((subject: Subject) => (subject.type || "theory") === selectedType)
                  .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                  .map((subject: Subject) => (
                  <Card 
                    key={subject.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-primary"
                    onClick={() => handleSubjectSelect(subject.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedType === "theory" ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-gradient-to-br from-green-500 to-green-700"}`}>
                          {selectedType === "theory" ? (
                            <BookOpen className="text-white" size={24} />
                          ) : (
                            <span className="text-white text-xl">🛠️</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg leading-tight">{subject.name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {subject.description && (
                        <p className="text-neutral-600 text-sm mb-4 line-clamp-3">{subject.description}</p>
                      )}
                      
                      <Button 
                        className="w-full mt-auto"
                        variant={selectedType === "theory" ? "default" : "secondary"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubjectSelect(subject.id);
                        }}
                      >
                        {selectedType === "theory" ? "Modulok megtekintése" : "Feladatok megtekintése"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                
                {subjects.filter((s: Subject) => (s.type || "theory") === selectedType).length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      {selectedType === "theory" ? <BookOpen className="h-8 w-8 text-neutral-400" /> : <span className="text-2xl">🛠️</span>}
                    </div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">
                      Nincsenek elérhető {selectedType === "theory" ? "elméleti tantárgyak" : "gyakorlati feladatok"}
                    </h3>
                    <p className="text-neutral-600 max-w-md mx-auto">Ebben a kategóriában jelenleg nincsenek hozzárendelt tartalmak a szakmához.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}