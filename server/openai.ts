import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "./storage";
import { multiApiService } from "./multiApiService";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

/**
 * Fix common Mermaid diagram syntax errors in AI-generated content
 */
export function fixMermaidSyntax(content: string): string {
  // Find all Mermaid code blocks
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;

  return content.replace(mermaidRegex, (match, mermaidCode) => {
    let fixedCode = mermaidCode.trim();

    // Step 0: Remove Wikipedia links that break Mermaid syntax
    fixedCode = fixedCode.replace(/\[([^\]]+)\]\(https:\/\/hu\.wikipedia\.org\/wiki\/[^)]+\)/g, '$1');

    // Step 1: Handle duplicate flowchart declarations
    fixedCode = fixedCode.replace(/flowchart\s+TD\s*flowchart\s+TD/gi, 'flowchart TD');
    fixedCode = fixedCode.replace(/flowchart\s+TD\s*flowchart/gi, 'flowchart TD');
    fixedCode = fixedCode.replace(/flowchart\s*flowchart/gi, 'flowchart');

    // Step 2: Handle duplicate graph declarations
    fixedCode = fixedCode.replace(/graph\s+TD\s*graph\s+TD/gi, 'graph TD');
    fixedCode = fixedCode.replace(/graph\s+TD\s*graph/gi, 'graph TD');
    fixedCode = fixedCode.replace(/graph\s*graph/gi, 'graph');

    // Step 3: Clean up and split into lines
    const lines = fixedCode.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);

    let cleanedLines: string[] = [];
    let hasValidStart = false;

    // Step 4: Process each line
    for (const line of lines) {
      // Check if this is a diagram type declaration
      if (line.match(/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gitgraph)/)) {
        if (!hasValidStart) {
          cleanedLines.push(line);
          hasValidStart = true;
        }
        // Skip duplicate diagram declarations
        continue;
      }

      // Fix parentheses in node text that break syntax
      let fixedLine = line;

      // Handle nodes with parentheses in labels - escape them properly
      fixedLine = fixedLine.replace(/([A-Z]\w*)\(([^)]*\([^)]*\)[^)]*)\)/g, (match: string, nodeId: string, content: string) => {
        const escapedContent = content.replace(/\(/g, '&#40;').replace(/\)/g, '&#41;');
        return `${nodeId}["${escapedContent}"]`;
      });

      // Handle arrow syntax with parentheses in labels
      fixedLine = fixedLine.replace(/-->\s*([A-Z]\w*)\(([^)]*\([^)]*\)[^)]*)\)/g, (match: string, nodeId: string, content: string) => {
        const escapedContent = content.replace(/\(/g, '&#40;').replace(/\)/g, '&#41;');
        return `--> ${nodeId}["${escapedContent}"]`;
      });

      // Add regular content lines
      if (hasValidStart) {
        cleanedLines.push(fixedLine);
      }
    }

    // Step 5: Ensure we have a valid diagram type
    if (!hasValidStart || cleanedLines.length === 0) {
      cleanedLines = ['flowchart TD', ...cleanedLines.filter(line =>
        !line.match(/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gitgraph)/)
      )];
    }

    // Step 6: Apply proper indentation
    cleanedLines = cleanedLines.map((line, index) => {
      if (index === 0) return line; // Keep diagram declaration as-is
      if (line.startsWith('    ')) return line; // Already indented
      return '    ' + line; // Add indentation
    });

    // Step 7: Basic syntax fixes
    fixedCode = cleanedLines.join('\n');

    // Remove quotes around node IDs
    // fixedCode = fixedCode.replace(/["'`]/g, '');

    // Fix arrow spacing
    fixedCode = fixedCode.replace(/-->/g, ' --> ');
    fixedCode = fixedCode.replace(/\s+-->\s+/g, ' --> ');

    return '```mermaid\n' + fixedCode + '\n```';
  });
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

