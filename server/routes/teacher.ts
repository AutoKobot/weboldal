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

    const thresholds = classData.gradeThresholds || { grade5: 90, grade4: 65, grade3: 55, grade2: 45 };
    const toGrade = (score: number) => {
      if (score >= thresholds.grade5) return 5;
      if (score >= thresholds.grade4) return 4;
      if (score >= thresholds.grade3) return 3;
      if (score >= thresholds.grade2) return 2;
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

    // Get ALL students in the class (not just those with test results)
    const allStudents = await storage.getStudentsByClass(classId);

    const allResults = await storage.getTestResultsByClass(
      classId,
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined,
      undefined
    );

    // Use thresholds from class settings, default values if not set
    const thresholds = classData.gradeThresholds || { grade5: 90, grade4: 65, grade3: 55, grade2: 45 };
    const toGrade = (score: number) => {
      if (score >= thresholds.grade5) return 5;
      if (score >= thresholds.grade4) return 4;
      if (score >= thresholds.grade3) return 3;
      if (score >= thresholds.grade2) return 2;
      return 1;
    };

    const byStudent: Record<string, any[]> = {};
    for (const r of allResults) {
      const key = (r as any).studentId || (r as any).userId;
      if (!byStudent[key]) byStudent[key] = [];
      byStudent[key].push(r);
    }

    // Get ACTUAL attendance count for each student
    const { db } = await import('../db');
    const { attendance: attendanceTable } = await import('@shared/schema');
    const { and, eq, gte, lte, inArray } = await import('drizzle-orm');

    const studentIds = allStudents.map((s: any) => s.id);
    const attendanceCounts: Record<string, number> = {};

    if (studentIds.length > 0) {
      const conditions = [
        eq(attendanceTable.classId, classId),
        inArray(attendanceTable.studentId, studentIds),
        inArray(attendanceTable.status, ['present', 'late'])
      ];

      if (typeof startDate === 'string' && startDate) {
        conditions.push(gte(attendanceTable.date, startDate));
      }
      if (typeof endDate === 'string' && endDate) {
        conditions.push(lte(attendanceTable.date, endDate));
      }

      const attendanceRecords = await db.select({
        studentId: attendanceTable.studentId,
      })
        .from(attendanceTable)
        .where(and(...conditions));

      for (const record of attendanceRecords) {
        attendanceCounts[record.studentId] = (attendanceCounts[record.studentId] || 0) + 1;
      }
    }

    // Map all students, merge with results
    const rosterRows = allStudents.map((s: any) => {
      const results = byStudent[s.id] || [];
      const grades = results.map((r: any) => ({ ...r, grade: toGrade(r.score) }));
      const avgGrade = grades.length > 0
        ? parseFloat((grades.reduce((sum: number, g: any) => sum + g.grade, 0) / grades.length).toFixed(2))
        : null;
      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        username: s.username,
        studentName: `${s.lastName} ${s.firstName}`,
        avgGrade,
        testCount: grades.length,
        stats: {
          attendanceCount: attendanceCounts[s.id] || 0,
          completedCount: grades.filter((g: any) => g.passed).length,
        },
        testResults: grades.map((g: any) => ({
          moduleTitle: g.moduleTitle || `Modul #${g.moduleId}`,
          moduleId: g.moduleId,
          score: g.score,
          grade: g.grade,
          createdAt: g.createdAt,
        })),
      };
    });

    rosterRows.sort((a: any, b: any) => a.studentName.localeCompare(b.studentName, 'hu'));

    const parsedStart = startDate ? new Date(startDate as string) : null;
    const parsedEnd = endDate ? new Date(endDate as string) : null;
    let periodLabel = 'Mindenkori';
    if (parsedStart && parsedEnd) periodLabel = `${parsedStart.toLocaleDateString('hu-HU')} – ${parsedEnd.toLocaleDateString('hu-HU')}`;
    else if (parsedStart) periodLabel = `${parsedStart.toLocaleDateString('hu-HU')} –tól`;

    res.json({
      className: classData.name,
      period: periodLabel,
      startDate: parsedStart?.toISOString() || null,
      endDate: parsedEnd?.toISOString() || null,
      generatedAt: new Date().toISOString(),
      students: rosterRows
    });
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
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });
    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }
    const { db } = await import('../db');
    const { dailyAttendance: dailyAttendanceTable, users: usersTable } = await import('@shared/schema');
    const { and, eq, gte, lte, asc } = await import('drizzle-orm');

    let conditions = [eq(dailyAttendanceTable.classId, classId)];
    if (date) conditions.push(eq(dailyAttendanceTable.date, date as string));
    if (startDate) conditions.push(gte(dailyAttendanceTable.date, startDate as string));
    if (endDate) conditions.push(lte(dailyAttendanceTable.date, endDate as string));

    const rows = await db.select({
      id: dailyAttendanceTable.id,
      student_id: dailyAttendanceTable.studentId,
      class_id: dailyAttendanceTable.classId,
      date: dailyAttendanceTable.date,
      status: dailyAttendanceTable.status,
      actual_start: dailyAttendanceTable.actualStart,
      actual_end: dailyAttendanceTable.actualEnd,
      notes: dailyAttendanceTable.notes,
      student_name: dailyAttendanceTable.studentName,
      last_name: usersTable.lastName,
      first_name: usersTable.firstName,
      username: usersTable.username,
    })
      .from(dailyAttendanceTable)
      .leftJoin(usersTable, eq(usersTable.id, dailyAttendanceTable.studentId))
      .where(and(...conditions))
      .orderBy(asc(dailyAttendanceTable.date));

    res.json(rows);
  } catch (error) {
    console.error("Error fetching daily attendance:", error);
    res.status(500).json({ message: "Failed to fetch daily attendance" });
  }
});

router.post('/classes/:id/daily-attendance', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });
    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }
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
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });
    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }
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
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });
    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }
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

router.get('/classes/:id/grade-thresholds', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });
    res.json(classData.gradeThresholds || { grade5: 90, grade4: 65, grade3: 55, grade2: 45 });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch grade thresholds" });
  }
});

router.put('/classes/:id/grade-thresholds', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });

    const { grade5, grade4, grade3, grade2 } = req.body;
    if (typeof grade5 !== 'number' || typeof grade4 !== 'number' || typeof grade3 !== 'number' || typeof grade2 !== 'number') {
      return res.status(400).json({ message: "All thresholds must be numbers" });
    }

    const { db } = await import('../db');
    const { classes: classesTable } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');

    const thresholds = { grade5, grade4, grade3, grade2 };
    await db.update(classesTable).set({ gradeThresholds: thresholds as any }).where(eq(classesTable.id, classId));
    res.json(thresholds);
  } catch (error) {
    res.status(500).json({ message: "Failed to update grade thresholds" });
  }
});

router.get('/classes/:id/notes', combinedAuth, checkTeacher, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });
    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }
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
    if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ message: "You are not assigned to this class" });
    }

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
