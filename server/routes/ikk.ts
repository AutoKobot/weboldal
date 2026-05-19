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

/**
 * POST /api/admin/ikk/generate-hours/:professionId
 *
 * Önálló óraszám-generálás egy már importált szakmához.
 * Folyamata:
 *   1. Lekéri a szakma tantárgyait és moduljait az adatbázisból
 *   2. Újra letölti a PTT dokumentumot az IKK-ról
 *   3. Az AI összehasonlítja a PTT óraszámait a tantárgy/modul struktúrával
 *   4. Tantárgyanként visszaadja az elméleti és gyakorlati órákat
 *   5. A rendszer EGYENLŐEN osztja szét a modulok között (típus szerint)
 */
router.post('/generate-hours/:professionId', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const professionId = parseInt(req.params.professionId);
    if (isNaN(professionId)) return res.status(400).json({ message: 'Érvénytelen szakma azonosító.' });

    const dbProfession = await storage.getProfession(professionId);
    if (!dbProfession) return res.status(404).json({ message: 'A szakma nem található.' });

    // Fetch subjects and their modules from DB
    const dbSubjects = await storage.getSubjects(professionId);
    if (dbSubjects.length === 0) {
      return res.status(400).json({ message: 'Nincsenek tantárgyak ehhez a szakmához.' });
    }

    // Build full subject+module list
    const subjectsWithModules: {
      id: number;
      name: string;
      code?: string | null;
      hours?: number | null;
      modules: { id: number; title: string; type: string }[];
    }[] = [];

    for (const sub of dbSubjects) {
      const mods = await storage.getModules(sub.id);
      subjectsWithModules.push({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        hours: sub.hours,
        modules: mods.map(m => ({ id: m.id, title: m.title, type: m.type || 'theory' }))
      });
    }

    // Try to get the PTT document from IKK
    let pttText = '';
    try {
      // We need the IKK profession data to get the PTT attachment
      // Use the profession code (okjId) to find it in the IKK listing
      const ikkProfessions = await ikkService.getProfessions();
      const ikkProf = ikkProfessions.find(
        p => p.name.trim() === dbProfession.name.trim() ||
             (dbProfession as any).code === p.okjId
      );
      if (ikkProf) {
        const { pttText: downloaded } = await ikkService.getProfessionContent(ikkProf);
        pttText = downloaded;
        console.log(`[generate-hours] PTT letöltve: ${pttText.length} karakter`);
      } else {
        console.warn(`[generate-hours] IKK szakma nem található: "${dbProfession.name}" – csak DB adatok alapján folytatjuk.`);
      }
    } catch (pttErr: any) {
      console.warn('[generate-hours] PTT letöltés sikertelen, folytatjuk DB adatokkal:', pttErr.message);
    }

    // Run AI hour generation
    const { trainingFormat = '3year' } = req.body;
    const hourDistributions = await ikkService.generateHoursFromPtt(
      dbProfession.name,
      pttText,
      subjectsWithModules,
      trainingFormat as '3year' | '2year'
    );

    if (hourDistributions.length === 0) {
      return res.status(500).json({ message: 'Az AI nem tudott óraszámokat generálni.' });
    }

    // Persist the hours to the modules and update the subjects' total hours
    const subjectTotalHoursMap = new Map<number, number>();
    const moduleToSubjectMap = new Map<number, number>();
    for (const sub of subjectsWithModules) {
      for (const mod of sub.modules) {
        moduleToSubjectMap.set(mod.id, sub.id);
      }
    }

    let updatedCount = 0;
    for (const dist of hourDistributions) {
      if (dist.hours > 0) {
        await storage.updateModule(dist.moduleId, { suggestedHours: dist.hours.toString() });
        updatedCount++;
        
        const subjectId = moduleToSubjectMap.get(dist.moduleId);
        if (subjectId !== undefined) {
          const currentSum = subjectTotalHoursMap.get(subjectId) || 0;
          subjectTotalHoursMap.set(subjectId, currentSum + dist.hours);
        }
      }
    }

    // Update the hours field in the subjects table to reflect the AI distributed hours
    for (const [subjectId, totalHours] of Array.from(subjectTotalHoursMap.entries())) {
      await storage.updateSubject(subjectId, { hours: Math.round(totalHours) });
    }

    res.json({
      success: true,
      message: `Óraszámok sikeresen generálva: ${updatedCount} modul frissítve.`,
      updatedCount,
      distributions: hourDistributions
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
      let isNewProfession = false;
      
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
        
        // --- STEP 1: LOGICAL SPLIT BY MAJOR UNITS ---
        activeImport.message = "Szakma szerkezetének elemzése (Phase 1)...";
        activeImport.progress = 12;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

        // Split PTT along major vocational units (e.g., 3.1, 3.2, 3.3)
        const sections = pttText
          .split(/(?=\n\s*\d+\.\d+\s+[A-ZÁÉÍÓÖŐUÚÜŰa-záéíóöőuúüű])/)
          .filter(s => s.trim().length > 100);

        const tableContext = pttText.substring(0, 12000);
        const mergedSubjectsMap: Map<string, any> = new Map();
        let analysisProgress = 12;

        await runParallel(sections, 2, async (section, idx) => {
          if ((activeImport.status as string) === 'error' || activeImport.error === 'Cancelled by user') return;

          activeImport.message = `Szakma szerkezetének elemzése (${idx + 1}/${sections.length})...`;
          const currentAnalysisProgress = 12 + Math.round((idx / sections.length) * 12);
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
                { role: "system", content: "Te egy PTT (Programtanterv) szerkezet-elemző szakértő vagy. Csak valid JSON-t adsz vissza subjects listával, modulok nélkül!" },
                { role: "user", content: `
Elemezd az alábbi PTT egységet és a táblázat környezetet!
Határozd meg a szekcióban található tantárgyakat, kódjukat (pl. 3.1.1), elméleti és gyakorlati óraszámaikat, valamint a gyakorlat százalékos arányát.

TÁBLÁZAT KÖRNYEZET (Táblázatos óraszámok):
${tableContext}

DOKUMENTUM EGYSÉG SZÖVEGE:
${section}

SZABÁLYOK:
1. Határozd meg az elméleti (theoryHours) és gyakorlati (practicalHours) órákat. A magyar PTT-ben mindig az ELMÉLET áll az első helyen és a GYAKORLAT a másodikon!
2. A "practicalPercent" a gyakorlati arány százalékban (0-100). Ha nincs gyakorlat, ez 0.
3. NE generálj modulokat vagy leckéket ebben a lépésben! Csak a tantárgyakat és azok összefoglaló adatait gyűjtsd ki!

VÁLASZ FORMÁTUM (SZIGORÚ JSON):
{
  "subjects": [
    {
      "name": "Tantárgy neve (pl. Gépészeti alapismeretek)",
      "code": "3.X.X",
      "totalHours": 80,
      "theoryHours": 40,
      "practicalHours": 40,
      "practicalPercent": 50,
      "description": "Rövid szakmai leírás..."
    }
  ]
}
` }
              ],
              temperature: 0
            });
          });

          const data = JSON.parse(response.choices[0].message.content || '{"subjects":[]}');
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
                  name: sub.name || existing.name,
                  description: sub.description || existing.description
                });
              }
            }
          }
        });

        const extractedSubjects = Array.from(mergedSubjectsMap.values());
        if (extractedSubjects.length === 0) throw new Error("A struktúra elemzés során az AI nem talált feldolgozható tantárgyakat.");

        // Find or create profession
        const allProfs = await storage.getProfessions();
        let dbProfession = allProfs.find(p => p.name.trim() === profession.name.trim());
        
        if (!dbProfession) {
          dbProfession = await storage.createProfession({
            name: profession.name,
            description: `Importálva az IKK-ról.`,
            iconName: "book",
            code: profession.okjId || profession.code
          });
          isNewProfession = true;
        } else {
          const cleanDescription = (dbProfession.description || "").split(" (Frissítve:")[0];
          await storage.updateProfession(dbProfession.id, {
            description: cleanDescription + ` (Frissítve: ${new Date().toLocaleDateString('hu-HU')} - ${type === 'both' ? 'Teljes' : type === 'theory' ? 'Elmélet' : 'Gyakorlat'})`
          });
        }
        
        createdProfessionId = dbProfession.id;
        const existingSubjects = await storage.getSubjects(dbProfession.id);
        const dbSubjects = [];

        // Save subjects immediately to the database
        activeImport.message = "Tantárgyak és óraszámok mentése az adatbázisba...";
        activeImport.progress = 25;
        await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

        for (const sub of extractedSubjects) {
          const theoryHoursParsed = typeof sub.theoryHours === 'number' ? sub.theoryHours : parseInt(sub.theoryHours || '0') || 0;
          const practicalHoursParsed = typeof sub.practicalHours === 'number' ? sub.practicalHours : parseInt(sub.practicalHours || '0') || 0;
          const totalHoursParsed = typeof sub.totalHours === 'number' ? sub.totalHours : parseInt(sub.totalHours || '0') || 0;
          const practicalPercentParsed = typeof sub.practicalPercent === 'number' ? sub.practicalPercent : parseInt(sub.practicalPercent || '0') || 0;

          const processTheory = type === 'theory' || (type === 'both' && theoryHoursParsed > 0);
          const processPractical = type === 'practical' || (type === 'both' && practicalHoursParsed > 0 && practicalPercentParsed > 0);

          if (processTheory) {
            const subjectName = sub.name;
            const subjectHours = theoryHoursParsed || totalHoursParsed || null;
            let dbSubject = existingSubjects.find(s => s.name === subjectName && s.type === 'theory');
            
            if (!dbSubject) {
              dbSubject = await storage.createSubject({
                professionId: dbProfession.id,
                name: subjectName,
                code: (sub.code || "").replace(/\.$/, ""),
                description: sub.description || "",
                type: 'theory',
                orderIndex: 0,
                hours: subjectHours
              });
            } else {
              await storage.updateSubject(dbSubject.id, { hours: subjectHours });
            }
            dbSubjects.push(dbSubject);
          }

          if (processPractical) {
            let subjectName = sub.name;
            if (!subjectName.toLowerCase().includes('gyakorlat')) {
              subjectName = subjectName + ' gyakorlat';
            }
            const subjectHours = practicalHoursParsed || totalHoursParsed || null;
            let dbSubject = existingSubjects.find(s => s.name === subjectName && s.type === 'practical');
            
            if (!dbSubject) {
              dbSubject = await storage.createSubject({
                professionId: dbProfession.id,
                name: subjectName,
                code: (sub.code || "").replace(/\.$/, ""),
                description: sub.description || "",
                type: 'practical',
                orderIndex: 0,
                hours: subjectHours
              });
            } else {
              await storage.updateSubject(dbSubject.id, { hours: subjectHours });
            }
            dbSubjects.push(dbSubject);
          }
        }

        // Calculate total target modules for progress mapping
        let totalTargetModules = 0;
        for (const dbSub of dbSubjects) {
          if (dbSub.type === 'theory') {
            const subHours = dbSub.hours || 10;
            totalTargetModules += subHours > 40 ? Math.ceil(subHours / 4) : subHours;
          } else {
            totalTargetModules += Math.max(1, Math.round((dbSub.hours || 30) / 7));
          }
        }
        
        let processedModules = 0;

        // ── PHASE 2: INDIVIDUAL SUBJECT MODULAR BREAKDOWN ──
        let subjectIndex = 0;
        for (const dbSubject of dbSubjects) {
          if ((activeImport.status as string) === 'error' || activeImport.error === 'Cancelled by user') break;

          subjectIndex++;
          activeImport.message = `Tananyag generálása (${subjectIndex}/${dbSubjects.length}): ${dbSubject.name}...`;
          activeImport.progress = 30 + Math.round((subjectIndex / dbSubjects.length) * 65);
          await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

          const subjectPttText = ikkService.getSubjectPttText(dbSubject.name, pttText, dbSubject.code);
          if (!subjectPttText.trim()) {
            console.log(`[IKK-IMPORT] ${dbSubject.name} tantárgynak nincs tanmenete a PTT-ben. Átugrás.`);
            continue;
          }

          if (dbSubject.type === 'theory') {
            // --- THEORY MODULAR BREAKDOWN ---
            const totalHours = dbSubject.hours || 10;
            const useBlocks = totalHours > 40;
            const blockSize = useBlocks ? 4 : 1;
            const targetModuleCount = useBlocks ? Math.ceil(totalHours / 4) : totalHours;
            
            activeImport.message = `${dbSubject.name} - Tanmenet felosztása (${totalHours} óra)...`;
            await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

            const breakdownRes = await withRetry(async () => {
              const openai = await getOpenAIClient();
              return openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: "Te egy szigorú tanmenet-tervező és szakoktató vagy. Csak valid JSON-t adsz vissza." },
                  { role: "user", content: useBlocks ? `
A feladatod a(z) "${dbSubject.name}" tantárgy tanmenetének lebontása pontosan ${targetModuleCount} darab, egyenként 4-órás heti témakörre (modulra), mivel a tantárgy magas óraszámú (${totalHours} óra).

TANTÁRGY LEÍRÁSA A PTT-BEN:
${subjectPttText}

SZABÁLYOK:
1. Generálj PONTOSAN ${targetModuleCount} darab modult. Nem lehet se több, se kevesebb!
2. Minden modul címe legyen szakmailag sűrű, tükrözze a 4-órás egység tartalmát, és kövessék a PTT logikai sorrendjét.
3. Minden modulhoz rendelj egy sectionCode-ot a tantárgy kódja alapján (pl. ha a tantárgy kódja "${dbSubject.code || '3.1.1'}", akkor a modulok kódjai: "${dbSubject.code || '3.1.1'}.1.a", "${dbSubject.code || '3.1.1'}.1.b", stb.).

VÁLASZ FORMÁTUM (SZIGORÚ JSON):
{
  "modules": [
    { "title": "Modul címe", "sectionCode": "${dbSubject.code || '3.1.1'}.1.a" }
  ]
}
` : `
A feladatod a(z) "${dbSubject.name}" tantárgy tanmenetének lebontása pontosan ${totalHours} darab 1-órás modulra (leckére) az 1 TANÓRA = 1 MODUL elv alapján.

TANTÁRGY LEÍRÁSA A PTT-BEN:
${subjectPttText}

SZABÁLYOK:
1. Generálj PONTOSAN ${totalHours} darab leckét (modult). Nem lehet se több, se kevesebb!
2. A leckék címei legyenek szakmailag sűrűek, és kövessék a PTT logikai sorrendjét.
3. Minden leckéhez rendelj egy sectionCode-ot a tantárgy kódja alapján (pl. ha a tantárgy kódja "${dbSubject.code || '3.1.1'}", akkor a leckék kódjai: "${dbSubject.code || '3.1.1'}.1.a", "${dbSubject.code || '3.1.1'}.1.b", stb.).

VÁLASZ FORMÁTUM (SZIGORÚ JSON):
{
  "modules": [
    { "title": "Lecke címe", "sectionCode": "${dbSubject.code || '3.1.1'}.1.a" }
  ]
}
` }
                ],
                temperature: 0.1
              });
            });

            const breakdownData = JSON.parse(breakdownRes.choices[0].message.content || '{"modules":[]}');
            const theoryModules = breakdownData.modules || [];

            if (theoryModules.length > 0) {
              const existingModules = await storage.getModules(dbSubject.id);

              const BATCH_SIZE = 4;
              const batches = [];
              for (let i = 0; i < theoryModules.length; i += BATCH_SIZE) {
                batches.push(theoryModules.slice(i, i + BATCH_SIZE));
              }

              let theoryProcessed = 0;
              await runParallel(batches, 2, async (batch, batchIndex) => {
                if ((activeImport.status as string) === 'error' || activeImport.error === 'Cancelled by user') return;

                const allExist = batch.every((bm: any) => existingModules.some(em => em.title === bm.title));
                if (allExist) {
                  theoryProcessed += batch.length;
                  processedModules += batch.length;
                  return;
                }

                if (batchIndex > 0) await new Promise(r => setTimeout(r, batchIndex * 500));

                const res = await withRetry(async () => {
                  const openai = await getOpenAIClient();
                  return openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    response_format: { type: "json_object" },
                    messages: [
                      { role: "system", content: "Tananyagfejlesztő vagy. Generálj szakmai tartalmat JSON-ben." },
                      { role: "user", content: ikkService.buildContentPrompt(profession.name, dbSubject.name, batch) }
                    ],
                    temperature: 0.4
                  }, {
                    timeout: 120000
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
                      type: 'theory',
                      moduleNumber: ++theoryProcessed,
                      sectionCode: original?.sectionCode || null,
                      isPublished: false,
                      suggestedHours: blockSize.toString()
                    };
                  });

                if (modulesToCreate.length > 0) await storage.bulkCreateModules(modulesToCreate);
                else theoryProcessed += batch.length;
                
                processedModules += batch.length;
                const currentProgress = 30 + Math.round((processedModules / (totalTargetModules || 10)) * 65);
                activeImport.progress = Math.min(99, currentProgress);

                activeImport.message = `${dbSubject.name} (Elmélet) - Tartalom (${theoryProcessed}/${theoryModules.length})...`;
                await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

                if (global.gc) {
                  try { global.gc(); } catch (e) {}
                }
              });
            }

          } else if (dbSubject.type === 'practical') {
            // --- PRACTICAL DUAL-PIPELINE (Daily breakdown) ---
            activeImport.message = `${dbSubject.name} - 1. lépés: Nyers műhelytevékenységek kigyűjtése...`;
            await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

            const rawActivitiesRes = await withRetry(async () => {
              const openai = await getOpenAIClient();
              return openai.chat.completions.create({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: "Szakoktató és PTT elemző vagy. Csak valid JSON-t adsz vissza." },
                  { role: "user", content: ikkService.buildWorkshopActivityExtractionPrompt(subjectPttText) }
                ],
                temperature: 0.1
              });
            });

            const rawActivitiesData = JSON.parse(rawActivitiesRes.choices[0].message.content || '{"rawActivities":[]}');
            const rawActivities = rawActivitiesData.rawActivities || [];

            if (rawActivities.length > 0) {
              activeImport.message = `${dbSubject.name} - 2. lépés: 1 napos tanulási egységekbe szervezés...`;
              await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

              const sizedModulesRes = await withRetry(async () => {
                const openai = await getOpenAIClient();
                return openai.chat.completions.create({
                  model: "gpt-4o-mini",
                  response_format: { type: "json_object" },
                  messages: [
                    { role: "system", content: "Gyakorlati tanmenet-tervező vagy. Csak valid JSON-t adsz vissza." },
                    { role: "user", content: ikkService.buildWorkshopDaySizingPrompt(dbSubject.name, rawActivities) }
                  ],
                  temperature: 0.2
                });
              });

              const sizedModulesData = JSON.parse(sizedModulesRes.choices[0].message.content || '{"modules":[]}');
              const sizedModules = sizedModulesData.modules || [];

              let practicalProcessed = 0;
              const existingModules = await storage.getModules(dbSubject.id);

              for (const sizedMod of sizedModules) {
                if ((activeImport.status as string) === 'error' || activeImport.error === 'Cancelled by user') break;

                if (existingModules.some(em => em.title === sizedMod.title)) {
                  practicalProcessed++;
                  processedModules++;
                  continue;
                }

                activeImport.message = `${dbSubject.name} - 3. lépés: ${sizedMod.title} útmutató generálása...`;
                await (storage as any).updateBackgroundJob(jobId, { message: activeImport.message, progress: activeImport.progress });

                const expandedRes = await withRetry(async () => {
                  const openai = await getOpenAIClient();
                  return openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    response_format: { type: "json_object" },
                    messages: [
                      { role: "system", content: "Gyakorlati tananyagfejlesztő vagy. Csak valid JSON-t adsz vissza." },
                      { role: "user", content: ikkService.buildPracticalDayContentPrompt(profession.name, dbSubject.name, sizedMod.title, sizedMod.activities || []) }
                    ],
                    temperature: 0.3
                  });
                });

                const expandedData = JSON.parse(expandedRes.choices[0].message.content || '{}');

                await storage.createModule({
                  subjectId: dbSubject.id,
                  title: sizedMod.title,
                  content: expandedData.content || "",
                  practicalTasks: expandedData.practicalTasks || [],
                  type: 'practical',
                  moduleNumber: ++practicalProcessed,
                  sectionCode: sizedMod.sectionCode || null,
                  isPublished: false
                });

                processedModules++;
                const currentProgress = 30 + Math.round((processedModules / (totalTargetModules || 10)) * 65);
                activeImport.progress = Math.min(99, currentProgress);
              }
            }
          }

          if (global.gc) {
            try {
              global.gc();
              console.log(`[GC] Sikeres memória tisztítás a(z) ${dbSubject.name} tantárgy után.`);
            } catch (e) {}
          }
        }

        if ((activeImport.status as string) === 'error' || activeImport.error === 'Cancelled by user') {
          if (createdProfessionId) await storage.deleteProfession(createdProfessionId);
          return;
        }

        activeImport.status = 'completed';
        activeImport.progress = 100;
        activeImport.message = `Sikeres import: ${dbProfession.name} (ID: ${dbProfession.id})`;
        
        await (storage as any).updateBackgroundJob(jobId, { status: 'completed', progress: 100, message: activeImport.message });

      } catch (err: any) {
        console.error("[IKK-IMPORT] Hiba:", err);
        activeImport.status = 'error';
        activeImport.error = err.message;
        await (storage as any).updateBackgroundJob(jobId, { status: 'error', error: err.message, message: `Hiba: ${err.message}` });
      }
    }, 500);
  } catch (error) {
    res.status(500).json({ message: 'Failed to start IKK import' });
  }
});

export default router;
