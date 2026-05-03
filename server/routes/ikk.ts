import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { ikkService } from "../ikk-service";
import { sql } from "drizzle-orm";
import { db } from "../db";

// Helper for controlled parallel execution
async function runParallel<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array(items.length);
  const executing = new Set<Promise<void>>();
  for (let i = 0; i < items.length; i++) {
    const p = Promise.resolve().then(() => fn(items[i], i)).then(res => {
      results[i] = res;
      executing.delete(p);
    });
    executing.add(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
}

// Helper for retry logic
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (retries <= 0) throw e;
    console.warn(`[IKK-RETRY] Hiba történt, újrapróbálkozás (${retries} maradt)...`);
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1, delay * 1.5);
  }
}

const router = Router();

const adminOnly = async (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

router.get('/professions', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const professions = await ikkService.getProfessions();
    res.json(professions);
  } catch (error) {
    console.error('Error fetching IKK professions:', error);
    res.status(500).json({ message: 'Failed to fetch IKK professions' });
  }
});

// Global state to track background import status
let activeImport: {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  professionName: string;
  activeJobId: number | null;
  error?: string;
} = {
  status: 'idle',
  progress: 0,
  message: '',
  professionName: '',
  activeJobId: null
};

router.get('/status', combinedAuth, adminOnly, async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (activeImport.status !== 'idle') {
      return res.json(activeImport);
    }

    const latestJob = await (storage as any).getLatestBackgroundJob('ikk_import');
    
    if (!latestJob) {
      return res.json({ status: 'idle', progress: 0, message: '', professionName: '', activeJobId: null });
    }

    const lastUpdate = new Date(latestJob.updatedAt || latestJob.updated_at).getTime();
    const isRecent = (Date.now() - lastUpdate) < (5 * 60 * 1000);

    if (latestJob.status !== 'processing' && !isRecent) {
      return res.json({ status: 'idle', progress: 0, message: '', professionName: '', activeJobId: null });
    }

    const statusData = {
      status: latestJob.status,
      progress: latestJob.progress,
      message: latestJob.message,
      professionName: latestJob.data?.professionName || '',
      activeJobId: latestJob.id,
      error: latestJob.error
    };
    
    res.json(statusData);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch import status' });
  }
});

router.post('/cancel', combinedAuth, adminOnly, async (req, res) => {
  try {
    const latestJob = await (storage as any).getLatestBackgroundJob('ikk_import');
    if (latestJob && latestJob.status === 'processing') {
      activeImport.status = 'error';
      activeImport.message = 'Felhasználó által megszakítva.';
      activeImport.error = 'Cancelled by user';
      
      await (storage as any).updateBackgroundJob(latestJob.id, {
        status: 'error',
        message: 'Megszakítva.',
        error: 'User cancelled'
      });
      return res.json({ success: true, message: 'Importálás leállítva.' });
    }
    res.json({ success: false, message: 'Nincs futó importálás.' });
  } catch (error) {
    res.status(500).json({ message: 'Hiba a leállítás során.' });
  }
});

router.post('/reset', combinedAuth, adminOnly, async (req, res) => {
  try {
    activeImport.status = 'idle';
    activeImport.progress = 0;
    activeImport.message = '';
    activeImport.professionName = '';
    activeImport.activeJobId = null;
    activeImport.error = undefined;

    await db.execute(sql`
      DELETE FROM background_jobs 
      WHERE type = 'ikk_import'
    `);

    res.json({ success: true, message: "Minden folyamat leállítva és törölve." });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ message: "Hiba a törlés során" });
  }
});

router.post('/reorganize/:id', combinedAuth, adminOnly, async (req, res) => {
  try {
    const professionId = parseInt(req.params.id);
    await storage.reorganizeSubjects(professionId);
    res.json({ success: true, message: "Sikeres átrendezés!" });
  } catch (error) {
    console.error("Reorganize error:", error);
    res.status(500).json({ message: "Hiba az átrendezés során" });
  }
});

