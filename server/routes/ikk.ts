import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { ikkService } from "../ikk-service";
import { getOpenAIClient } from "../openai";
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
    // Disable caching for status updates to avoid 304 Not Modified issues
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // If we have any active or recently finished import in memory, return it (faster than DB)
    if (activeImport.status !== 'idle') {
      return res.json(activeImport);
    }

    const latestJob = await (storage as any).getLatestBackgroundJob('ikk_import');
    
    // If we have no job at all, we are idle
    if (!latestJob) {
      return res.json({ status: 'idle', progress: 0, message: '', professionName: '', activeJobId: null });
    }

    // If memory is idle but DB has a job, report the DB state
    // But don't show "completed" or "error" forever - if it's older than 5 minutes and memory is idle, show idle
    const lastUpdate = new Date(latestJob.updatedAt || latestJob.updated_at).getTime();
    const isRecent = (Date.now() - lastUpdate) < (5 * 60 * 1000);

    if (latestJob.status !== 'processing' && !isRecent) {
      return res.json({ status: 'idle', progress: 0, message: '', professionName: '', activeJobId: null });
    }

    // Sync memory state with DB state if memory is idle but DB has a job
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
    // 1. Memory reset
    activeImport = {
      status: 'idle',
      progress: 0,
      message: '',
      professionName: '',
      activeJobId: null
    };

    // 2. Database "Hard Reset" - Delete all ikk_import jobs to clear UI state
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

