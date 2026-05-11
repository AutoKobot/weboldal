import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { storage } from "./storage";
import { multiApiService } from "./multiApiService";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { generateEdgeSpeech } from "./edge-tts";

export interface QuizEvaluation {
  score: number;
  feedback: string;
  isCorrect: boolean;
}

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
          hasValidStart = true;
          // If the line is purely a declaration, push it and skip regular processing
          if (!line.includes('[') && !line.includes('(') && !line.includes('-->')) {
            cleanedLines.push(line);
            continue;
          }
        } else {
          continue;
        }
      }

      // Fix parentheses in node text that break syntax
      let fixedLine = line;

      // Automatically wrap square bracket content containing parentheses in double quotes to prevent Mermaid parser errors
      fixedLine = fixedLine.replace(/([a-zA-Z0-9_-]+)\[([^"\]]+)\]/g, (match: string, id: string, text: string) => {
        if (text.includes('(') || text.includes(')')) {
          return `${id}["${text}"]`;
        }
        return match;
      });

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
export async function getOpenAIClient(): Promise<OpenAI> {
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
export async function getGeminiClient(): Promise<GoogleGenerativeAI> {
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
  } else {
    systemPrompt = `Tapasztalt magyar oktatóként segíts a diákoknak részletesen és érthetően. Adj strukturált, praktikus magyarázatokat példákkal.`;
  }

  // Append strictly enforcing module boundaries
  if (moduleContent && moduleContent !== 'basic_ai_only' && moduleContent !== 'chat') {
    systemPrompt += `\n\n### SZIGORÚ KONTEXTUS (Kizárólag ezen tananyag alapján válaszolj!):\nTananyag:\n${moduleContent.substring(0, 3000)}`;
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
      model: "gpt-4o-mini",
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
  } else {
    systemPrompt = `Te egy professzionális tananyag-fejlesztő AI vagy. A feladatod: a kapott bemeneti szöveget ALAPANYAGKÉNT kezelve készíts belőle részletes, strukturált, oktatási célú tananyagot. NE másold le egyszerűen a szöveget! Bővítsd ki magyarázatokkal, példákkal, és tagold logikusan.`;
  }

  // Strict context enforce for Gemini
  if (moduleContent && moduleContent !== 'basic_ai_only' && moduleContent !== 'chat') {
    systemPrompt += `\n\n### SZIGORÚ KONTEXTUS (Kizárólag ezen tananyag alapján válaszolj!):\nTananyag:\n${moduleContent.substring(0, 3000)}`;
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
    // Try multiple Gemini models in order of preference
    const modelsToTry = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
    let lastError;

    for (const modelName of modelsToTry) {
      try {
        // console.log(`Trying Gemini model: ${modelName}`);
        const model = gemini.getGenerativeModel({ model: modelName });
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

        return fullResponse; // Success!
      } catch (error: any) {
        console.error(`Gemini model ${modelName} failed:`, error.message);
        lastError = error;
        // Continue to next model
      }
    }

    // If all Gemini models failed
    throw lastError || new Error("All Gemini models failed");
  } catch (error: any) {
    console.error("Gemini streaming API error:", error);

    // Handle any Gemini error by falling back to OpenAI
    console.log(`Gemini API error (${error.status || error.message}), switching to OpenAI for this request`);

    // Fallback to OpenAI
    try {
      const openai = await getOpenAIClient();
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use mini for cost optimization
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
        // Strip markdown code fences if the AI wrapped the entire response
        const cleanMessage = message.replace(/^```(markdown|md)?\s*|\s*```$/gi, '');
        return { message: cleanMessage, suggestions: [] };
      } else {
        const gemini = await getGeminiClient();
        const message = await generateGeminiChatResponse(userMessage, 'basic_ai_only');
        // Strip markdown code fences if the AI wrapped the entire response
        const cleanMessage = message.replace(/^```(markdown|md)?\s*|\s*```$/gi, '');
        return { message: cleanMessage, suggestions: [] };
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
      model: "gpt-4o-mini", // Cost-effective model
      messages,
      max_tokens: 4000, 
      temperature: 0.7, 
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
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I couldn't explain that concept.";
  } catch (error) {
    console.error("Concept explanation error:", error);
    throw new Error("Failed to explain concept");
  }
}

export async function generateSpeech(text: string): Promise<Buffer> {
  try {
    // Először megpróbáljuk a kiváló minőségű, ingyenes Microsoft Edge Neural TTS-t
    try {
      // Tisztítsuk meg a szöveget a biztonság kedvéért a markdown elemektől a beszédszintetizátor számára
      const cleanText = text.replace(/\*\*/g, '').replace(/#/g, '');
      
      // Az Edge TTS simán kezel nagyobb blokkokat is
      console.log(`[SPEECH] Attempting free Edge TTS for ${cleanText.length} chars...`);
      return await generateEdgeSpeech(cleanText, 'hu-HU-NoemiNeural');
    } catch (edgeError) {
      console.error("[SPEECH] Edge TTS fallback alert:", edgeError);
      // Ha valamiért hiba történt az Edge websockettel, továbblépünk az OpenAI tartalékra
    }

    // TARTALÉK (FALLBACK): Ha a Microsoft Edge nem elérhető, az OpenAI fizetős API-jával oldjuk meg a generálást.
    const openai = await getOpenAIClient();
    
    // Chunk text if it exceeds API limits (4096 characters for OpenAI TTS)
    const MAX_CHUNK_LENGTH = 4000;
    
    if (text.length <= MAX_CHUNK_LENGTH) {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
        speed: 1.0, 
        response_format: "mp3",
      });
      return Buffer.from(await mp3.arrayBuffer());
    }

    // Split text into chunks at sentence boundaries
    const chunks: string[] = [];
    let currentChunk = "";
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      if ((currentChunk.length + sentence.length) > MAX_CHUNK_LENGTH) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    // Fallback if a single sentence is incredibly long
    if (chunks.length === 0) chunks.push(text.substring(0, MAX_CHUNK_LENGTH));

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      if (!chunk) continue;
      const mp3Chunk = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: chunk,
        speed: 1.0, 
        response_format: "mp3",
      });
      buffers.push(Buffer.from(await mp3Chunk.arrayBuffer()));
    }
    
    // MP3 files can be concatenated safely
    return Buffer.concat(buffers);
  } catch (error) {
    console.error("All TTS providers failed:", error);
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
    } else {
      systemPrompt = `Tapasztalt magyar oktatóként segíts a diákoknak részletesen és érthetően. Adj strukturált, praktikus magyarázatokat példákkal.`;
    }

    // Append detailed content constraints
    if (moduleContent) {
      systemPrompt += `\n\n### SZIGORÚ KONTEXTUS (Csak ezen téma alapján válaszolj!):\nTananyag:\n${moduleContent.substring(0, 3000)}`;
    }

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (chatHistory) {
      messages.push(...chatHistory);
    }

    messages.push({ role: "user", content: userMessage });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
                // Szupergyors, ingyenes Edge TTS használata OpenAI API helyett a chat során is!
                const audioBuffer = await generateEdgeSpeech(textForAudio, 'hu-HU-NoemiNeural');
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
          // Utolsó szövegtömb konvertálása Edge TTS segítségével
          const audioBuffer = await generateEdgeSpeech(finalText, 'hu-HU-NoemiNeural');
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
    // 1. OPTIMIZATION: Local check for exact matches (avoids API call)
    // If the user's answer matches the correct answer exactly (normalized), 
    // we can skip the AI evaluation entirely.
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();

    // Check for exact match or single letter choice match (e.g. user selected "A" and correct is "A")
    if (normalizedUser === normalizedCorrect) {
      console.log('⚡ Local evaluation: Exact match found, skipping AI call.');
      return {
        score: 100,
        feedback: "Helyes válasz! Pontosan eltaláltad.",
        isCorrect: true
      };
    }

    // Check if user answer is contained in correct answer (common for multiple choice text)
    // but only if the user answer is substantial enough (>3 chars) to avoid false positives
    if (normalizedUser.length > 3 && normalizedCorrect.includes(normalizedUser)) {
      console.log('⚡ Local evaluation: Substring match found, skipping AI call.');
      return {
        score: 100,
        feedback: "Helyes válasz!",
        isCorrect: true
      };
    }

    // 2. Only if local check fails, use AI for fuzzy evaluation
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
      model: "gpt-4o-mini",
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
      isCorrect: result.score >= 45
    };
  } catch (error) {
    console.error("Error evaluating answer:", error);
    // Fallback for error cases - assume incorrect rather than crashing
    return {
      score: 0,
      feedback: "Nem sikerült kiértékelni a választ. Kérlek próbáld újra.",
      isCorrect: false
    };
  }
}

