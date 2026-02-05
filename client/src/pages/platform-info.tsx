import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  MessageSquare, 
  BookOpen, 
  Mic, 
  Volume2, 
  CheckCircle, 
  Star, 
  Users, 
  Clock, 
  ArrowRight, 
  Lightbulb,
  Target,
  TrendingUp,
  Headphones
} from "lucide-react";
import { Link } from "wouter";

export default function PlatformInfo() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      {/* Dekoratív háttér elemek */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-green-400/20 to-blue-400/20 blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Főcím szekció */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-8">
            <Brain className="h-10 w-10" />
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-6">
            Global Learning System
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
            Intelligens AI-alapú tanulási platform, amely személyre szabott oktatási élményt nyújt 
            modern technológiák segítségével
          </p>
          <div className="flex items-center justify-center gap-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-4 py-2">
              <Star className="h-4 w-4 mr-2 fill-current" />
              AI-vezérelt tanulás
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-4 py-2">
              <Users className="h-4 w-4 mr-2" />
              Szakértő tanárok
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-4 py-2">
              <TrendingUp className="h-4 w-4 mr-2" />
              Adaptív rendszer
            </Badge>
          </div>
        </div>

        {/* AI képességek szekció */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Mesterséges Intelligencia Képességek
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Intelligens Chat Asszisztens</CardTitle>
                <CardDescription>
                  24/7 elérhető AI tanár, aki azonnal válaszol a kérdéseidre és személyre szabott magyarázatokat ad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Azonnali válaszok bármilyen szakmai kérdésre
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Személyre szabott magyarázatok
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Kontextus-alapú segítségnyújtás
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center mb-4">
                  <Headphones className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Hangalapú Interakció</CardTitle>
                <CardDescription>
                  Beszélj az AI-jal természetes módon - kérdezz hangüzenettel és hallgasd meg a válaszokat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-blue-500" />
                    Hangüzenetek küldése
                  </li>
                  <li className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-blue-500" />
                    AI válaszok meghallgatása
                  </li>
                  <li className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    Természetes beszédfelismerés
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 text-white flex items-center justify-center mb-4">
                  <Target className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Automatikus Kvízek</CardTitle>
                <CardDescription>
                  AI-generált kvízek, amelyek automatikusan értékelik a tudásodat és visszajelzést adnak
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Automatikus kérdés generálás
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Azonnali értékelés és visszajelzés
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    88% küszöb alapú modul befejezés
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Platform funkciók */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Platform Funkciók
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">Hierarchikus Tananyag Rendszer</CardTitle>
                <CardDescription className="text-lg">
                  Jól strukturált tanulási útvonal szakmáktól a modulokig
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-semibold mb-2">📚 Szakmacsoport</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Válaszd ki az érdekel szakmádat</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-semibold mb-2">📖 Tantárgyak</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Részletes tantárgyak minden szakmához</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-semibold mb-2">🎯 Modulok</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Kisebb, könnyen emészthető tanulási egységek</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center mb-4">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">Személyre Szabott Tanulás</CardTitle>
                <CardDescription className="text-lg">
                  AI-alapú adaptív rendszer, amely a te tempódhoz igazodik
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Haladás követés és statisztikák</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Személyre szabott tanulási célok</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">Adaptív nehézségi szint</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hogyan működik szekció */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Hogyan Működik?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Regisztráció",
                description: "Hozd létre a fiókodat és válaszd ki a szakmádat",
                icon: Users,
                color: "from-blue-500 to-cyan-500"
              },
              {
                step: "2", 
                title: "Tananyag Böngészés",
                description: "Fedezd fel a tantárgyakat és modulokat",
                icon: BookOpen,
                color: "from-green-500 to-teal-500"
              },
              {
                step: "3",
                title: "AI-val Tanulás", 
                description: "Használd a chat asszisztenst és hangfunkciókat",
                icon: Brain,
                color: "from-purple-500 to-pink-500"
              },
              {
                step: "4",
                title: "Haladás Követés",
                description: "Kövesd nyomon az eredményeidet és teljesítményedet",
                icon: TrendingUp,
                color: "from-orange-500 to-red-500"
              }
            ].map((item, index) => (
              <Card key={index} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg text-center">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${item.color} text-white flex items-center justify-center mx-auto mb-4`}>
                    <item.icon className="h-8 w-8" />
                  </div>
                  <div className="text-3xl font-bold text-gray-400 dark:text-gray-500 mb-2">
                    {item.step}
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA szekció */}
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-6 p-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
              Készen állsz a tanulásra?
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md">
              Válaszd ki a szakmádat és kezdd el a személyre szabott tanulási utadat AI támogatással
            </p>
            <Link href="/profession-selection">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg transition-all duration-300 text-lg px-8 py-4">
                <ArrowRight className="h-5 w-5 mr-2" />
                Szakma Kiválasztása
              </Button>
            </Link>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>2 perc alatt kezdhetsz</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Ingyenes regisztráció</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}