router.post('/import', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { profession, importType = 'both' } = req.body;
    if (!profession) return res.status(400).json({ message: 'Profession data is required' });

    const activeJob = await (storage as any).getLatestBackgroundJob('ikk_import');
    if (activeJob && activeJob.status === 'processing') {
      const lastUpdate = new Date(activeJob.updatedAt || activeJob.updated_at).getTime();
      const now = Date.now();
      const idleMinutes = (now - lastUpdate) / (1000 * 60);

      if (idleMinutes < 15) {
        return res.status(400).json({ message: 'Egy importálás már folyamatban van és aktív. Kérjük várjon vagy próbálja újra később.' });
      } else {
        await (storage as any).updateBackgroundJob(activeJob.id, { 
          status: 'error', 
          message: 'Időtúllépés miatt megszakítva.' 
        });
      }
    }

    const job = await (storage as any).createBackgroundJob('ikk_import', 'Előkészítés...', { 
      professionName: profession.name,
      importType 
    });

    // Update memory state for polling
    activeImport.status = 'processing';
    activeImport.progress = 0;
    activeImport.message = 'Előkészítés...';
    activeImport.professionName = profession.name;
    activeImport.activeJobId = job.id;
    activeImport.error = undefined;

    res.json({ success: true, message: 'Importálás elindítva!', jobId: job.id });

    setTimeout(async () => {
      const jobId = job.id;
      const type = importType as 'theory' | 'practical' | 'both';
      let createdProfessionId: number | null = null;
      
      try {
        if (activeImport.activeJobId !== jobId) return;

        const { getOpenAIClient } = await import('../openai');
        const openai = await getOpenAIClient();
        
        activeImport.message = "Kapcsolat ellenőrzése az OpenAI-val...";
        activeImport.progress = 5;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });
        await openai.models.list();

        activeImport.message = "PDF dokumentumok letöltése (IKK API)...";
        activeImport.progress = 10;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });
        const { kkkText, pttText } = await ikkService.getProfessionContent(profession);
        
        const chunks = ikkService.splitPttIntoSections(pttText);
        if (chunks.length === 0) throw new Error("Nem sikerült tantárgyakat találni a PTT-ben.");

        const mergedSubjectsMap: Map<string, any> = new Map();
        let analysisProgress = 0;
        await runParallel(chunks, 1, async (chunk, i) => {
          if (activeImport.status === 'error' || activeImport.error === 'Cancelled by user') return;

          activeImport.message = `Szerkezet elemzése (${i + 1}/${chunks.length})...`;
          // Map analysis to 15-40% range
          const currentAnalysisProgress = 15 + Math.round((i / chunks.length) * 25);
          if (currentAnalysisProgress > analysisProgress) {
            analysisProgress = currentAnalysisProgress;
            activeImport.progress = analysisProgress;
          }
          
          await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

          const response = await withRetry(async () => {
            const openai = await getOpenAIClient();
            return openai.chat.completions.create({
              model: "gpt-4o-mini",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Te egy precíz PTT elemző vagy. Csak valid JSON-t adsz vissza subjects listával." },
                { role: "user", content: ikkService.buildExtractionPrompt(chunk, type) }
              ],
              temperature: 0,
            });
          });

          const data = JSON.parse(response.choices[0].message.content || '{"subjects":[]}');
          if (data.subjects) {
            for (const sub of data.subjects) {
              const key = sub.name?.toLowerCase().trim();
              if (!key || key.includes('példa')) continue;
              if (!mergedSubjectsMap.has(key)) mergedSubjectsMap.set(key, { ...sub, modules: [] });
              const existing = mergedSubjectsMap.get(key);
              if (sub.modules) {
                for (const mod of sub.modules) {
                  if (!existing.modules.some((m: any) => m.title === mod.title)) existing.modules.push(mod);
                }
              }
            }
          }
        });

        const finalSubjects = Array.from(mergedSubjectsMap.values());
        if (finalSubjects.length === 0) throw new Error("Az AI nem talált feldolgozható tantárgyakat.");

        // Find or create profession
        const allProfs = await storage.getProfessions();
        let dbProfession = allProfs.find(p => p.name === profession.name);
        
        if (!dbProfession) {
          // Create new if not exists
          let totalModulesCount = finalSubjects.reduce((acc, s) => acc + s.modules.length, 0);
          dbProfession = await storage.createProfession({
            name: profession.name,
            description: `Importálva az IKK-ról. (${finalSubjects.length} tantárgy, ${totalModulesCount} modul).`,
            iconName: "book",
            code: profession.okjId || profession.code
          });
        } else {
          // Update existing description to reflect update
          await storage.updateProfession(dbProfession.id, {
            description: dbProfession.description + ` (Frissítve: ${new Date().toLocaleDateString('hu-HU')} - ${type})`
          });
        }
        
        createdProfessionId = dbProfession.id;
        const existingSubjects = await storage.getSubjects(dbProfession.id);

        let processedModules = 0;
        let totalModulesCount = finalSubjects.reduce((acc, s) => acc + s.modules.length, 0);
        
        for (const sub of finalSubjects) {
          if (activeImport.status === 'error' || activeImport.error === 'Cancelled by user') break;

          let dbSubject = existingSubjects.find(s => s.name === sub.name);
          
          if (!dbSubject) {
            dbSubject = await storage.createSubject({
              professionId: dbProfession.id,
              name: sub.name,
              code: sub.code || "",
              description: sub.description || "",
              type: sub.practicalPercent > 0 ? 'practical' : 'theory',
              orderIndex: 0,
              hours: sub.hours || null
            });
          }

          const existingModules = await storage.getModules(dbSubject.id);

          const BATCH_SIZE = 10; // Slightly smaller batches for stability
          const batches = [];
          for (let i = 0; i < sub.modules.length; i += BATCH_SIZE) {
            batches.push(sub.modules.slice(i, i + BATCH_SIZE));
          }

          // Safety delay between subjects
          await new Promise(r => setTimeout(r, 1000));

          await runParallel(batches, 2, async (batch, batchIndex) => {
            if (activeImport.status === 'error' || activeImport.error === 'Cancelled by user') return;

            // Small staggered delay for parallel batches to avoid simultaneous AI hits
            if (batchIndex > 0) await new Promise(r => setTimeout(r, batchIndex * 500));

            const res = await withRetry(async () => {
              const openai = await getOpenAIClient();
              return openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: "Tananyagfejlesztő vagy. Generálj szakmai tartalmat JSON-ben." },
                  { role: "user", content: ikkService.buildContentPrompt(profession.name, sub.name, batch) }
                ],
                temperature: 0.4
              });
            });

            const contentData = JSON.parse(res.choices[0].message.content || '{"modules":[]}');
            const modulesToCreate = (contentData.modules || [])
              .filter((modData: any) => !existingModules.some(em => em.title === modData.title))
              .map((modData: any) => {
                const original = batch.find((m: any) => m.title === modData.title);
                return {
                  subjectId: dbSubject.id,
                  title: modData.title,
                  content: modData.content || "",
                  practicalTasks: modData.practicalTasks || [],
                  type: original?.type || (sub.practicalPercent > 0 ? 'practical' : 'theory'),
                  moduleNumber: ++processedModules,
                  sectionCode: original?.sectionCode || null,
                  isPublished: true
                };
              });

            if (modulesToCreate.length > 0) await storage.bulkCreateModules(modulesToCreate);
            else processedModules += batch.length; // Count existing as processed for progress
            
            // Update progress AFTER each batch
            const currentProgress = 40 + Math.round((processedModules / totalModulesCount) * 55);
            if (currentProgress > activeImport.progress) {
               activeImport.progress = currentProgress;
            }
            activeImport.message = `${sub.name} - Tartalom (${processedModules}/${totalModulesCount})...`;
            
            await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });
          });
        }

        if (activeImport.status === 'error' || activeImport.error === 'Cancelled by user') {
          if (createdProfessionId) await storage.deleteProfession(createdProfessionId);
          return;
        }

        activeImport.status = 'completed';
        activeImport.progress = 100;
        activeImport.message = `Sikeres import: ${dbProfession.name}`;
        
        // Post-import reorganization: split subjects into theory and practical
        if (createdProfessionId) {
          try {
            await storage.reorganizeSubjects(createdProfessionId);
          } catch (reorgErr) {
            console.error("[IKK-IMPORT] Reorganization error:", reorgErr);
          }
        }
        
        await (storage as any).updateBackgroundJob(jobId, { status: 'completed', progress: 100, message: activeImport.message });

      } catch (err: any) {
        console.error("[IKK-IMPORT] Hiba:", err);
        activeImport.status = 'error';
        activeImport.error = err.message;
        if (createdProfessionId) {
          console.log(`[IKK-IMPORT] Takarítás: #${createdProfessionId}`);
          await storage.deleteProfession(createdProfessionId);
        }
        await (storage as any).updateBackgroundJob(jobId, { status: 'error', error: err.message, message: `Hiba: ${err.message}` });
      }
    }, 500);
  } catch (error) {
    res.status(500).json({ message: 'Failed to start IKK import' });
  }
});

export default router;
