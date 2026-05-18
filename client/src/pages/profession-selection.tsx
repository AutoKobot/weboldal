import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Users, Clock, GraduationCap, Star, ArrowRight, Wrench, HardHat, Zap, Lightbulb } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function ProfessionSelection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: professions, isLoading } = useQuery<any[]>({
    queryKey: ["/api/public/professions"],
  });

  const selectProfessionMutation = useMutation({
    mutationFn: async (professionId: number) => {
      await apiRequest("PUT", "/api/user/profession", { professionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Szakma kiválasztva",
        description: "Sikeresen kiválasztottad a szakmádat.",
      });
      // Use requestAnimationFrame to avoid setState during render
      requestAnimationFrame(() => {
        setLocation("/home");
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Ha már van kiválasztott szakma, átirányítás a tanuláshoz
  if (user?.selectedProfessionId) {
    setLocation("/learning");
    return null;
  }

  // Diákoknak tilos a manuális választás ha nincs beosztva
  if (user?.role === 'student' && !user?.selectedProfessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Dekoratív háttér elemek a premium hatáshoz */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl"></div>
        </div>

        <Card className="w-full max-w-lg border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-2xl text-white relative z-10 overflow-hidden">
          {/* Top subtle glow bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"></div>

          <CardHeader className="text-center pb-2 pt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-6 mx-auto animate-pulse">
              <Users className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
              Osztálybesorolás szükséges
            </CardTitle>
            <CardDescription className="text-slate-400 text-base mt-2">
              Kedves {user?.firstName || user?.username || 'Tanuló'}!
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4 text-center">
            <p className="text-slate-300 leading-relaxed">
              Az interaktív tananyagok eléréséhez az iskolai adminisztrátornak be kell sorolnia téged egy osztályba. Az osztályod alapján a rendszer **automatikusan** hozzárendeli a számodra megfelelő szakmát.
            </p>
            
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/30 text-sm text-blue-200/90 flex items-start gap-3 text-left">
              <Clock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-blue-300 block mb-1">Mi a teendő?</span>
                Nincs szükség manuális választásra. Amint a besorolásod megtörténik, a rendszer azonnal aktiválja a szakmád tananyagait, és közvetlenül hozzáférsz a tantárgyaidhoz.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-4">
              <Link href="/platform-info">
                <Button variant="outline" className="w-full sm:w-auto border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white">
                  Platform Információk
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" className="w-full sm:w-auto text-slate-400 hover:text-white hover:bg-slate-800">
                  Beállítások
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Különböző ikonok a szakmákhoz
  const getProfessionIcon = (professionName: string) => {
    const name = professionName.toLowerCase();
    if (name.includes('hegesztő') || name.includes('fém')) return Zap;
    if (name.includes('építő') || name.includes('épület')) return HardHat;
    if (name.includes('szerelő') || name.includes('gép')) return Wrench;
    return GraduationCap;
  };

  const getProfessionGradient = (index: number) => {
    const gradients = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-indigo-500 to-purple-500',
      'from-yellow-500 to-orange-500',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      {/* Dekoratív háttér elemek */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-green-400/20 to-blue-400/20 blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Fejléc szekció */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-6">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
            Válaszd ki a szakmád
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Kezdd el a tanulási utadat a választott szakmádban. Minden szakma egyedi tananyagokkal és gyakorlati feladatokkal vár.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Szakértő tanárok által készített tananyagok</span>
          </div>
        </div>

        {/* Szakmák rács */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {professions?.map((profession: any, index: number) => {
            const IconComponent = getProfessionIcon(profession.name);
            const gradientClass = getProfessionGradient(index);
            
            return (
              <Card 
                key={profession.id} 
                className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:scale-105 relative overflow-hidden"
              >
                {/* Gradiens háttér */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                
                <CardHeader className="relative pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradientClass} text-white shadow-lg`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <Clock className="h-3 w-3 mr-1" />
                      Elérhető
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
                    {profession.name}
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {profession.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>Szakmai képzés</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <BookOpen className="h-4 w-4" />
                      <span>Modulok</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => selectProfessionMutation.mutate(profession.id)}
                    disabled={selectProfessionMutation.isPending}
                    className={`w-full bg-gradient-to-r ${gradientClass} hover:shadow-lg transition-all duration-300 text-white border-0 group-hover:scale-105`}
                  >
                    {selectProfessionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-1" />
                    )}
                    Kiválasztás és indulás
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Alsó szekció */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
            <Link href="/platform-info">
              <Button variant="outline" className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Lightbulb className="h-4 w-4 mr-2" />
                Platform Információk
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                Beállítások
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}