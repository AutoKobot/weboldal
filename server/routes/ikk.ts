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

    // Start background process
    activeImport = {
      status: 'processing',
      progress: 0,
      message: 'Előkészítés...',
      professionName: profession.name
    };

    // Send immediate response to client
    res.json({ success: true, message: 'Importálás elindítva a háttérben!' });

    // Actual work happens here (not awaited in the main request)
    (async () => {
      try {
        console.log(`[BACKGROUND] Starting IKK import for: ${profession.name}`);
        const { kkkText, pttText } = await ikkService.getProfessionContent(profession);
        const { getOpenAIClient } = await import('../openai');
        const openai = await getOpenAIClient();

        const chunks = ikkService.splitPttIntoSections(pttText);
        const mergedSubjects: Map<string, any> = new Map();

        const chunkResults = [];
        activeImport.message = `Szerkezet elemzése (${chunks.length} rész)...`;
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const extractionPrompt = ikkService.buildExtractionPrompt(chunk);
          try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Te egy precíz dokumentum-elemző vagy. Kizárólag a dokumentumban szereplő szövegeket listázod fel, semmit sem generálsz magadtól. Csak érvényes JSON-t adsz válaszul." },
                { role: "user", content: extractionPrompt }
              ],
              temperature: 0.0,
            });
            let jsonStr = (response.choices[0].message.content || '{}').trim();
            chunkResults.push(JSON.parse(jsonStr.replace(/```json|```/g, '')));
            
            activeImport.progress = Math.round(((i + 1) / chunks.length) * 30); // First 30%
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) { 
            console.error(`Chunk error:`, err);
            chunkResults.push({ subjects: [] }); 
          }
        }

        for (const parsed of chunkResults) {
          if (parsed.subjects && Array.isArray(parsed.subjects)) {
            for (const subject of parsed.subjects) {
              const key = subject.name?.toLowerCase()?.trim();
              if (!key) continue;
              if (!mergedSubjects.has(key)) mergedSubjects.set(key, { ...subject, modules: [] });
              const existing = mergedSubjects.get(key)!;
              if (subject.modules && Array.isArray(subject.modules)) {
                for (const mod of subject.modules) {
                  if (!existing.modules.some((m: any) => m.title?.toLowerCase()?.trim() === mod.title?.toLowerCase()?.trim())) {
                    existing.modules.push(mod);
                  }
                }
              }
            }
          }
        }

        const rawSubjects = Array.from(mergedSubjects.values());
        const BATCH_SIZE = 10;
        
        activeImport.message = `Tananyag generálása (${rawSubjects.length} tantárgy)...`;

        for (let sIdx = 0; sIdx < rawSubjects.length; sIdx++) {
          const subject = rawSubjects[sIdx];
          if (!subject.modules || subject.modules.length === 0) continue;
          
          activeImport.message = `Generálás: ${subject.name}...`;
          const batches = [];
          for (let i = 0; i < subject.modules.length; i += BATCH_SIZE) {
            batches.push(subject.modules.slice(i, i + BATCH_SIZE));
          }

          const enrichedModules = [];
          for (let bIdx = 0; bIdx < batches.length; bIdx++) {
            const batch = batches[bIdx];
            const contentPrompt = ikkService.buildContentPrompt(profession.name, subject.name, batch);
            try {
              const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: "Te egy szakképzési tananyagfejlesztő vagy. Minden felsorolt modulhoz szakmai tartalmat generálsz. Csak érvényes JSON-t adsz válaszul." },
                  { role: "user", content: contentPrompt }
                ],
                temperature: 0.4,
              });
              const parsed = JSON.parse((response.choices[0].message.content || '{}').replace(/```json|```/g, ''));
              for (let mi = 0; mi < batch.length; mi++) {
                const rawMod = batch[mi];
                const enriched = parsed.modules?.[mi] || parsed.modules?.find((m: any) => m.title?.toLowerCase() === rawMod.title?.toLowerCase());
                enrichedModules.push({
                  title: rawMod.title, 
                  type: rawMod.type,
                  content: enriched?.content || `${rawMod.title} alapvető tartalma.`,
                  practicalTasks: enriched?.practicalTasks || []
                });
              }
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
              batch.forEach((m: any) => enrichedModules.push({ ...m, content: `${m.title}.`, practicalTasks: [] }));
            }
            
            // Progress from 30% to 90%
            const subjectProgress = (sIdx / rawSubjects.length) * 60;
            const batchProgress = (bIdx / batches.length) * (60 / rawSubjects.length);
            activeImport.progress = 30 + Math.round(subjectProgress + batchProgress);
          }
          subject.enrichedModules = enrichedModules;
        }

        activeImport.message = "Mentés az adatbázisba...";
        activeImport.progress = 95;

        const existingProfessions = await storage.getProfessions();
        const duplicate = existingProfessions.find(p => p.name === profession.name);
        if (duplicate) await storage.deleteProfession(duplicate.id);

        const totalModules = rawSubjects.reduce((sum, s) => sum + (s.enrichedModules?.length || 0), 0);
        const newProfession = await storage.createProfession({
          name: profession.name,
          description: `${rawSubjects.length} tantárgy, ${totalModules} modul (IKK PTT alapján).`,
          iconName: 'GraduationCap'
        });

        for (const sub of rawSubjects) {
          const enriched = sub.enrichedModules || [];
          const theoryMods = enriched.filter((m: any) => m.type === 'theory');
          const practicalMods = enriched.filter((m: any) => m.type === 'practical');

          const createSubjectWithModules = async (type: 'theory' | 'practical', mods: any[]) => {
            if (mods.length === 0) return;
            const subject = await storage.createSubject({
              name: sub.name, description: sub.description, type, professionId: newProfession.id
            });
            await Promise.all(mods.map((mod, i) => 
              storage.createModule({
                title: mod.title, content: mod.content,
                subjectId: subject.id, moduleNumber: i + 1, isPublished: false,
                practicalTasks: mod.practicalTasks
              })
            ));
          };
          await createSubjectWithModules('theory', theoryMods);
          await createSubjectWithModules('practical', practicalMods);
        }

        activeImport.status = 'completed';
        activeImport.progress = 100;
        activeImport.message = 'IKK importálás sikeresen befejeződött!';
        console.log(`[BACKGROUND] IKK import COMPLETED for: ${profession.name}`);
      } catch (err: any) {
        console.error('[BACKGROUND] IKK import error:', err);
        activeImport.status = 'error';
        activeImport.error = err.message || 'Ismeretlen hiba történt';
      }
    })();
  } catch (error) {
    console.error('IKK import indítási hiba:', error);
    res.status(500).json({ message: 'Failed to start IKK import' });
  }
});

export default router;
