import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import OnboardingWizard from "@/components/onboarding-wizard";
import PresentationSlideshow from "@/components/presentation-slideshow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, ArrowRight, Target, Users, Award, Clock, Brain, CheckCircle, HelpCircle } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  // Check if user has seen onboarding
  useEffect(() => {
    const hasSeenKey = `onboarding_seen_${user?.id}`;
    const hasSeen = localStorage.getItem(hasSeenKey) === 'true';
    setHasSeenOnboarding(hasSeen);
    
    // Show onboarding for new users
    if (!hasSeen && user) {
      setTimeout(() => setShowOnboarding(true), 1000);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_seen_${user.id}`, 'true');
      setHasSeenOnboarding(true);
    }
    setShowOnboarding(false);
    navigate('/tananyagok');
  };

  const showOnboardingManually = () => {
    setShowOnboarding(true);
  };

  if (!user) return null;

  const features = [
    {
      icon: Brain,
      title: "AI-támogatott tanulás",
      description: "Intelligens chatbot segít a kérdéseidben és magyarázza el a nehéz fogalmakat"
    },
    {
      icon: Target,
      title: "Szakmaspecifikus tartalom",
      description: "Pontosan a szakmádhoz igazított tananyagok és gyakorlati példák"
    },
    {
      icon: CheckCircle,
      title: "Haladás követése",
      description: "Nyomon követheted a fejlődésedet és láthatod, mit tanultál már meg"
    },
    {
      icon: Award,
      title: "Moduláris rendszer",
      description: "Kis lépésekben haladva minden modult alaposan elsajátíthatsz"
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Válaszd ki a szakmád",
      description: "Ha még nem tetted meg, válaszd ki a tanulni kívánt szakmát"
    },
    {
      number: "2", 
      title: "Böngészd a tantárgyakat",
      description: "A Tananyagok fülön találod a szakmádhoz tartozó tantárgyakat"
    },
    {
      number: "3",
      title: "Tanulj modulról modulra",
      description: "Minden tantárgy modulokra van osztva, így fokozatosan haldhatsz"
    },
    {
      number: "4",
      title: "Használd az AI segítséget",
      description: "Ha elakadsz, kérdezz az AI chatbottól vagy kérj magyarázatot"
    }
  ];

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
        <header className="bg-white shadow-sm border-b border-neutral-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileNavOpen(true)}
                className="lg:hidden flex-shrink-0"
              >
                <Menu size={20} />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl lg:text-2xl font-bold text-neutral-800 truncate">
                  Üdvözöljük, {user.firstName || 'Tanuló'}!
                </h1>
                <p className="text-sm lg:text-base text-neutral-600 truncate">
                  Fedezze fel a Global Learning System lehetőségeit
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {/* Hero Section */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-primary to-blue-700 rounded-xl p-8 text-white mb-8">
              <div className="max-w-4xl">
                <h2 className="text-3xl font-bold mb-4">
                  Modern szakmai képzés AI-támogatással
                </h2>
                <p className="text-xl mb-6 opacity-90">
                  A Global Learning System egy innovatív tanulási platform, amely 
                  szakmaspecifikus tartalmakat kínál intelligens mesterséges intelligencia 
                  támogatással. Tanuljon hatékonyan, moduláris rendszerben!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={() => navigate('/tananyagok')} 
                    size="lg" 
                    variant="secondary"
                    className="bg-white text-primary hover:bg-neutral-100"
                  >
                    <BookOpen className="mr-2" size={20} />
                    Kezdje a tanulást 
                    <ArrowRight className="ml-2" size={20} />
                  </Button>
                  <Button 
                    onClick={showOnboardingManually}
                    size="lg" 
                    variant="outline"
                    className="bg-white/10 text-white border-white hover:bg-white/20"
                  >
                    <HelpCircle className="mr-2" size={20} />
                    Interaktív útmutató
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Platform Presentation */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-neutral-800 mb-4">Platform Bemutató</h3>
              <PresentationSlideshow />
            </div>
          </div>

          {/* Features */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-neutral-800 mb-6">Miért válassza a Global Learning System-et?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center mb-3">
                      <feature.icon className="text-white" size={24} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-600 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-neutral-800 mb-6">Hogyan működik?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <Card key={index} className="relative">
                  <CardHeader>
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold mb-3">
                      {step.number}
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-600 text-sm">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <Card className="bg-gradient-to-r from-neutral-50 to-neutral-100 border-neutral-200">
            <CardContent className="p-8 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold text-neutral-800 mb-4">Készen áll a tanulásra?</h3>
              <p className="text-neutral-600 mb-6 max-w-2xl mx-auto">
                Kezdje el felfedezni a szakmájához tartozó tananyagokat. A moduláris rendszer lehetővé teszi, 
                hogy a saját tempójában haladjon, és az AI asszisztens mindig segít, ha kérdése van.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/tananyagok')} 
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  Tananyagok böngészése <BookOpen className="ml-2" size={20} />
                </Button>
                <Button 
                  onClick={() => navigate('/chat')} 
                  size="lg" 
                  variant="outline"
                >
                  AI segítség kérése
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
        userName={user.firstName || user.username || 'Tanuló'}
      />
    </div>
  );
}