// Cache AI clients and system settings to avoid repeated database queries
let cachedOpenAIClient: OpenAI | null = null;
let cachedGeminiClient: GoogleGenerativeAI | null = null;
let cachedOpenAIApiKey: string | null = null;
let cachedGeminiApiKey: string | null = null;
let cachedSystemMessage: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get OpenAI client with API key from environment or database
async function getOpenAIClient(): Promise<OpenAI> {
  const now = Date.now();

  // Use cached client if still valid
  if (cachedOpenAIClient && cachedOpenAIApiKey && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedOpenAIClient;
  }

  // Environment variable takes priority over database
  const currentApiKey = process.env.OPENAI_API_KEY || (await storage.getSystemSetting('openai_api_key'))?.value;

  if (!currentApiKey) {
    throw new Error('OpenAI API key not configured. Please set it in admin settings or .env file.');
  }

  // Create new client and cache it
  cachedOpenAIClient = new OpenAI({ apiKey: currentApiKey });
  cachedOpenAIApiKey = currentApiKey;
  cacheTimestamp = now;

  return cachedOpenAIClient;
}

// Get Gemini client with API key from environment or database
async function getGeminiClient(): Promise<GoogleGenerativeAI> {
  const now = Date.now();

  // Use cached client if still valid
  if (cachedGeminiClient && cachedGeminiApiKey && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedGeminiClient;
  }

  // Environment variable takes priority over database
  const currentApiKey = process.env.GEMINI_API_KEY || (await storage.getSystemSetting('gemini_api_key'))?.value;

  if (!currentApiKey) {
    throw new Error('Gemini API key not configured. Please set it in admin settings or .env file.');
  }

  // Create new client and cache it
  cachedGeminiClient = new GoogleGenerativeAI(currentApiKey);
  cachedGeminiApiKey = currentApiKey;
  cacheTimestamp = now;

  return cachedGeminiClient;
}

// Get cached system message or fetch from database
async function getCachedSystemMessage(): Promise<string | null> {
  const now = Date.now();

  // Use cached message if still valid
  if (cachedSystemMessage && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSystemMessage;
  }

  const customSystemMessage = await storage.getSystemSetting('ai_system_message');
  cachedSystemMessage = customSystemMessage?.value || null;

  return cachedSystemMessage;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizEvaluation {
  score: number; // 1-100
  feedback: string;
  isCorrect: boolean;
}

// Get the current AI provider setting
async function getCurrentAIProvider(): Promise<string> {
  const providerSetting = await storage.getSystemSetting('ai_provider');
  return providerSetting?.value || 'openai';
}

export async function generateStreamingChatResponse(
  userMessage: string,
  moduleContent?: string,
  chatHistory?: { role: string; content: string }[],
  onChunk?: (chunk: string, timestamp?: number) => void,
  customPrompt?: string | null
): Promise<string> {
  try {
    const provider = await getCurrentAIProvider();
    const customSystemMessage = await getCachedSystemMessage();

    if (provider === 'gemini') {
      return await generateGeminiChatResponse(userMessage, moduleContent, chatHistory, onChunk, customPrompt);
    } else {
      const openai = await getOpenAIClient();
      return await generateOpenAIChatResponse(openai, userMessage, moduleContent, chatHistory, customSystemMessage, onChunk, customPrompt);
    }
  } catch (error) {
    console.error('Error in generateStreamingChatResponse:', error);
    throw error;
  }
}

// OpenAI specific chat response generation
async function generateOpenAIChatResponse(
  openai: OpenAI,
  userMessage: string,
  moduleContent?: string,
  chatHistory?: { role: string; content: string }[],
  customSystemMessage?: string | null,
  onChunk?: (chunk: string, timestamp?: number) => void,
  customPrompt?: string | null
): Promise<string> {
  let systemPrompt;

  if (customPrompt) {
    // Use the custom prompt from admin settings
    systemPrompt = customPrompt;
  } else if (customSystemMessage) {
    systemPrompt = customSystemMessage;
    if (moduleContent) {
      systemPrompt += `\n\nJelenlegi modul: ${moduleContent.substring(0, 500)}`;
    }
  } else {
    systemPrompt = `Tapasztalt magyar oktatóként segíts a diákoknak részletesen és érthetően. Adj strukturált, praktikus magyarázatokat példákkal. ${moduleContent ? `\n\nTananyag: ${moduleContent.substring(0, 400)}` : ''}`;
  }

  const messages: any[] = [
    { role: "system", content: systemPrompt }
  ];

  if (chatHistory) {
    messages.push(...chatHistory);
  }

  messages.push({ role: "user", content: userMessage });

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 4000,
      temperature: 0.7,
      stream: true,
      presence_penalty: 0,
      frequency_penalty: 0,
    });

    let fullResponse = '';
    const startTime = Date.now();

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        if (onChunk) {
          const timestamp = Date.now() - startTime;
          onChunk(content, timestamp);
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("OpenAI streaming API error:", error);
    throw new Error("Failed to generate streaming AI response");
  }
}

