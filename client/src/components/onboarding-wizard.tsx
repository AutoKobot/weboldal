import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  BookOpen, 
  MessageCircle, 
  Brain, 
  Volume2,
  User,
  CheckCircle,
  X,
  Lock,
  Unlock,
  Play,
  Image,
  Headphones,
  Trophy,
  Target,
  GraduationCap,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  icon: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userName?: string;
}

export default function OnboardingWizard({ 
  isOpen, 
  onClose, 
  onComplete, 
  userName = "Felhasználó" 
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: `Üdvözöllek, ${userName}!`,
      description: 'Készen állsz egy izgalmas tanulási kalandra?',
      icon: <Sparkles className="h-8 w-8 text-yellow-500" />,
      content: (
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
            <User className="h-12 w-12 text-white" />
          </div>
          <p className="text-lg text-neutral-600">
            Ez a Global Learning System, egy AI-alapú oktatási platform, amely személyre szabott tanulási élményt nyújt.
          </p>
          <p className="text-sm text-neutral-500">
            A következő percekben megmutatjuk, hogyan használhatod a platform összes funkcióját.
          </p>
        </div>
      )
    },
    {
      id: 'structure',
      title: 'Tananyag felépítése',
      description: 'Ismerd meg a hierarchikus tanulási rendszert',
      icon: <BookOpen className="h-8 w-8 text-blue-500" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded text-white flex items-center justify-center text-xs">1</div>
                  Szakmacsoport
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-neutral-600">Pl. Hegesztő, Lakatos</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded text-white flex items-center justify-center text-xs">2</div>
                  Tantárgy
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-neutral-600">Pl. Anyagismeret, Lecsó készítés</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-purple-200 bg-purple-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded text-white flex items-center justify-center text-xs">3</div>
                  Modul
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-neutral-600">Konkrét leckék és gyakorlatok</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-neutral-50 p-4 rounded-lg">
            <p className="text-sm text-neutral-600 text-center">
              <span className="font-medium">Szakmacsoport</span> → <span className="font-medium">Tantárgy</span> → <span className="font-medium">Modul</span>
            </p>
            <p className="text-xs text-neutral-500 text-center mt-2">
              Minden szakmához tartoznak tantárgyak, minden tantárgyhoz modulok
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'ai-teacher',
      title: 'AI Tanár funkcionalitás',
      description: 'Fedezd fel az intelligens asszisztenst',
      icon: <MessageCircle className="h-8 w-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-2">Mit tud az AI Tanár?</h4>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Válaszol kérdéseidre a tananyaggal kapcsolatban
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Részletes magyarázatokat ad
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Gyakorlati példákkal segít
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Személyre szabja a válaszokat
              </li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <span className="text-xs">Szöveges chat</span>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center gap-2">
              <Volume2 className="h-5 w-5 text-purple-500" />
              <span className="text-xs">Hangos magyarázat</span>
            </Button>
            <Button variant="outline" className="h-auto p-3 flex flex-col items-center gap-2">
              <Brain className="h-5 w-5 text-orange-500" />
              <span className="text-xs">Tudáspróba</span>
            </Button>
          </div>
        </div>
      )
    },
    {
      id: 'voice-features',
      title: 'Hangos funkciók',
      description: 'Modern hang streaming technológia',
      icon: <Volume2 className="h-8 w-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-3">Innovatív hangos élmény</h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="bg-purple-50">1</Badge>
                <div>
                  <p className="font-medium text-sm">Valós idejű hang streaming</p>
                  <p className="text-xs text-neutral-600">A szöveg és hang szinkronban érkezik</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="bg-purple-50">2</Badge>
                <div>
                  <p className="font-medium text-sm">Szinkronizált lejátszás</p>
                  <p className="text-xs text-neutral-600">Időbélyeg alapú koordináció</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="bg-purple-50">3</Badge>
                <div>
                  <p className="font-medium text-sm">Magyar nyelv optimalizálás</p>
                  <p className="text-xs text-neutral-600">Természetes kiejtés és hangsúly</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-neutral-50 p-3 rounded-lg border-l-4 border-purple-500">
            <p className="text-sm text-neutral-600">
              <span className="font-medium">Tipp:</span> A hangos magyarázat gombbal kérhetsz audio magyarázatot bármikor!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'profession-selection',
      title: 'Szakmaválasztás',
      description: 'Válaszd ki a tanulni kívánt szakmát',
      icon: <GraduationCap className="h-8 w-8 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-2">Szakmaválasztás lépései:</h4>
            <div className="space-y-3 text-sm text-neutral-600">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-500 rounded-full text-white flex items-center justify-center text-xs font-medium">1</div>
                <div>
                  <p className="font-medium">Böngéssz a szakmák között</p>
                  <p className="text-xs text-neutral-500">Hegesztő, Lakatos, Ács, stb.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-500 rounded-full text-white flex items-center justify-center text-xs font-medium">2</div>
                <div>
                  <p className="font-medium">Válassz szakmát</p>
                  <p className="text-xs text-neutral-500">Ez határozza meg az elérhető tantárgyakat</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-500 rounded-full text-white flex items-center justify-center text-xs font-medium">3</div>
                <div>
                  <p className="font-medium">Kezdd el a tanulást</p>
                  <p className="text-xs text-neutral-500">A modulok sorban nyílnak meg</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <Target className="h-4 w-4 inline mr-1" />
              <strong>Fontos:</strong> A szakmaválasztás után csak az ahhoz tartozó tantárgyak és modulok lesznek elérhetők.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'progressive-unlock',
      title: 'Progresszív feloldás',
      description: 'Hogyan nyílnak meg az új modulok',
      icon: <Lock className="h-8 w-8 text-orange-500" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-500" />
                  Zárolt modulok
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-neutral-600">Még nem elérhetők, előbb teljesítened kell az előző modulokat</p>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-green-200 bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-green-500" />
                  Feloldott modulok
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-neutral-600">Elérhetők tanulásra, még nem teljesítettek</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-gradient-to-r from-orange-100 to-green-100 p-4 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-2">Működés:</h4>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full text-white flex items-center justify-center text-xs">1</div>
                Az első modul mindig elérhető
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full text-white flex items-center justify-center text-xs">2</div>
                Teljesítsd a tudáspróbát legalább 45% (2-es) eredménnyel
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full text-white flex items-center justify-center text-xs">3</div>
                A következő modul automatikusan feloldódik
              </li>
            </ul>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              <Trophy className="h-4 w-4 inline mr-1" />
              <strong>Teljesítési küszöb:</strong> A sikeres átmenetel határa 45%, ezzel automatikusan megnyílik a következő modul.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'living-mind-map',
      title: 'Élő Elmetérkép és Prezentációk',
      description: 'Fedezd fel a forradalmi vizuális tanulást',
      icon: <Brain className="h-8 w-8 text-pink-500" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-pink-50 border-2 border-pink-200 p-3 rounded-lg text-center">
              <Image className="h-6 w-6 text-pink-500 mx-auto mb-1" />
              <p className="text-xs font-medium text-pink-700">Prezentációk</p>
              <p className="text-xs text-pink-600">AI Képek és Tesztek</p>
            </div>
            <div className="bg-cyan-50 border-2 border-cyan-200 p-3 rounded-lg text-center">
              <Sparkles className="h-6 w-6 text-cyan-500 mx-auto mb-1" />
              <p className="text-xs font-medium text-cyan-700">Elmetérkép</p>
              <p className="text-xs text-cyan-600">Animált fastruktúra</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-pink-100 to-cyan-100 p-4 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-2">Hogyan működik a Living Mind Map?</h4>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-pink-500" />
                Az AI logikai fastruktúrába szervezi a tananyagot
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-pink-500" />
                Lüktető, neonos animált vonalak kötik össze a fogalmakat
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-500" />
                "Cinematic" kameramozgás rázoomol az éppen felolvasott részre
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-500" />
                Minden csomóponthoz egyedi magyarázó narráció tartozik
              </li>
            </ul>
          </div>
          
          <div className="bg-pink-50 border border-pink-200 p-3 rounded-lg">
            <p className="text-sm text-pink-800">
              <Play className="h-4 w-4 inline mr-1" />
              <strong>Újdonság:</strong> Próbáld ki a reszponzív interaktív prezentációkat és az Élő Elmetérkép lejátszót minden tananyaghoz!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'admin-features',
      title: 'Adminisztrációs funkciók',
      description: 'Rendszerbeállítások és felhasználó kezelés',
      icon: <Settings className="h-8 w-8 text-gray-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-gray-100 to-blue-100 p-4 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-2">Admin funkciók:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-sm mb-2">Felhasználó kezelés</h5>
                <ul className="space-y-1 text-xs text-neutral-600">
                  <li>• Felhasználók listázása</li>
                  <li>• Szerepkörök módosítása</li>
                  <li>• Felhasználók törlése</li>
                  <li>• Szakma hozzárendelés</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium text-sm mb-2">Tartalom kezelés</h5>
                <ul className="space-y-1 text-xs text-neutral-600">
                  <li>• Modulok szerkesztése</li>
                  <li>• Tantárgyak kezelése</li>
                  <li>• Szakmák adminisztrációja</li>
                  <li>• AI beállítások</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              <Settings className="h-4 w-4 inline mr-1" />
              <strong>Admin hozzáférés:</strong> Csak admin jogosultsággal rendelkező felhasználók férhetnek hozzá ezekhez a funkciókhoz.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'quiz-system',
      title: 'Intelligens tudáspróba',
      description: 'AI-generált kérdések és értékelés',
      icon: <Brain className="h-8 w-8 text-orange-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-100 to-yellow-100 p-4 rounded-lg">
            <h4 className="font-medium text-neutral-800 mb-3">Automatikus tudásfelmérés</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-sm mb-2">Hogyan működik?</h5>
                <ul className="space-y-1 text-xs text-neutral-600">
                  <li>• AI generálja a kérdéseket</li>
                  <li>• Modul tartalomhoz igazított</li>
                  <li>• Azonnali visszajelzés</li>
                  <li>• Részletes magyarázatok</li>
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium text-sm mb-2">Automatikus értékelés</h5>
                <ul className="space-y-1 text-xs text-neutral-600">
                  <li>• 45% (Elégséges) küszöbérték</li>
                  <li>• Automatikus modul feloldás</li>
                  <li>• 30 kérdéses dinamikus pool</li>
                  <li>• Fisher-Yates pártatlan keverés</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <Brain className="h-4 w-4 inline mr-1" />
              <strong>Újdonság:</strong> A tudáspróba most nagyobb felugró ablakban jelenik meg a jobb felhasználói élmény érdekében.
            </p>
          </div>
          
          <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
            <p className="text-sm text-neutral-600">
              <span className="font-medium">45% teljesítés (Elégséges)</span> esetén a modul sikeresnek minősül és feloldja a következőt!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'getting-started',
      title: 'Kezdjük el!',
      description: 'Most már készen állsz a tanulásra',
      icon: <CheckCircle className="h-8 w-8 text-green-500" />,
      content: (
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-lg">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-neutral-800 mb-2">
              Szuper! Most már minden tudod! 🎉
            </h4>
            <p className="text-sm text-neutral-600 mb-4">
              Készen állsz, hogy elkezdd a tanulást a Global Learning System-mel.
            </p>
          </div>
          
          <div className="bg-neutral-50 p-4 rounded-lg">
            <h5 className="font-medium text-sm mb-2">Következő lépések:</h5>
            <ol className="text-xs text-neutral-600 space-y-1 text-left">
              <li>1. Válassz egy szakmacsoportot</li>
              <li>2. Böngészd a tantárgyakat</li>
              <li>3. Kezdj egy modullal</li>
              <li>4. Használd az AI Tanárt segítséghez</li>
              <li>5. Teszteld tudásod a tudáspróbával</li>
            </ol>
          </div>
        </div>
      ),
      action: {
        text: 'Kezdjük a tanulást!',
        onClick: () => onComplete()
      }
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => [...prev, steps[currentStep].id]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTutorial = () => {
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {steps[currentStep].icon}
              <div>
                <h2 className="text-xl font-bold">{steps[currentStep].title}</h2>
                <p className="text-blue-100 text-sm">{steps[currentStep].description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Lépés {currentStep + 1} / {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="bg-white/20" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 p-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={skipTutorial}
            className="text-neutral-600"
          >
            Átugrás
          </Button>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Vissza
              </Button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={nextStep}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
              >
                Tovább
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              steps[currentStep].action && (
                <Button
                  onClick={steps[currentStep].action!.onClick}
                  className="bg-gradient-to-r from-green-600 to-blue-600"
                >
                  {steps[currentStep].action!.text}
                </Button>
              )
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}