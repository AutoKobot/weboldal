import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { ikkService } from "../ikk-service";

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
  error?: string;
} = {
  status: 'idle',
  progress: 0,
  message: '',
  professionName: ''
};

router.get('/status', combinedAuth, adminOnly, async (req, res) => {
  try {
    const latestJob = await (storage as any).getLatestBackgroundJob('ikk_import');
    if (!latestJob) {
      return res.json({ status: 'idle', progress: 0, message: '', professionName: '' });
    }
    res.json({
      status: latestJob.status,
      progress: latestJob.progress,
      message: latestJob.message,
      professionName: latestJob.data?.professionName || '',
      error: latestJob.error
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch import status' });
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

    // Send immediate response
    res.json({ success: true, message: 'Importálás elindítva a háttérben!', jobId: job.id });

    // Background Execution
    (async () => {
      const jobId = job.id;
      try {
        console.log(`[IKK-IMPORT] Megkezdve: ${profession.name} (Job: ${jobId})`);
        
        await (storage as any).updateBackgroundJob(jobId, { message: "AI szolgáltatás inicializálása...", progress: 2 });
        
        const { getOpenAIClient } = await import('../openai');
        const openai = await getOpenAIClient();
        
        await (storage as any).updateBackgroundJob(jobId, { message: "Kapcsolat ellenőrzése az OpenAI-val...", progress: 4 });
        // Quick check to see if OpenAI is responsive and key is valid
        try {
          await openai.models.list();
        } catch (openaiErr: any) {
          throw new Error(`OpenAI hiba: ${openaiErr.message || 'Érvénytelen API kulcs vagy hálózati hiba'}`);
        }

        // Step 1: Get PDF Content
        await (storage as any).updateBackgroundJob(jobId, { message: "PDF dokumentumok letöltése (IKK API)...", progress: 5 });
        const { kkkText, pttText } = await ikkService.getProfessionContent(profession);
        
        // Step 2: Extract structure
        await (storage as any).updateBackgroundJob(jobId, { message: "Szakmai szerkezet elemzése (AI)...", progress: 15 });
        const chunks = ikkService.splitPttIntoSections(pttText);
        
        if (chunks.length === 0) {
          console.error(`[IKK-IMPORT] Nincs tantárgy a PTT-ben. PTT szöveg hossza: ${pttText.length}`);
          throw new Error("Nem sikerült tantárgyakat találni a PTT-ben. Lehet, hogy a PDF nem tartalmazza a várt struktúrát.");
        }

        const mergedSubjectsMap: Map<string, any> = new Map();

        for (let i = 0; i < chunks.length; i++) {
          await (storage as any).updateBackgroundJob(jobId, { 
            message: `Szerkezet elemzése (${i + 1}/${chunks.length})...`,
            progress: 15 + Math.floor((i / chunks.length) * 25)
          });

          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "Te egy precíz PTT elemző vagy. Csak valid JSON-t adsz vissza subjects listával." },
              { role: "user", content: ikkService.buildExtractionPrompt(chunks[i]) }
            ],
            temperature: 0,
          });

          const data = JSON.parse(response.choices[0].message.content || '{"subjects":[]}');
          if (data.subjects) {
            for (const sub of data.subjects) {
              const key = sub.name?.toLowerCase().trim();
              if (!key) continue;
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
        }

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
        const dbProfession = await storage.createProfession({
          name: profession.name,
          description: `Importálva az IKK-ról. Ágazat: ${profession.sector?.name || 'N/A'}`,
          iconName: "book"
        });

        // Step 5: Generate content and save
        let totalModules = finalSubjects.reduce((acc, s) => acc + s.modules.length, 0);
        let processedModules = 0;

        for (const sub of finalSubjects) {
          const dbSubject = await storage.createSubject({
            professionId: dbProfession.id,
            name: sub.name,
            description: sub.description || "",
            type: sub.practicalPercent > 0 ? 'practical' : 'theory',
            orderIndex: 0
          });

          const BATCH_SIZE = 10;
          for (let i = 0; i < sub.modules.length; i += BATCH_SIZE) {
            const batch = sub.modules.slice(i, i + BATCH_SIZE);
            await (storage as any).updateBackgroundJob(jobId, {
              message: `${sub.name} - Tartalom generálása (${processedModules}/${totalModules})...`,
              progress: 40 + Math.floor((processedModules / totalModules) * 55)
            });

            try {
              const res = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: "Tananyagfejlesztő vagy. Generálj szakmai tartalmat és feladatokat JSON formátumban." },
                  { role: "user", content: ikkService.buildContentPrompt(profession.name, sub.name, batch) }
                ],
                temperature: 0.4
              });

              const contentData = JSON.parse(res.choices[0].message.content || '{"modules":[]}');
              for (const modData of (contentData.modules || [])) {
                await storage.createModule({
                  subjectId: dbSubject.id,
                  title: modData.title,
                  content: modData.content,
                  moduleNumber: processedModules + 1,
                  practicalTasks: modData.practicalTasks || [],
                  isPublished: true
                });
                processedModules++;
              }
            } catch (e) {
              console.error(`[IKK-IMPORT] Hiba a modul batch-nél:`, e);
            }
            await new Promise(r => setTimeout(r, 800));
          }
        }

        await (storage as any).updateBackgroundJob(jobId, {
          status: 'completed',
          progress: 100,
          message: `Sikeresen importálva: ${dbProfession.name} (${processedModules} modul)`
        });
        console.log(`[IKK-IMPORT] KÉSZ: ${profession.name}`);

      } catch (err: any) {
        console.error("[IKK-IMPORT] KRITIKUS HIBA:", err);
        await (storage as any).updateBackgroundJob(jobId, {
          status: 'error',
          error: err.message,
          message: `Hiba: ${err.message}`
        });
      }
    })();
  } catch (error) {
    console.error('IKK import indítási hiba:', error);
    res.status(500).json({ message: 'Failed to start IKK import' });
  }
});

export default router;
