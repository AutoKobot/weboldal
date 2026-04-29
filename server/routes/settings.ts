import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

const adminOnly = async (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

router.get('/ai-chat-enabled', combinedAuth, async (req: any, res) => {
  try {
    const setting = await storage.getSystemSetting('ai_chat_enabled');
    res.json({ enabled: setting ? setting.value === 'true' : true });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch setting" });
  }
});

router.post('/ai-chat-enabled', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { enabled } = req.body;
    await storage.setSystemSetting('ai_chat_enabled', String(enabled), req.user.id);
    res.json({ message: "Setting updated successfully", enabled });
  } catch (error) {
    res.status(500).json({ message: "Failed to update setting" });
  }
});

router.get('/ai-settings', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const settings = await storage.getAISettings();
    res.json(settings || { 
      imageProvider: 'openai', imageModel: 'dall-e-3',
      model: 'gpt-4o-mini', maxTokens: 2000, temperature: '0.7'
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch AI settings" });
  }
});

router.patch('/ai-settings', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const settings = await storage.updateAISettings(req.body, req.user.id);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to update AI settings" });
  }
});

router.post('/api-keys', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { openaiApiKey, togetherApiKey, deepinfraApiKey, geminiApiKey, serpApiKey, youtubeApiKey, elevenLabsKey, key, value } = req.body;
    
    if (openaiApiKey) await storage.setSystemSetting('openai_api_key', openaiApiKey, req.user.id);
    if (togetherApiKey) await storage.setSystemSetting('together_api_key', togetherApiKey, req.user.id);
    if (deepinfraApiKey) await storage.setSystemSetting('deepinfra_api_key', deepinfraApiKey, req.user.id);
    if (geminiApiKey) await storage.setSystemSetting('gemini_api_key', geminiApiKey, req.user.id);
    if (serpApiKey) await storage.setSystemSetting('serp_api_key', serpApiKey, req.user.id);
    if (youtubeApiKey) await storage.setSystemSetting('youtube_api_key', youtubeApiKey, req.user.id);
    if (elevenLabsKey) await storage.setSystemSetting('elevenlabs_api_key', elevenLabsKey, req.user.id);
    
    if (key && value !== undefined) {
      await storage.setSystemSetting(key, value, req.user.id);
    }

    res.json({ success: true, message: "API keys updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update API keys" });
  }
});

// Prompt management
const promptKeys = [
  'ai_system_message', 'ai_module_update_message', 'ai_youtube_prompt',
  'ai_wikipedia_prompt', 'ai_internet_content_prompt', 'concise-content-prompt',
  'audio-explanation-prompt', 'text-explanation-prompt'
];

router.get('/prompts/:key', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { key } = req.params;
    if (!promptKeys.includes(key)) return res.status(400).json({ message: "Invalid prompt key" });
    const setting = await storage.getSystemSetting(key);
    res.json({ message: setting?.value || '' });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch prompt" });
  }
});

router.post('/prompts/:key', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { key } = req.params;
    const { message } = req.body;
    if (!promptKeys.includes(key)) return res.status(400).json({ message: "Invalid prompt key" });
    await storage.setSystemSetting(key, message, req.user.id);
    res.json({ message: "Prompt updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update prompt" });
  }
});

export default router;
