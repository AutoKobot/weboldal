import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

const checkTeacher = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'school_admin')) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Teacher role required." });
};

router.get('/classes', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classes = await storage.getClassesByTeacher(req.user.id);
    res.json(classes);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});

router.get('/students', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const students = await storage.getStudentsByTeacher(req.user.id);
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const studentsWithOnlineStatus = students.map((s: any) => ({
      ...s,
      isOnline: s.lastActiveDate ? new Date(s.lastActiveDate).getTime() > fiveMinsAgo.getTime() : false
    }));
    res.json(studentsWithOnlineStatus);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

router.get('/home-stats', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const teacherId = req.user.id;
    const teacherClasses = await storage.getClassesByTeacher(teacherId);
    const { db } = await import('../db');
    const { users: usersTable, testResults: testResultsTable } = await import('@shared/schema');
    const { inArray, eq: eqDrizzle } = await import('drizzle-orm');

    const classIds = teacherClasses.map((c: any) => c.id);
    let studentsInClasses: any[] = [];
    if (classIds.length > 0) {
      studentsInClasses = await db.select().from(usersTable).where(inArray(usersTable.classId, classIds));
    }

    const directStudents = await storage.getStudentsByTeacher(teacherId);
    const allStudents = [
      ...studentsInClasses,
      ...directStudents.filter((s: any) => !studentsInClasses.find((sc: any) => sc.id === s.id)),
    ];

    let studentsWithResults: any[] = [];
    if (allStudents.length > 0) {
      const allStudentIds = allStudents.map((s: any) => s.id);
      
      // Batch fetch all test results for all students in one query
      const allResults = await db.select({
        id: testResultsTable.id,
        userId: testResultsTable.userId,
        moduleId: testResultsTable.moduleId,
        score: testResultsTable.score,
        passed: testResultsTable.passed,
        createdAt: testResultsTable.createdAt,
      })
      .from(testResultsTable)
      .where(inArray(testResultsTable.userId, allStudentIds))
      .orderBy(testResultsTable.createdAt);

      // Group results by userId
      const resultsByUser: Record<string, any[]> = {};
      allResults.forEach(r => {
        if (!resultsByUser[r.userId]) resultsByUser[r.userId] = [];
        resultsByUser[r.userId].push(r);
      });

      studentsWithResults = allStudents.map((student: any) => ({
        id: student.id,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        classId: student.classId,
        completedModules: student.completedModules || [],
        lastActiveDate: student.lastActiveDate,
        currentStreak: student.currentStreak,
        testResults: resultsByUser[student.id] || [],
      }));
    }

    res.json({ classes: teacherClasses, students: studentsWithResults });
  } catch (error) {
    console.error('Error fetching teacher home stats:', error);
    res.status(500).json({ message: 'Failed to fetch teacher home stats' });
  }
});

router.get('/classes/:id/grades', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { startDate, endDate, studentId } = req.query;
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });

    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

    const results = await storage.getTestResultsByClass(
      classId,
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined,
      typeof studentId === 'string' ? studentId : undefined
    );

    const toGrade = (score: number) => {
      if (score >= 95) return 5;
      if (score >= 80) return 4;
      if (score >= 70) return 3;
      if (score >= 60) return 2;
      return 1;
    };

    res.json(results.map(r => ({ ...r, grade: toGrade(r.score) })));
  } catch (error) {
    console.error("Error fetching class grades:", error);
    res.status(500).json({ message: "Failed to fetch grades" });
  }
});

router.get('/classes/:id/roster', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });

    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

    const allResults = await storage.getTestResultsByClass(
      classId,
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined,
      undefined
    );

    const toGrade = (score: number) => {
      if (score >= 95) return 5;
      if (score >= 80) return 4;
      if (score >= 70) return 3;
      if (score >= 60) return 2;
      return 1;
    };

    const byStudent: Record<string, any[]> = {};
    for (const r of allResults) {
      const key = (r as any).studentId || (r as any).userId;
      if (!byStudent[key]) byStudent[key] = [];
      byStudent[key].push(r);
    }

    const rosterRows = Object.entries(byStudent).map(([, results]) => {
      const first = results[0] as any;
      const grades = results.map(r => ({ ...r, grade: toGrade(r.score) }));
      const avgGrade = grades.length > 0
        ? parseFloat((grades.reduce((s, g) => s + g.grade, 0) / grades.length).toFixed(2))
        : null;
      return {
        studentName: first.studentName || 'Ismeretlen',
        username: first.username || '',
        avgGrade,
        testCount: grades.length,
        grades: grades.map(g => ({
          moduleTitle: g.moduleTitle || g.moduleId,
          score: g.score,
          grade: g.grade,
          createdAt: g.createdAt,
        })),
      };
    });

    rosterRows.sort((a, b) => a.studentName.localeCompare(b.studentName, 'hu'));
    let periodLabel = 'Mindenkori';
    if (startDate && endDate) periodLabel = `${new Date(startDate as string).toLocaleDateString('hu-HU')} – ${new Date(endDate as string).toLocaleDateString('hu-HU')}`;
    else if (startDate) periodLabel = `${new Date(startDate as string).toLocaleDateString('hu-HU')} –tól`;

    res.json({ className: classData.name, period: periodLabel, generatedAt: new Date().toISOString(), students: rosterRows });
  } catch (error) {
    console.error("Error fetching class roster:", error);
    res.status(500).json({ message: "Failed to fetch roster" });
  }
});

router.get('/classes/:id/attendance', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { date, startDate, endDate } = req.query;
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });

    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

    if (startDate && endDate) {
      const rows = await storage.getAttendanceByClassRange(classId, startDate as string, endDate as string);
      return res.json(rows);
    }

    const targetDate = (date as string) || new Date().toISOString().split('T')[0];
    const rows = await storage.getAttendanceByClass(classId, targetDate);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

