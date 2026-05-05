import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { insertChatMessageSchema } from "@shared/schema";
import { 
  generateChatResponse, 
  generateStreamingChatResponse, 
  generateSpeech 
} from "../openai";
import { enhancedModuleGenerator } from "../enhanced-module-generator";

const router = Router();

// Cache for sitemap to avoid repeated database queries
let sitemapCache: any = null;
let sitemapCacheTime: number = 0;
const SITEMAP_CACHE_DURATION = 30000;

const generateSitemap = async (userId: string, forceRefresh: boolean = false) => {
  try {
    const now = Date.now();
    if (!forceRefresh && sitemapCache && (now - sitemapCacheTime) < SITEMAP_CACHE_DURATION) {
      return sitemapCache;
    }

    const user = await storage.getUser(userId);
    const professions = await storage.getProfessions();
    const subjects = await storage.getSubjects();
    const modules = await storage.getModules();

    const completedModules = user?.completedModules || [];
    const totalModules = modules.length;
    const completionPercentage = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

    const sitemap = {
      website: "Global Learning System - AI Oktatási Platform",
      user_role: user?.role || 'student',
      user_progress: {
        completed_modules: completedModules,
        total_modules: totalModules,
        completion_percentage: completionPercentage,
        current_profession: (user?.assignedProfessionIds && user.assignedProfessionIds.length > 0) ?
          professions.find(p => p.id === (user.assignedProfessionIds || [])[0])?.name : 'Nincs kiválasztva'
      },
      main_sections: [
        { name: "Főoldal", url: "/", description: "Dashboard és áttekintés" },
        { 
          name: "Szakmák", url: "/tananyagok", description: "Elérhető szakmák listája",
          subsections: professions.map(prof => ({
            name: prof.name, id: prof.id, description: prof.description,
            is_assigned: (user?.assignedProfessionIds && user.assignedProfessionIds.includes(prof.id)) || false
          }))
        },
        { name: "Közösségi Tanulás", url: "/community", description: "Csoportos tanulás és megbeszélések" },
        { name: "Haladásom", url: "/progress", description: "Tanulási előrehaladás követése" },
        { name: "Beállítások", url: "/settings", description: "Felhasználói beállítások" }
      ],
      available_modules: modules.map(module => ({
        id: module.id, title: module.title, url: `/modules/${module.id}`,
        subject_id: module.subjectId,
        subject_name: subjects.find(s => s.id === module.subjectId)?.name,
        profession_name: subjects.find(s => s.id === module.subjectId) ?
          professions.find(p => p.id === subjects.find(s => s.id === module.subjectId)?.professionId)?.name : null,
        is_completed: completedModules.includes(module.id),
        is_accessible: true
      })),
      available_subjects: subjects.map((subject: any) => ({
        id: subject.id, name: subject.name, profession_id: subject.professionId,
        profession_name: professions.find((p: any) => p.id === subject.professionId)?.name
      })),
      last_updated: new Date().toISOString()
    };

    sitemapCache = sitemap;
    sitemapCacheTime = now;
    return sitemap;
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return sitemapCache || null;
  }
};

router.post('/voice-chat', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    const chatEnabledSetting = await storage.getSystemSetting('ai_chat_enabled');
    const isChatEnabled = chatEnabledSetting ? chatEnabledSetting.value === 'true' : true;
    const user = await storage.getUser(userId);
    if (!isChatEnabled && user?.role !== 'admin') {
      return res.status(403).json({ message: "Az AI chat funkció jelenleg ki van kapcsolva." });
    }

    const sitemap = await generateSitemap(userId);
    const systemMessage = `Szabolcs vagyok, a magyar hangnavigációs asszisztensed. Segítek neked a platform használatában és navigációban.
WEBOLDAL TÉRKÉP ÉS KONTEXTUS:
${JSON.stringify(sitemap, null, 2)}
FONTOS: Használd a fenti weboldal térképet a navigációs kérések megválaszolásához.`;

    const response = await generateChatResponse(message, systemMessage, []);
    res.json({ message: response.message });
  } catch (error) {
    console.error("Voice chat error:", error);
    res.status(500).json({ message: "Hiba történt a válasz generálása során" });
  }
});

// GET chat messages (history) — frontend calls /api/chat/messages?moduleId=xxx
router.get('/chat/messages', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const moduleId = req.query.moduleId ? parseInt(req.query.moduleId as string) : undefined;
    const messages = await storage.getChatMessages(userId, moduleId);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Hiba a chat előzmények betöltésekor' });
  }
});

