import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuizProps {
  data: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
}

export function SlideQuiz({ data }: QuizProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSelect = (option: string) => {
    if (showFeedback) return;
    setSelectedOption(option);
    setShowFeedback(true);
  };

  const isCorrect = selectedOption === data.correctAnswer;

  return (
    <Card className="bg-slate-900/40 border-slate-800 shadow-xl backdrop-blur-md overflow-hidden border-l-4 border-l-blue-500">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-600/20 p-2 rounded-lg mt-1">
            <HelpCircle className="w-5 h-5 text-blue-400" />
          </div>
          <h4 className="text-xl font-bold text-white leading-tight">{data.question}</h4>
        </div>

        <div className="grid gap-3">
          {data.options.map((option, i) => {
            const isThisSelected = selectedOption === option;
            const isThisCorrect = option === data.correctAnswer;
            
            let variant: "outline" | "default" = "outline";
            let borderColor = "border-slate-700";
            let bgColor = "bg-slate-800/40";
            let textColor = "text-slate-200";

            if (showFeedback) {
              if (isThisCorrect) {
                borderColor = "border-green-500/50";
                bgColor = "bg-green-500/10";
                textColor = "text-green-400";
              } else if (isThisSelected && !isCorrect) {
                borderColor = "border-red-500/50";
                bgColor = "bg-red-500/10";
                textColor = "text-red-400";
              }
            } else if (isThisSelected) {
              borderColor = "border-blue-500";
              bgColor = "bg-blue-500/10";
            }

            return (
              <motion.div key={i} whileHover={{ x: showFeedback ? 0 : 5 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant={variant}
                  onClick={() => handleSelect(option)}
                  disabled={showFeedback}
                  className={`w-full justify-start h-auto py-4 px-5 text-left border-2 transition-all duration-300 ${borderColor} ${bgColor} ${textColor} relative group`}
                >
                  <div className="flex items-center w-full">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 text-sm font-bold border transition-colors ${isThisSelected ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 font-medium">{option}</span>
                    
                    {showFeedback && isThisCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-green-500 ml-2 animate-in zoom-in duration-300" />
                    )}
                    {showFeedback && isThisSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-500 ml-2 animate-in zoom-in duration-300" />
                    )}
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`p-4 rounded-xl text-sm leading-relaxed ${isCorrect ? 'bg-green-500/10 text-green-300 border border-green-500/20' : 'bg-blue-900/20 text-blue-100 border border-blue-800/30'}`}
            >
              <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-[10px]">
                {isCorrect ? "Kiváló!" : "Tanuljunk belőle:"}
              </div>
              {data.explanation}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
