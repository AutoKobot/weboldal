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

// Helper for repairing potentially truncated JSON from LLM responses
function tryRepairJson(jsonStr: string): string {
  let cleaned = jsonStr.trim();
  try { JSON.parse(cleaned); return cleaned; } catch (e) { }

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  try { JSON.parse(cleaned); return cleaned; } catch (e) { }

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIndex = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex > 0) {
    cleaned = cleaned.substring(startIndex).trim();
  }
  try { JSON.parse(cleaned); return cleaned; } catch (e) { }

  // Attempt recovery by stripping characters from the end and trying to balance brackets
  let temp = cleaned;
  while (temp.length > 0) {
    let candidate = temp.trim();
    if (candidate.endsWith(',')) {
      candidate = candidate.slice(0, -1).trim();
    }

    const stack: ('{' | '[')[] = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < candidate.length; i++) {
      const char = candidate[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          stack.push('{');
        } else if (char === '[') {
          stack.push('[');
        } else if (char === '}') {
          if (stack[stack.length - 1] === '{') {
            stack.pop();
          }
        } else if (char === ']') {
          if (stack[stack.length - 1] === '[') {
            stack.pop();
          }
        }
      }
    }

    let balanced = candidate;
    if (inString) {
      balanced += '"';
    }

    const localStack = [...stack];
    while (localStack.length > 0) {
      const open = localStack.pop();
      if (open === '{') balanced += '}';
      else if (open === '[') balanced += ']';
    }

    try {
      JSON.parse(balanced);
      return balanced;
    } catch (e) {
      temp = temp.slice(0, -1);
    }
  }

  return jsonStr;
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
  phase: string;
  message: string;
  professionName: string;
  activeJobId: number | null;
  error?: string;
} = {
  status: 'idle',
  progress: 0,
  phase: '',
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
      return res.json({ status: 'idle', progress: 0, message: '', professionName: '', activeJobId: null, phase: '' });
    }

    const lastUpdate = new Date(latestJob.updatedAt || latestJob.updated_at).getTime();
    const isRecent = (Date.now() - lastUpdate) < (5 * 60 * 1000);

    if (latestJob.status !== 'processing' && !isRecent) {
      return res.json({ status: 'idle', progress: 0, message: '', professionName: '', activeJobId: null, phase: '' });
    }

    const statusData = {
      status: latestJob.status,
      progress: latestJob.progress,
      phase: latestJob.data?.phase || '',
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

/**
 * POST /api/admin/ikk/generate-hours/:professionId
 *
 * Önálló óraszám-generálás egy már importált szakmához.
 * Csak a tantárgyak elméleti/gyakorlati óraszámait frissíti, nem generál új modulokat.
 */
router.post('/generate-hours/:professionId', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const professionId = parseInt(req.params.professionId);
    if (isNaN(professionId)) return res.status(400).json({ message: 'Érvénytelen szakma azonosító.' });

    const dbProfession = await storage.getProfession(professionId);
    if (!dbProfession) return res.status(404).json({ message: 'A szakma nem található.' });

    const dbSubjects = await storage.getSubjects(professionId);
    if (dbSubjects.length === 0) {
      return res.status(400).json({ message: 'Nincsenek tantárgyak ehhez a szakmához.' });
    }

    // Get PTT document
    let pttText = '';
    try {
      const ikkProfessions = await ikkService.getProfessions();
      const ikkProf = ikkProfessions.find(
        p => p.name.trim() === dbProfession.name.trim() ||
          (dbProfession as any).code === p.okjId
      );
      if (ikkProf) {
        const { pttText: downloaded } = await ikkService.getProfessionContent(ikkProf);
        pttText = downloaded;
        console.log(`[generate-hours] PTT letöltve: ${pttText.length} karakter`);
      }
    } catch (pttErr: any) {
      console.warn('[generate-hours] PTT letöltés sikertelen:', pttErr.message);
    }

    // Run AI hour extraction (Phase 1)
    const { trainingFormat = '3year' } = req.body;
    const subjectHours = await ikkService.extractSubjectHours(
      dbProfession.name,
      pttText,
      dbSubjects.map(s => ({ id: s.id, name: s.name, code: s.code, hours: s.hours })),
      trainingFormat as '3year' | '2year'
    );

    if (subjectHours.length === 0) {
      return res.status(500).json({ message: 'Az AI nem tudott óraszámokat generálni.' });
    }

    // Persist hours to subjects and suggest hours to their modules
    let updatedSubjects = 0;
    let updatedModules = 0;
    for (const sh of subjectHours) {
      const totalHours = sh.theoryHours + sh.practicalHours;
      await storage.updateSubject(sh.id, { hours: Math.round(totalHours) });

      // Find existing modules for this subject
      const modules = await storage.getModules(sh.id);
      const theoryMods = modules.filter(m => m.type === 'theory');
      const practicalMods = modules.filter(m => m.type === 'practical');

      // Distribute hours evenly within type
      if (theoryMods.length > 0 && sh.theoryHours > 0) {
        const perTheory = Math.round((sh.theoryHours / theoryMods.length) * 2) / 2;
        for (const m of theoryMods) {
          await storage.updateModule(m.id, { suggestedHours: perTheory.toString() });
          updatedModules++;
        }
      }
      if (practicalMods.length > 0 && sh.practicalHours > 0) {
        const perPractical = Math.round((sh.practicalHours / practicalMods.length) * 2) / 2;
        for (const m of practicalMods) {
          await storage.updateModule(m.id, { suggestedHours: perPractical.toString() });
          updatedModules++;
        }
      }
      updatedSubjects++;
    }

    res.json({
      success: true,
      message: `Óraszámok sikeresen generálva: ${updatedSubjects} tantárgy, ${updatedModules} modul frissítve.`,
      distributions: subjectHours
    });

  } catch (error: any) {
    console.error('[generate-hours] Hiba:', error);
    res.status(500).json({ message: `Hiba az óraszám generálás során: ${error.message}` });
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
      importType,
      phase: 'előkészítés'
    });

    // Update memory state for polling
    activeImport.status = 'processing';
    activeImport.progress = 0;
    activeImport.phase = 'előkészítés';
    activeImport.message = 'Előkészítés...';
    activeImport.professionName = profession.name;
    activeImport.activeJobId = job.id;
    activeImport.error = undefined;

    res.json({ success: true, message: 'Importálás elindítva!', jobId: job.id });

    setTimeout(async () => {
      const jobId = job.id;
      const type = importType as 'theory' | 'practical' | 'both';

      try {
        if (activeImport.activeJobId !== jobId) return;

        const { getOpenAIClient } = await import('../openai');
        const openai = await getOpenAIClient();

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // PREPARE: Download PDF and check connection
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        activeImport.phase = 'előkészítés';
        activeImport.message = "Kapcsolat ellenőrzése az OpenAI-val...";
        activeImport.progress = 3;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress, data: { phase: 'előkészítés', professionName: profession.name } });
        await openai.models.list();

        activeImport.message = "PDF dokumentumok letöltése (IKK API)...";
        activeImport.progress = 6;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });
        const { pttText } = await ikkService.getProfessionContent(profession);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // PHASE 1: Extract subjects with pure theory/practical hours from PTT
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        activeImport.phase = 'tantárgyak elemzése';
        activeImport.message = "1/3: Tantárgyak és óraszámok kinyerése a PTT-ből...";
        activeImport.progress = 10;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress, data: { phase: 'tantárgyak elemzése', professionName: profession.name } });

        // Phase 1a: Split PTT into manageable chunks and extract subjects via AI
        // A PTT-t 10000 karakteres chunkokra daraboljuk 2000 karakter átfedéssel
        const sections = ikkService.splitPttIntoSections(pttText);

        activeImport.message = `1/3: ${sections.length} szekció feldolgozása AI segítségével...`;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: 12 });

        // Extract subject metadata from each chunk using AI (only names, codes, total hours)
        const mergedSubjectsMap: Map<string, any> = new Map();
        for (let idx = 0; idx < sections.length; idx++) {
          if (activeImport.status === 'error' || activeImport.error === 'Cancelled by user') break;

          activeImport.message = `1/3: Szakma szerkezetének elemzése (${idx + 1}/${sections.length})...`;
          await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: 10 + Math.round((idx / sections.length) * 5) });

          const response = await withRetry(async () => {
            const openai = await getOpenAIClient();
            return openai.chat.completions.create({
              model: "gpt-4o-mini",
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "Te egy PTT (Programtanterv) szerkezet-elemző szakértő vagy. Csak valid JSON-t adsz vissza subjects listával, modulok nélkül!" },
                {
                  role: "user", content: `
Elemezd az alábbi PTT egységet!
Határozd meg a szekcióban található tantárgyakat, kódjukat (pl. 3.1.1) és a teljes óraszámot.

PTT RÉSZLET:
${sections[idx]}

SZABÁLYOK:
1. Csak a tantárgyak nevét, kódját és teljes óraszámát gyűjtsd ki!
2. NE generálj modulokat, NE bontsd elmélet/gyakorlat részekre!

VÁLASZ FORMÁTUM (SZIGORÚ JSON):
{
  "subjects": [
    {
      "name": "Tantárgy neve",
      "code": "3.X.X",
      "totalHours": 80
    }
  ]
}` }
              ],
              temperature: 0
            }, { timeout: 120000 });
          });

          const data = JSON.parse(tryRepairJson(response.choices[0].message.content || '{"subjects":[]}'));
          if (data.subjects) {
            for (const sub of data.subjects) {
              const key = (sub.code || '').trim() || sub.name?.toLowerCase().trim();
              if (!key || key.includes('példa')) continue;
              if (!mergedSubjectsMap.has(key)) {
                mergedSubjectsMap.set(key, sub);
              } else {
                const existing = mergedSubjectsMap.get(key);
                mergedSubjectsMap.set(key, {
                  ...existing,
                  ...sub,
                  name: sub.name || existing.name
                });
              }
            }
          }
        }

        const extractedSubjects = Array.from(mergedSubjectsMap.values());
        if (extractedSubjects.length === 0) {
          throw new Error("A struktúra elemzés során az AI nem talált feldolgozható tantárgyakat.");
        }

        // Find or create profession in DB
        const allProfs = await storage.getProfessions();
        let dbProfession = allProfs.find(p => p.name.trim() === profession.name.trim());

        if (!dbProfession) {
          dbProfession = await storage.createProfession({
            name: profession.name,
            description: `Importálva az IKK-ról.`,
            iconName: "book",
            code: profession.okjId || profession.code
          });
        }

        // Save subjects to DB first (without hours split yet)
        const existingDbSubjects = await storage.getSubjects(dbProfession.id);
        const dbSubjects: { id: number; name: string; code: string | null; type: string; hours: number | null }[] = [];

        for (const sub of extractedSubjects) {
          const totalHours = typeof sub.totalHours === 'number' ? sub.totalHours : parseInt(sub.totalHours || '0') || 0;

          // Csak akkor hozzuk létre az elméleti tantárgyat, ha nem kizárólag gyakorlati import
          if (type !== 'practical') {
            let dbSubject = existingDbSubjects.find(s => s.name === sub.name && s.type === 'theory');
            if (!dbSubject) {
              dbSubject = await storage.createSubject({
                professionId: dbProfession.id,
                name: sub.name,
                code: (sub.code || "").replace(/\.$/, ""),
                description: "",
                type: 'theory',
                orderIndex: 0,
                hours: totalHours
              });
            }
            dbSubjects.push({
              id: dbSubject.id,
              name: sub.name,
              code: sub.code || null,
              type: 'theory',
              hours: totalHours
            });
          }
        }

        // Phase 1b: Run AI hour extraction to split into theory/practical hours
        activeImport.message = "1/3: Elméleti/gyakorlati óraszámok meghatározása AI segítségével...";
        activeImport.progress = 18;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

        const subjectHours = await ikkService.extractSubjectHours(
          dbProfession.name,
          pttText,
          dbSubjects.map(s => ({ id: s.id, name: s.name, code: s.code, hours: s.hours })),
          '3year'
        );

        // Create separate practical subject entries if needed
        for (const sh of subjectHours) {
          if (sh.practicalHours > 0 && type !== 'theory') {
            const practicalName = sh.name.toLowerCase().includes('gyakorlat')
              ? sh.name
              : sh.name + ' gyakorlat';
            const existingPractical = await storage.getSubjects(dbProfession.id);
            let practicalSubject = existingPractical.find(s => s.name === practicalName && s.type === 'practical');
            if (!practicalSubject) {
              practicalSubject = await storage.createSubject({
                professionId: dbProfession.id,
                name: practicalName,
                code: sh.code.replace(/\.$/, ""),
                description: "",
                type: 'practical',
                orderIndex: 0,
                hours: sh.practicalHours
              });
              dbSubjects.push({
                id: practicalSubject.id,
                name: practicalName,
                code: sh.code,
                type: 'practical',
                hours: sh.practicalHours
              });
            } else {
              await storage.updateSubject(practicalSubject.id, { hours: sh.practicalHours });
            }
          }
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // PHASE 2: Generate modules per subject (breakdown)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        activeImport.phase = 'modulok bontása';
        activeImport.message = "2/3: Modulok bontása tantárgyanként...";
        activeImport.progress = 25;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress, data: { phase: 'modulok bontása', professionName: profession.name } });

        let subjectIndex = 0;
        const allSubjectHours = [...subjectHours];

        for (const sh of allSubjectHours) {
          if (activeImport.status === 'error' || activeImport.error === 'Cancelled by user') break;

          subjectIndex++;
          const theoryHoursToProcess = type === 'practical' ? 0 : sh.theoryHours;
          const practicalHoursToProcess = type === 'theory' ? 0 : sh.practicalHours;

          if (theoryHoursToProcess === 0 && practicalHoursToProcess === 0) continue;

          // Get PTT chunk for this subject
          const pttChunk = ikkService.getSubjectPttText(sh.name, pttText, sh.code);

          activeImport.message = `2/3: Modulok bontása (${subjectIndex}/${allSubjectHours.length}): ${sh.name}...`;
          activeImport.progress = 25 + Math.round((subjectIndex / allSubjectHours.length) * 25);
          await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

          // Find the DB subject for theory
          let theorySubject = dbSubjects.find(s => s.name === sh.name && s.type === 'theory');

          // If theory subject not found, try to create it
          if (!theorySubject && theoryHoursToProcess > 0) {
            const newSub = await storage.createSubject({
              professionId: dbProfession.id,
              name: sh.name,
              code: sh.code.replace(/\.$/, ""),
              description: "",
              type: 'theory',
              orderIndex: 0,
              hours: theoryHoursToProcess
            });
            theorySubject = { id: newSub.id, name: sh.name, code: sh.code, type: 'theory', hours: theoryHoursToProcess };
            dbSubjects.push(theorySubject);
          }

          // Call AI to generate modules for this subject
          if (theorySubject && theoryHoursToProcess > 0) {
            const theoryModules = await ikkService.generateModulesForSubject(
              profession.name,
              sh.name,
              sh.code,
              theoryHoursToProcess,
              0,
              pttChunk,
              'theory'
            );

            if (theoryModules.length > 0) {
              const existingModules = await storage.getModules(theorySubject.id);

              // Save modules to DB in batches of 2
              const BATCH_SIZE = 2;
              let theoryProcessed = 0;
              for (let i = 0; i < theoryModules.length; i += BATCH_SIZE) {
                const batch = theoryModules.slice(i, i + BATCH_SIZE);

                const allExist = batch.every((bm: any) => existingModules.some(em => em.title === bm.title));
                if (allExist) {
                  theoryProcessed += batch.length;
                  continue;
                }

                const modulesToCreate = batch
                  .filter((modData: any) => !existingModules.some(em => em.title === modData.title))
                  .map((modData: any) => ({
                    subjectId: theorySubject!.id,
                    title: modData.title,
                    content: "",
                    practicalTasks: [],
                    type: 'theory',
                    moduleNumber: ++theoryProcessed,
                    sectionCode: modData.sectionCode || null,
                    isPublished: false,
                    suggestedHours: "1"
                  }));

                if (modulesToCreate.length > 0) {
                  await storage.bulkCreateModules(modulesToCreate);
                } else {
                  theoryProcessed += batch.length;
                }
              }
            }
          }

          // Handle practical subject
          if (practicalHoursToProcess > 0) {
            const practicalName = sh.name.toLowerCase().includes('gyakorlat')
              ? sh.name
              : sh.name + ' gyakorlat';
            let practicalSubject = dbSubjects.find(s => s.name === practicalName && s.type === 'practical');

            if (practicalSubject) {
              const practicalModules = await ikkService.generateModulesForSubject(
                profession.name,
                sh.name + ' (gyakorlat)',
                sh.code,
                0,
                practicalHoursToProcess,
                pttChunk,
                'practical'
              );

              if (practicalModules.length > 0) {
                const existingModules = await storage.getModules(practicalSubject.id);
                let practicalProcessed = 0;

                for (const mod of practicalModules) {
                  if (existingModules.some(em => em.title === mod.title)) {
                    practicalProcessed++;
                    continue;
                  }

                  await storage.createModule({
                    subjectId: practicalSubject.id,
                    title: mod.title,
                    content: "",
                    practicalTasks: [],
                    type: 'practical',
                    moduleNumber: ++practicalProcessed,
                    sectionCode: mod.sectionCode || null,
                    isPublished: false,
                    suggestedHours: "7"
                  });
                }
              }
            }
          }
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // PHASE 3: Generate content for each module
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        activeImport.phase = 'tartalom generálás';
        activeImport.message = "3/3: Szakmai tartalom generálása modulonként...";
        activeImport.progress = 55;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress, data: { phase: 'tartalom generálás', professionName: profession.name } });

        // Get all modules for all subjects (only empty content ones)
        let allModules: { id: number; subjectId: number; title: string; type: string; content: string }[] = [];
        for (const dbSub of dbSubjects) {
          const mods = await storage.getModules(dbSub.id);
          allModules.push(...mods.filter(m => !m.content || m.content.trim() === '').map(m => ({
            id: m.id,
            subjectId: m.subjectId,
            title: m.title,
            type: m.type || 'theory',
            content: m.content || ''
          })));
        }

        if (allModules.length === 0) {
          activeImport.message = "Minden modulnak már van tartalma, átugrás...";
          activeImport.progress = 95;
          await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });
        } else {
          // Group modules by subject
          const modulesBySubject = new Map<number, { subjectId: number; subjectName: string; modules: { id: number; title: string; type: string }[] }>();
          for (const mod of allModules) {
            const dbSub = dbSubjects.find(s => s.id === mod.subjectId);
            if (!dbSub) continue;
            if (!modulesBySubject.has(mod.subjectId)) {
              modulesBySubject.set(mod.subjectId, { subjectId: mod.subjectId, subjectName: dbSub.name, modules: [] });
            }
            modulesBySubject.get(mod.subjectId)!.modules.push({ id: mod.id, title: mod.title, type: mod.type });
          }

          let contentProgress = 55;
          const subjectEntries = Array.from(modulesBySubject.values());
          let subjIdx = 0;

          for (const entry of subjectEntries) {
            if (activeImport.status === 'error' || activeImport.error === 'Cancelled by user') break;
            subjIdx++;

            const BATCH_SIZE = 2;
            const batches = [];
            for (let i = 0; i < entry.modules.length; i += BATCH_SIZE) {
              batches.push(entry.modules.slice(i, i + BATCH_SIZE));
            }

            let batchIdx = 0;
            for (const batch of batches) {
              if ((activeImport as any).status === 'error' || activeImport.error === 'Cancelled by user') break;
              batchIdx++;

              activeImport.message = `3/3: Tartalom (${subjIdx}/${subjectEntries.length} tantárgy, ${batchIdx}/${batches.length} batch): ${entry.subjectName}...`;
              contentProgress = 55 + Math.round((subjIdx / subjectEntries.length) * 40);
              activeImport.progress = Math.min(99, contentProgress);
              await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

              // Build proper RawModule array for the prompt
              const rawModules = batch.map(m => ({
                title: m.title,
                type: m.type as 'theory' | 'practical',
                sectionCode: ''
              }));

              const response = await withRetry(async () => {
                const openai = await getOpenAIClient();
                return openai.chat.completions.create({
                  model: "gpt-4o-mini",
                  response_format: { type: "json_object" },
                  messages: [
                    { role: "system", content: "Tananyagfejlesztő vagy. Generálj szakmai tartalmat JSON-ben." },
                    { role: "user", content: ikkService.buildContentPrompt(profession.name, entry.subjectName, rawModules) }
                  ],
                  temperature: 0.4
                }, { timeout: 120000 });
              });

              const contentData = JSON.parse(tryRepairJson(response.choices[0].message.content || '{"modules":[]}'));
              const generatedModules = (contentData.modules || []) as { title: string; content?: string; practicalTasks?: string[] }[];

              for (const genMod of generatedModules) {
                const originalMod = batch.find(m => m.title === genMod.title);
                if (originalMod) {
                  await storage.updateModule(originalMod.id, {
                    content: genMod.content || "",
                    practicalTasks: genMod.practicalTasks || []
                  });
                }
              }

              if (global.gc) {
                try { global.gc(); } catch (e) { }
              }
            }
          }
        }

        // Finalize
        if ((activeImport as any).status === 'error' || activeImport.error === 'Cancelled by user') {
          // Don't delete profession on error if it already existed
          return;
        }

        activeImport.status = 'completed';
        activeImport.progress = 100;
        activeImport.phase = 'kész';
        activeImport.message = `Sikeres import: ${dbProfession.name} (ID: ${dbProfession.id})`;

        await (storage as any).updateBackgroundJob(jobId, { status: 'completed', progress: 100, message: activeImport.message, data: { phase: 'kész', professionName: profession.name } });

      } catch (err: any) {
        console.error("[IKK-IMPORT] Hiba:", err);
        activeImport.status = 'error';
        activeImport.error = err.message;
        activeImport.phase = 'hiba';
        await (storage as any).updateBackgroundJob(jobId, { status: 'error', error: err.message, message: `Hiba: ${err.message}`, data: { phase: 'hiba', professionName: profession.name } });
      }
    }, 500);
  } catch (error) {
    res.status(500).json({ message: 'Failed to start IKK import' });
  }
});

export default router;