// Gemini specific chat response generation
async function generateGeminiChatResponse(
  userMessage: string,
  moduleContent?: string,
  chatHistory?: { role: string; content: string }[],
  onChunk?: (chunk: string, timestamp?: number) => void,
  customPrompt?: string | null
): Promise<string> {
  const gemini = await getGeminiClient();
  const customSystemMessage = await getCachedSystemMessage();

  let systemPrompt;
  if (customPrompt) {
    // Use the custom prompt from admin settings
    systemPrompt = customPrompt;
  } else if (customSystemMessage) {
    systemPrompt = customSystemMessage;
    if (moduleContent) {
      systemPrompt += `\n\nJelenlegi modul: ${moduleContent.substring(0, 500)}`;
    }
  } else {
    systemPrompt = `Te egy professzionális tananyag-fejlesztő AI vagy. A feladatod: a kapott bemeneti szöveget ALAPANYAGKÉNT kezelve készíts belőle részletes, strukturált, oktatási célú tananyagot. NE másold le egyszerűen a szöveget! Bővítsd ki magyarázatokkal, példákkal, és tagold logikusan. ${moduleContent ? `\n\nTananyag: ${moduleContent.substring(0, 400)}` : ''}`;
  }

  // Build conversation history for Gemini
  let fullPrompt = systemPrompt + "\n\n";

  if (chatHistory && chatHistory.length > 0) {
    chatHistory.forEach(msg => {
      if (msg.role === 'user') {
        fullPrompt += `Felhasználó: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        fullPrompt += `Asszisztens: ${msg.content}\n`;
      }
    });
  }

  fullPrompt += `Felhasználó: ${userMessage}\nAsszisztens: `;

  try {
    // Start with a stable model
    const model = gemini.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContentStream(fullPrompt);

    let fullResponse = '';
    const startTime = Date.now();

    for await (const chunk of result.stream) {
      const content = chunk.text();
      if (content) {
        fullResponse += content;
        if (onChunk) {
          const timestamp = Date.now() - startTime;
          onChunk(content, timestamp);
        }
      }
    }

    return fullResponse;
  } catch (error: any) {
    console.error("Gemini streaming API error:", error);

    // Handle any Gemini error by falling back to OpenAI
    console.log(`Gemini API error (${error.status || error.message}), switching to OpenAI for this request`);

    // Fallback to OpenAI
    try {
      const openai = await getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Fallback to GPT-4o for high quality
        messages: [
          { role: "system", content: "Te egy professzionális tananyag-fejlesztő AI vagy. Kezeld a bemenetet ALAPANYAGKÉNT." },
          { role: "user", content: fullPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      return response.choices[0]?.message?.content || "Nem sikerült válasz generálása.";
    } catch (openaiError) {
      console.error("OpenAI fallback error:", openaiError);
      throw new Error("Mindkét AI szolgáltató elérhetetlen");
    }
  }
}

// Remove the incorrect function since we're handling it inline

export async function generateChatResponse(
  userMessage: string,
  moduleContent?: string,
  chatHistory?: { role: string; content: string }[],
  customSystemMessage?: string
): Promise<ChatResponse> {
  try {
    const provider = await getCurrentAIProvider();
    const cachedSystemMessage = await getCachedSystemMessage();

    // Skip external API routing for basic AI-only mode or simple chat
    if (moduleContent === 'basic_ai_only' || moduleContent === 'standalone' || moduleContent === 'chat') {
      // Use the provided customSystemMessage if available, otherwise use a directive system prompt
      // that instructs the AI to treat input as base material for course creation
      const systemMessage = customSystemMessage || cachedSystemMessage || "Te egy professzionális tananyag-fejlesztő AI vagy. A feladatod: a kapott bemeneti szöveget ALAPANYAGKÉNT kezelve készíts belőle részletes, strukturált, oktatási célú tananyagot. NE másold le egyszerűen a szöveget! Bővítsd ki magyarázatokkal, példákkal, és tagold logikusan. A cél a tanuló tudásának mélyítése.";

      if (provider === 'openai') {
        const openai = await getOpenAIClient();
        const message = await generateOpenAIChatResponse(openai, userMessage, undefined, [], systemMessage);
        return { message, suggestions: [] };
      } else {
        const gemini = await getGeminiClient();
        const message = await generateGeminiChatResponse(userMessage, 'basic_ai_only');
        return { message, suggestions: [] };
      }
    }

    // Check if user message requires specialized API routing
    const taskRoute = await multiApiService.routeTask(userMessage);

    if (taskRoute.type === 'enhanced_content') {
      // Use enhanced content generation with internet search
      const enhanced = taskRoute.data;
      const enrichedContent = `${moduleContent || ''}\n\nAktuális információk az internetről:\n${enhanced.content}`;
      moduleContent = enrichedContent;
    } else if (taskRoute.type === 'search') {
      // Format search results for chat response
      const searchResults = taskRoute.data;
      const formattedResults = searchResults.map((result: any) =>
        `**${result.title}**\n${result.snippet}\nForrás: ${result.link}`
      ).join('\n\n');

      return {
        message: `Itt vannak a keresési eredmények a következőre: "${userMessage}"\n\n${formattedResults}`,
        suggestions: ["További információk", "Másik keresés", "Kérdések a témáról"]
      };
    } else if (taskRoute.type === 'youtube') {
      // Format YouTube results for chat response
      const videos = taskRoute.data;
      const formattedVideos = videos.map((video: any) =>
        `**${video.snippet.title}**\n${video.snippet.description.substring(0, 200)}...\nYouTube link: https://youtube.com/watch?v=${video.id.videoId}`
      ).join('\n\n');

      return {
        message: `YouTube videók a következő témában: "${userMessage}"\n\n${formattedVideos}`,
        suggestions: ["Videó megtekintése", "További videók", "Kapcsolódó témák"]
      };
    }

    if (provider === 'gemini') {
      const response = await generateGeminiChatResponse(userMessage, moduleContent, chatHistory);
      const fixedResponse = fixMermaidSyntax(response);
      return { message: fixedResponse };
    }

    // OpenAI implementation with GPT-4 Turbo
    const openai = await getOpenAIClient();

    let systemPrompt;

    // Enhanced prompt with multi-API context
    if (customSystemMessage) {
      systemPrompt = customSystemMessage;
      if (moduleContent) {
        systemPrompt += `\n\nJelenlegi modul és aktuális információk: ${moduleContent.substring(0, 800)}`;
      }
    } else {
      systemPrompt = `Tapasztalt magyar oktatóként segíts a diákoknak részletesen és érthetően. Adj strukturált, praktikus magyarázatokat példákkal. Használd a legfrissebb információkat is. ${moduleContent ? `\n\nTananyag és aktuális adatok: ${moduleContent.substring(0, 600)}` : ''}`;
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add chat history if provided
    if (chatHistory) {
      messages.push(...chatHistory);
    }

    messages.push({ role: "user", content: userMessage });

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Upgraded to GPT-4o for better performance and reasoning
      messages,
      max_tokens: 4000, // Increased for more comprehensive responses
      temperature: 0.7, // Better for educational explanations
      stream: false,
      presence_penalty: 0,
      frequency_penalty: 0,
    });

    const content = response.choices[0].message.content || "Sajnálom, nem tudtam választ generálni.";

    // Apply Mermaid syntax fixes to the generated content
    const fixedContent = fixMermaidSyntax(content);

    return {
      message: fixedContent,
      suggestions: ["További kérdések", "Gyakorló feladatok", "Kapcsolódó témák"]
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
}



export async function explainConcept(
  concept: string,
  moduleContent?: string
): Promise<string> {
  try {
    const openai = await getOpenAIClient();

    const prompt = `Explain the concept "${concept}" in simple, clear terms that a student can understand. ${moduleContent ? `Use this module content as context: ${moduleContent}` : ''}

Provide a concise but comprehensive explanation with examples where helpful.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I couldn't explain that concept.";
  } catch (error) {
    console.error("Concept explanation error:", error);
    throw new Error("Failed to explain concept");
  }
}

export async function generateSpeech(
  text: string
): Promise<Buffer> {
  try {
    const openai = await getOpenAIClient();

    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // tts-1 a leggyorsabb modell
      voice: "nova", // Nova hang jobb magyar kiejtéshez
      input: text,
      speed: 1.0, // Normál sebesség a gyorsabb feldolgozásért
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error("OpenAI TTS API error:", error);
    throw new Error("Failed to generate speech");
  }
}

// Synchronized streaming with text and audio chunks
export async function generateSynchronizedStreamingResponse(
  userMessage: string,
  moduleContent?: string,
  chatHistory?: { role: string; content: string }[],
  onTextChunk?: (chunk: string, timestamp: number) => void,
  onAudioChunk?: (audioBuffer: Buffer, timestamp: number, textChunk: string) => void,
  customPrompt?: string | null
): Promise<string> {
  try {
    const [openai, customSystemMessage] = await Promise.all([
      getOpenAIClient(),
      getCachedSystemMessage()
    ]);

    let systemPrompt;

    if (customPrompt) {
      // Use the custom prompt from admin settings
      systemPrompt = customPrompt;
    } else if (customSystemMessage) {
      systemPrompt = customSystemMessage;
      if (moduleContent) {
        systemPrompt += `\n\nJelenlegi modul: ${moduleContent.substring(0, 500)}`;
      }
    } else {
      systemPrompt = `Tapasztalt magyar oktatóként segíts a diákoknak részletesen és érthetően. Adj strukturált, praktikus magyarázatokat példákkal. ${moduleContent ? `\n\nTananyag: ${moduleContent.substring(0, 400)}` : ''}`;
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (chatHistory) {
      messages.push(...chatHistory);
    }

    messages.push({ role: "user", content: userMessage });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1000, // Rövidebb válaszok = gyorsabb
      temperature: 0.5, // Kevesebb kreativitás = gyorsabb
      stream: true,
      presence_penalty: 0,
      frequency_penalty: 0,
    });

    let fullResponse = '';
    let accumulatedText = '';
    const startTime = Date.now();
    const chunkSize = 300; // Nagyobb chunk = kevesebb audio generálás
    const audioPromises: Promise<void>[] = []; // Track all audio generation promises

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        accumulatedText += content;
        const timestamp = Date.now() - startTime;

        // Send text chunk immediately
        if (onTextChunk) {
          onTextChunk(content, timestamp);
        }

        // Generate audio only for complete sentences with substantial length
        if ((accumulatedText.length >= chunkSize ||
          (accumulatedText.match(/[.!?]\s/) && accumulatedText.length >= 80)) && onAudioChunk) {
          // Find a good breaking point (only at complete sentence boundaries)
          let breakPoint = accumulatedText.length;
          const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];

          // Look for sentence boundaries, but only if text is substantial enough
          for (const ender of sentenceEnders) {
            const lastIndex = accumulatedText.lastIndexOf(ender);
            if (lastIndex > 60) { // Minimum 60 karakter egy audio chunkhoz
              breakPoint = lastIndex + ender.length;
              break;
            }
          }

          const textForAudio = accumulatedText.substring(0, breakPoint).trim();
          if (textForAudio) {
            // CRITICAL FIX: Track audio generation promises to wait for completion
            const audioPromise = (async () => {
              try {
                const audioResponse = await openai.audio.speech.create({
                  model: "tts-1",
                  voice: "nova",
                  input: textForAudio,
                  response_format: "mp3",
                });

                const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
                onAudioChunk(audioBuffer, timestamp, textForAudio);
              } catch (audioError) {
                console.error('Error generating audio chunk:', audioError);
                // Continue with text streaming even if audio fails
              }
            })();

            audioPromises.push(audioPromise);
            accumulatedText = accumulatedText.substring(breakPoint); // Keep remaining text
          }
        }
      }
    }

    // Generate audio for any remaining text - Wait for completion
    if (accumulatedText.trim() && onAudioChunk) {
      const finalText = accumulatedText.trim();
      const finalTimestamp = Date.now() - startTime;

      // Track final audio generation promise
      const finalAudioPromise = (async () => {
        try {
          const audioResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "nova",
            input: finalText,
            response_format: "mp3",
          });

          const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
          onAudioChunk(audioBuffer, finalTimestamp, finalText);
        } catch (audioError) {
          console.error('Error generating final audio chunk:', audioError);
        }
      })();

      audioPromises.push(finalAudioPromise);
    }

    // CRITICAL: Wait for all audio chunks to complete before returning
    if (audioPromises.length > 0) {
      console.log(`🎵 Waiting for ${audioPromises.length} audio chunks to complete...`);
      await Promise.allSettled(audioPromises);
      console.log(`🎵 All audio chunks completed!`);
    }

    return fullResponse;
  } catch (error) {
    console.error('Error in synchronized streaming:', error);
    throw new Error(`Failed to generate synchronized response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function transcribeAudio(audioBuffer: Buffer, filename: string = "audio.webm"): Promise<string> {
  try {
    const openai = await getOpenAIClient();

    // Convert WebM to WAV if needed using FFmpeg
    let processedBuffer = audioBuffer;
    let processedFilename = filename;

    if (filename.endsWith('.webm')) {
      const execAsync = promisify(exec);

      // Create temporary files
      const tempDir = '/tmp';
      const inputPath = path.join(tempDir, `input_${Date.now()}.webm`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.wav`);

      try {
        // Write WebM buffer to temporary file
        fs.writeFileSync(inputPath, audioBuffer);

        // Convert WebM to WAV using FFmpeg
        await execAsync(`ffmpeg -i "${inputPath}" -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}"`);

        // Read converted WAV file
        processedBuffer = fs.readFileSync(outputPath);
        processedFilename = 'converted.wav';

        // Clean up temporary files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      } catch (conversionError) {
        console.error("FFmpeg conversion error:", conversionError);
        // If conversion fails, try with original file
        processedBuffer = audioBuffer;
        processedFilename = filename;
      }
    }

    // Determine MIME type from filename extension
    let mimeType = "audio/wav";
    if (processedFilename.endsWith('.mp4') || processedFilename.endsWith('.m4a')) {
      mimeType = "audio/mp4";
    } else if (processedFilename.endsWith('.wav')) {
      mimeType = "audio/wav";
    } else if (processedFilename.endsWith('.mp3')) {
      mimeType = "audio/mp3";
    } else if (processedFilename.endsWith('.ogg')) {
      mimeType = "audio/ogg";
    }

    // Create a File object from the processed buffer
    const audioFile = new File([new Uint8Array(processedBuffer)], processedFilename, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "hu", // Hungarian language
      prompt: "Ez egy oktatási beszélgetés bútor-ergonómiáról és bútortervezésről magyar nyelven. A tanuló kérdéseket tesz fel a következő témákról: ergonómia, bútor, szék magasság, asztal, tervezés, kényelmes, biztonság, hatékonyság, precizitás, testalkat, dőlésszög, párnák, támaszt, méret, forma, kanapé, íróasztal, billentyűzet, munkafolyamat, távolság, kényelem, balesetvédelem, gyártás, lekerekítés, sarkok, használat, emberi test, ülőhely, háttámla, munkavégzés, anatómiai, antropometriai, funkcionalitás, ergonómikus, bútorgyártás, formatervezés, használhatóság, komfort, stabil, tartós, praktikus, esztétikus.", // Enhanced context with comprehensive furniture ergonomics vocabulary
    });

    return transcription.text;
  } catch (error) {
    console.error("OpenAI Whisper API error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

export async function generateQuizQuestions(moduleContent: string, title?: string): Promise<QuizQuestion[]> {
  return generateQuizFromModule(moduleContent);
}

export async function generateQuizFromModule(moduleContent: string): Promise<QuizQuestion[]> {
  try {
    const openai = await getOpenAIClient();

    const prompt = `A következő tananyag alapján generálj 10 tesztkérdést magyar nyelven. 
    Minden kérdéshez adj 4 válaszlehetőséget, amelyből pontosan egy a helyes.
    A kérdések fedelje fel a tananyag fő pontjait és legyenek megfelelő nehézségűek.
    
    Tananyag:
    ${moduleContent}
    
    Válaszolj JSON formátumban, következő struktúrával:
    {
      "questions": [
        {
          "question": "Kérdés szövege?",
          "options": ["A válasz", "B válasz", "C válasz", "D válasz"],
          "correctAnswer": 0,
          "explanation": "Magyarázat a helyes válaszra"
        }
      ]
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Te egy szakértő oktató vagy, aki kiváló tesztkérdéseket készít magyar nyelven. A kérdések legyenek pontosak, egyértelműek és a tananyag lényegét tükrözzék."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
    return result.questions || [];
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

export async function evaluateAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  explanation: string
): Promise<QuizEvaluation> {
  try {
    const openai = await getOpenAIClient();

    const prompt = `Értékeld a tanuló válaszát a következő kérdésre magyar nyelven:

Kérdés: ${question}
Helyes válasz: ${correctAnswer}
Tanuló válasza: ${userAnswer}
Magyarázat: ${explanation}

Adj pontszámot 1-től 100-ig, ahol:
- 100: Teljesen helyes válasz
- 80-99: Nagyrészt helyes, kisebb hiányosságokkal
- 60-79: Részben helyes, de fontos elemek hiányoznak
- 40-59: Alapvetően téves, de van benne valami helyes elem
- 1-39: Teljesen téves válasz

Válaszolj JSON formátumban:
{
  "score": 85,
  "feedback": "Részletes visszajelzés a válaszra",
  "isCorrect": true
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Te egy objektív és segítőkész tanár vagy, aki konstruktív visszajelzést ad a tanulók válaszaira. Legyél bátorító, de pontos az értékelésben."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{"score": 0, "feedback": "Hiba történt az értékelés során", "isCorrect": false}');

    return {
      score: Math.max(1, Math.min(100, result.score)),
      feedback: result.feedback,
      isCorrect: result.score >= 60
    };
  } catch (error) {
    console.error("Error evaluating answer:", error);
    throw new Error("Failed to evaluate answer");
  }
}
