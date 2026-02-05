import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Trash2, Mic, MicOff, Volume2, Play, Pause, Square, FileText, Brain } from "lucide-react";
import type { ChatMessage } from "@shared/schema";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  userId: string;
  moduleId?: number;
  predefinedMessage?: string;
  onQuizStart?: () => void;
}

export default function ChatInterface({ userId, moduleId, onQuizStart }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isAIResponding, setIsAIResponding] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const streamingAudioChunks = useRef<string[]>([]);
  const synchronizedAudioQueue = useRef<{buffer: Uint8Array, timestamp: number, text: string}[]>([]);
  const [playbackStartTime, setPlaybackStartTime] = useState<number>(0);

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/chat/messages', moduleId],
    queryFn: async () => {
      const params = moduleId ? `?moduleId=${moduleId}` : '';
      const response = await fetch(`/api/chat/messages${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      return data;
    },
    retry: false,
    refetchInterval: isAIResponding ? 2000 : false,
    staleTime: 0,
    gcTime: 0,
  });

  const transcribeAudio = async (audioBlob: Blob, extension: string = 'webm') => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${extension}`);
      
      const response = await fetch('/api/chat/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const result = await response.json();
      return result.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioChunks([]);
        
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          if (transcribedText.trim()) {
            sendStreamingMessage(transcribedText);
          }
        } catch (error) {
          toast({
            title: "Hiba",
            description: "Nem sikerült feldolgozni a hangfelvételt",
            variant: "destructive",
          });
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Nem sikerült elérni a mikrofont",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const toggleAudioPlayback = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
        setIsPlaying(false);
      } else {
        currentAudio.play()
          .then(() => setIsPlaying(true))
          .catch(e => {
            console.log('Audio playback failed:', e);
            toast({
              title: "Lejátszási hiba",
              description: "Nem sikerült lejátszani a hangfájlt",
              variant: "destructive",
            });
          });
      }
    }
  };

  // Synchronized streaming function for timestamped text-audio coordination
  const sendSynchronizedStreamingMessage = async (messageText: string, isVoiceRequest: boolean = false) => {
    if (!messageText.trim()) return;

    setIsAIResponding(true);
    setStreamingMessage('');
    setIsGeneratingAudio(isVoiceRequest);
    
    // Clear previous audio queue
    synchronizedAudioQueue.current = [];
    let audioQueueProcessing = false;
    
    try {
      const response = await fetch('/api/chat/message/synchronized-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          relatedModuleId: moduleId,
        }),
      });

      if (!response.ok) {
        throw new Error('Synchronized streaming failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      const processAudioQueue = async () => {
        if (audioQueueProcessing || synchronizedAudioQueue.current.length === 0) return;
        
        audioQueueProcessing = true;
        const audioChunk = synchronizedAudioQueue.current.shift();
        
        if (audioChunk && isVoiceRequest) {
          try {
            const audioBlob = new Blob([audioChunk.buffer], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            console.log(`Playing audio chunk (${audioChunk.text.length} chars): "${audioChunk.text.substring(0, 50)}..." at ${audioChunk.timestamp}ms`);
            
            audio.onplay = () => {
              setIsPlaying(true);
              setIsGeneratingAudio(false);
            };
            audio.onended = () => {
              setIsPlaying(false);
              audioQueueProcessing = false;
              // Process next chunk in queue
              setTimeout(processAudioQueue, 100);
            };
            audio.onerror = () => {
              audioQueueProcessing = false;
              setTimeout(processAudioQueue, 100);
            };
            
            if (currentAudio) {
              currentAudio.pause();
            }
            setCurrentAudio(audio);
            await audio.play();
            
          } catch (error) {
            console.error('Error playing synchronized audio chunk:', error);
            audioQueueProcessing = false;
            setTimeout(processAudioQueue, 100);
          }
        } else {
          audioQueueProcessing = false;
        }
      };
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'user_message':
                  queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
                  break;
                case 'text_chunk':
                  setStreamingMessage(prev => prev + data.data);
                  break;
                case 'audio_chunk':
                  if (isVoiceRequest && data.data) {
                    try {
                      const audioData = atob(data.data);
                      const bytes = new Uint8Array(audioData.length);
                      for (let i = 0; i < audioData.length; i++) {
                        bytes[i] = audioData.charCodeAt(i);
                      }
                      
                      synchronizedAudioQueue.current.push({
                        buffer: bytes,
                        timestamp: data.timestamp,
                        text: data.text
                      });
                      
                      // Start processing queue if not already processing
                      if (!audioQueueProcessing) {
                        setTimeout(processAudioQueue, data.timestamp);
                      }
                    } catch (error) {
                      console.error('Error processing synchronized audio chunk:', error);
                    }
                  }
                  break;
                case 'ai_complete':
                  setIsAIResponding(false);
                  setStreamingMessage('');
                  queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
                  break;
                case 'done':
                  setIsAIResponding(false);
                  if (!isVoiceRequest) {
                    setIsGeneratingAudio(false);
                  }
                  break;
                case 'error':
                  throw new Error(data.message || 'Synchronized streaming error');
              }
            } catch (parseError) {
              console.error('Error parsing synchronized SSE data:', parseError);
            }
          }
        }
      }

    } catch (error) {
      console.error('Synchronized streaming error:', error);
      setIsAIResponding(false);
      setStreamingMessage('');
      setIsGeneratingAudio(false);
      toast({
        title: "Szinkronizált streaming hiba",
        description: "A szinkronizált válasz generálása sikertelen volt",
        variant: "destructive",
      });
    }
  };

  const sendStreamingMessage = async (messageText: string) => {
    setIsAIResponding(true);
    setStreamingMessage(""); // Reset streaming message
    
    let isVoiceRequest = messageText.includes('Hangos magyarázat kérése');
    
    // Prevent multiple voice requests while audio is being generated or playing
    if (isVoiceRequest && (isGeneratingAudio || isPlaying)) {
      toast({
        title: "Hangos felolvasás már folyamatban",
        description: "Várj, amíg befejeződik az aktuális felolvasás.",
        variant: "destructive",
      });
      setIsAIResponding(false);
      return;
    }
    
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
    }

    let accumulatedResponse = '';
    let audioStarted = false;
    let audioGeneration: Promise<void> | null = null;

    // Mark voice request for final audio generation
    if (isVoiceRequest) {
      setIsGeneratingAudio(true);
    }

    try {
      const response = await fetch('/api/chat/message/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: messageText,
          relatedModuleId: moduleId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = line.slice(6).trim();
              if (!jsonData) continue;
              
              const data = JSON.parse(jsonData);
              console.log('Processing SSE event:', data.type, 'data length:', data.data?.length || 0);
              
              switch (data.type) {
                case 'user_message':
                  refetch();
                  break;
                case 'ai_chunk':
                  accumulatedResponse += data.data;
                  setStreamingMessage(accumulatedResponse); // Update streaming message in real-time
                  break;
                case 'streaming_audio_chunk_data':
                  if (isVoiceRequest && data.data) {
                    streamingAudioChunks.current[data.chunkIndex] = data.data;
                    console.log('Received audio chunk:', data.chunkIndex + 1, '/', data.totalChunks);
                  }
                  break;
                case 'streaming_audio_complete':
                  if (isVoiceRequest && streamingAudioChunks.current.length > 0) {
                    try {
                      console.log('Assembling audio from', streamingAudioChunks.current.length, 'chunks');
                      const completeBase64 = streamingAudioChunks.current.join('');
                      const audioData = atob(completeBase64);
                      const bytes = new Uint8Array(audioData.length);
                      for (let i = 0; i < audioData.length; i++) {
                        bytes[i] = audioData.charCodeAt(i);
                      }
                      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                      const audioUrl = URL.createObjectURL(audioBlob);
                      const audio = new Audio(audioUrl);
                      
                      console.log('Streaming audio blob created, size:', audioBlob.size);
                      
                      audio.onplay = () => {
                        console.log('Streaming audio started playing - setting states');
                        setIsPlaying(true);
                        setIsGeneratingAudio(false);
                      };
                      audio.onpause = () => {
                        console.log('Streaming audio paused');
                        setIsPlaying(false);
                      };
                      audio.onended = () => {
                        console.log('Streaming audio playback ended naturally');
                        setIsPlaying(false);
                        setCurrentAudio(null);
                        setIsGeneratingAudio(false);
                      };
                      audio.onerror = (e) => {
                        console.error('Streaming audio playback error:', e);
                        setIsPlaying(false);
                        setCurrentAudio(null);
                        setIsGeneratingAudio(false);
                      };
                      
                      // Stop previous audio and set new one
                      if (currentAudio) {
                        currentAudio.pause();
                      }
                      setCurrentAudio(audio);
                      console.log('Setting new current audio and attempting to play');
                      audio.play().catch(e => {
                        console.error('Streaming audio autoplay blocked:', e);
                        setIsGeneratingAudio(false);
                      });
                      
                      // Reset chunks for next request
                      streamingAudioChunks.current = [];
                    } catch (error) {
                      console.error('Error processing streaming audio:', error);
                      setIsGeneratingAudio(false);
                    }
                  }
                  break;
                case 'final_audio':
                  console.log('Received final_audio event:', !!data.data);
                  if (isVoiceRequest && data.data) {
                    try {
                      const audioData = atob(data.data);
                      const bytes = new Uint8Array(audioData.length);
                      for (let i = 0; i < audioData.length; i++) {
                        bytes[i] = audioData.charCodeAt(i);
                      }
                      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                      const audioUrl = URL.createObjectURL(audioBlob);
                      const audio = new Audio(audioUrl);
                      
                      console.log('Audio blob created, size:', audioBlob.size);
                      
                      audio.onplay = () => {
                        console.log('Audio started playing');
                        setIsPlaying(true);
                      };
                      audio.onpause = () => setIsPlaying(false);
                      audio.onended = () => {
                        console.log('Audio playback ended');
                        setIsPlaying(false);
                        setCurrentAudio(null);
                        setIsGeneratingAudio(false);
                      };
                      audio.onerror = (e) => {
                        console.error('Audio playback error:', e);
                        setIsPlaying(false);
                        setCurrentAudio(null);
                        setIsGeneratingAudio(false);
                      };
                      
                      // Stop previous audio and play new one
                      if (currentAudio) {
                        currentAudio.pause();
                      }
                      setCurrentAudio(audio);
                      audio.play().catch(e => {
                        console.error('Audio autoplay blocked:', e);
                        setIsGeneratingAudio(false);
                      });
                    } catch (error) {
                      console.error('Error processing final audio:', error);
                      setIsGeneratingAudio(false);
                    }
                  }
                  break;
                case 'audio_error':
                  setIsGeneratingAudio(false);
                  toast({
                    title: "Audio hiba",
                    description: "A hang generálása sikertelen volt",
                    variant: "destructive",
                  });
                  break;
                case 'ai_complete':
                  setStreamingMessage(""); // Clear streaming message
                  refetch();
                  break;
                case 'done':
                  setIsAIResponding(false);
                  setStreamingMessage(""); // Clear streaming message
                  return;
                case 'error':
                  setIsAIResponding(false);
                  setStreamingMessage(""); // Clear streaming message
                  toast({
                    title: "Hiba történt",
                    description: data.message,
                    variant: "destructive",
                  });
                  return;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

    } catch (error) {
      setIsAIResponding(false);
      setStreamingMessage(""); // Clear streaming message
      toast({
        title: "Hiba történt",
        description: "Nem sikerült elküldeni az üzenetet.",
        variant: "destructive",
      });
    }
  };

  const deleteMessagesMutation = useMutation({
    mutationFn: async () => {
      const params = moduleId ? `?moduleId=${moduleId}` : '';
      await apiRequest('DELETE', `/api/chat/messages${params}`);
    },
    onSuccess: () => {
      // Set empty array immediately to prevent refetch
      queryClient.setQueryData(['/api/chat/messages', moduleId], []);
      toast({
        title: "Sikeres törlés",
        description: "Chat előzmények törölve.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni a chat előzményeket",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (message.trim()) {
      // Use streaming for faster responses
      sendStreamingMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Scroll to bottom when new messages arrive or streaming message updates
  useEffect(() => {
    // Only auto-scroll if there are actual messages and user has interacted with chat
    if (messages.filter((m: any) => !m.isSystemMessage).length === 0) return;
    
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      const isAtBottom = messagesContainer.scrollHeight - messagesContainer.clientHeight <= messagesContainer.scrollTop + 50;
      // Only auto-scroll if user is already at the bottom
      if (isAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages, streamingMessage]);

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Most";
    if (diffInMinutes < 60) return `${diffInMinutes} perce`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} órája`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Tanár Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Tanár Chat
            {moduleId && <Badge variant="secondary">Module {moduleId}</Badge>}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteMessagesMutation.mutate()}
            disabled={deleteMessagesMutation.isPending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardHeader>
      
      {/* AI funkciók fix pozícióban a chat tetején */}
      <div className="p-4 bg-orange-50 border-b border-orange-200">
        <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4" />
          AI funkciók
        </h4>
        <div className="space-y-2">
          <Button 
            variant="default" 
            className="w-full justify-start bg-orange-500 hover:bg-orange-600 text-white"
            onClick={() => {
              sendStreamingMessage(`Szöveges magyarázat kérése erről a modulról`);
            }}
            disabled={isAIResponding}
          >
            <FileText className="h-4 w-4 mr-2" />
            Szöveges magyarázat kérése
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => {
              sendSynchronizedStreamingMessage(`Hangos magyarázat kérése erről a modulról`);
            }}
            disabled={isAIResponding || isGeneratingAudio || isPlaying}
          >
            <Volume2 className="h-4 w-4 mr-2" />
            Hangos magyarázat (Szinkronizált)
            {(isGeneratingAudio || isPlaying) && (
              <div className="ml-2 flex items-center gap-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            )}
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start border-pink-300 text-pink-700 hover:bg-pink-50"
            onClick={onQuizStart}
            disabled={isAIResponding}
          >
            <Brain className="h-4 w-4 mr-2" />
            Tudáspróba
          </Button>
        </div>
      </div>

      <CardContent className="flex-1 flex flex-col p-4">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96 scroll-smooth">
          {/* Messages */}
          {(messages as ChatMessage[]).filter((msg: ChatMessage) => !msg.isSystemMessage).map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[80%] ${msg.senderRole === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.senderRole === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-neutral-200 text-neutral-600'
                }`}>
                  {msg.senderRole === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`rounded-lg p-3 ${
                  msg.senderRole === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-neutral-100 text-neutral-800'
                }`}>
                  {msg.senderRole === 'user' ? (
                    <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                  ) : (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-neutral">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-neutral-800">{children}</h1>,
                          h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-neutral-800">{children}</h2>,
                          h3: ({children}) => <h3 className="text-sm font-medium mb-1 text-neutral-800">{children}</h3>,
                          p: ({children}) => <p className="mb-2 leading-relaxed text-neutral-800">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1 text-neutral-800">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-neutral-800">{children}</ol>,
                          li: ({children}) => <li className="text-neutral-800">{children}</li>,
                          blockquote: ({children}) => <blockquote className="border-l-2 border-neutral-400 pl-2 italic mb-2 bg-neutral-50 py-1 text-neutral-700">{children}</blockquote>,
                          code: ({children}) => <code className="bg-neutral-200 px-1 py-0.5 rounded text-xs font-mono text-neutral-900">{children}</code>,
                          pre: ({children}) => <pre className="bg-neutral-200 p-2 rounded-md overflow-x-auto mb-2 text-xs">{children}</pre>,
                          strong: ({children}) => <strong className="font-semibold text-neutral-900">{children}</strong>,
                          em: ({children}) => <em className="italic text-neutral-700">{children}</em>,
                          table: ({children}) => <table className="w-full border-collapse border border-neutral-300 mb-2 text-xs">{children}</table>,
                          th: ({children}) => <th className="border border-neutral-300 px-2 py-1 bg-neutral-200 font-semibold text-neutral-900">{children}</th>,
                          td: ({children}) => <td className="border border-neutral-300 px-2 py-1 text-neutral-800">{children}</td>,
                          a: ({href, children}) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                        }}
                      >
                        {msg.message}
                      </ReactMarkdown>
                    </div>
                  )}
                  <div className={`text-xs mt-1 ${
                    msg.senderRole === 'user' ? 'text-blue-100' : 'text-neutral-500'
                  }`}>
                    {formatTime(msg.timestamp || new Date())}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* AI Response Streaming State */}
          {isAIResponding && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-neutral-200 text-neutral-600">
                  <Bot size={16} />
                </div>
                <div className="rounded-lg p-3 bg-neutral-100 text-neutral-800">
                  {streamingMessage ? (
                    <div>
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-neutral">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({children}) => <h1 className="text-lg font-bold mb-2 text-neutral-800">{children}</h1>,
                            h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-neutral-800">{children}</h2>,
                            h3: ({children}) => <h3 className="text-sm font-medium mb-1 text-neutral-800">{children}</h3>,
                            p: ({children}) => <p className="mb-2 leading-relaxed text-neutral-800">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1 text-neutral-800">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1 text-neutral-800">{children}</ol>,
                            li: ({children}) => <li className="text-neutral-800">{children}</li>,
                            blockquote: ({children}) => <blockquote className="border-l-2 border-neutral-400 pl-2 italic mb-2 bg-neutral-50 py-1 text-neutral-700">{children}</blockquote>,
                            code: ({children}) => <code className="bg-neutral-200 px-1 py-0.5 rounded text-xs font-mono text-neutral-900">{children}</code>,
                            pre: ({children}) => <pre className="bg-neutral-200 p-2 rounded-md overflow-x-auto mb-2 text-xs">{children}</pre>,
                            strong: ({children}) => <strong className="font-semibold text-neutral-900">{children}</strong>,
                            em: ({children}) => <em className="italic text-neutral-700">{children}</em>,
                            table: ({children}) => <table className="w-full border-collapse border border-neutral-300 mb-2 text-xs">{children}</table>,
                            th: ({children}) => <th className="border border-neutral-300 px-2 py-1 bg-neutral-200 font-semibold text-neutral-900">{children}</th>,
                            td: ({children}) => <td className="border border-neutral-300 px-2 py-1 text-neutral-800">{children}</td>,
                            a: ({href, children}) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                          }}
                        >
                          {streamingMessage}
                        </ReactMarkdown>
                        <span className="inline-block w-2 h-5 bg-neutral-400 ml-1 animate-pulse"></span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-xs text-blue-600 font-medium">AI válaszol...</span>
                        {isGeneratingAudio && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Volume2 size={12} />
                            hang generálás...
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse flex space-x-1">
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm text-neutral-500">AI válaszol...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-neutral-100">
          <div className="flex flex-wrap gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Írj egy üzenetet vagy használd a mikrofont..."
              disabled={isAIResponding || isRecording}
              className="flex-1"
            />
            
            {/* Voice Recording Button */}
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isAIResponding}
              variant={isRecording ? "destructive" : "outline"}
              className={isRecording ? "animate-pulse" : ""}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>

            {/* Audio Control Button - Always visible */}
            <Button
              onClick={toggleAudioPlayback}
              variant="outline"
              className="flex items-center gap-1"
              disabled={!currentAudio}
              title={currentAudio ? (isPlaying ? "Pause" : "Play") : "No audio"}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              <span className="text-xs ml-1">
                {isPlaying ? "Pause" : "Play"}
              </span>
            </Button>

            {/* Stop Button - appears when AI is responding or audio is playing */}
            {(isAIResponding || isPlaying) && (
              <Button
                onClick={() => {
                  // Stop audio playback
                  if (currentAudio) {
                    currentAudio.pause();
                    setCurrentAudio(null);
                    setIsPlaying(false);
                  }
                  
                  // Cancel ongoing AI request
                  if (abortController) {
                    abortController.abort();
                    setAbortController(null);
                  }
                  
                  setIsAIResponding(false);
                }}
                variant="destructive"
                className="flex items-center gap-1"
              >
                <Square size={16} />
                Leállítás
              </Button>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isAIResponding || isRecording}
              className="bg-primary hover:bg-blue-700"
            >
              {isAIResponding ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
          
          {/* Recording Status */}
          {isRecording && (
            <div className="mt-2 text-sm text-red-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Felvétel folyamatban... Kattints a mikrofon gombra a leállításhoz.
            </div>
          )}


        </div>
      </CardContent>
    </Card>
  );
}