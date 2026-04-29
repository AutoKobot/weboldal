import { Router } from "express";
import { multiApiService } from "../multiApiService";
import { combinedAuth } from "./middleware";
import { storage } from "../storage";

const router = Router();

router.post('/search/internet', combinedAuth, async (req: any, res) => {
  try {
    const { query } = req.body;
    const results = await multiApiService.searchInternet(query);
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/search/youtube', combinedAuth, async (req: any, res) => {
  try {
    const { query } = req.body;
    const results = await multiApiService.searchYoutube(query);
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/wikipedia/:title', async (req, res) => {
  try {
    const searchTerm = decodeURIComponent(req.params.title);
    const summaryUrl = `https://hu.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;
    const response = await fetch(summaryUrl);
    if (response.ok) {
      const data = await response.json();
      res.json({
        title: data.title,
        content: data.extract,
        url: `https://hu.wikipedia.org/wiki/${encodeURIComponent(data.title)}`
      });
    } else {
      res.status(404).json({ message: "Not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Wikipedia error" });
  }
});

router.get('/api-status', combinedAuth, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).end();
    const status = {
      openai: !!(await storage.getSystemSetting('openai_api_key'))?.value,
      gemini: !!(await storage.getSystemSetting('gemini_api_key'))?.value,
      youtube: !!(await storage.getSystemSetting('youtube_api_key'))?.value,
      elevenLabs: !!(await storage.getSystemSetting('elevenlabs_api_key'))?.value
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

export default router;