export interface PresentationSlide {
  id: number;
  type: "title" | "content" | "interactive" | "summary";
  title: string;
  subtitle?: string;
  content: string; // Markdown or HTML-like
  narration?: string; // NEW: Detailed narration script for audio
  narrationAudioUrl?: string; // NEW: URL to the generated audio file
  layout: "centered" | "split-left-image" | "split-right-image" | "full-text" | "interactive-focus";
  imagePrompt?: string; // Prompt for image generation
  imageUrl?: string; // URL of generated image
  interactiveType?: "quiz" | "flashcard" | "stepper" | "hotspot" | "diagram";
  interactiveData?: any; // Structured data for the specific interactive component
}

export async function generatePresentationData(moduleTitle: string, moduleContent: string): Promise<PresentationSlide[]> {
  try {
    const openai = await getOpenAIClient();

    const prompt = `Te egy profi digitális tananyagfejlesztő vagy. 
Készíts egy interaktív, prémium minőségű prezentációt: "${moduleTitle}"
Tananyag: ${moduleContent.substring(0, 40000)}

FONTOS TARTALMI KÖVETELMÉNYEK (HOSSZ):
A kapott tananyagot BŐVÍTSD KI a saját releváns szakmai tudásoddal (mintha végeztél volna egy alapos webes kutatást a témában), hogy egy átfogóbb, mélyebb anyagot kapjunk.
A "narration" mezők (hangos prezentáció szövege) együttes hossza az összes dián összesítve érje el a **700 - 2000 szót**. Ez azért kritikus, hogy az ebből generált hanganyag **legalább 5 perces, de maximum 15 perces** legyen (átlagos beszédsebességgel számolva). Minden dián adj meg kellően részletes, magyarázó és érdekfeszítő "narration" szöveget!

PRÉMIUM VIZUÁLIS SZABÁLYOK:
1. DESIGN STÍLUS: "Clean, precise technical illustration, engineering drawing style, blueprint or vector-style educational diagram, high-quality, clear lines".
2. EGY KÉP (SZIGORÚ): Minden diának PONTOSAN 1 képet KELL tartalmaznia a "imagePrompts" listában.
3. SZÖVEG TILOS: A képeken SEMMILYEN szöveg, felirat vagy írás nem szerepelhet! Az AI ne tegyen semmilyen karaktert a képre.
4. TÉMAKÖR ÉS RÉSZLETESSÉG: A kép a dián szereplő tényleges témáról szóljon. Inkább mérnöki ábra, tervrajz vagy egyértelmű műszaki illusztráció legyen, ami jól elmagyarázza a fogalmat, ne pedig egy sima fotó. LÉGY NAGYON PRECIÍZ! Ne csak a témát add meg absztrakt módon, hanem pontosan, fizikailag írd le, hogy minek kell szerepelnie a rajzon (pl. "a side-view technical drawing of a wooden chair with arrows pointing to the 90-degree backrest angle and lumbar support, showing exact structural components").
5. NYELV (KRITIKUS): Az "imagePrompts" tartalmát KIZÁRÓLAG ANGOL NYELVEN (English) írd meg, mert a képgeneráló modell nem ért magyarul! Azonban MINDEN MÁS MEZŐ (title, content, narration, interactiveData kérdései és válaszai) KÖTELEZŐEN MAGYAR NYELVEN kell, hogy készüljön!

JSON struktúra:
{
  "slides": [
    {
      "id": 1,
      "type": "content",
      "title": "Dia címe",
      "content": "Szakmai Markdown tartalom",
      "narration": "Hungarian narration.",
      "layout": "split-right-image",
      "imagePrompts": [
        "Clean technical illustration of [exact, detailed physical description of the object, components, and angles], engineering drawing style, clear white background, no text, precise lines"
      ],
      "interactiveType": "quiz",
      "interactiveData": {
        "question": "Kérdés szövege?",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "A",
        "explanation": "Magyarázat..."
      }
    }
  ]
}

INTERAKTIVITÁS SZABÁLYA:
Ha egy dián kérdés vagy teszt szerepel, KÖTELEZŐ az "interactiveType": "quiz" használata és az "interactiveData" kitöltése. Az ilyen diákon a rendszer AUTOMATIKUSAN megáll a hang végén és megvárja a választ. Ne írj kérdést a sima content-be, ha azt akarod, hogy a diák válaszoljon rá!

Válaszolj KIZÁRÓLAG érvényes JSON-ban!`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(response.choices[0].message.content || '{"slides": []}');
    return data.slides;
  } catch (error) {
    console.error("Presentation generation error:", error);
    throw new Error("Failed to generate presentation data");
  }
}