router.post('/import', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { profession } = req.body;
    if (!profession) return res.status(400).json({ message: 'Profession data is required' });

    const activeJob = await (storage as any).getLatestBackgroundJob('ikk_import');
    if (activeJob && activeJob.status === 'processing') {
      const lastUpdate = new Date(activeJob.updatedAt || activeJob.updated_at).getTime();
      const now = Date.now();
      const idleMinutes = (now - lastUpdate) / (1000 * 60);

      if (idleMinutes < 15) {
        return res.status(400).json({ message: 'Egy importálás már folyamatban van és aktív. Kérjük várjon vagy próbálja újra később.' });
      } else {
        console.warn(`[IKK-IMPORT] Elakadt munka észlelve (nem volt frissítés ${Math.round(idleMinutes)} perce), engedélyezem az új indítást.`);
        await (storage as any).updateBackgroundJob(activeJob.id, { 
          status: 'error', 
          message: 'Időtúllépés miatt megszakítva (egy másik import váltotta fel).' 
        });
      }
    }

    // Create new persistent job
    const job = await (storage as any).createBackgroundJob('ikk_import', 'Előkészítés...', { professionName: profession.name });

    // Update memory state for polling
    activeImport = {
      status: 'processing',
      progress: 0,
      message: 'Előkészítés...',
      professionName: profession.name,
      activeJobId: job.id
    };

    // Send immediate response
    res.json({ success: true, message: 'Importálás elindítva a háttérben!', jobId: job.id });

    // Background Execution - Start after a short delay to ensure DB connections are stabilized
    setTimeout(async () => {
      const jobId = job.id;
      try {
        // Validation: If this is not the current active job, stop immediately
        if (activeImport.activeJobId !== jobId) {
          console.log(`[IKK-IMPORT] Zombi munka észlelve (#${jobId}), leállítás.`);
          return;
        }

        console.log(`[IKK-IMPORT-DEBUG] Háttérfolyamat indítása... Job: ${jobId}`);
        console.log(`[IKK-IMPORT] Megkezdve: ${profession.name} (Job: ${jobId})`);
        
        console.log(`[IKK-IMPORT-DEBUG] Status frissítése (AI inicializálás előtt)...`);
        
        // Final check before starting
        if (activeImport.status === 'error') return;
        activeImport.message = "AI szolgáltatás inicializálása...";
        activeImport.progress = 2;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });
        console.log(`[IKK-IMPORT-DEBUG] Status frissítve.`);
        
        console.time(`openai-init-${jobId}`);
        console.log(`[IKK-IMPORT-DEBUG] OpenAI kliens betöltése...`);
        const { getOpenAIClient } = await import('../openai');
        const openai = await getOpenAIClient();
        console.timeEnd(`openai-init-${jobId}`);
        
        activeImport.message = "Kapcsolat ellenőrzése az OpenAI-val...";
        activeImport.progress = 4;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });
        console.time(`openai-check-${jobId}`);
        try {
          await openai.models.list();
          console.timeEnd(`openai-check-${jobId}`);
        } catch (openaiErr: any) {
          console.timeEnd(`openai-check-${jobId}`);
          throw new Error(`OpenAI hiba: ${openaiErr.message || 'Érvénytelen API kulcs vagy hálózati hiba'}`);
        }

        // Step 1: Get PDF Content
        activeImport.message = "PDF dokumentumok letöltése (IKK API)...";
        activeImport.progress = 5;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });
        console.log(`[IKK-IMPORT] PDF letöltés indítva...`);
        console.time(`pdf-content-${jobId}`);
        const { kkkText, pttText } = await ikkService.getProfessionContent(profession);
        console.timeEnd(`pdf-content-${jobId}`);
        console.log(`[IKK-IMPORT] PDF letöltés kész. KKK: ${kkkText.length}, PTT: ${pttText.length}`);
        
        // Step 1.5: Validate content matches profession (Security Check)
        activeImport.message = "Dokumentumok hitelesítése...";
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message });
        
        const validationResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Te egy szakértő vagy, aki eldönti, hogy egy tananyag-dokumentum egy adott szakmához tartozik-e. Csak 'IGEN' vagy 'NEM' választ adj." },
            { role: "user", content: `A kiválasztott szakma: ${profession.name}. A dokumentum részlete: ${pttText.substring(0, 1000)}. Ez a dokumentum ehhez a szakmához tartozik?` }
          ],
          max_tokens: 10
        });

        const isValid = validationResponse.choices[0].message.content?.trim().toUpperCase().includes('IGEN');
        if (!isValid) {
          throw new Error(`Szakmai dokumentum eltérés! A letöltött PDF nem a(z) ${profession.name} szakmához tartozik. (Valószínűleg IKK oldali hiba)`);
        }

        // Step 2: Extract Subjects and Modules (Parallel Chunks)
        const chunks = ikkService.splitPttIntoSections(pttText);
        if (chunks.length === 0) {
          console.error(`[IKK-IMPORT] Nincs tantárgy a PTT-ben. PTT szöveg hossza: ${pttText.length}`);
          throw new Error("Nem sikerült tantárgyakat találni a PTT-ben. Lehet, hogy a PDF nem tartalmazza a várt struktúrát.");
        }

        const mergedSubjectsMap: Map<string, any> = new Map();
        await runParallel(chunks, 2, async (chunk, i) => {
          if (activeImport.status === 'error') return;

          activeImport.message = `Szerkezet elemzése (${i + 1}/${chunks.length})...`;
          activeImport.progress = 15 + Math.floor((i / chunks.length) * 25);
          await (storage as any).updateBackgroundJob(jobId, { 
            message: activeImport.message,
            progress: activeImport.progress
          });

          const response = await withRetry(async () => {
            const openai = await getOpenAIClient();
            return openai.chat.completions.create({
              model: "gpt-4o-mini",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Te egy precíz PTT elemző vagy. Csak valid JSON-t adsz vissza subjects listával." },
                { role: "user", content: ikkService.buildExtractionPrompt(chunk) }
              ],
              temperature: 0,
            });
          });

          const data = JSON.parse(response.choices[0].message.content || '{"subjects":[]}');
          if (data.subjects) {
            for (const sub of data.subjects) {
              const key = sub.name?.toLowerCase().trim();
              if (!key || key === 'példa_tantárgy_neve' || key === 'tantárgy pontos neve') continue;
              
              if (!mergedSubjectsMap.has(key)) mergedSubjectsMap.set(key, { ...sub, modules: [] });
              const existing = mergedSubjectsMap.get(key);
              if (sub.modules) {
                for (const mod of sub.modules) {
                  if (!existing.modules.some((m: any) => m.title === mod.title)) {
                    existing.modules.push(mod);
                  }
                }
              }
            }
          }
        });

        const finalSubjects = Array.from(mergedSubjectsMap.values());
        if (finalSubjects.length === 0) throw new Error("Az AI nem talált feldolgozható tantárgyakat.");

        // Step 3: Delete existing if any
        const allProfs = await storage.getProfessions();
        const existing = allProfs.find(p => p.name === profession.name);
        if (existing) {
          console.log(`[IKK-IMPORT] Meglévő szakma törlése: ${existing.id}`);
          await storage.deleteProfession(existing.id);
        }

        // Step 4: Create new profession
        let totalModules = finalSubjects.reduce((acc, s) => acc + s.modules.length, 0);
        const professionDescription = `Importálva az IKK-ról. Ágazat: ${profession.sector?.name || profession.sector || 'N/A'}. (${finalSubjects.length} tantárgy, ${totalModules} modul). Azonosító: ${profession.okjId || 'N/A'}`;
        
        const dbProfession = await storage.createProfession({
          name: profession.name,
          description: professionDescription,
          iconName: "book"
        });

        // Step 5: Generate content and save
        let processedModules = 0;

        for (const sub of finalSubjects) {
          if ((activeImport.status as string) === 'error') break;
          const dbSubject = await storage.createSubject({
            professionId: dbProfession.id,
            name: sub.name,
            description: sub.description || "",
            type: sub.practicalPercent > 0 ? 'practical' : 'theory',
            orderIndex: 0,
            hours: sub.hours || null
          });

          // Prepare batches for this subject
          const BATCH_SIZE = 15;
          const batches = [];
          for (let i = 0; i < sub.modules.length; i += BATCH_SIZE) {
            batches.push(sub.modules.slice(i, i + BATCH_SIZE));
          }

          // Process batches in parallel (limit 5 for faster generation)
          await runParallel(batches, 5, async (batch) => {
            if (activeImport.status === 'error') return;

            const res = await withRetry(async () => {
              const openai = await getOpenAIClient();
              return openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: "Tananyagfejlesztő vagy. Generálj szakmai tartalmat és feladatokat JSON formátumban." },
                  { role: "user", content: ikkService.buildContentPrompt(profession.name, sub.name, batch) }
                ],
                temperature: 0.4
              });
            });

            const contentData = JSON.parse(res.choices[0].message.content || '{"modules":[]}');
            const modulesToCreate: any[] = [];

            for (const modData of (contentData.modules || [])) {
              const originalMod = batch.find((m: any) => m.title === modData.title);
              modulesToCreate.push({
                subjectId: dbSubject.id,
                title: modData.title,
                content: modData.content || "",
                practicalTasks: modData.practicalTasks || [],
                type: originalMod?.type || (sub.practicalPercent > 0 ? 'practical' : 'theory'),
                moduleNumber: ++processedModules,
                sectionCode: originalMod?.sectionCode || null,
                isPublished: true
              });
            }

            if (modulesToCreate.length > 0) {
              await storage.bulkCreateModules(modulesToCreate);
            }
            
            // Update progress AFTER each batch
            const currentProgress = 40 + Math.floor((processedModules / totalModules) * 55);
            const currentMessage = `${sub.name} - Tartalom generálása (${processedModules}/${totalModules})...`;
            
            activeImport.message = currentMessage;
            activeImport.progress = currentProgress;
            
            await (storage as any).updateBackgroundJob(jobId, {
              message: currentMessage,
              progress: currentProgress
            });
            console.log(`[IKK-IMPORT] Job #${jobId}: ${processedModules}/${totalModules} kész (${currentProgress}%).`);
          });
        }

        activeImport.status = 'completed';
        activeImport.progress = 100;
        activeImport.message = `Sikeresen importálva: ${dbProfession.name} (${processedModules} modul)`;
        await (storage as any).updateBackgroundJob(jobId, {
          status: activeImport.status,
          progress: activeImport.progress,
          message: activeImport.message
        });
        console.log(`[IKK-IMPORT] KÉSZ: ${profession.name}`);

      } catch (err: any) {
        console.error("[IKK-IMPORT] KRITIKUS HIBA:", err);
        activeImport.status = 'error';
        activeImport.error = err.message;
        activeImport.message = `Hiba: ${err.message}`;
        await (storage as any).updateBackgroundJob(jobId, {
          status: activeImport.status,
          error: activeImport.error,
          message: activeImport.message
        });
      }
    }, 500);
  } catch (error) {
    console.error('IKK import indítási hiba:', error);
    res.status(500).json({ message: 'Failed to start IKK import' });
  }
});

export default router;
