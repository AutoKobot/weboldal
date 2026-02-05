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
  Rocket
} from "lucide-react";
import { Link } from "wouter";
import AnimatedAIBackground from "@/components/animated-ai-background";
import AnimatedSection from "@/components/animated-section";
import { useParallax, useSmoothScroll } from "@/hooks/useScrollAnimation";
import futuristicImage from "@assets/image_1749219808494.png";

export default function FuturisticLanding() {
  const { scrollToElement } = useSmoothScroll();
  const { ref: parallaxRef, offset } = useParallax(0.3);

  return (
    <div className="min-h-screen overflow-hidden relative bg-optimized-gradient smooth-scroll">
      {/* Instant CSS background for immediate display */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 opacity-95"></div>
      
      {/* Animated AI Background with parallax effect */}
      <div 
        ref={parallaxRef as any}
        className="parallax-bg"
        style={{ transform: `translateY(${offset * 0.5}px)` }}
      >
        <AnimatedAIBackground />
      </div>
      
      {/* Content overlay with optimized backdrop */}
      <div className="relative z-10 min-h-screen bg-black/20">
        {/* Gradient overlays for depth */}
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-purple-500/10 to-transparent"></div>

      {/* Navigation with animations */}
      <nav className="relative z-50 flex items-center justify-between p-6 backdrop-blur-sm bg-white/5 border-b border-white/10 fade-in-up">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center hover-glow">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Global Learning System
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/student-auth">
            <Button variant="ghost" className="text-white hover:bg-white/10 hover-lift touch-friendly">
              Bejelentkezés
            </Button>
          </Link>
          <Link href="/student-auth">
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 hover-lift touch-friendly">
              Kezdés
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <AnimatedSection animation="fade-left" delay={200}>
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-cyan-500/30 hover-glow">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI-vezérelt tanulás
                </Badge>
                <h1 className="responsive-heading text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="text-white">A jövő</span>
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    oktatási
                  </span>
                  <br />
                  <span className="text-white">platformja</span>
                </h1>
                <p className="responsive-text text-xl text-slate-300 leading-relaxed max-w-lg">
                  Fedezd fel a szakmai képzés új dimenzióját mesterséges intelligencia segítségével. 
                  Személyre szabott tanulási útvonalak, interaktív AI mentorálás és valós idejű fejlődéskövetés.
                </p>
              </div>

              <AnimatedSection animation="fade-up" delay={400}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/student-auth">
                    <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 px-8 py-4 text-lg hover-lift touch-friendly">
                      <Play className="h-5 w-5 mr-2" />
                      Kezdés most
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg hover-lift touch-friendly"
                    onClick={() => scrollToElement('features-section')}
                  >
                    <Globe className="h-5 w-5 mr-2" />
                    Tudj meg többet
                  </Button>
                </div>
              </AnimatedSection>
            </div>
          {/* Right Content - Image */}
          <AnimatedSection animation="fade-right" delay={300}>
            <div className="relative">
              <img 
                src={futuristicImage} 
                alt="AI Technology" 
                className="w-full h-auto rounded-2xl shadow-2xl hover-lift"
                loading="lazy"
              />
              
              {/* Floating UI Elements */}
              <div className="absolute -top-4 -left-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-cyan-400" />
                  <span className="text-sm text-white font-medium">AI Mentor</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -right-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                  <span className="text-sm text-white font-medium">Valós idejű elemzés</span>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* Stats */}
        <AnimatedSection animation="fade-up" delay={600}>
          <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">1000+</div>
                <div className="text-sm text-slate-400">Aktív tanuló</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">50+</div>
                <div className="text-sm text-slate-400">Szakma</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-pink-400">98%</div>
                <div className="text-sm text-slate-400">Sikerességi arány</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-white/20 backdrop-blur-sm bg-white/5">
              <img 
                src={futuristicImage} 
                alt="Futurisztikus oktatási környezet AI technológiával"
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"></div>
            </div>
            
            {/* Floating cards */}
            <div className="absolute -top-4 -left-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-2">
                <Cpu className="h-5 w-5 text-cyan-400" />
                <span className="text-sm text-white font-medium">AI Mentor</span>
              </div>
            </div>
            
            <div className="absolute -bottom-4 -right-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                <span className="text-sm text-white font-medium">Valós idejű elemzés</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Miért válaszd a <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">jövőt?</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Tapasztald meg a következő generációs tanulási élményt, ahol a technológia és a pedagógia tökéletesen ötvöződik
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Brain,
              title: "AI-vezérelt személyre szabás",
              description: "A mesterséges intelligencia folyamatosan elemzi a tanulási stílusodat és személyre szabja a tartalmat",
              gradient: "from-cyan-500 to-blue-500"
            },
            {
              icon: Zap,
              title: "Valós idejű visszajelzés",
              description: "Azonnali értékelés és javaslatok minden lépésnél, hogy maximalizáld a tanulási hatékonyságot",
              gradient: "from-purple-500 to-pink-500"
            },
            {
              icon: Users,
              title: "Közösségi tanulás",
              description: "Csatlakozz szakmai közösségekhez és tanulj társaiddal együtt interaktív projekteken",
              gradient: "from-emerald-500 to-teal-500"
            },
            {
              icon: Award,
              title: "Iparág által elismert tanúsítványok",
              description: "Szerezz értékes képesítéseket, amelyeket az iparág vezető vállalatai ismernek el",
              gradient: "from-orange-500 to-red-500"
            },
            {
              icon: Shield,
              title: "Biztonságos és megbízható",
              description: "Vállalati szintű biztonság és adatvédelem garantálja a tanulási élményed védelmét",
              gradient: "from-indigo-500 to-purple-500"
            },
            {
              icon: Rocket,
              title: "Karrierfejlesztés",
              description: "Személyes karriertanácsadás és állásajánlatok segítségével építsd fel az álmaid karrierjét",
              gradient: "from-pink-500 to-rose-500"
            }
          ].map((feature, index) => (
            <Card key={index} className="group bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105">
              <CardContent className="p-6 space-y-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="text-slate-300 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <h2 className="text-4xl lg:text-5xl font-bold text-white">
            Készen állsz a <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">jövőre?</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Csatlakozz már ma a thousands tanulóhoz, akik már felfedezték a személyre szabott AI-tanulás erejét
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/student-auth">
              <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 px-12 py-4 text-lg">
                <Sparkles className="h-5 w-5 mr-2" />
                Kezdd el ingyen
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 backdrop-blur-sm bg-white/5">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Global Learning System
              </span>
            </div>
            <p className="text-slate-400">
              © 2025 Global Learning System. Minden jog fenntartva. A jövő már itt van.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}