import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Cpu, 
  Sparkles, 
  Zap,
  ArrowRight,
  Play,
  Users,
  Award,
  TrendingUp,
  Shield,
  Globe,
  Rocket,
  Target
} from "lucide-react";
import { Link } from "wouter";
import AnimatedAIBackground from "@/components/animated-ai-background";
import PresentationSlideshow from "@/components/presentation-slideshow";
import futuristicImage from "@assets/image_1749219808494.png";

export default function FuturisticLanding() {
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen overflow-hidden relative bg-optimized-gradient">
      {/* Instant dark background for immediate display */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 opacity-95"></div>
      
      {/* Animated AI Background - Loads progressively */}
      <AnimatedAIBackground />
      
      {/* Content overlay with optimized performance */}
      <div className="relative z-10 min-h-screen bg-black/20 animate-slide-up">
        {/* Navigation */}
        <nav className="relative z-50 flex items-center justify-between p-6 backdrop-blur-sm bg-white/5 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="text-white" size={16} />
            </div>
            <span className="text-xl font-bold text-white">Global Learning System</span>
          </div>
          
          <div className="flex space-x-4">
            <Link href="/student-auth">
              <Button variant="outline" className="border-green-400/30 text-green-300 hover:bg-green-400/10 hover:border-green-400/50">
                Tanuló
              </Button>
            </Link>
            <Link href="/teacher-auth">
              <Button variant="outline" className="border-orange-400/30 text-orange-300 hover:bg-orange-400/10 hover:border-orange-400/50">
                Tanár
              </Button>
            </Link>
            <Link href="/school-admin-auth">
              <Button variant="outline" className="border-blue-400/30 text-blue-300 hover:bg-blue-400/10 hover:border-blue-400/50">
                Iskolai Admin
              </Button>
            </Link>
            <Link href="/admin-login">
              <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0">
                Rendszer Admin
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Hero Badge */}
            <Badge className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border-cyan-500/30 text-sm px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-támogatott oktatási platform
            </Badge>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight">
              A Jövő
              <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
                {" "}Oktatása{" "}
              </span>
              Itt Van
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Fedezd fel a mesterséges intelligencia erejét a tanulásban. 
              Személyre szabott modulok, interaktív AI asszisztens és professzionális közösségek.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-gradient-to-r from-purple-600/40 to-violet-700/40 border-purple-400/60 text-white hover:from-purple-600/60 hover:to-violet-700/60 hover:border-purple-400/80 px-8 py-4 text-lg backdrop-blur-sm shadow-lg shadow-purple-500/20"
                onClick={scrollToFeatures}
              >
                Tudj meg többet
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-16 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">1000+</div>
                <div className="text-gray-400">Aktív tanuló</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">50+</div>
                <div className="text-gray-400">Tanulási modul</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">95%</div>
                <div className="text-gray-400">Elégedettség</div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Presentation */}
        <section className="relative z-20 py-24 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-cyan-400/50 text-cyan-400 bg-cyan-400/10">
              <Sparkles className="w-4 h-4 mr-2" />
              Platform Bemutató
            </Badge>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Fedezze fel az 
              <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
                {" "}AI Platform{" "}
              </span>
              lehetőségeit
            </h2>
            
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Interaktív bemutató a Global Learning System főbb funkcióiról és innovatív megoldásairól
            </p>
            
            <div className="max-w-5xl mx-auto">
              <PresentationSlideshow />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Miért válaszd a 
                <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
                  {" "}Global Learning{" "}
                </span>
                rendszert?
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Cutting-edge technológia találkozik a személyre szabott oktatással
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature Cards */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <Brain className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">AI Asszisztens</h3>
                  <p className="text-gray-300">
                    Intelligens chatbot, amely 24/7 segít kérdéseidben és magyarázza el a nehéz fogalmakat.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mb-4">
                    <Users className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Közösségi Tanulás</h3>
                  <p className="text-gray-300">
                    Csatlakozz szakmai közösségekhez, dolgozz projekteken és tanulj társaiddal.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mb-4">
                    <Target className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Személyre Szabott</h3>
                  <p className="text-gray-300">
                    Adaptív tanulási útvonalak, amelyek alkalmazkodnak az egyéni tempódhoz és igényekhez.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
                    <Award className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Progresszív Rendszer</h3>
                  <p className="text-gray-300">
                    Moduláris felépítés szakmai szintekkel és automatikus előrehaladás követéssel.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Analitika</h3>
                  <p className="text-gray-300">
                    Részletes teljesítmény követés és fejlődési javaslatok AI alapú elemzéssel.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <Shield className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Biztonságos</h3>
                  <p className="text-gray-300">
                    Enterprise szintű biztonság és adatvédelem minden felhasználói interakciónál.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-2xl p-12 backdrop-blur-sm">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Készen állsz a jövő oktatására?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Csatlakozz több ezer tanulóhoz, akik már felfedezték az AI-támogatott tanulás erejét.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="outline" className="bg-gradient-to-r from-cyan-600/40 to-blue-700/40 border-cyan-400/60 text-white hover:from-cyan-600/60 hover:to-blue-700/60 hover:border-cyan-400/80 px-8 py-4 backdrop-blur-sm shadow-lg shadow-cyan-500/20">
                  <Globe className="w-5 h-5 mr-2" />
                  Tudj meg többet
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12 px-6 backdrop-blur-sm bg-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="text-white" size={16} />
              </div>
              <span className="text-xl font-bold text-white">Global Learning System</span>
            </div>
            <p className="text-gray-400">
              © 2025 Global Learning System. Minden jog fenntartva. A jövő már itt van.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}