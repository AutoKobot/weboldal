import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Brain, Trophy } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
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
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [evaluations, setEvaluations] = useState<(QuizEvaluation | null)[]>([]);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [openAnswer, setOpenAnswer] = useState('');
  const { toast } = useToast();

  const generateQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/modules/${moduleId}/quiz`);
      return await response.json();
    },
    onSuccess: (data) => {
      setQuestions(data.questions);
      setSelectedAnswers(new Array(data.questions.length).fill(null));
      setEvaluations(new Array(data.questions.length).fill(null));
      setIsQuizStarted(true);
      toast({
        title: "Teszt generálva",
        description: `${data.questions.length} kérdés készen áll!`,
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
    onSuccess: (evaluation: QuizEvaluation, variables) => {
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

  const completeModuleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/modules/${moduleId}/complete`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Gratulálunk!",
        description: "Sikeresen befejezted a modult! 🎉",
      });
      onModuleComplete?.();
    },
    onError: (error: Error) => {
      console.error('Error completing module:', error);
    },
  });

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmitAnswer = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const selectedIndex = selectedAnswers[currentQuestionIndex];
    
    if (selectedIndex === null) {
      toast({
        title: "Válasz hiányzik",
        description: "Kérlek válassz ki egy lehetőséget!",
        variant: "destructive",
      });
      return;
    }

    const userAnswer = currentQuestion.options[selectedIndex];
    const correctAnswer = currentQuestion.options[currentQuestion.correctAnswer];

    evaluateAnswerMutation.mutate({
      question: currentQuestion.question,
      correctAnswer,
      userAnswer,
      explanation: currentQuestion.explanation
    });
  };

  const handleSubmitOpenAnswer = () => {
    if (!openAnswer.trim()) {
      toast({
        title: "Válasz hiányzik",
        description: "Kérlek írj egy választ!",
        variant: "destructive",
      });
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const correctAnswer = currentQuestion.options[currentQuestion.correctAnswer];

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
      
      // Check if score meets 88% threshold for module completion
      const finalScore = calculateFinalScore();
      if (finalScore >= 88) {
        completeModuleMutation.mutate();
      }
    }
  };

  const calculateFinalScore = () => {
    const validEvaluations = evaluations.filter(e => e !== null) as QuizEvaluation[];
    if (validEvaluations.length === 0) return 0;
    
    const totalScore = validEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
    return Math.round(totalScore / validEvaluations.length);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isQuizStarted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Brain className="h-6 w-6" />
            Tudáspróba
          </CardTitle>
          <CardDescription>
            Teszteld a tudásod a "{moduleTitle}" modulból!
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-muted-foreground">
            Az AI automatikusan generál kérdéseket a modul tartalma alapján, majd értékeli a válaszaidat 1-100 pontos skálán.
          </p>
          <Button 
            onClick={() => generateQuizMutation.mutate()}
            disabled={generateQuizMutation.isPending}
            size="lg"
          >
            {generateQuizMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Kérdések generálása...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Teszt indítása
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isQuizCompleted) {
    const finalScore = calculateFinalScore();
    const correctAnswers = evaluations.filter(e => e?.isCorrect).length;
    const isModuleCompleted = finalScore >= 88;
    
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6" />
            Teszt befejezve!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-4">
            <div className={`text-4xl font-bold ${getScoreColor(finalScore)}`}>
              {finalScore}/100 pont
            </div>
            <p className="text-lg">
              {correctAnswers}/{questions.length} helyes válasz
            </p>
            
            {isModuleCompleted && (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Modul sikeresen befejezve!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Elérted a 88%-os küszöböt, ezért a modul befejezettnek számít.
                </p>
              </div>
            )}
            
            {!isModuleCompleted && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-yellow-700">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">Modul nem befejezett</span>
                </div>
                <p className="text-sm text-yellow-600 mt-1">
                  A modul befejezéséhez legalább 88 pont szükséges.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {evaluations.map((evaluation, index) => (
              evaluation && (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {evaluation.isCorrect ? 
                      <CheckCircle className="h-4 w-4 text-green-600" /> :
                      <XCircle className="h-4 w-4 text-red-600" />
                    }
                    <span className="text-sm">Kérdés {index + 1}</span>
                  </div>
                  <Badge variant={evaluation.isCorrect ? "default" : "destructive"}>
                    {evaluation.score} pont
                  </Badge>
                </div>
              )
            ))}
          </div>

          <Button 
            onClick={() => {
              setIsQuizStarted(false);
              setIsQuizCompleted(false);
              setCurrentQuestionIndex(0);
              setQuestions([]);
              setSelectedAnswers([]);
              setEvaluations([]);
            }}
          >
            Új teszt indítása
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentEvaluation = evaluations[currentQuestionIndex];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            Kérdés {currentQuestionIndex + 1}/{questions.length}
          </CardTitle>
          <Badge variant="outline">
            {moduleTitle}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-lg font-medium">
          {currentQuestion.question}
        </div>

        {!currentEvaluation ? (
          <div className="space-y-4">
            <RadioGroup
              value={selectedAnswers[currentQuestionIndex]?.toString() || ''}
              onValueChange={(value) => handleAnswerSelect(parseInt(value))}
            >
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="border-t pt-4">
              <Label htmlFor="open-answer" className="text-sm font-medium">
                Vagy írd le saját szavaiddal a válaszod:
              </Label>
              <Textarea
                id="open-answer"
                placeholder="Itt írhatsz részletes választ..."
                value={openAnswer}
                onChange={(e) => setOpenAnswer(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitAnswer}
                disabled={evaluateAnswerMutation.isPending || selectedAnswers[currentQuestionIndex] === null}
                className="flex-1"
              >
                {evaluateAnswerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Értékelés...
                  </>
                ) : (
                  'Válasz elküldése'
                )}
              </Button>
              
              {openAnswer.trim() && (
                <Button 
                  onClick={handleSubmitOpenAnswer}
                  disabled={evaluateAnswerMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  {evaluateAnswerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Értékelés...
                    </>
                  ) : (
                    'Szöveges válasz'
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${currentEvaluation.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {currentEvaluation.isCorrect ? 
                  <CheckCircle className="h-5 w-5 text-green-600" /> :
                  <XCircle className="h-5 w-5 text-red-600" />
                }
                <span className={`font-semibold ${getScoreColor(currentEvaluation.score)}`}>
                  {currentEvaluation.score}/100 pont
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentEvaluation.feedback}
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Helyes válasz:</strong> {currentQuestion.options[currentQuestion.correctAnswer]}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {currentQuestion.explanation}
              </p>
            </div>

            <Button 
              onClick={goToNextQuestion}
              className="w-full"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Következő kérdés' : 'Teszt befejezése'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}