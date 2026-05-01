import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { insertProfessionSchema, insertSubjectSchema, insertModuleSchema } from "@shared/schema";
import { fixMermaidSyntax } from "../openai";
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' });

const checkContentEditor = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'school_admin')) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Teacher or Admin role required." });
};

// --- Quizzes (Prioritized) ---
router.post('/modules/:id/quiz-result', combinedAuth, async (req: any, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    const { score, maxScore, passed, details } = req.body;
    const result = await storage.createTestResult({
      userId: req.user.id, moduleId, score, maxScore, passed, details: details || {}, createdAt: new Date()
    });
    if (passed) {
      const user = await storage.getUser(req.user.id);
      if (user && !user.completedModules?.includes(moduleId)) {
        await storage.updateUserCompletedModules(req.user.id, [...(user.completedModules || []), moduleId]);
      }
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to save result" });
  }
});

router.post('/quiz/evaluate', combinedAuth, async (req: any, res) => {
  try {
    const { question, correctAnswer, userAnswer, explanation } = req.body;
    const { evaluateAnswer } = await import('../openai');
    const evaluation = await evaluateAnswer(question, correctAnswer, userAnswer, explanation);
    res.json(evaluation);
  } catch (error) {
    console.error("Evaluation error:", error);
    res.status(500).json({ message: "Failed to evaluate answer" });
  }
});

router.get('/modules/:id/quiz', combinedAuth, async (req: any, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    const module = await storage.getModule(moduleId);
    if (!module || !module.generatedQuizzes || !Array.isArray(module.generatedQuizzes) || module.generatedQuizzes.length === 0) {
      return res.status(404).json({ message: "Nincs kvíz generálva ehhez a modulhoz. Kérd meg a tanárod az újragenerálásra!", needsRegeneration: true });
    }
    const randomIndex = Math.floor(Math.random() * module.generatedQuizzes.length);
    res.json({ questions: module.generatedQuizzes[randomIndex] });
  } catch (error) {
    console.error("Quiz load error:", error);
    res.status(500).json({ message: "Failed to load quiz" });
  }
});

router.post('/modules/:id/flashcards/import', combinedAuth, checkContentEditor, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nincs fájl' });
    const moduleId = parseInt(req.params.id);
    const csvData = fs.readFileSync(req.file.path, 'utf-8');
    const records = parse(csvData, { columns: true, skip_empty_lines: true });

    const toInsert = records.map((r: any) => ({
      moduleId,
      front: String(r.Front || r.Question || Object.values(r)[0] || '').trim(),
      back: String(r.Back || r.Answer || Object.values(r)[1] || '').trim(),
    })).filter((f: any) => f.front && f.back);

    if (toInsert.length === 0) return res.status(400).json({ message: 'Nincs érvényes kártya' });
    const inserted = await storage.bulkCreateFlashcards(toInsert);
    fs.unlinkSync(req.file.path);
    res.status(201).json({ count: inserted.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to import" });
  }
});

// --- Professions ---
router.get('/professions', combinedAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    const userRole = user?.role || req.user.role;
    const userId = user?.id || req.user.id;
    const userSchoolAdminId = user?.schoolAdminId || (req.user as any).schoolAdminId;

    const schoolAdminId = userRole === 'admin' ? undefined : (userRole === 'school_admin' ? userId : userSchoolAdminId);
    let professions = await storage.getProfessions(schoolAdminId);

    // Demo restriction - ONLY for dedicated DemoUser
    const username = user?.username || req.user.username;
    if (username === 'DemoUser') {
      const demoProfessions = professions.filter(p => p.name.toLowerCase().includes('hegesztő'));
      if (demoProfessions.length > 0) {
        professions = demoProfessions.slice(0, 1);
      } else if (professions.length > 0) {
        // Fallback to the first available profession if hegesztő is missing
        professions = professions.slice(0, 1);
      }
    }

    res.json(professions);
  } catch (error) {
    console.error("Fetch professions error details:", error);
    res.status(500).json({ 
      message: "Failed to fetch professions", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

router.post('/professions', combinedAuth, checkContentEditor, async (req: any, res) => {
  try {
    const data = insertProfessionSchema.parse(req.body);
    const profession = await storage.createProfession(data);
    res.json(profession);
  } catch (error) {
    res.status(500).json({ message: "Failed to create profession" });
  }
});

// --- Subjects ---
router.get('/subjects', combinedAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    const userRole = user?.role || req.user.role;
    const userId = user?.id || req.user.id;
    const userSchoolAdminId = user?.schoolAdminId || (req.user as any).schoolAdminId;

    const schoolAdminId = userRole === 'admin' ? undefined : (userRole === 'school_admin' ? userId : userSchoolAdminId);
    const professionId = req.query.professionId ? parseInt(req.query.professionId as string) : undefined;
    
    let subjects = await storage.getSubjects(professionId, schoolAdminId);

    // Demo restriction - ONLY for dedicated DemoUser
    const username = user?.username || req.user.username;
    if (username === 'DemoUser') {
      subjects = subjects.slice(0, 3);
    }

    res.json(subjects);
  } catch (error) {
    console.error("Fetch subjects error:", error);
    res.status(500).json({ message: "Failed to fetch subjects" });
  }
});

router.post('/subjects', combinedAuth, checkContentEditor, async (req: any, res) => {
  try {
    const data = insertSubjectSchema.parse(req.body);
    const subject = await storage.createSubject(data);
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: "Failed to create subject" });
  }
});

