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
import { useAuth } from "@/hooks/useAuth";

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
  const currentAudioUrlRef = useRef<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isAIResponding, setIsAIResponding] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const streamingAudioChunks = useRef<string[]>([]);
  const synchronizedAudioQueue = useRef<{ buffer: Uint8Array, timestamp: number, text: string }[]>([]);
  const { user } = useAuth();
  const { data: aiChatEnabledData } = useQuery({
    queryKey: ['/api/settings/ai-chat-enabled'],
  });
  const aiChatEnabled = (aiChatEnabledData as { enabled: boolean })?.enabled !== false;

  const [playbackStartTime, setPlaybackStartTime] = useState<number>(0);
  const firstChunkTimestamp = useRef<number | null>(null);

  // Live conversation state - ENHANCED WITH SYNCHRONIZATION
  const [isLiveConversationActive, setIsLiveConversationActive] = useState(false);
  const isLiveConversationActiveRef = useRef(false);
  const [isWaitingForUserSpeech, setIsWaitingForUserSpeech] = useState(false);
  const liveConversationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const allowAudioPlaybackRef = useRef<boolean>(true);
  const audioQueueProcessing = useRef<boolean>(false);

  // Enhanced state tracking for debugging
  const recordingCycleCountRef = useRef<number>(0);
  const lastRecordingStartTime = useRef<number | null>(null);

  // Handle unhandled promise rejections for audio playback
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Check if the rejection is related to audio interruption
      if (event.reason?.message?.includes('interrupted') ||
        event.reason?.name === 'AbortError' ||
        event.reason?.message?.includes('play') ||
        event.reason?.message?.includes('audio')) {
        event.preventDefault();
        console.log('Audio interruption handled gracefully');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Cleanup live conversation on unmount
  useEffect(() => {
    return () => {
      if (isLiveConversationActive) {
        stopLiveConversation();
      }
    };
  }, []);

  // Auto-scroll helper functions
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isNearBottom = () => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
  };

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
    enabled: !!userId,
  });

  const deleteMessagesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/chat/messages', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete messages');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
      toast({
        title: "Beszélgetés törölve",
        description: "Az összes üzenet sikeresen törölve lett.",
      });
    },
    onError: (error) => {
      console.error('Error deleting messages:', error);
      if (isUnauthorizedError(error)) {
        window.location.href = '/login';
        return;
      }
      toast({
        title: "Hiba",
        description: "Nem sikerült törölni az üzeneteket.",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll when messages array grows (new AI response added)
  useEffect(() => {
    if (messages.length > 0 && isNearBottom()) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Auto-scroll during streaming (handles first chunk and continuation)
  useEffect(() => {
    if (streamingMessage && isNearBottom()) {
      scrollToBottom();
    }
  }, [streamingMessage]);

  const sendSynchronizedStreamingMessage = async (messageText: string) => {
    setIsAIResponding(true);
    setStreamingMessage("");
    setIsGeneratingAudio(true);

    const processAudioQueue = async () => {
      if (audioQueueProcessing.current || synchronizedAudioQueue.current.length === 0 || !allowAudioPlaybackRef.current) {
        return;
      }

      audioQueueProcessing.current = true;
      const audioChunk = synchronizedAudioQueue.current.shift();

      if (audioChunk && allowAudioPlaybackRef.current) {
        try {
          const audioBlob = new Blob([audioChunk.buffer as any], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          console.log(`Playing audio chunk (${audioChunk.text.length} chars): "${audioChunk.text.substring(0, 50)}..." at ${audioChunk.timestamp}ms`);

          audio.onplay = () => {
            // Guard against playback if stopped during the brief window between play() and onplay
            if (!allowAudioPlaybackRef.current) {
              audio.pause();
              URL.revokeObjectURL(audioUrl);
              setCurrentAudio(null);
              if (currentAudioUrlRef.current === audioUrl) {
                currentAudioUrlRef.current = null;
              }
              audioQueueProcessing.current = false;
              return;
            }
            setIsPlaying(true);
            setIsGeneratingAudio(false);
            console.log(`🔊 Audio chunk started playing: ${audioChunk.text.substring(0, 30)}...`);
          };
          audio.onended = () => {
            console.log(`✅ Audio chunk finished: ${audioChunk.text.substring(0, 30)}...`);
            URL.revokeObjectURL(audioUrl);
            if (currentAudioUrlRef.current === audioUrl) {
              currentAudioUrlRef.current = null;
            }
            setIsPlaying(false);
            audioQueueProcessing.current = false;

            if (allowAudioPlaybackRef.current) {
              // Continue processing the audio queue immediately
              const nextProcessTimeout = setTimeout(() => {
                processAudioQueue();

                // ENHANCED TIMING: Only restart recording cycle after ALL audio chunks are processed AND longer delay
                // Check multiple times with increasing delays to ensure queue is truly empty and stable
                setTimeout(() => {
                  if (synchronizedAudioQueue.current.length === 0 &&
                    isLiveConversationActiveRef.current &&
                    !liveConversationTimeoutRef.current &&
                    !audioQueueProcessing.current &&
                    !isPlaying) {
                    console.log('🎤 [TIMING FIX] All audio chunks completed, preparing to restart live recording cycle...', {
                      conversationActive: isLiveConversationActiveRef.current,
                      queueEmpty: synchronizedAudioQueue.current.length === 0,
                      noTimeout: !liveConversationTimeoutRef.current,
                      notProcessing: !audioQueueProcessing.current,
                      notPlaying: !isPlaying,
                      queueLength: synchronizedAudioQueue.current.length
                    });

                    // CRITICAL TIMING FIX: Wait much longer to ensure ALL audio processing is complete
                    // This prevents microphone from starting during AI speech
                    liveConversationTimeoutRef.current = setTimeout(() => {
                      // Triple-check state before restarting cycle with enhanced validation
                      const isQueueReallyEmpty = synchronizedAudioQueue.current.length === 0;
                      const isConversationStillActive = isLiveConversationActiveRef.current;
                      const isNotCurrentlyProcessing = !audioQueueProcessing.current;
                      const isNotCurrentlyPlaying = !isPlaying;

                      console.log('🎤 [RESTART VALIDATION] State check before restart:', {
                        isQueueReallyEmpty,
                        isConversationStillActive,
                        isNotCurrentlyProcessing,
                        isNotCurrentlyPlaying,
                        allConditionsMet: isQueueReallyEmpty && isConversationStillActive && isNotCurrentlyProcessing && isNotCurrentlyPlaying
                      });

                      if (isQueueReallyEmpty && isConversationStillActive && isNotCurrentlyProcessing && isNotCurrentlyPlaying) {
                        console.log('🎤 [RESTART] All conditions validated, starting new recording cycle');
                        liveConversationTimeoutRef.current = null; // Clear timeout ref before starting
                        startLiveRecordingCycle();
                      } else {
                        console.log('🎤 [RESTART] Conditions not met, skipping cycle restart');
                        liveConversationTimeoutRef.current = null;
                      }
                    }, 6000); // INCREASED from 3000ms to 6000ms for better stability
                  }
                }, 500); // Increased from 200ms to 500ms for more stability
              }, 100); // Increased from 50ms for better timing
            }
          };
          audio.onerror = (error) => {
            console.error(`❌ Audio chunk error: ${audioChunk.text.substring(0, 30)}...`, error);
            URL.revokeObjectURL(audioUrl);
            if (currentAudioUrlRef.current === audioUrl) {
              currentAudioUrlRef.current = null;
            }
            setIsPlaying(false);
            audioQueueProcessing.current = false;

            if (allowAudioPlaybackRef.current) {
              // Continue with next chunk even on error with enhanced timing
              setTimeout(() => {
                processAudioQueue();

                // ENHANCED ERROR RECOVERY TIMING: Check if we need to restart recording after error
                setTimeout(() => {
                  if (synchronizedAudioQueue.current.length === 0 &&
                    isLiveConversationActiveRef.current &&
                    !liveConversationTimeoutRef.current &&
                    !audioQueueProcessing.current &&
                    !isPlaying) {
                    console.log('🎤 [ERROR RECOVERY] Audio error recovery - preparing to restart live recording cycle...');

                    // ENHANCED TIMING: Same longer delay as success path for consistency
                    liveConversationTimeoutRef.current = setTimeout(() => {
                      const isQueueReallyEmpty = synchronizedAudioQueue.current.length === 0;
                      const isConversationStillActive = isLiveConversationActiveRef.current;
                      const isNotCurrentlyProcessing = !audioQueueProcessing.current;
                      const isNotCurrentlyPlaying = !isPlaying;

                      console.log('🎤 [ERROR RECOVERY VALIDATION] State check after error:', {
                        isQueueReallyEmpty,
                        isConversationStillActive,
                        isNotCurrentlyProcessing,
                        isNotCurrentlyPlaying
                      });

                      if (isQueueReallyEmpty && isConversationStillActive && isNotCurrentlyProcessing && isNotCurrentlyPlaying) {
                        console.log('🎤 [ERROR RECOVERY] Starting new recording cycle after error');
                        liveConversationTimeoutRef.current = null;
                        startLiveRecordingCycle();
                      } else {
                        console.log('🎤 [ERROR RECOVERY] Conditions not met, skipping restart after error');
                        liveConversationTimeoutRef.current = null;
                      }
                    }, 6000); // INCREASED: Same 6000ms delay as success path
                  }
                }, 500); // INCREASED: Same 500ms delay as success path
              }, 100);
            }
          };

          if (currentAudio) {
            currentAudio.pause();
            if (currentAudioUrlRef.current) {
              URL.revokeObjectURL(currentAudioUrlRef.current);
            }
          }
          setCurrentAudio(audio);
          currentAudioUrlRef.current = audioUrl;

          // Handle audio play promise properly with better error recovery and enhanced timing
          audio.play().catch(error => {
            console.error(`⚠️ Audio play failed for chunk: ${audioChunk.text.substring(0, 30)}...`, error);
            URL.revokeObjectURL(audioUrl);
            if (currentAudioUrlRef.current === audioUrl) {
              currentAudioUrlRef.current = null;
            }
            setIsPlaying(false);
            audioQueueProcessing.current = false;

            if (allowAudioPlaybackRef.current) {
              // Continue processing queue even if this chunk failed with enhanced timing
              setTimeout(() => {
                processAudioQueue();

                // ENHANCED PLAY FAILURE RECOVERY: Check restart conditions after play failure with better timing
                setTimeout(() => {
                  if (synchronizedAudioQueue.current.length === 0 &&
                    isLiveConversationActiveRef.current &&
                    !liveConversationTimeoutRef.current &&
                    !audioQueueProcessing.current &&
                    !isPlaying) {
                    console.log('🎤 [PLAY FAILURE] Audio play failure recovery - preparing to restart live recording cycle...');

                    // ENHANCED TIMING: Same consistent delay as other recovery paths
                    liveConversationTimeoutRef.current = setTimeout(() => {
                      const isQueueReallyEmpty = synchronizedAudioQueue.current.length === 0;
                      const isConversationStillActive = isLiveConversationActiveRef.current;
                      const isNotCurrentlyProcessing = !audioQueueProcessing.current;
                      const isNotCurrentlyPlaying = !isPlaying;

                      console.log('🎤 [PLAY FAILURE VALIDATION] State check after play failure:', {
                        isQueueReallyEmpty,
                        isConversationStillActive,
                        isNotCurrentlyProcessing,
                        isNotCurrentlyPlaying
                      });

                      if (isQueueReallyEmpty && isConversationStillActive && isNotCurrentlyProcessing && isNotCurrentlyPlaying) {
                        console.log('🎤 [PLAY FAILURE] Starting new recording cycle after play failure');
                        liveConversationTimeoutRef.current = null;
                        startLiveRecordingCycle();
                      } else {
                        console.log('🎤 [PLAY FAILURE] Conditions not met, skipping restart after play failure');
                        liveConversationTimeoutRef.current = null;
                      }
                    }, 6000); // INCREASED: Same 6000ms delay as other paths for consistency
                  }
                }, 500); // INCREASED: Same 500ms delay as other paths
              }, 100);
            }
          });

        } catch (error) {
          console.error('Error playing synchronized audio chunk:', error);
          audioQueueProcessing.current = false;
          if (allowAudioPlaybackRef.current) {
            setTimeout(processAudioQueue, 100);
          }
        }
      } else {
        audioQueueProcessing.current = false;
      }
    };

    try {
      const controller = new AbortController();
      setAbortController(controller);

      const response = await fetch('/api/chat/message/synchronized-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          message: messageText,
          relatedModuleId: moduleId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader!.read();
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
                  if (data.data) {
                    try {
                      const audioData = atob(data.data);
                      const bytes = new Uint8Array(audioData.length);
                      for (let i = 0; i < audioData.length; i++) {
                        bytes[i] = audioData.charCodeAt(i);
                      }

                      // Normalize timestamps to start from 0
                      if (firstChunkTimestamp.current === null) {
                        firstChunkTimestamp.current = data.timestamp;
                        console.log(`🎵 First audio chunk baseline: ${data.timestamp}ms`);
                      }

                      const normalizedTimestamp = data.timestamp - (firstChunkTimestamp.current || 0);

                      synchronizedAudioQueue.current.push({
                        buffer: bytes,
                        timestamp: normalizedTimestamp,
                        text: data.text
                      });

                      if (!audioQueueProcessing.current && synchronizedAudioQueue.current.length === 1) {
                        setTimeout(processAudioQueue, Math.max(0, normalizedTimestamp));
                      }
                    } catch (error) {
                      console.error('Error processing synchronized audio chunk:', error);
                    }
                  }
                  break;
                case 'final_audio':
                  console.log('🎵 Received final_audio event, data length:', data.data?.length || 0);
                  if (data.data) {
                    try {
                      const audioData = atob(data.data);
                      const bytes = new Uint8Array(audioData.length);
                      for (let i = 0; i < audioData.length; i++) {
                        bytes[i] = audioData.charCodeAt(i);
                      }

                      console.log('🎵 Processing final audio, buffer size:', bytes.length);

                      // For final audio, play immediately without timestamp synchronization
                      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
                      const audioUrl = URL.createObjectURL(audioBlob);
                      const audio = new Audio(audioUrl);

                      audio.onplay = () => {
                        setIsPlaying(true);
                        setIsGeneratingAudio(false);
                        console.log('🔊 Final audio started playing');
                      };

                      audio.onended = () => {
                        console.log('✅ [FINAL AUDIO] Final audio finished playing');
                        URL.revokeObjectURL(audioUrl);
                        setIsPlaying(false);
                        setCurrentAudio(null);
                        if (currentAudioUrlRef.current === audioUrl) {
                          currentAudioUrlRef.current = null;
                        }

                        // ENHANCED TIMING: Apply same timing logic as synchronized audio chunks for consistency
                        if (allowAudioPlaybackRef.current && isLiveConversationActiveRef.current) {
                          console.log('🎤 [FINAL AUDIO] Preparing to restart live conversation after final audio');

                          // Use same enhanced timing as other audio completion paths
                          setTimeout(() => {
                            if (!liveConversationTimeoutRef.current &&
                              isLiveConversationActiveRef.current &&
                              !audioQueueProcessing.current &&
                              !isPlaying &&
                              !isGeneratingAudio) {
                              console.log('🎤 [FINAL AUDIO] All conditions met, restarting live recording after final audio');

                              liveConversationTimeoutRef.current = setTimeout(() => {
                                const isConversationStillActive = isLiveConversationActiveRef.current;
                                const isNotCurrentlyProcessing = !audioQueueProcessing.current;
                                const isNotCurrentlyPlaying = !isPlaying;
                                const isNotGenerating = !isGeneratingAudio;

                                console.log('🎤 [FINAL AUDIO VALIDATION] State check after final audio:', {
                                  isConversationStillActive,
                                  isNotCurrentlyProcessing,
                                  isNotCurrentlyPlaying,
                                  isNotGenerating
                                });

                                if (isConversationStillActive && isNotCurrentlyProcessing && isNotCurrentlyPlaying && isNotGenerating) {
                                  console.log('🎤 [FINAL AUDIO] Starting new recording cycle after final audio');
                                  liveConversationTimeoutRef.current = null;
                                  startLiveRecordingCycle();
                                } else {
                                  console.log('🎤 [FINAL AUDIO] Conditions not met, skipping restart after final audio');
                                  liveConversationTimeoutRef.current = null;
                                }
                              }, 6000); // Same 6000ms delay as synchronized audio
                            }
                          }, 500); // Same 500ms delay as synchronized audio
                        }
                      };

                      audio.onerror = (error) => {
                        console.error('❌ [FINAL AUDIO ERROR] Final audio error:', error);
                        URL.revokeObjectURL(audioUrl);
                        setIsPlaying(false);
                        setCurrentAudio(null);
                        if (currentAudioUrlRef.current === audioUrl) {
                          currentAudioUrlRef.current = null;
                        }

                        // ENHANCED ERROR RECOVERY: Apply same error recovery timing as synchronized audio
                        if (allowAudioPlaybackRef.current && isLiveConversationActiveRef.current) {
                          console.log('🎤 [FINAL AUDIO ERROR] Preparing error recovery after final audio failure');

                          setTimeout(() => {
                            if (!liveConversationTimeoutRef.current &&
                              isLiveConversationActiveRef.current &&
                              !audioQueueProcessing.current &&
                              !isPlaying &&
                              !isGeneratingAudio) {
                              console.log('🎤 [FINAL AUDIO ERROR] Starting recovery after final audio error');

                              liveConversationTimeoutRef.current = setTimeout(() => {
                                const isConversationStillActive = isLiveConversationActiveRef.current;
                                const isNotCurrentlyProcessing = !audioQueueProcessing.current;
                                const isNotCurrentlyPlaying = !isPlaying;
                                const isNotGenerating = !isGeneratingAudio;

                                console.log('🎤 [FINAL AUDIO ERROR VALIDATION] State check after final audio error:', {
                                  isConversationStillActive,
                                  isNotCurrentlyProcessing,
                                  isNotCurrentlyPlaying,
                                  isNotGenerating
                                });

                                if (isConversationStillActive && isNotCurrentlyProcessing && isNotCurrentlyPlaying && isNotGenerating) {
                                  console.log('🎤 [FINAL AUDIO ERROR] Starting new recording cycle after final audio error');
                                  liveConversationTimeoutRef.current = null;
                                  startLiveRecordingCycle();
                                } else {
                                  console.log('🎤 [FINAL AUDIO ERROR] Conditions not met, skipping restart after final audio error');
                                  liveConversationTimeoutRef.current = null;
                                }
                              }, 6000); // Same 6000ms delay as synchronized audio error recovery
                            }
                          }, 500); // Same 500ms delay as synchronized audio error recovery
                        }
                      };

                      // Stop any currently playing audio
                      if (currentAudio) {
                        currentAudio.pause();
                        if (currentAudioUrlRef.current) {
                          URL.revokeObjectURL(currentAudioUrlRef.current);
                        }
                      }

                      setCurrentAudio(audio);
                      currentAudioUrlRef.current = audioUrl;

                      // Play the final audio
                      audio.play().catch(error => {
                        console.error('⚠️ Final audio play failed:', error);
                        URL.revokeObjectURL(audioUrl);
                        setIsPlaying(false);
                        setCurrentAudio(null);
                        if (currentAudioUrlRef.current === audioUrl) {
                          currentAudioUrlRef.current = null;
                        }
                      });

                    } catch (error) {
                      console.error('Error processing final audio:', error);
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
                  setIsGeneratingAudio(false);
                  break;
                case 'error':
                  throw new Error(data.message || 'Stream error');
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', parseError);
            }
          }
        }
      }

    } catch (error: any) {
      // Only show error if it's not an AbortError (user cancelled)
      if (error?.name !== 'AbortError') {
        console.error('Synchronized streaming error:', error);
        toast({
          title: "Szinkronizált streaming hiba",
          description: "A szinkronizált válasz generálása sikertelen volt",
          variant: "destructive",
        });
      }

      setIsAIResponding(false);
      setStreamingMessage('');
      setIsGeneratingAudio(false);

      // Clean up audio queue and current audio
      synchronizedAudioQueue.current = [];
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
        setIsPlaying(false);
      }

      // Clean up current audio URL in error case
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
    } finally {
      setAbortController(null);
    }
  };

  const sendStreamingMessage = async (messageText: string) => {
    setIsAIResponding(true);
    setStreamingMessage("");

    let isVoiceRequest = messageText.includes('Hangos magyarázat kérése');

    if (isVoiceRequest && (isGeneratingAudio || isPlaying)) {
      toast({
        title: "Hangos felolvasás már folyamatban",
        description: "Várj, amíg befejeződik az aktuális felolvasás.",
        variant: "destructive",
      });
      setIsAIResponding(false);
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
    }

    if (isVoiceRequest) {
      setIsGeneratingAudio(true);
    }

    try {
      const controller = new AbortController();
      setAbortController(controller);

      const response = await fetch('/api/chat/message/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          message: messageText,
          relatedModuleId: moduleId,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader!.read();
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
                case 'ai_complete':
                  setIsAIResponding(false);
                  setStreamingMessage('');
                  queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
                  break;
                case 'done':
                  setIsAIResponding(false);
                  break;
                case 'error':
                  throw new Error(data.message || 'Stream error');
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', parseError);
            }
          }
        }
      }

    } catch (error: any) {
      // Only show error if it's not an AbortError (user cancelled)
      if (error?.name !== 'AbortError') {
        console.error('Streaming error:', error);
        toast({
          title: "Streaming hiba",
          description: "A válasz generálása sikertelen volt",
          variant: "destructive",
        });
      }

      setIsAIResponding(false);
      setStreamingMessage('');
      setIsGeneratingAudio(false);

      // Clean up current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
        setIsPlaying(false);
      }
    } finally {
      setAbortController(null);
    }
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('hu-HU', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
        await sendVoiceMessage(audioBlob);
        setAudioChunks([]);

        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Felvételi hiba",
        description: "Nem sikerült elindítani a hangfelvételt.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setIsAIResponding(true);

    try {
      // STEP 1: First transcribe the audio using the correct endpoint
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_message.webm');

      console.log('🎤 Transcribing audio for voice message...');
      const transcribeResponse = await fetch('/api/chat/transcribe', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error('Audio transcription failed');
      }

      const transcriptionResult = await transcribeResponse.json();
      const transcribedText = transcriptionResult.text;

      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error('No speech detected in audio');
      }

      console.log('🎤 Transcription successful:', transcribedText);

      // STEP 2: Send the transcribed text as a regular streaming message
      await sendStreamingMessage(transcribedText);

      toast({
        title: "Hangüzenet feldolgozva",
        description: `Felismert szöveg: "${transcribedText}"`,
      });
    } catch (error) {
      console.error('Voice message error:', error);
      toast({
        title: "Hangüzenet hiba",
        description: error instanceof Error ? error.message : "Nem sikerült feldolgozni a hangüzenetet.",
        variant: "destructive",
      });
    } finally {
      setIsAIResponding(false);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || isAIResponding) return;

    // Trigger auto-scroll for new message submission
    setTimeout(() => {
      if (isNearBottom()) {
        scrollToBottom();
      }
    }, 100);

    sendStreamingMessage(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleAudioPlayback = () => {
    if (!currentAudio) return;

    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      currentAudio.play();
      setIsPlaying(true);
    }
  };

  // Transcribe audio for live conversation without sending as message
  const transcribeAudioForLiveChat = async (audioBlob: Blob): Promise<string> => {
    try {
      // ENHANCED DEBUGGING: Detailed validation before transcription
      console.log('🎤 [LIVE TRANSCRIPTION DEBUG] Audio blob validation:', {
        size: audioBlob.size,
        type: audioBlob.type,
        timestamp: Date.now(),
        conversationActive: isLiveConversationActiveRef.current
      });

      if (audioBlob.size === 0) {
        console.error('🎤 [LIVE ERROR] Empty audio blob detected in live conversation!');
        throw new Error('Empty audio blob - recording may have failed');
      }

      if (audioBlob.size < 500) { // Very small threshold for live conversation
        console.warn('🎤 [LIVE WARNING] Suspiciously small audio blob:', audioBlob.size, 'bytes');
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'live_voice.webm');

      console.log('🎤 [LIVE TRANSCRIPTION] Starting live transcription with blob size:', audioBlob.size);
      const response = await fetch('/api/chat/transcribe', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎤 [LIVE ERROR] Transcription failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          blobSize: audioBlob.size
        });
        throw new Error(`Live transcription failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const transcribedText = result.text || '';

      console.log('🎤 [LIVE TRANSCRIPTION RESULT] Detailed result:', {
        originalText: transcribedText,
        textLength: transcribedText.length,
        isEmpty: transcribedText.length === 0,
        blobSize: audioBlob.size,
        wordsDetected: transcribedText.split(' ').length
      });

      return transcribedText;
    } catch (error) {
      console.error('🎤 [LIVE TRANSCRIPTION ERROR] Detailed error:', {
        error: error instanceof Error ? error.message : error,
        blobSize: audioBlob?.size || 'unknown',
        conversationActive: isLiveConversationActiveRef.current,
        timestamp: Date.now()
      });
      throw error;
    }
  };

  // Generate welcome audio directly with TTS (no AI needed)
  const generateWelcomeAudio = async (text: string, onFinished?: () => void) => {
    try {
      console.log('🔊 Welcome message:', text);

      // Show visual toast AND play welcome audio
      toast({
        title: "🎤 Beszélj bátran!",
        description: text,
        duration: 3000,
      });

      // Generate and play welcome audio using direct TTS
      try {
        const response = await fetch('/api/chat/tts-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text }),
        });

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
          const audioUrl = URL.createObjectURL(audioBlob);

          const audio = new Audio(audioUrl);
          audio.volume = 0.8;

          // CRITICAL FIX: Wait for audio to finish before starting microphone
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            console.log('🔊 Welcome audio finished, now starting microphone...');

            // Start microphone only AFTER welcome audio finishes
            if (onFinished) {
              onFinished();
            }
          };

          // Handle autoplay blocked case
          audio.onerror = () => {
            console.log('🔊 Welcome audio error, starting microphone anyway');
            URL.revokeObjectURL(audioUrl);
            if (onFinished) {
              onFinished();
            }
          };

          try {
            await audio.play();
          } catch (err) {
            console.log('Autoplay blocked, starting microphone immediately:', err);
            URL.revokeObjectURL(audioUrl);
            if (onFinished) {
              onFinished();
            }
          }
        } else {
          console.log('🔊 TTS response not OK, starting microphone immediately');
          if (onFinished) {
            onFinished();
          }
        }
      } catch (audioError) {
        console.log('Welcome audio failed, starting microphone immediately:', audioError);
        if (onFinished) {
          onFinished();
        }
      }

    } catch (error) {
      console.error('Welcome message error:', error);
      // Always call the callback even on error
      if (onFinished) {
        onFinished();
      }
    }
  };

  // ENHANCED: Synchronize state variables to prevent desync
  const syncLiveConversationState = (active: boolean, reason: string) => {
    console.log(`🔄 [STATE] Syncing live conversation state to ${active} - Reason: ${reason}`);
    setIsLiveConversationActive(active);
    isLiveConversationActiveRef.current = active;

    if (active) {
      recordingCycleCountRef.current = 0;
    }

    console.log(`🔄 [STATE] State synchronized: isLiveConversationActive=${active}, ref=${isLiveConversationActiveRef.current}`);
  };

  // Start live conversation mode - ENHANCED
  const startLiveConversation = async () => {
    if (isLiveConversationActiveRef.current) {
      console.log('🔄 [STATE] Stopping existing live conversation before starting new one');
      stopLiveConversation();
      return;
    }

    console.log('🔄 [STATE] Starting live conversation with enhanced state management');

    // Enable audio playback deterministically
    allowAudioPlaybackRef.current = true;

    // Clear any stale queue/state before starting
    synchronizedAudioQueue.current = [];
    firstChunkTimestamp.current = null; // Reset timestamp baseline
    recordingCycleCountRef.current = 0;

    // Clear any existing timeouts to prevent conflicts
    if (liveConversationTimeoutRef.current) {
      clearTimeout(liveConversationTimeoutRef.current);
      liveConversationTimeoutRef.current = null;
      console.log('🔄 [STATE] Cleared existing timeout before starting');
    }

    // ENHANCED: Use synchronized state setter
    syncLiveConversationState(true, "User initiated live conversation");

    toast({
      title: "Élő beszélgetés elindítva",
      description: "Várj, amíg befejezem az üdvözlést...",
    });

    try {
      // FIXED: Wait for welcome audio to finish before starting microphone
      console.log('🔊 Starting welcome audio...');

      const startMicrophoneAfterWelcome = () => {
        console.log('🎤 Welcome audio completed, now starting microphone recording cycle...');

        // Double-check state is still active before starting microphone
        if (!isLiveConversationActiveRef.current) {
          console.log('🎤 [WARNING] Live conversation was stopped during welcome audio, aborting microphone start');
          return;
        }

        setIsWaitingForUserSpeech(true);
        lastRecordingStartTime.current = Date.now();
        startLiveRecordingCycle(true);

        // Update toast to show that user can now speak
        toast({
          title: "🎤 Most már beszélhetsz!",
          description: "Az élő beszélgetés aktív, beszélj bátran!",
          duration: 2000,
        });
      };

      // Play welcome audio and wait for it to finish
      await generateWelcomeAudio("Szia! Élő beszélgetés aktív. Várd meg amíg befejezem, aztán beszélj!", startMicrophoneAfterWelcome);

    } catch (error) {
      console.error('🔄 [ERROR] Error starting live conversation:', error);
      syncLiveConversationState(false, "Error during startup");
      setIsWaitingForUserSpeech(false);

      toast({
        title: "Hiba",
        description: "Nem sikerült elindítani az élő beszélgetést. Próbáld újra!",
        variant: "destructive",
      });
    }
  };

  // Stop live conversation mode - ENHANCED
  const stopLiveConversation = () => {
    console.log('🔄 [STATE] Stopping live conversation with enhanced cleanup');

    // ENHANCED: Use synchronized state setter
    syncLiveConversationState(false, "User stopped or system cleanup");
    setIsWaitingForUserSpeech(false);

    // Disable audio playback to prevent queued audio from playing
    allowAudioPlaybackRef.current = false;

    // Clear audio queue and revoke any pending object URLs
    synchronizedAudioQueue.current = [];
    audioQueueProcessing.current = false;

    // ENHANCED: More thorough timeout cleanup
    if (liveConversationTimeoutRef.current) {
      console.log('🔄 [CLEANUP] Clearing live conversation timeout');
      clearTimeout(liveConversationTimeoutRef.current);
      liveConversationTimeoutRef.current = null;
    }

    // Stop any ongoing recording with enhanced cleanup
    if (mediaRecorder && isRecording) {
      console.log('🔄 [CLEANUP] Stopping ongoing recording');
      try {
        mediaRecorder.stop();
      } catch (e) {
        console.warn('🔄 [CLEANUP] MediaRecorder stop error (expected during cleanup):', e);
      }
      setIsRecording(false);
      setMediaRecorder(null);
    }

    // Stop any playing audio
    if (currentAudio) {
      console.log('🔄 [CLEANUP] Stopping current audio playback');
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsPlaying(false);

      // Revoke current audio URL to prevent memory leak
      if (currentAudioUrlRef.current) {
        URL.revokeObjectURL(currentAudioUrlRef.current);
        currentAudioUrlRef.current = null;
      }
    }

    // Cancel AI response if ongoing
    if (abortController) {
      console.log('🔄 [CLEANUP] Aborting ongoing AI request');
      abortController.abort();
      setAbortController(null);
    }

    setIsAIResponding(false);
    setStreamingMessage('');
    setIsGeneratingAudio(false);

    // Reset recording cycle counter
    recordingCycleCountRef.current = 0;
    lastRecordingStartTime.current = null;

    // Re-enable audio playback for future use (non-live conversations)
    setTimeout(() => {
      allowAudioPlaybackRef.current = true;
      console.log('🔄 [STATE] Audio playback re-enabled for future use');
    }, 500);

    toast({
      title: "Élő beszélgetés leállítva",
      description: "A beszélgetés befejezve.",
    });
  };

  // Live recording cycle for conversation - FIXED VERSION
  const startLiveRecordingCycle = async (isActive = isLiveConversationActiveRef.current) => {
    // Enhanced debugging for state tracking
    console.log('🎤 [DEBUG] startLiveRecordingCycle called with:', {
      isActive,
      isLiveConversationActiveRef: isLiveConversationActiveRef.current,
      isRecording,
      isWaitingForUserSpeech,
      isPlaying
    });

    // Prevent multiple simultaneous recording cycles
    if (!isActive || isRecording || isWaitingForUserSpeech) {
      console.log('🎤 Recording already active or not allowed, skipping');
      return;
    }

    // Additional safety check
    if (!isLiveConversationActiveRef.current) {
      console.log('🎤 [SAFETY] Live conversation not active, aborting cycle');
      return;
    }

    try {
      // CRITICAL TIMING FIX: Do not start recording if audio is currently playing
      if (isPlaying || isGeneratingAudio || audioQueueProcessing.current) {
        console.log('🎤 [TIMING FIX] Skipping recording start - audio system busy:', {
          isPlaying,
          isGeneratingAudio,
          audioQueueProcessing: audioQueueProcessing.current,
          queueLength: synchronizedAudioQueue.current.length
        });

        // ENHANCED TIMING: Schedule retry with much longer delay to ensure audio system is fully idle
        liveConversationTimeoutRef.current = setTimeout(() => {
          console.log('🎤 [TIMING FIX] Retrying recording start after audio system idle period');
          liveConversationTimeoutRef.current = null;
          startLiveRecordingCycle();
        }, 8000); // INCREASED from 5000ms to 8000ms for complete audio finish
        return;
      }

      console.log('🎤 Starting live recording cycle...');
      setIsWaitingForUserSpeech(true);

      // Start recording for user input with enhanced audio processing
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      });
      console.log('🎤 Media stream acquired');

      // ENHANCED: Use let instead of const to prevent closure issues
      let recorder: MediaRecorder | null = null;
      let recordedChunks: Blob[] = [];
      let recordingCompleted = false;

      try {
        recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
      } catch (e) {
        // Fallback for browsers that don't support opus
        console.warn('🎤 Opus codec not supported, falling back to default');
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        console.log('🎤 [ENHANCED] Data available:', {
          size: event.data.size,
          type: event.data.type,
          currentChunks: recordedChunks.length,
          recordingCompleted,
          conversationActive: isLiveConversationActiveRef.current
        });

        if (event.data.size > 0 && !recordingCompleted) {
          recordedChunks.push(event.data);
          console.log('🎤 [ENHANCED] Chunk added, total chunks:', recordedChunks.length);
        }
      };

      recorder.onstop = async () => {
        recordingCompleted = true;
        console.log('🎤 [ENHANCED] Recording stopped. State:', {
          chunks: recordedChunks.length,
          totalSize: recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0),
          conversationActive: isLiveConversationActiveRef.current,
          isActive: isActive
        });

        setIsWaitingForUserSpeech(false);
        setIsRecording(false);
        setMediaRecorder(null);

        // Clean up stream immediately
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🎤 Track stopped:', track.kind, track.label);
        });

        // ENHANCED: More detailed validation with specific error logging
        const hasChunks = recordedChunks.length > 0;
        const totalSize = recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0);
        const conversationStillActive = isLiveConversationActiveRef.current;

        console.log('🎤 [VALIDATION] Checking conditions:', {
          hasChunks,
          totalSize,
          conversationStillActive,
          shouldProceed: hasChunks && totalSize > 0 && conversationStillActive
        });

        if (!hasChunks || totalSize === 0) {
          console.error('🎤 [ERROR] No audio data captured!');
          if (conversationStillActive) {
            liveConversationTimeoutRef.current = setTimeout(() => {
              startLiveRecordingCycle();
            }, 3000); // Shorter retry for data issues
          }
          return;
        }

        if (!conversationStillActive) {
          console.log('🎤 [INFO] Conversation no longer active, stopping');
          return;
        }

        const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
        console.log('🎤 [ENHANCED] Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunksUsed: recordedChunks.length
        });

        // SAFETY: Double-check blob size
        if (audioBlob.size === 0) {
          console.error('🎤 [ERROR] Created blob is empty despite having chunks!');
          if (isLiveConversationActiveRef.current) {
            liveConversationTimeoutRef.current = setTimeout(() => {
              startLiveRecordingCycle();
            }, 3000);
          }
          return;
        }

        try {
          // Transcribe the audio
          console.log('🎤 Starting transcription with blob size:', audioBlob.size);
          const transcribedText = await transcribeAudioForLiveChat(audioBlob);
          console.log('🎤 Transcription result:', transcribedText);

          // ENHANCED echo/noise filtering with better empty audio detection
          const lowerText = transcribedText.toLowerCase().trim();
          const isValidTranscription = transcribedText &&
            transcribedText.trim().length > 3 && // Minimum 3 characters (reduced for short questions)
            !lowerText.includes('amara.org') &&
            !lowerText.includes('köszönöm') &&
            !lowerText.includes('feliratok') &&
            !lowerText.includes('angol feliratok') &&
            !lowerText.includes('kapcsold be') &&
            !lowerText.includes('tetszik') &&
            !lowerText.includes('lájkolj') &&
            !lowerText.includes('oszd meg') &&
            !lowerText.includes('videót') &&
            !lowerText.includes('megnézted') &&
            !lowerText.includes('youtube') &&
            !lowerText.includes('subscribe') &&
            !lowerText.includes('channel') &&
            // ENHANCED validation: Better detection of actual speech vs noise
            transcribedText.split(' ').length >= 1 && // At least 1 word (for very short questions)
            // Block obvious repetitive patterns and common transcription errors
            !lowerText.match(/(.{5,})\s*\1/g) &&
            // Block common empty audio transcription results
            !lowerText.includes('thank you') &&
            !lowerText.includes('thanks for watching') &&
            !lowerText.includes('bye') &&
            !lowerText.includes('see you later') &&
            lowerText !== 'you' &&
            lowerText !== 'thank' &&
            lowerText !== 'thanks' &&
            lowerText !== '';

          if (isValidTranscription && isLiveConversationActiveRef.current) {
            console.log('🎤 [SUCCESS] Valid transcription, sending to AI:', transcribedText);

            // ENHANCED STATE MANAGEMENT: Disable audio playback ref during AI processing to prevent interference
            allowAudioPlaybackRef.current = true; // Ensure audio playback is allowed for response

            // Send the transcribed text to AI and get voice response with prefix for audio
            await sendSynchronizedStreamingMessage(`Hangos magyarázat kérése: ${transcribedText}`);

            // Audio playback processing is now handled in enhanced timing within processAudioQueue
            console.log('🎤 [ENHANCED] AI response sent, audio timing management is handled by enhanced queue processing');
          } else if (isLiveConversationActiveRef.current) {
            // Invalid/filtered transcription, try again with longer delay for stability
            console.log('🎤 [VALIDATION] Invalid or filtered transcription, trying again with enhanced timing...', {
              textLength: transcribedText.length,
              wordCount: transcribedText.split(' ').length,
              isValid: isValidTranscription,
              transcriptionPreview: transcribedText.substring(0, 50)
            });

            // ENHANCED TIMING: Longer delay for invalid transcriptions to avoid rapid retries
            liveConversationTimeoutRef.current = setTimeout(() => {
              liveConversationTimeoutRef.current = null;
              startLiveRecordingCycle();
            }, 4000); // INCREASED from 3000ms to 4000ms for better stability
          }
        } catch (error) {
          console.error('🎤 [ERROR] Error processing live conversation:', error);
          if (isLiveConversationActiveRef.current) {
            toast({
              title: "Beszédfelismerési hiba",
              description: "Próbáld újra beszélni.",
              variant: "destructive",
            });
            // Continue the conversation despite the error
            liveConversationTimeoutRef.current = setTimeout(() => {
              startLiveRecordingCycle();
            }, 3000); // Shorter retry for errors
          }
        }
      };

      setMediaRecorder(recorder);
      recorder.start(1000); // Collect data every 1 second for better chunk management
      setIsRecording(true);

      console.log('🎤 [ENHANCED] Recording started with improved chunk collection');

      // Auto-stop recording after 8 seconds to get user input (shorter time)
      setTimeout(() => {
        if (recorder && recorder.state === 'recording') {
          console.log('🎤 [ENHANCED] Auto-stopping recording after timeout');
          recorder.stop();
        }
      }, 8000);

    } catch (error) {
      console.error('🎤 [ERROR] Error starting live recording cycle:', error);
      setIsWaitingForUserSpeech(false);
      setIsRecording(false);
      toast({
        title: "Mikrofonhozzáférési hiba",
        description: "Nem sikerült elérni a mikrofont.",
        variant: "destructive",
      });
      stopLiveConversation();
    }
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

  // AI Chat Disabled logic moved inside main return

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
          {aiChatEnabled && (
            <>
              <Button
                variant={isLiveConversationActive ? "destructive" : "default"}
                className={`w-full justify-start ${isLiveConversationActive
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                onClick={startLiveConversation}
                disabled={isAIResponding || isGeneratingAudio || isPlaying}
              >
                <Mic className="h-4 w-4 mr-2" />
                {isLiveConversationActive ? "Élő beszélgetés leállítása" : "Élő beszélgetés indítása"}
                {(isWaitingForUserSpeech || isRecording) && (
                  <div className="ml-2 flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
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
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
              </Button>
            </>
          )}
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
      <CardContent className="flex-1 flex flex-col p-4 bg-[#9c8e8e4f]">
        {!aiChatEnabled && user?.role !== 'admin' ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 bg-slate-50/80 rounded-lg">
            <div className="rounded-full bg-slate-200 p-6 mb-4">
              <Bot className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Tanár Szolgáltatás Szünetel</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Az AI iskolai asszisztens szolgáltatás jelenleg kikapcsolt állapotban van az adminisztrátor által.
            </p>
            <div className="flex flex-col gap-2 text-sm text-slate-500 bg-white p-4 rounded-lg border w-full max-w-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span>Karbantartás vagy beállítási szünet</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                <span>Kérjük, próbálja meg később</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-96 scroll-smooth">
              {/* Messages */}
              {(messages as ChatMessage[]).filter((msg: ChatMessage) => !msg.isSystemMessage).map((msg: ChatMessage) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${msg.senderRole === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.senderRole === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-neutral-200 text-neutral-600'
                      }`}>
                      {msg.senderRole === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`rounded-lg p-3 ${msg.senderRole === 'user'
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
                              h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-neutral-800">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-neutral-800">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-medium mb-1 text-neutral-800">{children}</h3>,
                              p: ({ children }) => <p className="mb-2 leading-relaxed text-neutral-800">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-neutral-800">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-neutral-800">{children}</ol>,
                              li: ({ children }) => <li className="text-neutral-800">{children}</li>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-neutral-400 pl-2 italic mb-2 bg-neutral-50 py-1 text-neutral-700">{children}</blockquote>,
                              code: ({ children }) => <code className="bg-neutral-200 px-1 py-0.5 rounded text-xs font-mono text-neutral-900">{children}</code>,
                              pre: ({ children }) => <pre className="bg-neutral-200 p-2 rounded-md overflow-x-auto mb-2 text-xs">{children}</pre>,
                              strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
                              em: ({ children }) => <em className="italic text-neutral-700">{children}</em>,
                              table: ({ children }) => <table className="w-full border-collapse border border-neutral-300 mb-2 text-xs">{children}</table>,
                              th: ({ children }) => <th className="border border-neutral-300 px-2 py-1 bg-neutral-200 font-semibold text-neutral-900">{children}</th>,
                              td: ({ children }) => <td className="border border-neutral-300 px-2 py-1 text-neutral-800">{children}</td>,
                              a: ({ href, children }) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                            }}
                          >
                            {msg.message}
                          </ReactMarkdown>
                        </div>
                      )}
                      <div className={`text-xs mt-1 ${msg.senderRole === 'user' ? 'text-blue-100' : 'text-neutral-500'
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
                                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-neutral-800">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-neutral-800">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-medium mb-1 text-neutral-800">{children}</h3>,
                                p: ({ children }) => <p className="mb-2 leading-relaxed text-neutral-800">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-neutral-800">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-neutral-800">{children}</ol>,
                                li: ({ children }) => <li className="text-neutral-800">{children}</li>,
                                blockquote: ({ children }) => <blockquote className="border-l-2 border-neutral-400 pl-2 italic mb-2 bg-neutral-50 py-1 text-neutral-700">{children}</blockquote>,
                                code: ({ children }) => <code className="bg-neutral-200 px-1 py-0.5 rounded text-xs font-mono text-neutral-900">{children}</code>,
                                pre: ({ children }) => <pre className="bg-neutral-200 p-2 rounded-md overflow-x-auto mb-2 text-xs">{children}</pre>,
                                strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
                                em: ({ children }) => <em className="italic text-neutral-700">{children}</em>,
                                table: ({ children }) => <table className="w-full border-collapse border border-neutral-300 mb-2 text-xs">{children}</table>,
                                th: ({ children }) => <th className="border border-neutral-300 px-2 py-1 bg-neutral-200 font-semibold text-neutral-900">{children}</th>,
                                td: ({ children }) => <td className="border border-neutral-300 px-2 py-1 text-neutral-800">{children}</td>,
                                a: ({ href, children }) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
                              }}
                            >
                              {streamingMessage}
                            </ReactMarkdown>
                            <span className="inline-block w-2 h-5 bg-neutral-400 ml-1 animate-pulse"></span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="animate-pulse flex space-x-1">
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-xs text-neutral-500">AI válaszol...</span>
                            {isGeneratingAudio && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <Volume2 size={12} />
                                Hang generálása...
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="animate-pulse flex space-x-1">
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-neutral-600">Válasz készítése...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t pt-4">
              <div className="flex gap-2 items-end">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Írj üzenetet az AI tanárnak..."
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

                {/* Audio Control Button */}
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

                {/* Stop Button */}
                {(isAIResponding || isPlaying) && (
                  <Button
                    onClick={() => {
                      if (currentAudio) {
                        currentAudio.pause();
                        setCurrentAudio(null);
                        setIsPlaying(false);
                      }

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
          </>
        )}
      </CardContent>
    </Card>
  );
}