import { Router } from "express";
import { multiApiService } from "../multiApiService";
import { combinedAuth } from "./middleware";
import { storage } from "../storage";
import { pool } from "../db";

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
      openai: !!process.env.OPENAI_API_KEY || !!(await storage.getSystemSetting('openai_api_key'))?.value,
      gemini: !!process.env.GEMINI_API_KEY || !!(await storage.getSystemSetting('gemini_api_key'))?.value,
      youtube: !!process.env.YOUTUBE_API_KEY || !!(await storage.getSystemSetting('youtube_api_key'))?.value,
      elevenLabs: !!process.env.ELEVENLABS_API_KEY || !!(await storage.getSystemSetting('elevenlabs_api_key'))?.value,
      together: !!process.env.TOGETHER_API_KEY || !!(await storage.getSystemSetting('together_api_key'))?.value,
      deepinfra: !!process.env.DEEPINFRA_API_KEY || !!(await storage.getSystemSetting('deepinfra_api_key'))?.value,
      dataForSeo: (!!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD) ||
        (!!(await storage.getSystemSetting('dataforseo_login'))?.value && !!(await storage.getSystemSetting('dataforseo_password'))?.value)
    };
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.get('/db-status', combinedAuth, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).end();
    if (typeof (pool as any).getStatus === 'function') {
      res.json((pool as any).getStatus());
    } else {
      res.json({
        primaryOnline: true,
        backupOnline: null,
        backupConfigured: false,
        activeSource: 'primary'
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/db-backup-url', combinedAuth, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).end();
    const setting = await storage.getSystemSetting('database_url_backup');
    res.json({ url: setting?.value || process.env.DATABASE_URL_BACKUP || '' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/db-backup-url', combinedAuth, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).end();
    const { url } = req.body;
    if (url) {
      await storage.setSystemSetting('database_url_backup', url, req.user.id);
    }
    res.json({ success: true, message: 'Másodlagos adatbázis URL mentve. Az élesítéshez indítsd újra a szervert.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/db-switch', combinedAuth, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).end();
    const { source } = req.body;
    if (source !== 'primary' && source !== 'backup') {
      return res.status(400).json({ message: "Invalid source parameter" });
    }

    if (typeof (pool as any).switchSource === 'function') {
      const success = (pool as any).switchSource(source);
      if (success) {
        res.json({ success: true, message: `Successfully switched to ${source}` });
      } else {
        res.status(400).json({ success: false, message: `Failed to switch to ${source}. Is it configured?` });
      }
    } else {
      res.status(400).json({ success: false, message: "Redundancy pool not initialized" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
