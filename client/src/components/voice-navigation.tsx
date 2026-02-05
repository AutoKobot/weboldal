import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface VoiceNavigationProps {
  onNavigationCommand: (command: string) => void;
}

export function VoiceNavigation({ onNavigationCommand }: VoiceNavigationProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'hu-HU';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
        speakResponse("Igen, hallgatlak. Mit szeretnél?");
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      recognitionInstance.onresult = async (event: any) => {
        try {
          if (event.results && event.results.length > 0 && event.results[0].length > 0) {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('Voice command received:', transcript);
            
            setIsProcessing(true);
            
            // Check if Szabolcs was mentioned
            if (transcript.includes('szabolcs')) {
              await handleVoiceCommand(transcript);
            } else {
              await speakResponse("Kérlek, szólíts meg Szabolcs néven a navigáláshoz.");
            }
            
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Voice recognition result error:', error);
          setIsProcessing(false);
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsProcessing(false);
        toast({
          title: "Hangfelismerési hiba",
          description: "Próbáld újra a hangparancsot.",
          variant: "destructive"
        });
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const handleIntelligentResponse = async (transcript: string) => {
    try {
      console.log('Voice navigation - Sending to backend:', transcript);
      const response = await apiRequest('POST', '/api/chat/voice', {
        message: transcript,
        context: 'voice_navigation'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Voice navigation - Backend response received:', data.message.substring(0, 100) + '...');
        await speakResponse(data.message);
      } else {
        await speakResponse("Sajnos nem tudok most válaszolni. Próbáld meg később.");
      }
    } catch (error) {
      console.error('Intelligent response error:', error);
      await speakResponse("Hiba történt a válasz generálása során.");
    }
  };

  const handleVoiceCommand = async (transcript: string) => {
    try {
      console.log('Processing voice command:', transcript);
      
      // Check for general questions - send to backend with sitemap context
      if (transcript.includes('mi az') || transcript.includes('mi a') ||
          transcript.includes('hogy') || transcript.includes('mit') ||
          transcript.includes('miért') || transcript.includes('hol') ||
          transcript.includes('mikor') || transcript.includes('kérdés') ||
          transcript.includes('segíts') || transcript.includes('elmagyarázd') ||
          transcript.includes('elérhető') || transcript.includes('tudok') ||
          transcript.includes('lehet') || transcript.includes('van')) {
        await handleIntelligentResponse(transcript);
        return;
      }
      
      // Home/Main page - expanded synonyms
      if (transcript.includes('kezdőlap') || transcript.includes('főoldal') || 
          transcript.includes('otthon') || transcript.includes('home') ||
          transcript.includes('visszamenj') || transcript.includes('indítólap') ||
          transcript.includes('főmenü') || transcript.includes('haza')) {
        onNavigationCommand('/');
        await speakResponse("Kezdőlap megnyitása");
        return;
      }
      
      // Admin login - expanded synonyms
      if (transcript.includes('admin') || transcript.includes('adminisztráció') ||
          transcript.includes('adminisztrátor') || transcript.includes('kezelő') ||
          transcript.includes('vezérlő') || transcript.includes('irányítás') ||
          transcript.includes('felügyelet') || transcript.includes('rendszergazda')) {
        onNavigationCommand('/admin-login');
        await speakResponse("Admin bejelentkezés megnyitása");
        return;
      }
      
      // Student authentication - expanded synonyms
      if (transcript.includes('lépj be') || transcript.includes('bejelentkezés') ||
          transcript.includes('belépés') || transcript.includes('belépek') ||
          transcript.includes('student') || transcript.includes('diák') ||
          transcript.includes('tanuló') || transcript.includes('regisztráció') ||
          transcript.includes('belépni') || transcript.includes('csatlakozás') ||
          transcript.includes('kezdő') || transcript.includes('új felhasználó')) {
        onNavigationCommand('/student-auth');
        await speakResponse("Diák bejelentkezés megnyitása");
        return;
      }
      
      // Learning/Study - expanded synonyms
      if (transcript.includes('tanulni szeretnék') || transcript.includes('tanulás') ||
          transcript.includes('tanulok') || transcript.includes('learning') ||
          transcript.includes('szeretnék tanulni') || transcript.includes('elkezdek tanulni') ||
          transcript.includes('oktatás') || transcript.includes('képzés') ||
          transcript.includes('felkészülés') || transcript.includes('tudás') ||
          transcript.includes('lecke') || transcript.includes('óra')) {
        onNavigationCommand('/home');
        await speakResponse("Tanulási felület megnyitása");
        return;
      }
      
      // Profession selection - expanded synonyms (First level: Szakmák)
      if (transcript.includes('szakma') || transcript.includes('foglalkozás') ||
          transcript.includes('hivatás') || transcript.includes('munkakör') ||
          transcript.includes('pálya') || transcript.includes('szakmák') ||
          transcript.includes('szakirány') || transcript.includes('karrier') ||
          transcript.includes('munka') || transcript.includes('állás') ||
          transcript.includes('területek') || transcript.includes('szakterület')) {
        onNavigationCommand('/tananyagok');
        await speakResponse("Szakmák oldal megnyitása");
        return;
      }
      
      // Learning materials - expanded synonyms (Second level: Tananyagok after Szakmák)
      if (transcript.includes('tananyag') || transcript.includes('tananyagok') ||
          transcript.includes('anyag') || transcript.includes('anyagok') ||
          transcript.includes('oktatóanyag') || transcript.includes('lecke') ||
          transcript.includes('tartalom') || transcript.includes('kurzus') ||
          transcript.includes('segédanyag') || transcript.includes('jegyzet') ||
          transcript.includes('dokumentum') || transcript.includes('útmutató')) {
        onNavigationCommand('/tananyagok');
        await speakResponse("Tananyagok oldal megnyitása");
        return;
      }
      
      // Subjects - expanded synonyms (Alternative access to subjects)
      if (transcript.includes('tantárgy') || transcript.includes('tárgy') ||
          transcript.includes('tantárgyak') || transcript.includes('tárgyak') ||
          transcript.includes('subject') || transcript.includes('témakör') ||
          transcript.includes('diszciplína') || transcript.includes('ismeretterület') ||
          transcript.includes('tantéma') || transcript.includes('témák')) {
        onNavigationCommand('/subjects');
        await speakResponse("Tantárgyak oldal megnyitása");
        return;
      }
      
      // Modules - expanded synonyms  
      if (transcript.includes('modul') || transcript.includes('modulok') ||
          transcript.includes('fejezet') || transcript.includes('rész') ||
          transcript.includes('egység') || transcript.includes('leckék') ||
          transcript.includes('részek') || transcript.includes('szekció') ||
          transcript.includes('fejezeteket') || transcript.includes('tudásblokk') ||
          transcript.includes('tanegység') || transcript.includes('tanrész')) {
        onNavigationCommand('/modules');
        await speakResponse("Modulok oldal megnyitása");
        return;
      }
      
      // Community
      if (transcript.includes('közösség') || transcript.includes('community') ||
          transcript.includes('csapat') || transcript.includes('együtt tanulás') ||
          transcript.includes('társak') || transcript.includes('közösségi')) {
        onNavigationCommand('/community');
        await speakResponse("Közösségi oldal megnyitása");
        return;
      }
      
      // Settings
      if (transcript.includes('beállítás') || transcript.includes('beállítások') ||
          transcript.includes('settings') || transcript.includes('konfiguráció') ||
          transcript.includes('opciók') || transcript.includes('preferenciák')) {
        onNavigationCommand('/settings');
        await speakResponse("Beállítások oldal megnyitása");
        return;
      }
      
      // Progress
      if (transcript.includes('haladás') || transcript.includes('előrehaladás') ||
          transcript.includes('progress') || transcript.includes('fejlődés') ||
          transcript.includes('statisztika') || transcript.includes('eredmény')) {
        onNavigationCommand('/progress');
        await speakResponse("Haladás oldal megnyitása");
        return;
      }
      
      // Platform info
      if (transcript.includes('információ') || transcript.includes('segítség') ||
          transcript.includes('súgó') || transcript.includes('help') ||
          transcript.includes('platform') || transcript.includes('rendszer')) {
        onNavigationCommand('/platform-info');
        await speakResponse("Platform információk megnyitása");
        return;
      }
      
      // If no specific command matched, try intelligent response with sitemap
      await handleIntelligentResponse(transcript);
      
    } catch (error) {
      console.error('Voice command processing error:', error);
      await speakResponse("Hiba történt a parancs feldolgozása során.");
    }
  };

  const speakResponse = async (text: string) => {
    try {
      // Use browser's built-in speech synthesis for better reliability
      if ('speechSynthesis' in window) {
        // Wait for voices to load if they haven't already
        let voices = speechSynthesis.getVoices();
        if (voices.length === 0) {
          await new Promise(resolve => {
            speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
          });
          voices = speechSynthesis.getVoices();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hu-HU';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        
        // Debug: log available voices
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Always prioritize Hungarian voices for authentic pronunciation
        const bestVoice = voices.find(voice => 
          voice.lang === 'hu-HU'
        ) || voices.find(voice => 
          voice.lang.startsWith('hu')
        ) || voices.find(voice => 
          voice.name.toLowerCase().includes('szabolcs')
        ) || voices.find(voice => 
          voice.name.toLowerCase().includes('google') && 
          voice.name.toLowerCase().includes('female')
        ) || voices.find(voice => 
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman')
        );
        
        if (bestVoice) {
          utterance.voice = bestVoice;
          console.log('Selected voice:', bestVoice.name, bestVoice.lang);
        } else {
          console.log('No suitable voice found, using default');
        }
        
        speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  if (!recognition) {
    return null; // Hide if speech recognition is not supported
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col items-center gap-2">
        {isListening && (
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
            Szabolcs hallgat...
          </div>
        )}
        {isProcessing && (
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
            Feldolgozás...
          </div>
        )}
        <Button
          size="lg"
          className={`rounded-full w-16 h-16 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
        >
          {isListening ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
        <div className="text-xs text-center text-muted-foreground max-w-24">
          Szólítsd meg: "Szabolcs"
        </div>
      </div>
    </div>
  );
}

// Add type declarations for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}