import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCcw, Volume2 } from "lucide-react";
import { type Flashcard } from "@shared/schema";

interface FlashcardQuizProps {
    flashcards: Flashcard[];
}

export function FlashcardQuiz({ flashcards }: FlashcardQuizProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [direction, setDirection] = useState(0);

    if (!flashcards || flashcards.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                Nincsenek tanulókártyák ehhez a modulhoz.
            </div>
        );
    }

    const currentCard = flashcards[currentIndex];

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setDirection(1);
            setIsFlipped(false);
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
            }, 50);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setIsFlipped(false);
            setTimeout(() => {
                setCurrentIndex(currentIndex - 1);
            }, 50);
        }
    };

    const handleReset = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setDirection(0);
    };

    const handleSpeak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "hu-HU";
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                    Kártya {currentIndex + 1} / {flashcards.length}
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Újrakezdés
                </Button>
            </div>

            <div className="relative h-[400px] w-full perspective-1000">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={{
                            enter: (direction: number) => ({
                                x: direction > 0 ? 300 : -300,
                                opacity: 0,
                                scale: 0.8
                            }),
                            center: {
                                x: 0,
                                opacity: 1,
                                scale: 1
                            },
                            exit: (direction: number) => ({
                                x: direction > 0 ? -300 : 300,
                                opacity: 0,
                                scale: 0.8
                            })
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="absolute inset-0"
                    >
                        <div
                            className="relative w-full h-full cursor-pointer transition-all duration-500 preserve-3d"
                            style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                            onClick={() => setIsFlipped(!isFlipped)}
                        >
                            {/* Front side */}
                            <Card className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 text-center border-2 border-primary/20 bg-card shadow-xl hover:shadow-2xl transition-shadow rounded-2xl">
                                <CardContent className="flex flex-col items-center gap-6">
                                    <span className="text-xs font-bold uppercase tracking-wider text-primary/60">Kérdés</span>
                                    <div className="text-2xl md:text-3xl font-semibold leading-relaxed">
                                        {currentCard.front}
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="mt-4 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsFlipped(true);
                                        }}
                                    >
                                        Megoldás megtekintése
                                    </Button>
                                </CardContent>
                                <div className="absolute bottom-4 right-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSpeak(currentCard.front);
                                        }}
                                    >
                                        <Volume2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            </Card>

                            {/* Back side */}
                            <Card
                                className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 text-center border-2 border-primary/40 bg-primary/5 shadow-xl rounded-2xl"
                                style={{ transform: "rotateY(180deg)" }}
                            >
                                <CardContent className="flex flex-col items-center gap-6">
                                    <span className="text-xs font-bold uppercase tracking-wider text-primary/60">Válasz</span>
                                    <div className="text-xl md:text-2xl font-medium leading-relaxed">
                                        {currentCard.back}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsFlipped(false);
                                        }}
                                    >
                                        Vissza a kérdéshez
                                    </Button>
                                </CardContent>
                                <div className="absolute bottom-4 right-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSpeak(currentCard.back);
                                        }}
                                    >
                                        <Volume2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-4">
                <Button
                    variant="outline"
                    size="lg"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="rounded-full h-14 w-14 p-0"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                    variant="default"
                    size="lg"
                    onClick={handleNext}
                    disabled={currentIndex === flashcards.length - 1}
                    className="rounded-full h-14 w-14 p-0 shadow-lg shadow-primary/20"
                >
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>

            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <motion.div
                    className="bg-primary h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}} />
        </div>
    );
}
