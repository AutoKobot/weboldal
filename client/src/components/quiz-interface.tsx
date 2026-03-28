import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Brain, Trophy, ChevronRight, HelpCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface QuizQuestion {
  question: string;
  type?: 'single' | 'multiple' | 'ordering' | 'icon' | 'find_incorrect';
  options: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  correctOrder?: number[];
  explanation: string;
}

interface QuizEvaluation {
  score: number;
  feedback: string;
  isCorrect: boolean;
}

interface QuizInterfaceProps {
  moduleId: number;
  moduleTitle: string;
  onModuleComplete?: () => void;
}

export default function QuizInterface({ moduleId, moduleTitle, onModuleComplete }: QuizInterfaceProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<(QuizEvaluation | null)[]>([]);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [openAnswer, setOpenAnswer] = useState('');
  const { toast } = useToast();

  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/modules/${moduleId}/quiz`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Ismeretlen hiba történt' }));
        throw new Error(errorData.message || 'Nem sikerült a kvíz betöltése');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setQuestions(data.questions);
      // Initialize selectedAnswers based on question types
      const initialAnswers = data.questions.map((q: QuizQuestion) => {
        if (q.type === 'multiple') return [];
        if (q.type === 'ordering') return [];
        return null;
      });
      setSelectedAnswers(initialAnswers);
      setEvaluations(new Array(data.questions.length).fill(null));
      setIsQuizStarted(true);
      toast({
        title: "Teszt betöltve",
        description: `${data.questions.length} kérdés készen áll!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Kvíz nem elérhető",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const evaluateAnswerMutation = useMutation({
    mutationFn: async ({ question, correctAnswer, userAnswer, explanation }: {
      question: string;
      correctAnswer: string;
      userAnswer: string;
      explanation: string;
    }) => {
      const response = await apiRequest('POST', '/api/quiz/evaluate', {
        question,
        correctAnswer,
        userAnswer,
        explanation
      });
      return await response.json();
    },
    onSuccess: (evaluation: QuizEvaluation) => {
      const newEvaluations = [...evaluations];
      newEvaluations[currentQuestionIndex] = evaluation;
      setEvaluations(newEvaluations);

      toast({
        title: `Pontszám: ${evaluation.score}/100`,
        description: evaluation.isCorrect ? "Helyes válasz!" : "Javítható válasz",
        variant: evaluation.isCorrect ? "default" : "destructive",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Értékelési hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitQuizResultMutation = useMutation({
    mutationFn: async (result: { score: number; maxScore: number; passed: boolean; details: any }) => {
      const response = await apiRequest('POST', `/api/modules/${moduleId}/quiz-result`, result);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.passed) {
        toast({
          title: "Gratulálunk!",
          description: "Sikeresen teljesítetted a modult! 🎉",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Error submitting quiz result:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült menteni az eredményt.",
        variant: "destructive",
      });
    },
  });

  const handleAnswerSelect = (answerIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = [...selectedAnswers];

    if (currentQuestion.type === 'multiple') {
      const currentSelection = (newAnswers[currentQuestionIndex] as number[]) || [];
      if (currentSelection.includes(answerIndex)) {
        newAnswers[currentQuestionIndex] = currentSelection.filter(i => i !== answerIndex);
      } else {
        newAnswers[currentQuestionIndex] = [...currentSelection, answerIndex].sort();
      }
    } else if (currentQuestion.type === 'ordering') {
      const currentOrder = (newAnswers[currentQuestionIndex] as number[]) || [];
      if (currentOrder.includes(answerIndex)) {
        newAnswers[currentQuestionIndex] = currentOrder.filter(i => i !== answerIndex);
      } else {
        newAnswers[currentQuestionIndex] = [...currentOrder, answerIndex];
      }
    } else {
      newAnswers[currentQuestionIndex] = answerIndex;
    }

    setSelectedAnswers(newAnswers);
  };

  const handleSubmitAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const selection = selectedAnswers[currentQuestionIndex];

    if (selection === null || (Array.isArray(selection) && selection.length === 0)) {
      toast({
        title: "Válasz hiányzik",
        description: "Kérlek válassz ki legalább egy lehetőséget!",
        variant: "destructive",
      });
      return;
    }

    // Evaluation logic for structured types
    if (currentQuestion.type === 'multiple') {
      const correctOnes = currentQuestion.correctAnswers || [];
      const userOnes = selection as number[];
      const isCorrect = correctOnes.length === userOnes.length && 
                       correctOnes.every(val => userOnes.includes(val));
      
      const evaluation: QuizEvaluation = {
        score: isCorrect ? 100 : 0,
        isCorrect,
        feedback: isCorrect ? "Helyes! Minden jó választ megtaláltál." : "Sajnos nem minden válasz helyes. A jó megoldások: " + correctOnes.map(i => currentQuestion.options[i]).join(", ")
      };
      
      const newEvaluations = [...evaluations];
      newEvaluations[currentQuestionIndex] = evaluation;
      setEvaluations(newEvaluations);
      return;
    }

    if (currentQuestion.type === 'ordering') {
      const correctOrder = currentQuestion.correctOrder || [];
      const userOrder = selection as number[];
      const isCorrect = JSON.stringify(correctOrder) === JSON.stringify(userOrder);

      const evaluation: QuizEvaluation = {
        score: isCorrect ? 100 : 0,
        isCorrect,
        feedback: isCorrect ? "Helyes sorrend!" : "Sajnos a sorrend helytelen. A folyamat: " + correctOrder.map(i => currentQuestion.options[i]).join(" → ")
      };

      const newEvaluations = [...evaluations];
      newEvaluations[currentQuestionIndex] = evaluation;
      setEvaluations(newEvaluations);
      return;
    }

    // Single choice types
    const userIndex = selection as number;
    const correctIndex = currentQuestion.correctAnswer ?? 0;
    
    if (userIndex === correctIndex) {
      const evaluation: QuizEvaluation = { score: 100, isCorrect: true, feedback: "Helyes válasz!" };
      const newEvaluations = [...evaluations];
      newEvaluations[currentQuestionIndex] = evaluation;
      setEvaluations(newEvaluations);
      return;
    }

    const userAnswer = currentQuestion.options[userIndex];
    const correctAnswer = currentQuestion.options[correctIndex];

    evaluateAnswerMutation.mutate({
      question: currentQuestion.question,
      correctAnswer,
      userAnswer,
      explanation: currentQuestion.explanation
    });
  };

  const handleSubmitOpenAnswer = () => {
    if (!openAnswer.trim()) {
      toast({ title: "Válasz hiányzik", description: "Írj egy választ!", variant: "destructive" });
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const correctIndex = currentQuestion.correctAnswer ?? 0;
    const correctAnswer = currentQuestion.options[correctIndex];

    evaluateAnswerMutation.mutate({
      question: currentQuestion.question,
      correctAnswer,
      userAnswer: openAnswer,
      explanation: currentQuestion.explanation
    });
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setOpenAnswer('');
    } else {
      setIsQuizCompleted(true);
      const finalScore = calculateFinalScore();
      submitQuizResultMutation.mutate({
        score: finalScore,
        maxScore: 100,
        passed: finalScore >= 60,
        details: { questions, evaluations }
      });
    }
  };

  const calculateFinalScore = () => {
    const validEvaluations = evaluations.filter(e => e !== null) as QuizEvaluation[];
    if (validEvaluations.length === 0) return 0;
    const totalScore = validEvaluations.reduce((sum, e) => sum + e.score, 0);
    return Math.round(totalScore / validEvaluations.length);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-700';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isQuizStarted) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg border-primary/20">
        <CardHeader className="text-center font-bold text-2xl">
          <CardTitle className="flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Tudáspróba
          </CardTitle>
          <CardDescription>Teszteld a tudásod a "{moduleTitle}" modulból!</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">Változatos kérdéstípusok (sorrend, választás, ikonok) várnak rád.</p>
          <Button onClick={() => generateQuizMutation.mutate()} disabled={generateQuizMutation.isPending} size="lg">
            {generateQuizMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Feldolgozás...</>) : "Indítás"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isQuizCompleted) {
    const finalScore = calculateFinalScore();
    const isPassed = finalScore >= 60;
    return (
      <Card className="w-full max-w-2xl mx-auto border-2 shadow-2xl">
        <CardHeader className="text-center">
          <Trophy className={`h-16 w-16 mx-auto mb-4 ${isPassed ? 'text-yellow-500' : 'text-slate-300'}`} />
          <CardTitle className="text-3xl font-black">{isPassed ? 'Gratulálunk!' : 'Sajnos nem sikerült'}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className={`text-5xl font-black ${getScoreColor(finalScore)}`}>{finalScore}%</div>
          <div className="space-y-2">
            {evaluations.map((e, i) => e && (
              <div key={i} className="flex justify-between p-2 bg-muted/30 rounded border text-sm">
                <span>{i + 1}. kérdés</span>
                {e.isCorrect ? <CheckCircle className="text-green-600 h-4 w-4" /> : <XCircle className="text-red-600 h-4 w-4" />}
                <Badge variant={e.isCorrect ? "default" : "destructive"}>{e.score}p</Badge>
              </div>
            ))}
          </div>
          <Button onClick={() => onModuleComplete?.()} className="w-full py-6 text-xl">Befejezés</Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentEvaluation = evaluations[currentQuestionIndex];

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-t-4 border-t-primary overflow-hidden">
      <CardHeader className="bg-muted/30">
        <div className="flex justify-between items-center mb-2">
          <Badge variant="secondary">{currentQuestionIndex + 1} / {questions.length}</Badge>
          <Badge variant="outline" className="opacity-50 italic">AI Generált</Badge>
        </div>
        <CardTitle className="text-2xl font-bold leading-tight">{currentQuestion.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {!currentEvaluation ? (
          <div className="space-y-6">
            {currentQuestion.type === 'multiple' ? (
              <div className="grid gap-3">
                {currentQuestion.options.map((opt, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleAnswerSelect(i)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedAnswers[currentQuestionIndex]?.includes(i) ? 'border-primary bg-primary/5' : 'border-muted bg-muted/10 hover:border-primary/50'}`}
                  >
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${selectedAnswers[currentQuestionIndex]?.includes(i) ? 'bg-primary border-primary text-white' : 'border-muted-foreground'}`}>
                      {selectedAnswers[currentQuestionIndex]?.includes(i) && <CheckCircle className="h-4 w-4" />}
                    </div>
                    <span className="font-medium">{opt}</span>
                  </div>
                ))}
              </div>
            ) : currentQuestion.type === 'ordering' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 p-4 bg-primary/5 rounded-xl border-2 border-dashed border-primary/20 min-h-[60px]">
                  {selectedAnswers[currentQuestionIndex].map((idx: number, step: number) => (
                    <Badge key={step} className="px-3 py-1.5 flex items-center gap-1">
                      <span className="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{step + 1}</span>
                      {currentQuestion.options[idx]}
                      <XCircle className="h-3 w-3 cursor-pointer ml-1" onClick={(e) => { e.stopPropagation(); handleAnswerSelect(idx); }} />
                    </Badge>
                  ))}
                </div>
                <div className="grid gap-2">
                  {currentQuestion.options.map((opt, i) => !selectedAnswers[currentQuestionIndex].includes(i) && (
                    <Button key={i} variant="outline" className="justify-start text-left" onClick={() => handleAnswerSelect(i)}>{opt}</Button>
                  ))}
                </div>
              </div>
            ) : currentQuestion.type === 'icon' ? (
              <div className="grid grid-cols-2 gap-4 text-center">
                {currentQuestion.options.map((name, i) => {
                  const Icon = (LucideIcons as any)[name.charAt(0).toUpperCase() + name.slice(1).replace(/-./g, x=>x[1].toUpperCase())] || HelpCircle;
                  return (
                    <div 
                      key={i} 
                      onClick={() => handleAnswerSelect(i)}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all group ${selectedAnswers[currentQuestionIndex] === i ? 'border-primary bg-primary/5 scale-105' : 'border-muted hover:border-primary/30'}`}
                    >
                      <Icon className={`h-12 w-12 mx-auto mb-2 ${selectedAnswers[currentQuestionIndex] === i ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'}`} />
                      <div className="text-xs font-bold uppercase tracking-widest">{name}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <RadioGroup value={selectedAnswers[currentQuestionIndex]?.toString()} onValueChange={v => handleAnswerSelect(parseInt(v))}>
                <div className="grid gap-3">
                  {currentQuestion.options.map((opt, i) => (
                    <div key={i} onClick={() => handleAnswerSelect(i)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${selectedAnswers[currentQuestionIndex] === i ? 'border-primary bg-primary/5' : 'border-muted bg-muted/10 hover:border-primary/50'}`}>
                      <RadioGroupItem value={i.toString()} className="sr-only" />
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedAnswers[currentQuestionIndex] === i ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {selectedAnswers[currentQuestionIndex] === i && <div className="w-2 h-2 rounded-full bg-white text-md" />}
                      </div>
                      <span className="font-medium text-lg">{opt}</span>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            <div className="space-y-4 pt-4 border-t">
              <Button onClick={handleSubmitAnswer} className="w-full h-14 text-xl font-bold" disabled={evaluateAnswerMutation.isPending}>
                {evaluateAnswerMutation.isPending ? <Loader2 className="animate-spin" /> : "Válasz beküldése"}
              </Button>
              <Textarea 
                placeholder="VAGY írd le saját szavaiddal a részleteket..." 
                value={openAnswer} 
                onChange={e => setOpenAnswer(e.target.value)}
                className="min-h-[80px]"
              />
              <Button variant="ghost" size="sm" onClick={handleSubmitOpenAnswer} className="w-full opacity-50" disabled={!openAnswer.trim()}>Szöveges kiértékelés</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className={`p-6 rounded-2xl border-l-8 ${currentEvaluation.isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <div className="flex items-center gap-4 mb-2">
                {currentEvaluation.isCorrect ? <CheckCircle className="text-green-600 h-8 w-8" /> : <XCircle className="text-red-600 h-8 w-8" />}
                <span className="text-2xl font-black">{currentEvaluation.score} / 100</span>
              </div>
              <p className="font-medium leading-relaxed">{currentEvaluation.feedback}</p>
            </div>
            <div className="p-5 bg-muted rounded-xl">
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><Brain className="h-3 w-3" /> Magyarázat</div>
              <p className="text-sm italic opacity-80">{currentQuestion.explanation}</p>
            </div>
            <Button onClick={goToNextQuestion} className="w-full py-8 text-xl font-black group">
              {currentQuestionIndex < questions.length - 1 ? (<>Következő kérdés<ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" /></>) : "Eredmény megtekintése"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}