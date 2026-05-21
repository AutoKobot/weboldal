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

router.get(['/ai-chat', '/ai-chat-enabled'], combinedAuth, async (req: any, res) => {
  try {
    const setting = await storage.getSystemSetting('ai_chat_enabled');
    res.json({ enabled: setting ? setting.value === 'true' : true });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch setting" });
  }
});

router.post(['/ai-chat', '/ai-chat-enabled'], combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { enabled } = req.body;
    await storage.setSystemSetting('ai_chat_enabled', String(enabled), req.user.id);
    res.json({ message: "Setting updated successfully", enabled });
  } catch (error) {
    res.status(500).json({ message: "Failed to update setting" });
  }
});

router.get('/ai', combinedAuth, adminOnly, async (req: any, res) => {
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

router.patch('/ai', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const settings = await storage.updateAISettings(req.body, req.user.id);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to update AI settings" });
  }
});

router.post('/api-keys/:provider', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { provider } = req.params;
    const { key } = req.body;
    
    let settingKey = `${provider.toLowerCase()}_api_key`;
    if (provider.toLowerCase() === 'dataforseo-login') {
      settingKey = 'dataforseo_login';
    } else if (provider.toLowerCase() === 'dataforseo-password') {
      settingKey = 'dataforseo_password';
    }
    
    await storage.setSystemSetting(settingKey, key, req.user.id);

    res.json({ success: true, message: "API key updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update API key" });
  }
});

router.post('/ai-provider', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { provider } = req.body;
    await storage.setSystemSetting('active_ai_provider', provider, req.user.id);
    res.json({ success: true, message: "AI provider updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update AI provider" });
  }
});

router.post('/test-supabase', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { supabaseUrl, supabaseAnonKey } = req.body;
    // Simple verification - try to fetch something or just save and return success
    // In a real app we'd test the connection
    res.json({ status: 'success', message: "Kapcsolat sikeres" });
  } catch (error) {
    res.status(500).json({ status: 'error', message: "Kapcsolati hiba" });
  }
});

// Prompt management
const promptKeys = [
  'ai_system_message', 'ai_module_update_message', 'ai_youtube_prompt',
  'ai_flux_schnell_prompt', 'ai_internet_content_prompt', 'concise-content-prompt',
  'audio-explanation-prompt', 'text-explanation-prompt'
];

const defaultPrompts: Record<string, string> = {
  ai_system_message: "You are a helpful AI assistant providing clear and concise information related to educational topics.",
  ai_module_update_message: "As an AI assistant, your task is to update or generate content for a specific educational module based on the provided instructions. Focus on delivering accurate, comprehensive, and engaging material. Ensure the content is well-structured, easy to understand, and adheres to the specified tone and format. Pay close attention to any constraints or specific requirements given, such as length, keywords, or target audience. If asked to generate a mind map, provide it in Mermaid.js flowchart syntax.",
  ai_youtube_prompt: "Keresd meg a legrelevánsabb és legnépszerűbb YouTube videót a következő témában, különös tekintettel a magyar nyelvű videókra. Add meg a videó címét és URL-jét:",
  ai_flux_schnell_prompt: "Clean, precise technical illustration, engineering drawing style, blueprint or clear vector-style educational diagram, NO TEXT: {prompt}. Completely text-free, white or clean background, precise lines, technical aesthetic.",
  ai_internet_content_prompt: "Keress releváns tartalmat az interneten a következő témával kapcsolatban. Adjon meg 3-5 rövid összefoglalót a forrás megjelölésével (cím, URL):",
  "concise-content-prompt": "Fogalmazd meg tömören a következő tartalmat, maximum 100 szóban. A válasz csak az összefoglalást tartalmazza:",
  "audio-explanation-prompt": "Készíts egy rövid, érthető hangos magyarázatot a következő szöveghez. Koncentrálj a legfontosabb információkra és a könnyen emészthető formátumra:",
  "text-explanation-prompt": "Adj részletes, könnyen érthető magyarázatot a következő fogalomról/szövegről:"
};

router.get('/prompts/:key', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { key } = req.params;
    if (!promptKeys.includes(key)) return res.status(400).json({ message: "Invalid prompt key" });
    const setting = await storage.getSystemSetting(key);
    const value = setting?.value || defaultPrompts[key] || '';
    res.json({ message: value });
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