export async function generatePresentationImage(prompt: string): Promise<string> {
  try {
    const settings = await storage.getAISettings();
    const provider = settings?.imageProvider || 'openai';
    const modelKey = settings?.imageModel || 'dall-e-3';
    
    // LOGGING TO CONSOLE FOR DEBUGGING (Visible in Render Logs)
    console.log(`[IMAGE GENERATION DEBUG] Selected Provider: ${provider}, Model Key: ${modelKey}`);
    
    let imageUrl = "";
    let providerName = provider;
    let modelName = modelKey;
    let costUsd = 0;

    if (provider === 'openai') {
      const openai = await getOpenAIClient();
      modelName = "dall-e-3";
      costUsd = 0.04;

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Clean, precise technical illustration, engineering drawing style, blueprint or clear vector-style educational diagram, NO TEXT: ${prompt}. Completely text-free, white or clean background, precise lines, technical aesthetic.`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid",
      });

      imageUrl = response.data?.[0]?.url || response.data?.[0]?.b64_json || "";
    } else if (provider === 'together') {
      const apiKey = process.env.TOGETHER_API_KEY || (await storage.getSystemSetting('together_api_key'))?.value;
      if (!apiKey) throw new Error("Together AI API key not configured");
      
      // Mapping for Together AI
      const mapping: Record<string, string> = {
        'flux-pro': 'black-forest-labs/FLUX.1-pro',
        'flux-dev': 'black-forest-labs/FLUX.1-dev',
        'flux-schnell': 'black-forest-labs/FLUX.1-schnell'
      };
      modelName = mapping[modelKey] || mapping['flux-pro'];
      
      // Costs (estimated with 1.5x margin)
      const costMap: Record<string, number> = {
        'flux-pro': 0.045,
        'flux-dev': 0.015,
        'flux-schnell': 0.003
      };
      costUsd = costMap[modelKey] || 0.045;

      const response = await fetch("https://api.together.xyz/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt: `Clean, precise technical illustration, engineering drawing style, blueprint or clear vector-style educational diagram, NO TEXT: ${prompt}. Completely text-free, white or clean background, precise lines, technical aesthetic.`,
          model: modelName,
          n: 1,
          size: "1024x1024"
        })
      });

      if (response.ok) {
        const data = await response.json();
        imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || "";
      }
    } else if (provider === 'deepinfra') {
      const apiKey = process.env.DEEPINFRA_API_KEY || (await storage.getSystemSetting('deepinfra_api_key'))?.value;
      if (!apiKey) throw new Error("DeepInfra API key not configured");
      
      // Mapping for DeepInfra
      const mapping: Record<string, string> = {
        'flux-pro': 'black-forest-labs/FLUX-1-pro',
        'flux-dev': 'black-forest-labs/FLUX-1-dev',
        'flux-schnell': 'black-forest-labs/FLUX-1-schnell'
      };
      modelName = mapping[modelKey] || mapping['flux-schnell'];

      // Costs (estimated with 1.5x margin)
      const costMap: Record<string, number> = {
        'flux-pro': 0.045,
        'flux-dev': 0.015,
        'flux-schnell': 0.003
      };
      costUsd = costMap[modelKey] || 0.003;

      const response = await fetch("https://api.deepinfra.com/v1/openai/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt: `Clean, precise technical illustration, engineering drawing style, blueprint or clear vector-style educational diagram, NO TEXT: ${prompt}. Completely text-free, white or clean background, precise lines, technical aesthetic.`,
          model: modelName,
          n: 1,
          size: "1024x1024"
        })
      });

      if (response.ok) {
        const data = await response.json();
        // DeepInfra might return in OpenAI format OR their native format
        imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || data.images?.[0] || "";
        
        if (imageUrl) {
          console.log(`[DEEPINFRA] Image generated successfully: ${imageUrl.substring(0, 50)}...`);
        } else {
          console.error(`[DEEPINFRA] Response OK, but no image found. Response: ${JSON.stringify(data).substring(0, 200)}...`);
        }
      } else {
        const errorData = await response.text();
        console.error(`[DEEPINFRA] API Error: ${response.status} - ${errorData}`);
      }
    }

    // Log the API call for cost tracking
    if (imageUrl) {
      console.log(`[IMAGE] Final Image URL result for slide: ${imageUrl.substring(0, 50)}...`);
      await storage.logApiCall({
        provider: providerName,
        service: "image_generation",
        model: modelName,
        tokenCount: 0,
        costUsd: costUsd.toString(),
        requestData: JSON.stringify({ prompt }),
        responseData: JSON.stringify({ imageUrl: "URL_GEN" }) // Don't store full URL to save space
      });
    } else {
      console.error(`[IMAGE] Failed to produce imageUrl for provider: ${providerName}`);
    }

    return imageUrl;
  } catch (error) {
    console.error("Image generation error:", error);
    return "";
  }
}

export interface MindMapNode {
  id: string;
  label: string;
  description: string;
  narration: string;
  color?: string;
  children?: MindMapNode[];
}

export async function generateMindMapData(moduleTitle: string, moduleContent: string): Promise<MindMapNode> {
  try {
    const openai = await getOpenAIClient();

    const prompt = `Te egy profi digitális tananyagfejlesztő vagy.
Készíts egy interaktív, ágakra bomló, strukturált ELMETÉRKÉP (Mind Map) fastruktúrát az alábbi témából: "${moduleTitle}"
Tananyag: ${moduleContent.substring(0, 40000)}

FONTOS RENDELKEZÉSEK:
1. Az elmetérképnek van egy egyetlen gyökér-csomópontja (Root Node), amiből ágaznak ki az alpontok (Főágak), majd azokból a részletesebb pontok (Alágak).
2. Összesen **8 - 15 csomópont** legyen az egész fában a jobb átláthatóság érdekében. A mélysége maximum 3 szint legyen.
3. Minden csomóponthoz (Node) tartozzon egy rövid, érdekes narrációs szöveg ("narration"), amely elmagyarázza az adott fogalmat. Ezt a lejátszó hangosan fel fogja olvasni. A narráció hossza 20-50 szó legyen csomópontonként.
4. Minden csomóponthoz tartozzon egy rövid magyarázó címke vagy leírás ("description") is (1-2 mondat).
5. A "label" (címke) legyen rövid (1-3 szó), tiszta magyar szakszó vagy kifejezés.

JSON struktúra (Rekurzív):
{
  "id": "root",
  "label": "Téma címe",
  "description": "A téma rövid összefoglalása.",
  "narration": "Üdvözöllek! Ebben az elmetérképben megismerkedünk a [téma] alapjaival...",
  "color": "#3b82f6",
  "children": [
    {
      "id": "node_1",
      "label": "Főág neve",
      "description": "Főág rövid leírása.",
      "narration": "Az első nagy témakörünk a...",
      "color": "#10b981",
      "children": [
        {
          "id": "node_1_1",
          "label": "Alág neve",
          "description": "Alág részletei.",
          "narration": "Ezen belül fontos megemlíteni a...",
          "color": "#f59e0b"
        }
      ]
    }
  ]
}

Válaszolj KIZÁRÓLAG érvényes JSON formátumban, a fenti rekurzív struktúrával!`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4000,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error("Mind map generation error:", error);
    throw new Error("Failed to generate mind map data");
  }
}

