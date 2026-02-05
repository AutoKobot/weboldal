import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PresentationSlideshow from "@/components/presentation-slideshow";
import { BookOpen, Bot, Users, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
                <BookOpen className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-700">Global Learning System</h1>
                <p className="text-sm text-neutral-500">AI Oktatási Platform</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={() => window.location.href = '/student-auth'}
                className="bg-primary hover:bg-blue-700"
              >
                Bejelentkezés
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/admin-login'}
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl lg:text-6xl font-bold text-neutral-800 mb-6">
            Tanulj az AI
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {" "}segítségével
            </span>
          </h2>
          <p className="text-xl text-neutral-600 mb-8 max-w-2xl mx-auto">
            A Global Learning System egy interaktív online oktatási platform, mely AI-alapú oktatást biztosít. 
            Modulok felajánlásával, haladáskövetéssel és intelligens chatbot tanárral segítjük a tanulást.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/student-auth'}
            className="bg-primary hover:bg-blue-700 text-lg px-8 py-3"
          >
            Kezdj el tanulni
          </Button>
        </div>
      </section>

      {/* Platform Presentation */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-neutral-800 mb-4">
            Platform Bemutató
          </h3>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Fedezze fel az AI Szakképzési Platform főbb funkcióit és lehetőségeit.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <PresentationSlideshow />
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-neutral-800 mb-4">
            Miért válaszd a Global Learning System-et?
          </h3>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Modern technológiák és AI-alapú megoldások a leghatékonyabb tanulási élményért.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="text-primary" size={24} />
              </div>
              <CardTitle>Strukturált Modulok</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Gondosan összeállított tananyagok, amelyek lépésről lépésre vezetik a tanulást.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="text-accent" size={24} />
              </div>
              <CardTitle>AI Tanár</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Intelligens chatbot, aki válaszol a kérdéseidre és tesztkérdéseket generál.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="text-secondary" size={24} />
              </div>
              <CardTitle>Haladáskövetés</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Részletes statisztikák a tanulási folyamatról és az elért eredményekről.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="text-purple-600" size={24} />
              </div>
              <CardTitle>Közösség</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Csatlakozz a tanulók közösségéhez és osszd meg a tapasztalataidat.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-secondary py-16">
        <div className="container mx-auto px-4 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">
            Készen állsz a tanulásra?
          </h3>
          <p className="text-lg mb-8 opacity-90">
            Regisztrálj most és kezdj el felfedezni az interaktív tanulás világát!
          </p>
          <Button 
            size="lg"
            variant="secondary"
            onClick={() => window.location.href = '/student-auth'}
            className="bg-white text-primary hover:bg-neutral-100 text-lg px-8 py-3"
          >
            Ingyenes regisztráció
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
              <BookOpen className="text-white" size={16} />
            </div>
            <span className="text-lg font-semibold">Global Learning System</span>
          </div>
          <p className="text-neutral-400">
            © 2024 Global Learning System. Minden jog fenntartva.
          </p>
        </div>
      </footer>
    </div>
  );
}
