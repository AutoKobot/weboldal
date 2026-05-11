import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import multer from "multer";
import { 
  generateSynchronizedStreamingResponse, 
  transcribeAudio, 
  generateSpeech 
} from "../openai";
import { insertChatMessageSchema } from "@shared/schema";

const router = Router();
// Config multer for in-memory storage of small audio chunks
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to safely log simple API costs
async function recordCost(provider: string, service: string, cost: number) {
  try {
    await storage.recordSimpleApiCall(provider, service, cost);
  } catch (e) {
    // Non-critical error
  }
}

// 1. GET chat history (formerly handled in server/routes/index.ts)
router.get('/messages', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const moduleId = req.query.moduleId ? parseInt(req.query.moduleId as string) : undefined;
    const messages = await storage.getChatMessages(userId, moduleId);
    res.json(messages);
  } catch (error) {
    console.error('[CHAT] Error fetching history:', error);
    res.status(500).json({ message: 'Hiba a chat előzmények betöltésekor' });
  }
});

// 2. DELETE chat history
router.delete('/messages', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const moduleId = req.query.moduleId ? parseInt(req.query.moduleId as string) : undefined;
    await storage.deleteChatMessages(userId, moduleId);
    res.json({ success: true, message: 'Üzenetek törölve' });
  } catch (error) {
    console.error('[CHAT] Error deleting history:', error);
    res.status(500).json({ message: 'Hiba az üzenetek törlésekor' });
  }
});

// 3. Transcribe endpoint
router.post('/transcribe', combinedAuth, upload.single('audio'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Hangfájl nem érkezett" });
    }

    console.log(`[CHAT] Transcribing audio chunk of size ${req.file.buffer.length} bytes...`);
    const text = await transcribeAudio(req.file.buffer, req.file.originalname || "voice.webm");
    
    // Est recording cost (Whisper API is approx 0.006 / min)
    await recordCost('OpenAI', 'Whisper', 0.0005); 

    res.json({ text });
  } catch (error) {
    console.error('[CHAT] Transcription failed:', error);
    res.status(500).json({ message: "Hiba a beszédfelismerés során" });
  }
});

// 4. Direct TTS Endpoint for fast generation
router.post('/tts-direct', combinedAuth, async (req: any, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Szöveg megadása kötelező" });

    console.log(`[CHAT] Generating direct TTS for: "${text.substring(0, 30)}..."`);
    const audioBuffer = await generateSpeech(text);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    console.error('[CHAT] Direct TTS failed:', error);
    res.status(500).json({ message: "Hiba a hangszintézis során" });
  }
});

// 5. Synchronized Streaming API (Text + Audio Chunks side-by-side)
router.post('/message/synchronized-stream', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { message, relatedModuleId } = req.body;

    if (!message) return res.status(400).json({ message: "Üzenet megadása kötelező" });

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // 1. Persist User Message to storage first
    const userMsg = await storage.createChatMessage({
      userId,
      message,
      relatedModuleId: relatedModuleId ? parseInt(relatedModuleId) : null,
      senderRole: 'user',
      isSystemMessage: false
    });

    // Emit initial message ack
    res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMsg })}\n\n`);

    // 2. Build context from history and module
    let contextData = '';
    if (relatedModuleId) {
      const module = await storage.getModule(parseInt(relatedModuleId));
      contextData = module?.detailedContent || module?.content || '';
    }

    const history = await storage.getChatMessages(userId, relatedModuleId ? parseInt(relatedModuleId) : undefined);
    const messageHistory = history.slice(-4).map(m => ({
      role: m.senderRole === 'user' ? 'user' : 'assistant',
      content: m.message
    }));

    // 3. Pull Prompt from settings
    const promptSetting = await storage.getSystemSetting('ai_system_message');
    const customPrompt = promptSetting?.value || null;

    console.log(`[CHAT] Starting synchronized generation for user ${userId}...`);

    // 4. Run generator
    const finalAnswer = await generateSynchronizedStreamingResponse(
      message,
      contextData,
      messageHistory,
      (chunk, timestamp) => {
        // Send text delta
        res.write(`data: ${JSON.stringify({ type: 'text_chunk', data: chunk, timestamp })}\n\n`);
      },
      (audioBuffer, timestamp, textChunk) => {
        // Send binary chunk encoded to base64
        res.write(`data: ${JSON.stringify({ 
          type: 'audio_chunk', 
          data: audioBuffer.toString('base64'), 
          timestamp,
          text: textChunk
        })}\n\n`);
      },
      customPrompt
    );

    // 5. Persist AI response
    const aiMsg = await storage.createChatMessage({
      userId,
      message: finalAnswer,
      relatedModuleId: relatedModuleId ? parseInt(relatedModuleId) : null,
      senderRole: 'assistant',
      isSystemMessage: false
    });

    // Final token billing approx
    await recordCost('OpenAI', 'Chat', Math.ceil(finalAnswer.length/4) * 0.00015);

    // End connection
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('[CHAT] Sync Stream Exception:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Hiba a kérés feldolgozása közben" });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: "Interrupted" })}\n\n`);
      res.end();
    }
  }
});

export default router;