router.post('/message/stream', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { isSystemMessage, ...messageBody } = req.body;
    const messageData = insertChatMessageSchema.parse({
      ...messageBody, userId, senderRole: 'user', isSystemMessage: isSystemMessage || false,
    });

    const isVoiceRequest = messageData.message.includes('Hangos magyarázat kérése');
    const chatEnabledSetting = await storage.getSystemSetting('ai_chat_enabled');
    if ((chatEnabledSetting?.value === 'false') && (req.user.role !== 'admin')) {
      return res.status(403).json({ message: "Az AI chat funkció jelenleg ki van kapcsolva." });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const userMessage = await storage.createChatMessage(messageData);
    res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`);

    let moduleContent = undefined;
    let moduleTitle = '';
    if (messageData.relatedModuleId) {
      const module = await storage.getModule(messageData.relatedModuleId);
      moduleContent = module?.content;
      moduleTitle = module?.title || '';
    }

    const recentMessages = await storage.getChatMessages(userId, messageData.relatedModuleId || undefined);
    const chatHistory = recentMessages.slice(-3).map(msg => ({
      role: msg.senderRole === 'user' ? 'user' : 'assistant',
      content: msg.message,
    }));

    const [audioPromptSetting, textPromptSetting] = await Promise.all([
      storage.getSystemSetting('audio-explanation-prompt'),
      storage.getSystemSetting('text-explanation-prompt')
    ]);

    let customPrompt = null;
    if (isVoiceRequest && audioPromptSetting?.value) {
      customPrompt = audioPromptSetting.value
        .replace('{question}', messageData.message)
        .replace('{title}', moduleTitle || 'Tananyag')
        .replace('{content}', (moduleContent || '').substring(0, 800));
    } else if (!isVoiceRequest && textPromptSetting?.value) {
      customPrompt = textPromptSetting.value
        .replace('{question}', messageData.message)
        .replace('{title}', moduleTitle || 'Tananyag')
        .replace('{content}', (moduleContent || '').substring(0, 800));
    }

    const sitemap = await generateSitemap(userId);
    const enhancedContent = `${moduleContent || ''}\n\nWEBOLDAL NAVIGÁCIÓS TÉRKÉP:\n${JSON.stringify(sitemap, null, 2)}`;

    let fullResponse = '';
    await generateStreamingChatResponse(
      messageData.message, enhancedContent, chatHistory,
      (chunk: string) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: 'ai_chunk', data: chunk })}\n\n`);
      },
      customPrompt
    );

    const textTokens = Math.ceil(fullResponse.length / 4);
    await storage.recordSimpleApiCall('OpenAI', 'Chat', textTokens * 0.00015);

    if (isVoiceRequest && fullResponse) {
      try {
        const finalAudio = await generateSpeech(fullResponse);
        await storage.recordSimpleApiCall('OpenAI', 'TTS', fullResponse.length * 0.000015);
        res.write(`data: ${JSON.stringify({ type: 'final_audio', data: finalAudio.toString('base64') })}\n\n`);
      } catch (e) {
        res.write(`data: ${JSON.stringify({ type: 'audio_error', message: 'Audio generation failed' })}\n\n`);
      }
    }

    const aiMessage = await storage.createChatMessage({
      message: fullResponse, userId, senderRole: 'assistant',
      relatedModuleId: messageData.relatedModuleId, isSystemMessage: false
    });
    res.write(`data: ${JSON.stringify({ type: 'ai_message', data: aiMessage })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error("Streaming chat error:", error);
    if (!res.headersSent) res.status(500).json({ message: "Error" });
    else res.end();
  }
});

router.get('/queue-status', combinedAuth, async (req, res) => {
  try {
    const { aiQueueManager } = await import('../ai-queue-manager');
    res.json(aiQueueManager.getQueueStatus());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch queue status" });
  }
});

router.post('/modules/:id/generate-presentation', combinedAuth, async (req: any, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'school_admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    const moduleId = parseInt(req.params.id);
    const module = await storage.getModule(moduleId);
    if (!module) return res.status(404).json({ message: "Module not found" });

    const { aiQueueManager } = await import('../ai-queue-manager');
    aiQueueManager.queueAIPresentationGeneration(module.id, module.title, module.detailedContent || module.content)
      .catch(err => console.error(`Background presentation error:`, err));

    res.status(202).json({ success: true, message: "Queued", status: "queued" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to queue presentation" });
  }
});

router.post('/modules/:id/regenerate-quizzes', combinedAuth, async (req: any, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      return res.status(403).json({ message: "Access denied" });
    }

    const module = await storage.getModule(moduleId);
    if (!module) return res.status(404).json({ message: "Module not found" });

    const { aiQueueManager } = await import('../ai-queue-manager');
    aiQueueManager.queueAIQuizRegeneration(module.id, module.title, module.detailedContent || module.content)
      .catch(err => console.error(`Background quiz regeneration error:`, err));

    res.status(202).json({ success: true, message: "Queued", status: "queued" });
  } catch (error) {
    console.error("Error regenerating quizzes:", error);
    res.status(500).json({ message: "Failed to regenerate quizzes" });
  }
});

router.post('/modules/:id/regenerate', combinedAuth, async (req: any, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      return res.status(403).json({ message: "Access denied" });
    }

    const module = await storage.getModule(moduleId);
    if (!module) return res.status(404).json({ message: "Module not found" });

    const { title, content } = req.body;
    let subjectContext = '', subjectName = '', professionName = '';

    if (module.subjectId) {
      const subject = await storage.getSubject(module.subjectId);
      if (subject) {
        subjectName = subject.name;
        subjectContext = `Tantárgy: ${subject.name}`;
        if (subject.professionId) {
          const professions = await storage.getProfessions();
          const profession = professions.find(p => p.id === subject.professionId);
          if (profession) {
            professionName = profession.name;
            subjectContext += `, Szakma: ${profession.name}`;
          }
        }
      }
    }

    console.log(`[AI-REGENERATE] Starting regeneration for module: ${module.id} (${module.title})`);
    
    const enhancedContent = await enhancedModuleGenerator.generateEnhancedModule(
      title || module.title, content || module.content, subjectContext, undefined, subjectName, professionName, module.type as 'theory' | 'practical'
    );

    console.log(`[AI-REGENERATE] Content generated successfully. Saving to database...`);

    const updatedModule = await storage.updateModule(moduleId, {
      content: enhancedContent.detailedVersion, // Sync main content with detailed version
      conciseContent: enhancedContent.conciseVersion,
      detailedContent: enhancedContent.detailedVersion,
      keyConceptsData: enhancedContent.keyConceptsWithVideos,
      generatedQuizzes: enhancedContent.generatedQuizzes
    });

    console.log(`[AI-REGENERATE] Module ${moduleId} updated successfully.`);
    res.json(updatedModule);
  } catch (error: any) {
    console.error("Error regenerating module:", error);
    res.status(500).json({ 
      message: "Failed to regenerate module content",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