router.patch('/attendance/:id', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Érvénytelen státusz" });
    const updated = await storage.updateAttendanceStatus(parseInt(req.params.id), status, req.user.id);
    res.json(updated);
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ message: "Failed to update attendance" });
  }
});

router.get('/classes/:id/daily-attendance', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { date, startDate, endDate } = req.query;
    const rows = await storage.getDailyAttendanceByClass(
      classId, 
      date as string, 
      startDate as string, 
      endDate as string
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching daily attendance:", error);
    res.status(500).json({ message: "Failed to fetch daily attendance" });
  }
});

router.post('/classes/:id/daily-attendance', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { records } = req.body; // Array of { studentId, date, status, actualStart, actualEnd, notes }
    const results = [];
    for (const rec of records) {
      const row = await storage.upsertDailyAttendance({
        ...rec,
        classId,
        recordedBy: req.user.id
      });
      results.push(row);
    }
    res.json(results);
  } catch (error) {
    console.error("Error updating daily attendance:", error);
    res.status(500).json({ message: "Failed to update daily attendance" });
  }
});

router.post('/classes/:id/attendance', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const { studentId, date, periodNumber, status } = req.body;
    const classId = parseInt(req.params.id);
    const row = await storage.upsertAttendance({
      studentId, classId, teacherId: req.user.id, date, periodNumber: parseInt(periodNumber), status, recordedBy: req.user.id
    });
    res.json(row);
  } catch (error) {
    console.error("Error recording attendance:", error);
    res.status(500).json({ message: "Failed to record attendance" });
  }
});

router.post('/classes/:id/attendance/bulk', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const { records } = req.body; // Array of { studentId, date, periodNumber, status }
    const classId = parseInt(req.params.id);
    const teacherId = req.user.id;
    
    const results = [];
    for (const rec of records) {
      const row = await storage.upsertAttendance({
        ...rec,
        classId,
        teacherId,
        recordedBy: teacherId
      });
      results.push(row);
    }
    res.json(results);
  } catch (error) {
    console.error("Error in bulk attendance:", error);
    res.status(500).json({ message: "Failed to record bulk attendance" });
  }
});

router.get('/classes/:id/schedules', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });

    const schedules = await storage.getLessonSchedules(
      classData.schoolAdminId || '',
      classData.scheduleGroup || 'morning',
      classId
    );
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching class schedules:", error);
    res.status(500).json({ message: "Failed to fetch schedules" });
  }
});

router.post('/classes/:id/schedules', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { schedules } = req.body; // Array of InsertLessonSchedule
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });

    const formattedSchedules = schedules.map((s: any) => ({
      ...s,
      classId,
      schoolId: classData.schoolId,
      schoolAdminId: classData.schoolAdminId,
      scheduleGroup: classData.scheduleGroup || 'morning'
    }));

    const results = await storage.upsertLessonSchedules(formattedSchedules);
    res.json(results);
  } catch (error) {
    console.error("Error updating class schedules:", error);
    res.status(500).json({ message: "Failed to update schedules" });
  }
});

router.get('/classes/:id/notes', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const notes = await storage.getClassDailyNotes(classId, targetDate);
    res.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ message: "Failed to fetch notes" });
  }
});

router.post('/students/:studentId/notes', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const { date, note, classId } = req.body;
    const row = await storage.upsertStudentDailyNote({
      studentId: req.params.studentId, teacherId: req.user.id,
      classId: classId ? parseInt(classId) : null,
      date: date || new Date().toISOString().split('T')[0], note
    });
    res.json(row);
  } catch (error) {
    console.error("Error saving note:", error);
    res.status(500).json({ message: "Failed to save note" });
  }
});

router.get('/classes/:id/attendance/export', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { startDate, endDate, format } = req.query;
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });

    const sd = (startDate as string) || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const ed = (endDate as string) || new Date().toISOString().split('T')[0];
    const rows = await storage.getAttendanceExportData(classId, sd, ed);

    if (format === 'csv') {
      const statusMap: any = { present: 'Jelen', absent: 'Hiányzik', late: 'Késő', excused: 'Igazolt' };
      const headerLine = 'Vezetéknév;Keresztnév;Felhasználó;Dátum;Óra sorszáma;Státusz;Belépés ideje;Napi megjegyzés\n';
      const csvRows = rows.map((r: any) => [
        r.last_name || '', r.first_name || '', r.username || '', r.date || '', r.period_number || '',
        statusMap[r.status] || r.status || '',
        r.login_at ? new Date(r.login_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '',
        (r.daily_note || '').replace(/;/g, ',').replace(/\n/g, ' ')
      ].join(';')).join('\n');

      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      const responseBuffer = Buffer.concat([bom, Buffer.from(headerLine + csvRows, 'utf8')]);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="jelenlet_${classId}_${sd}.csv"`);
      res.end(responseBuffer);
    } else {
      res.json({ className: classData.name, startDate: sd, endDate: ed, rows });
    }
  } catch (error) {
    console.error("Error exporting attendance:", error);
    res.status(500).json({ message: "Failed to export attendance" });
  }
});

// --- Practical Grades ---
router.get('/practical-grades/student/:studentId', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const grades = await storage.getPracticalGradesByStudent(req.params.studentId);
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: 'Hiba a gyakorlati jegyek betöltésekor' });
  }
});

router.post('/practical-grades', combinedAuth, checkTeacher, async (req: any, res) => {
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

router.delete('/practical-grades/:id', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    await storage.deletePracticalGrade(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Hiba a törléskor' });
  }
});

export default router;