router.patch('/subjects/:id', combinedAuth, checkContentEditor, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = insertSubjectSchema.partial().parse(req.body);
    const subject = await storage.updateSubject(id, data);
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: "Failed to update subject" });
  }
});

router.delete('/subjects/:id', combinedAuth, checkContentEditor, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteSubject(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete subject" });
  }
});

// --- Modules ---
router.get('/modules', combinedAuth, async (req: any, res) => {
  try {
    const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
    const user = await storage.getUser(req.user.id);
    const userRole = user?.role || req.user.role;
    const username = user?.username || req.user.username;
    const userSchoolAdminId = user?.schoolAdminId || (req.user as any).schoolAdminId;
    const userId = user?.id || req.user.id;
    
    const schoolAdminId = userRole === 'admin' ? undefined : (userRole === 'school_admin' ? userId : userSchoolAdminId);

    let modules;
    if (userRole === 'admin' || userRole === 'teacher') {
      modules = await storage.getModules(subjectId, schoolAdminId);
    } else {
      modules = await storage.getPublishedModules(subjectId, schoolAdminId);
    }
    
    let cleaned = modules.map(m => ({
      ...m,
      content: m.content ? fixMermaidSyntax(m.content) : m.content,
      conciseContent: m.conciseContent ? fixMermaidSyntax(m.conciseContent) : m.conciseContent,
      detailedContent: m.detailedContent ? fixMermaidSyntax(m.detailedContent) : m.detailedContent,
    }));

    // Demo restriction - ONLY for dedicated DemoUser
    if (username === 'DemoUser') {
      cleaned = cleaned.slice(0, 3);
    }

    res.json(cleaned);
  } catch (error) {
    console.error("Fetch modules error details:", error);
    res.status(500).json({ 
      message: "Failed to fetch modules", 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

router.get('/modules/:id', combinedAuth, async (req: any, res) => {
  try {
    const module = await storage.getModule(parseInt(req.params.id));
    if (!module) return res.status(404).json({ message: "Module not found" });
    res.json({
      ...module,
      content: module.content ? fixMermaidSyntax(module.content) : module.content,
      conciseContent: module.conciseContent ? fixMermaidSyntax(module.conciseContent) : module.conciseContent,
      detailedContent: module.detailedContent ? fixMermaidSyntax(module.detailedContent) : module.detailedContent,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch module" });
  }
});

router.post('/modules', combinedAuth, checkContentEditor, async (req: any, res) => {
  try {
    const data = insertModuleSchema.parse(req.body);
    const module = await storage.createModule(data);
    res.status(201).json(module);
  } catch (error) {
    res.status(500).json({ message: "Failed to create module" });
  }
});

router.patch('/modules/:id', combinedAuth, checkContentEditor, async (req: any, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    const data = insertModuleSchema.partial().parse(req.body);
    const module = await storage.updateModule(moduleId, data);
    res.json(module);
  } catch (error) {
    res.status(500).json({ message: "Failed to update module" });
  }
});

router.delete('/modules/:id', combinedAuth, checkContentEditor, async (req: any, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    await storage.deleteModule(moduleId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete module" });
  }
});

router.post('/modules/:id/complete', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const moduleId = parseInt(req.params.id);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const completed = user.completedModules || [];
    if (!completed.includes(moduleId)) {
      await storage.updateUserCompletedModules(userId, [...completed, moduleId]);
      if (req.user.id) req.user.completedModules = [...completed, moduleId];
    }
    res.json({ message: "Module completed" });
  } catch (error) {
    res.status(500).json({ message: "Failed to complete module" });
  }
});

// --- Flashcards ---
router.get('/modules/:id/flashcards', combinedAuth, async (req: any, res) => {
  try {
    const flashcards = await storage.getFlashcards(parseInt(req.params.id));
    res.json(flashcards);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch flashcards" });
  }
});

// --- Debug Endpoint ---
router.get('/debug-db', combinedAuth, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.user.id);
    const userRole = user?.role || req.user.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ message: "Admin access required for debug" });
    }

    const professionsCount = await storage.getProfessions();
    const subjectsCount = await storage.getSubjects();
    const modulesCount = await storage.getModules();
    
    // Check background jobs if the method exists
    let jobs = [];
    try {
      if ((storage as any).getLatestBackgroundJob) {
        const job = await (storage as any).getLatestBackgroundJob('ikk_import');
        if (job) jobs.push(job);
      }
    } catch (e) {}

    res.json({
      professions: professionsCount.length,
      subjects: subjectsCount.length,
      modules: modulesCount.length,
      jobs: jobs,
      user: user ? {
        id: user.id,
        role: user.role,
        schoolAdminId: user.schoolAdminId,
        schoolId: user.schoolId
      } : {
        id: req.user.id,
        role: req.user.role,
        schoolAdminId: (req.user as any).schoolAdminId || null,
        schoolId: (req.user as any).schoolId || null
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

