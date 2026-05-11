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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const cardHover = {
  hover: { scale: 1.03, y: -5, transition: { type: "spring", stiffness: 400, damping: 10 } }
};

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
      description: 'Készen állsz egy lenyűgöző tanulási kalandra?',
      icon: <Sparkles className="h-8 w-8 text-yellow-300 drop-shadow-md" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="text-center space-y-6 py-6">
          <motion.div variants={itemVariants} className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full w-full h-full mx-auto flex items-center justify-center shadow-2xl border-4 border-white/50 backdrop-blur-sm">
              <User className="h-16 w-16 text-white drop-shadow-lg" />
            </div>
          </motion.div>
          <motion.div variants={itemVariants} className="space-y-2">
            <h3 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Global Learning System
            </h3>
            <p className="text-lg text-neutral-600 font-medium">
              Egy új generációs, AI-vezérelt oktatási platform.
            </p>
          </motion.div>
          <motion.p variants={itemVariants} className="text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
            Hagyd, hogy végigvezessünk a rendszer prémium funkcióin, melyek teljesen új szintre emelik a tanulás élményét!
          </motion.p>
        </motion.div>
      )
    },
    {
      id: 'structure',
      title: 'Tananyag felépítése',
      description: 'Ismerd meg a hierarchikus tanulási rendszert',
      icon: <BookOpen className="h-8 w-8 text-blue-200" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <motion.div variants={itemVariants} whileHover="hover" custom={1}>
              <Card className="h-full border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-lg shadow-blue-500/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-3 text-blue-900">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg shadow-md text-white flex items-center justify-center text-sm font-bold">1</div>
                    Szakma
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-blue-700/80 font-medium">Pl. Hegesztő, Lakatos</p>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants} whileHover="hover" custom={2}>
              <Card className="h-full border-0 bg-gradient-to-br from-teal-50 to-teal-100/50 shadow-lg shadow-teal-500/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-3 text-teal-900">
                    <div className="w-8 h-8 bg-teal-500 rounded-lg shadow-md text-white flex items-center justify-center text-sm font-bold">2</div>
                    Tantárgy
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-teal-700/80 font-medium">Pl. Anyagismeret, Hegesztés</p>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={itemVariants} whileHover="hover" custom={3}>
              <Card className="h-full border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 shadow-lg shadow-purple-500/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4"></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-3 text-purple-900">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg shadow-md text-white flex items-center justify-center text-sm font-bold">3</div>
                    Modul
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-purple-700/80 font-medium">Konkrét leckék és gyakorlatok</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md p-5 rounded-xl border border-neutral-200/50 shadow-sm">
            <p className="text-sm text-neutral-700 text-center flex items-center justify-center gap-3">
              <span className="font-bold text-blue-600 px-3 py-1 bg-blue-50 rounded-full">Szakmacsoport</span> 
              <ChevronRight className="w-4 h-4 text-neutral-400" />
              <span className="font-bold text-teal-600 px-3 py-1 bg-teal-50 rounded-full">Tantárgy</span> 
              <ChevronRight className="w-4 h-4 text-neutral-400" />
              <span className="font-bold text-purple-600 px-3 py-1 bg-purple-50 rounded-full">Modul</span>
            </p>
            <p className="text-xs text-neutral-500 text-center mt-3 font-medium">
              Minden szakmához tartoznak tantárgyak, minden tantárgyhoz modulok.
            </p>
          </motion.div>
        </motion.div>
      )
    },
    {
      id: 'ai-teacher',
      title: 'AI Tanár funkcionalitás',
      description: 'Fedezd fel az intelligens személyes asszisztenst',
      icon: <MessageCircle className="h-8 w-8 text-green-200" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={itemVariants} className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-2xl border border-green-200/50 shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
              <Brain className="w-48 h-48 -mt-10 -mr-10 text-green-900" />
            </div>
            <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-green-600" /> Mit tud az AI Tanár?
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
              {[
                "Azonnal válaszol kérdéseidre",
                "Részletes magyarázatokat ad",
                "Gyakorlati példákkal segít",
                "Személyre szabja a válaszokat"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-md">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-900">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: MessageCircle, color: "blue", label: "Szöveges chat" },
              { icon: Volume2, color: "purple", label: "Hangos magyarázat" },
              { icon: Brain, color: "orange", label: "Tudáspróba" }
            ].map((btn, i) => (
              <motion.div key={i} variants={itemVariants} whileHover="hover">
                <Button variant="outline" className="h-full w-full py-4 flex flex-col items-center gap-3 bg-white hover:bg-neutral-50 shadow-sm border-neutral-200/60 rounded-xl transition-all">
                  <div className={`p-3 rounded-full bg-${btn.color}-50 text-${btn.color}-600`}>
                    <btn.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-700">{btn.label}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )
    },
    {
      id: 'living-mind-map',
      title: 'Élő Elmetérkép és Prezentációk',
      description: 'Fedezd fel a forradalmi vizuális tanulást',
      icon: <Brain className="h-8 w-8 text-pink-300" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <motion.div variants={itemVariants} whileHover="hover">
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200/50 p-5 rounded-2xl text-center shadow-lg shadow-pink-500/10 h-full">
                <div className="w-12 h-12 mx-auto bg-pink-500 rounded-2xl rotate-3 shadow-md flex items-center justify-center mb-3">
                  <Image className="h-6 w-6 text-white -rotate-3" />
                </div>
                <p className="text-sm font-bold text-pink-900">Prezentációk</p>
                <p className="text-xs text-pink-700 mt-1 font-medium">Profi AI képek és interaktív tesztek</p>
              </div>
            </motion.div>
            <motion.div variants={itemVariants} whileHover="hover">
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200/50 p-5 rounded-2xl text-center shadow-lg shadow-cyan-500/10 h-full">
                <div className="w-12 h-12 mx-auto bg-cyan-500 rounded-2xl -rotate-3 shadow-md flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-white rotate-3" />
                </div>
                <p className="text-sm font-bold text-cyan-900">Élő Elmetérkép</p>
                <p className="text-xs text-cyan-700 mt-1 font-medium">Lüktető animált fastruktúra</p>
              </div>
            </motion.div>
          </div>
          
          <motion.div variants={itemVariants} className="bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 blur-3xl rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/20 blur-3xl rounded-full"></div>
            <h4 className="font-bold text-white mb-4 relative z-10">Működés közben:</h4>
            <ul className="space-y-3 text-sm text-neutral-300 relative z-10">
              {[
                "Az AI logikai fastruktúrába szervezi a tananyagot",
                "Neonos animált vonalak kötik össze a fogalmakat",
                "\"Cinematic\" kameramozgás rázoomol a felolvasott részre",
                "Minden csomóponthoz magyarázó narráció tartozik"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-pink-500 shadow-[0_0_10px_#ec4899]' : 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]'}`}></div>
                  <span className="font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )
    },
    {
      id: 'profession-selection',
      title: 'Szakmaválasztás',
      description: 'Irányítsd te a jövődet',
      icon: <GraduationCap className="h-8 w-8 text-indigo-300" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-50 to-violet-100 p-6 rounded-2xl shadow-lg shadow-indigo-500/10 border border-indigo-200/50">
            <h4 className="font-bold text-indigo-900 mb-4 text-lg">A tanulás lépései:</h4>
            <div className="space-y-4 text-sm relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-indigo-200/50"></div>
              
              {[
                { title: "Böngéssz a szakmák között", desc: "Találd meg a neked valót (pl. Hegesztő, Lakatos)", color: "indigo" },
                { title: "Válassz szakmát", desc: "Ez határozza meg az elérhető tantárgyakat", color: "purple" },
                { title: "Kezdd el a tanulást", desc: "A modulok izgalmas sorrendben nyílnak meg", color: "pink" }
              ].map((step, i) => (
                <motion.div key={i} whileHover={{ x: 5 }} className="flex items-start gap-4 relative z-10">
                  <div className={`w-8 h-8 rounded-xl bg-${step.color}-500 shadow-lg shadow-${step.color}-500/30 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5`}>
                    {i + 1}
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl flex-1 border border-white">
                    <p className={`font-bold text-${step.color}-900`}>{step.title}</p>
                    <p className={`text-xs text-${step.color}-700/80 font-medium mt-1`}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-800">Fókuszált haladás</p>
              <p className="text-xs text-neutral-500 font-medium mt-1">A szakmaválasztás után csak az ahhoz tartozó, releváns tantárgyak és modulok lesznek láthatók.</p>
            </div>
          </motion.div>
        </motion.div>
      )
    },
    {
      id: 'progressive-unlock',
      title: 'Progresszív feloldás',
      description: 'Játékos és logikus előrehaladás',
      icon: <Lock className="h-8 w-8 text-orange-200" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <motion.div variants={itemVariants} whileHover="hover">
              <div className="h-full bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200/50 p-5 rounded-2xl shadow-lg shadow-orange-500/5 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-xl shadow-inner">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-orange-900">Zárolt modulok</h4>
                </div>
                <p className="text-sm text-orange-800/80 font-medium relative z-10">Még rejtve vannak, amíg az előző kihívásokat nem teljesíted.</p>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} whileHover="hover">
              <div className="h-full bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/50 p-5 rounded-2xl shadow-lg shadow-green-500/5 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <div className="p-2 bg-green-100 text-green-600 rounded-xl shadow-inner">
                    <Unlock className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-green-900">Feloldott modulok</h4>
                </div>
                <p className="text-sm text-green-800/80 font-medium relative z-10">Szabadon tanulhatók, a tudás csak rád vár.</p>
              </div>
            </motion.div>
          </div>
          
          <motion.div variants={itemVariants} className="bg-neutral-900 p-6 rounded-2xl shadow-xl text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center shrink-0">
                <Trophy className="h-8 w-8 text-white drop-shadow-md" />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1 text-yellow-400">45% – A bűvös határ</h4>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Teljesítsd a tudáspróbát <strong className="text-white">legalább 45%-os (elégséges)</strong> eredménnyel, és azonnal, automatikusan feloldódik a következő kaland!
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )
    },
    {
      id: 'quiz-system',
      title: 'Intelligens Tudáspróba',
      description: 'Nem csak teszt, igazi tanulás',
      icon: <Brain className="h-8 w-8 text-orange-200" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={itemVariants} className="bg-gradient-to-br from-amber-50 to-orange-100 p-6 rounded-2xl border border-orange-200/50 shadow-lg shadow-orange-500/10">
            <h4 className="font-bold text-orange-900 mb-5 text-lg">Hogyan működik?</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: Brain, title: "30-as Medence", desc: "Egy 30 kérdéses dinamikus poolból válogat." },
                { icon: Sparkles, title: "Fisher-Yates", desc: "Matematikailag tökéletes, pártatlan keverés minden alkalommal." },
                { icon: Target, title: "Azonnali Értékelés", desc: "Minden válaszhoz részletes AI magyarázat jár." },
                { icon: Trophy, title: "45% Küszöb", desc: "Elégséges (2-es) eredménnyel már feloldod a folytatást." }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/70 backdrop-blur-sm p-3 rounded-xl border border-white">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-orange-900 text-sm">{item.title}</h5>
                    <p className="text-xs text-orange-800/70 font-medium mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )
    },
    {
      id: 'getting-started',
      title: 'Induljon a kaland!',
      description: 'A tudás csak egy karnyújtásnyira van.',
      icon: <CheckCircle className="h-8 w-8 text-green-200" />,
      content: (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="text-center space-y-6 py-4">
          <motion.div variants={itemVariants} className="relative mx-auto w-40 h-40">
            <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-full blur-2xl opacity-40 animate-pulse"></div>
            <div className="relative bg-gradient-to-tr from-green-500 to-emerald-600 rounded-full w-full h-full mx-auto flex items-center justify-center shadow-2xl border-4 border-white/50 backdrop-blur-sm">
              <CheckCircle className="h-20 w-20 text-white drop-shadow-lg" />
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="space-y-2">
            <h4 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">
              Szuper! Most már mindent tudsz! 🎉
            </h4>
            <p className="text-lg text-neutral-600 font-medium">
              Vágj bele életed legjobb tanulási élményébe.
            </p>
          </motion.div>
        </motion.div>
      ),
      action: {
        text: 'Kezdjük a tanulást! 🚀',
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
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.15)] w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Modern Glassmorphic Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-7 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
                {steps[currentStep].icon}
              </div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight drop-shadow-md">{steps[currentStep].title}</h2>
                <p className="text-blue-100/90 font-medium">{steps[currentStep].description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full w-10 h-10 transition-all hover:rotate-90"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider uppercase text-blue-100">
              <span>Lépés {currentStep + 1} / {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-black/20 overflow-hidden [&>div]:bg-white" />
          </div>
        </div>

        {/* Dynamic Animated Content */}
        <div className="p-8 overflow-y-auto flex-1 min-h-[350px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 30, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -30, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full flex flex-col justify-center"
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Polished Footer */}
        <div className="bg-neutral-50/80 backdrop-blur-md p-6 flex items-center justify-between border-t border-neutral-200/50 shrink-0">
          <Button
            variant="ghost"
            onClick={skipTutorial}
            className="text-neutral-500 font-semibold hover:text-neutral-800 hover:bg-neutral-200/50 rounded-xl"
          >
            Átugrás
          </Button>
          
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="rounded-xl border-neutral-300 font-semibold hover:bg-neutral-100 transition-all"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Vissza
              </Button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={nextStep}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
              >
                Tovább
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              steps[currentStep].action && (
                <Button
                  onClick={steps[currentStep].action!.onClick}
                  className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-green-500/30 transition-all hover:scale-105 px-6"
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