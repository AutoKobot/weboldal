import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

const checkTeacherOrAdmin = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'school_admin')) {
    return next();
  }
  return res.status(403).json({ message: "Access denied." });
};

router.get('/student/:studentId', combinedAuth, async (req: any, res) => {
  try {
    // A student can see their own grades, a teacher/admin can see any student's grades
    if (req.user.role === 'student' && req.user.id !== req.params.studentId) {
      return res.status(403).json({ message: "You can only see your own grades" });
    }
    
    const grades = await storage.getPracticalGradesByStudent(req.params.studentId);
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Hiba a gyakorlati jegyek betöltésekor' });
  }
});

router.get('/module/:moduleId', combinedAuth, checkTeacherOrAdmin, async (req: any, res) => {
  try {
    // This might be used by teachers to see all grades for a module
    // We'll need a storage method for this or filter from a larger set
    const moduleId = parseInt(req.params.moduleId);
    // For now, let's assume we fetch all and filter or have a specific method
    const { db } = await import('../db');
    const { practicalGrades } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const grades = await db.select().from(practicalGrades).where(eq(practicalGrades.moduleId, moduleId));
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Hiba a modul jegyeinek betöltésekor' });
  }
});

router.post('/', combinedAuth, checkTeacherOrAdmin, async (req: any, res) => {
  try {
    const { studentId, moduleId, grade, comment } = req.body;
    const teacherId = req.user.id;
    if (!studentId || !moduleId || !grade) return res.status(400).json({ message: 'Hiányzó mezők' });

    const existing = await storage.getPracticalGradeForModule(studentId, moduleId);
    let result;
    if (existing) {
      result = await storage.updatePracticalGrade(existing.id, { grade, comment, teacherId });
    } else {
      result = await storage.createPracticalGrade({ studentId, moduleId, grade, comment, teacherId });
    }
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Hiba a mentéskor' });
  }
});

router.delete('/:id', combinedAuth, checkTeacherOrAdmin, async (req: any, res) => {
  try {
    await storage.deletePracticalGrade(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Hiba a törléskor' });
  }
});

export default router;
