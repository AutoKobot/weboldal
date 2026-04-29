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
  res.json(activeImport);
});

router.post('/import', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { profession } = req.body;
    if (!profession) return res.status(400).json({ message: 'Profession data is required' });

    if (activeImport.status === 'processing') {
      return res.status(400).json({ message: 'An import is already in progress' });
    }

    // Reset status
    activeImport = {
      status: 'processing',
      progress: 0,
      message: 'Előkészítés...',
      professionName: profession.name
    };

    // Send immediate response
    res.json({ success: true, message: 'Importálás elindítva a háttérben!' });

    // Background Execution
    (async () => {
      try {
        console.log(`[IKK-IMPORT] Megkezdve: ${profession.name}`);
        const { getOpenAIClient } = await import('../openai');
        const openai = await getOpenAIClient();

        // Step 1: Get PDF Content
        activeImport.message = "PDF dokumentumok letöltése...";
        activeImport.progress = 5;
        const { kkkText, pttText } = await ikkService.getProfessionContent(profession);
        
        // Step 2: Extract structure
        activeImport.message = "Szakmai szerkezet elemzése (AI)...";
        activeImport.progress = 15;
        const chunks = ikkService.splitPttIntoSections(pttText);
        
        if (chunks.length === 0) throw new Error("Nem sikerült tantárgyakat találni a PTT-ben.");

        const rawSubjects: any[] = [];
        const mergedSubjectsMap: Map<string, any> = new Map();

        for (let i = 0; i < chunks.length; i++) {
          activeImport.message = `Szerkezet elemzése (${i + 1}/${chunks.length})...`;
          activeImport.progress = 15 + Math.floor((i / chunks.length) * 25);

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

        // Step 3: Delete existing if any (to avoid duplicates)
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
          console.log(`[IKK-IMPORT] Tantárgy mentése: ${sub.name}`);
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
            activeImport.message = `${sub.name} - Tartalom generálása (${processedModules}/${totalModules})...`;
            activeImport.progress = 40 + Math.floor((processedModules / totalModules) * 55);

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

        activeImport.status = 'completed';
        activeImport.progress = 100;
        activeImport.message = `Sikeresen importálva: ${dbProfession.name} (${processedModules} modul)`;
        console.log(`[IKK-IMPORT] KÉSZ: ${profession.name}`);

      } catch (err: any) {
        console.error("[IKK-IMPORT] KRITIKUS HIBA:", err);
        activeImport.status = 'error';
        activeImport.error = err.message;
        activeImport.message = `Hiba: ${err.message}`;
      }
    })();
  } catch (error) {
    console.error('IKK import indítási hiba:', error);
    res.status(500).json({ message: 'Failed to start IKK import' });
  }
});

export default router;
