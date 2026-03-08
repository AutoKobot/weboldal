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
  Target,
  GraduationCap
} from "lucide-react";
import { Link } from "wouter";
import AnimatedAIBackground from "@/components/animated-ai-background";
import PresentationSlideshow from "@/components/presentation-slideshow";

export default function FuturisticLanding() {
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen overflow-hidden relative bg-optimized-gradient font-sans">
      {/* Instant dark background for immediate display */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 opacity-90"></div>

      {/* Animated AI Background - Loads progressively - DO NOT MODIFY */}
      <AnimatedAIBackground />

      {/* Content overlay with optimized performance */}
      <div className="relative z-10 min-h-screen bg-transparent animate-slide-up">
        {/* Navigation - Glassmorphic top bar */}
        <nav className="sticky top-0 z-50 flex flex-wrap items-center justify-between p-4 md:px-8 md:py-4 backdrop-blur-xl bg-slate-950/40 border-b border-white/10 shadow-2xl">
          <div className="flex items-center space-x-3 mb-4 sm:mb-0">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)]">
              <Brain className="text-white" size={20} />
            </div>
            <span className="text-xl md:text-2xl font-black tracking-tight text-white">
              Global <span className="text-cyan-400">Learning</span> System
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/student-auth">
              <Button variant="outline" className="bg-white/5 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:border-green-400/80 transition-all font-medium backdrop-blur-md">
                Tanuló
              </Button>
            </Link>
            <Link href="/teacher-auth">
              <Button variant="outline" className="bg-white/5 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:border-orange-400/80 transition-all font-medium backdrop-blur-md">
                Tanár
              </Button>
            </Link>
            <Link href="/school-admin-auth">
              <Button variant="outline" className="bg-white/5 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400/80 transition-all font-medium backdrop-blur-md">
                Iskola Admin
              </Button>
            </Link>
            <Link href="/admin-login">
              <Button className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white border-0 shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all font-bold">
                Rendszer Admin
              </Button>
            </Link>
            <Button
              onClick={async () => {
                try {
                  const res = await fetch('/api/auth/demo', { method: 'POST' });
                  if (res.ok) {
                    window.location.href = '/tananyagok';
                  }
                } catch (e) { console.error("Demo login failed", e) }
              }}
              variant="outline"
              className="bg-white/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 font-bold backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <Play className="w-4 h-4 mr-2" />
              Demo Ingyen
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center pt-24 pb-32 px-6 text-center overflow-hidden">
          {/* Decorative glowing orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

          <div className="max-w-5xl mx-auto space-y-10 relative z-10">
            {/* Hero Badge */}
            <div className="inline-flex animate-bounce-slow">
              <Badge className="bg-white/10 backdrop-blur-md text-cyan-300 border border-cyan-400/30 text-sm md:text-base px-5 py-2.5 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Sparkles className="w-5 h-5 mr-2 text-yellow-300" />
                A következő generációs oktatási platform
              </Badge>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight tracking-tighter">
              A Jövő <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 filter drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                Oktatása
              </span>
              {" "}Itt Van
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
              Tapasztald meg a mesterséges intelligencia nyújtotta páratlan tanulási élményt.
              Személyre szabott tartalom, interaktív AI oktatók és modern szakmai közösségek.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
              <Button
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 border-0 px-8 py-6 text-xl font-bold rounded-full shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all hover:scale-105"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/auth/demo', { method: 'POST' });
                    if (res.ok) {
                      window.location.href = '/tananyagok';
                    }
                  } catch (e) { console.error("Demo login failed", e) }
                }}
              >
                <Play className="w-6 h-6 mr-3" />
                Demo Indítása Regisztráció Nélkül
              </Button>
              <Link href="/student-auth">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 px-8 py-6 text-xl rounded-full backdrop-blur-md transition-all font-medium"
                >
                  <GraduationCap className="w-6 h-6 mr-3 text-cyan-400" />
                  Kezdd el most
                </Button>
              </Link>
            </div>

            {/* Stats - Modern Glass Look */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-20 max-w-4xl mx-auto">
              {[
                { value: "1000+", label: "Aktív tanuló", color: "text-cyan-400" },
                { value: "50+", label: "Szakmai Modul", color: "text-blue-400" },
                { value: "95%", label: "Elégedettség", color: "text-purple-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 transform transition-all hover:-translate-y-2 hover:bg-white/10 hover:border-white/20">
                  <div className={`text-4xl md:text-5xl font-black ${stat.color} mb-2 drop-shadow-lg`}>{stat.value}</div>
                  <div className="text-slate-400 font-medium tracking-wide uppercase text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Presentation Block */}
        <section className="relative z-20 py-24 px-6 bg-slate-950/50 backdrop-blur-xl border-y border-white/5">
          <div className="max-w-6xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-cyan-500/40 text-cyan-300 bg-cyan-500/10 px-4 py-1.5 uppercase tracking-widest text-xs font-bold rounded-full">
              Platform Bemutató
            </Badge>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Fedezd fel az
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {" "}AI Platform{" "}
              </span>
              lehetőségeit
            </h2>

            <p className="text-lg md:text-xl text-slate-400 mb-16 max-w-3xl mx-auto font-light">
              Műszerfalak, interaktív bemutatók és intelligens analitika egy helyen. Csak válassz egy funkciót.
            </p>

            <div className="max-w-5xl mx-auto relative rounded-3xl overflow-hidden p-[2px] bg-gradient-to-br from-cyan-500/30 via-purple-500/30 to-blue-500/30">
              <div className="bg-slate-950 rounded-[22px] p-2 md:p-6 shadow-2xl">
                <PresentationSlideshow variant="dark" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid Section */}
        <section id="features" className="py-32 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 lg:mb-28">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                Miért a
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent filter drop-shadow-sm">
                  {" "}Global Learning{" "}
                </span>
                rendszer?
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
                Egyedülálló technológiai megoldások, amik a maximális teljesítményre sarkallnak.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
              {/* Feature Cards with Glass & Hover Effects */}
              {[
                { icon: Brain, title: "AI Asszisztens", color: "from-cyan-400 to-blue-500", shadow: "shadow-cyan-500/20", desc: "Intelligens chatbot, amely 24/7 segít kérdéseidben és azonnal elmagyarázza a legbonyolultabb fogalmakat." },
                { icon: Users, title: "Közösségi Tanulás", color: "from-purple-400 to-pink-500", shadow: "shadow-purple-500/20", desc: "Csatlakozz elit szakmai közösségekhez, dolgozz projekteken és inspirálódj mások sikereiből." },
                { icon: Target, title: "Személyre Szabott", color: "from-orange-400 to-red-500", shadow: "shadow-orange-500/20", desc: "Teljesen adaptív tanulási útvonalak, amelyek másodpercről másodpercre igazodnak az igényeidhez." },
                { icon: Award, title: "Progresszív Rendszer", color: "from-green-400 to-emerald-500", shadow: "shadow-green-500/20", desc: "Moduláris, egymásra épülő szintek automatikus haladáskövetéssel és instant visszajelzésekkel." },
                { icon: TrendingUp, title: "Élő Analitika", color: "from-blue-400 to-indigo-500", shadow: "shadow-blue-500/20", desc: "Részletes, gyönyörű teljesítmény műszerfalak prediktív AI elemzésekkel és egyéni fókuszpontokkal." },
                { icon: Shield, title: "Enterprise Biztonság", color: "from-violet-400 to-purple-500", shadow: "shadow-violet-500/20", desc: "Páratlan, banki szintű titkosítás és felhő alapú adatvédelem minden egyes interakciódnál." },
              ].map((item, idx) => (
                <div key={idx} className="group relative rounded-3xl bg-slate-900/50 backdrop-blur-md border border-white/10 p-8 hover:bg-slate-800/60 hover:border-white/20 transition-all duration-500 hover:-translate-y-2 overflow-hidden overflow-visible">
                  {/* Glowing background blob on hover */}
                  <div className={`absolute -inset-1 opacity-0 group-hover:opacity-100 bg-gradient-to-r ${item.color} rounded-3xl blur-md transition-opacity duration-500 -z-10`}></div>

                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-6 shadow-lg ${item.shadow} group-hover:scale-110 transition-transform duration-500`}>
                    <item.icon className="text-white w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed font-light group-hover:text-slate-300 transition-colors">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ultimate CTA Section */}
        <section className="py-32 px-4 relative">
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none"></div>

          <div className="max-w-5xl mx-auto relative z-10">
            <div className="relative rounded-[3rem] overflow-hidden p-1 bg-gradient-to-br from-cyan-500 via-purple-500 to-blue-600 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
              <div className="relative bg-slate-950/90 backdrop-blur-2xl rounded-[2.9rem] px-8 py-20 text-center overflow-hidden">
                {/* Abstract bg shapes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px]"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]"></div>

                <Globe className="w-16 h-16 text-cyan-400 mx-auto mb-8 animate-pulse-slow" />
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6">
                  Állj a jövő nyertesei közé.
                </h2>
                <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto font-light">
                  Csatlakozz ahhoz a több ezer tanulóhoz, akik már ma a holnap technológiájával építik a karrierjüket. Ez az élmény felülmúlja a várakozásaidat.
                </p>

                <Link href="/student-auth">
                  <Button size="lg" className="bg-white text-slate-950 hover:bg-slate-200 border-0 px-10 py-7 text-xl font-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all hover:scale-110">
                    <Rocket className="w-6 h-6 mr-3 text-purple-600" />
                    Regisztrálj Ingyenesen
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Modern Minimal Footer */}
        <footer className="relative z-20 border-t border-white/5 bg-slate-950 py-12 px-6">
          <div className="max-w-6xl mx-auto flex flex-col items-center">
            <div className="flex items-center space-x-3 mb-6 grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-pointer">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Brain className="text-white" size={16} />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Global Learning System</span>
            </div>
            <p className="text-slate-500 text-sm font-light text-center">
              © {new Date().getFullYear()} Global Learning System. A kiválóság kódolva van. <br className="md:hidden" />Minden jog fenntartva.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}