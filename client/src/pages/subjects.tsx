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
                <h1 className="text-2xl font-bold text-neutral-800">Tantárgyak</h1>
                <p className="text-neutral-600">Válassza ki a tanulni kívánt tantárgyat</p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {subjectsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject: Subject) => (
                <Card 
                  key={subject.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleSubjectSelect(subject.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
                        <BookOpen className="text-white" size={24} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                      </div>
                      <ArrowRight className="text-neutral-400" size={20} />
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {subject.description && (
                      <p className="text-neutral-600 text-sm mb-4">{subject.description}</p>
                    )}
                    
                    <Button 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubjectSelect(subject.id);
                      }}
                    >
                      Modulok megtekintése
                    </Button>
                  </CardContent>
                </Card>
              ))}
              
              {subjects.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">Nincsenek elérhető tantárgyak</h3>
                  <p className="text-neutral-600">Jelenleg nincsenek tantárgyak hozzárendelve a szakmájához.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}