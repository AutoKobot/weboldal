import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, BookOpen, PlayCircle, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Learning() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  // Ha nincs kiválasztott szakma, átirányítás a szakma kiválasztáshoz
  if (!user?.selectedProfessionId) {
    setLocation("/profession-selection");
    return null;
  }

  const { data: subjects, isLoading: subjectsLoading } = useQuery<any[]>({
    queryKey: ["/api/public/subjects", { professionId: user?.selectedProfessionId }],
    queryFn: () => fetch(`/api/public/subjects?professionId=${user?.selectedProfessionId}`).then(res => res.json()),
    enabled: !!user?.selectedProfessionId,
  });

  const { data: modules, isLoading: modulesLoading } = useQuery<any[]>({
    queryKey: ["/api/public/modules", { subjectId: selectedSubject }],
    queryFn: () => selectedSubject ? fetch(`/api/public/modules?subjectId=${selectedSubject}`).then(res => res.json()) : Promise.resolve([]),
    enabled: !!selectedSubject,
  });

  const { data: profession } = useQuery<any>({
    queryKey: ["/api/public/professions", user?.selectedProfessionId],
    queryFn: () => fetch(`/api/public/professions`).then(res => res.json()).then(profs => profs.find((p: any) => p.id === user?.selectedProfessionId)),
    enabled: !!user?.selectedProfessionId,
  });

  if (subjectsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const completedModules = user?.completedModules || [];

  const isModuleCompleted = (moduleId: number) => {
    return completedModules.includes(moduleId);
  };

  const getSubjectProgress = (subjectId: number) => {
    const subjectModules = modules?.filter((m: any) => m.subjectId === subjectId) || [];
    if (subjectModules.length === 0) return 0;
    const completed = subjectModules.filter((m: any) => isModuleCompleted(m.id)).length;
    return Math.round((completed / subjectModules.length) * 100);
  };

  return (
    <div className="min-h-screen bg-student-warm dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {profession?.name || 'Tanulás'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {profession?.description || 'Válaszd ki a tantárgyakat és kezdj el tanulni'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/chat">
                <Button variant="outline">AI Asszisztens</Button>
              </Link>
              <Link href="/progress">
                <Button variant="outline">Haladás</Button>
              </Link>
            </div>
          </div>
        </div>

        <Tabs value={selectedSubject?.toString() || "overview"} onValueChange={(value) => {
          if (value === "overview") {
            setSelectedSubject(null);
          } else {
            setSelectedSubject(parseInt(value));
          }
        }}>
          <TabsList className="grid w-full grid-cols-auto mb-6">
            <TabsTrigger value="overview">Áttekintés</TabsTrigger>
            {subjects?.map((subject: any) => (
              <TabsTrigger key={subject.id} value={subject.id.toString()}>
                {subject.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects?.map((subject: any) => (
                <Card key={subject.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      {subject.name}
                    </CardTitle>
                    <CardDescription>{subject.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <Badge variant="secondary">
                        {modules?.filter((m: any) => m.subjectId === subject.id).length || 0} modul
                      </Badge>
                      <Badge variant={getSubjectProgress(subject.id) === 100 ? "default" : "outline"}>
                        {getSubjectProgress(subject.id)}% kész
                      </Badge>
                    </div>
                    
                    <Button 
                      onClick={() => setSelectedSubject(subject.id)}
                      className="w-full"
                      variant={getSubjectProgress(subject.id) > 0 ? "default" : "outline"}
                    >
                      {getSubjectProgress(subject.id) > 0 ? 'Folytatás' : 'Kezdés'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Subject Tabs */}
          {subjects?.map((subject: any) => (
            <TabsContent key={subject.id} value={subject.id.toString()}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {subject.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {subject.description}
                </p>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>
                    {modules?.filter((m: any) => m.subjectId === subject.id).length || 0} modul
                  </span>
                  <span>
                    {getSubjectProgress(subject.id)}% befejezve
                  </span>
                </div>
              </div>

              {modulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {modules?.filter((module: any) => module.subjectId === subject.id).map((module: any) => (
                    <Card key={module.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {isModuleCompleted(module.id) ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <PlayCircle className="h-5 w-5 text-blue-600" />
                          )}
                          {module.title}
                          <Badge variant="outline" className="ml-auto">
                            {module.moduleNumber}. modul
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                          {module.content
                            .replace(/<[^>]*>/g, '') // Remove HTML tags
                            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links [text](url) -> text
                            .replace(/https?:\/\/[^\s]+/g, '') // Remove standalone URLs
                            .replace(/\s+/g, ' ') // Normalize whitespace
                            .trim()
                          }
                        </p>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>Elérhető</span>
                          </div>
                          
                          <Link href={`/module/${module.id}`}>
                            <Button 
                              variant={isModuleCompleted(module.id) ? "outline" : "default"}
                              size="sm"
                            >
                              {isModuleCompleted(module.id) ? 'Áttekintés' : 'Kezdés'}
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}