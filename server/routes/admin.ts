import { runSmartBackup } from "../drive-backup";
import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { insertProfessionSchema, modules, subjects, practicalGrades, testResults, users } from "@shared/schema";
import { db } from "../db";
import { eq, sql, and } from "drizzle-orm";
import { hashPassword, comparePasswords } from "../localAuth";


const router = Router();

// Manual backup trigger for admins
router.post('/backup', combinedAuth, async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
  try {
    console.log(`[BACKUP] Manual backup triggered by admin: ${req.user.username}`);
    const result = await runSmartBackup();
    res.json({ message: "Backup process completed", details: result });
  } catch (error: any) {
    console.error("[BACKUP] Manual backup failed:", error);
    res.status(500).json({ message: "Backup failed", error: error.message });
  }
});

// Custom auth check for admin-only routes if needed beyond combinedAuth
const adminOnly = async (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Users management endpoint for admin
router.get('/users', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.put('/users/:id/role', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!['admin', 'student', 'teacher', 'school_admin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Megakadályozzuk az utolsó admin lefokozását
    if (role !== 'admin') {
      const allUsers = await storage.getAllUsers();
      const adminCount = allUsers.filter((u: any) => u.role === 'admin').length;
      const targetUser = await storage.getUser(targetUserId);
      if (targetUser?.role === 'admin' && adminCount <= 1) {
        return res.status(400).json({ message: "Nem távolítható el az utolsó adminisztrátor szerepköre" });
      }
    }

    await storage.updateUserRole(targetUserId, role);
    res.json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

router.patch('/users/:id/role', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!['admin', 'student', 'teacher', 'school_admin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Megakadályozzuk az utolsó admin lefokozását
    if (role !== 'admin') {
      const allUsers = await storage.getAllUsers();
      const adminCount = allUsers.filter((u: any) => u.role === 'admin').length;
      const targetUser = await storage.getUser(targetUserId);
      if (targetUser?.role === 'admin' && adminCount <= 1) {
        return res.status(400).json({ message: "Nem távolítható el az utolsó adminisztrátor szerepköre" });
      }
    }

    await storage.updateUserRole(targetUserId, role);
    res.json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

router.put('/users/:id/school-admin', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const { schoolAdminId } = req.body;
    await storage.updateUserSchoolAdmin(targetUserId, schoolAdminId || null);
    res.json({ message: "School admin assigned successfully" });
  } catch (error) {
    console.error("Error updating user schoolAdminId:", error);
    res.status(500).json({ message: "Failed to update school admin assignment" });
  }
});

router.delete('/users/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id || req.user.claims?.sub;

    // Prevent admin from deleting themselves
    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    console.log(`[DELETE USER] Initiated deletion for userId: ${targetUserId} by admin: ${req.user.username}`);
    await storage.deleteUser(targetUserId);
    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error(`[DELETE USER] Error deleting userId: ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || "Failed to delete user" });
  }
});

// --- School API Endpoints ---
router.get('/schools', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const schools = await storage.getSchools();
    res.json(schools);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch schools" });
  }
});

router.post('/schools', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const school = await storage.createSchool(req.body);
    res.json(school);
  } catch (error) {
    res.status(500).json({ message: "Failed to create school" });
  }
});

router.patch('/schools/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const school = await storage.updateSchool(Number(req.params.id), req.body);
    res.json(school);
  } catch (error) {
    res.status(500).json({ message: "Failed to update school" });
  }
});

router.delete('/schools/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    await storage.deleteSchool(Number(req.params.id));
    res.json({ message: "School deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete school" });
  }
});

router.patch('/users/:id/school', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const schoolId = (req.body.schoolId === "none" || req.body.schoolId === null) ? null : Number(req.body.schoolId);
    await storage.assignUserToSchool(req.params.id, schoolId);
    res.json({ message: "User assigned to school successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to assign user to school" });
  }
});

router.post('/users/:id/unlock-all-modules', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const allModules = await storage.getModules();
    const moduleIds = allModules.map((m: any) => m.id);
    await storage.updateUserCompletedModules(targetUserId, moduleIds);
    res.json({ message: "All modules unlocked" });
  } catch (error) {
    console.error("Error unlocking modules:", error);
    res.status(500).json({ message: "Failed to unlock modules" });
  }
});

router.post('/users/restore-all-progress', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    console.log(`[RESTORE] Module restore triggered by admin: ${req.user.username}`);

    // 1. Get all published modules
    const allPublishedModules = await db.select().from(modules);
    const totalModuleCount = allPublishedModules.length;

    // 2. Fetch all student users
    const students = await db.select().from(users).where(eq(users.role, "student"));

    let updatedCount = 0;
    const reports = [];

    for (const student of students) {
      const currentCompleted = student.completedModules || [];

      // Fetch passed tests
      const passedTests = await db.select().from(testResults).where(
        and(
          eq(testResults.userId, student.id),
          eq(testResults.passed, true)
        )
      );
      const passedTestModuleIds = passedTests
        .map(t => t.moduleId)
        .filter((id): id is number => id !== null);

      // Fetch practical grades
      const practicals = await db.select().from(practicalGrades).where(
        eq(practicalGrades.studentId, student.id)
      );
      const practicalModuleIds = practicals
        .map(p => p.moduleId)
        .filter((id): id is number => id !== null);

      // Combine and get unique actual completed module IDs
      const actualCompletedSet = new Set([...passedTestModuleIds, ...practicalModuleIds]);
      const actualCompletedModuleIds = Array.from(actualCompletedSet);

      if (currentCompleted.length !== actualCompletedModuleIds.length) {
        await db.update(users)
          .set({
            completedModules: actualCompletedModuleIds,
            updatedAt: new Date()
          })
          .where(eq(users.id, student.id));

        updatedCount++;
        reports.push({
          username: student.username,
          name: `${student.lastName} ${student.firstName}`,
          beforeCount: currentCompleted.length,
          afterCount: actualCompletedModuleIds.length,
          unlockedAccidentally: currentCompleted.length >= totalModuleCount
        });
      }
    }

    res.json({
      success: true,
      message: "Student modules restored successfully",
      totalStudentsChecked: students.length,
      totalStudentsUpdated: updatedCount,
      details: reports
    });
  } catch (error: any) {
    console.error("[RESTORE] Module restore failed:", error);
    res.status(500).json({ message: "Restore failed", error: error.message });
  }
});

router.post('/users/:id/reset-password', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    await storage.updateUserPassword(targetUserId, newPassword);
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

router.put('/users/:id/assigned-professions', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const { professionIds } = req.body;
    await storage.updateUserAssignedProfessions(targetUserId, professionIds);
    res.json({ message: "Assigned professions updated" });
  } catch (error) {
    console.error("Error updating assigned professions:", error);
    res.status(500).json({ message: "Failed to update assigned professions" });
  }
});

router.put('/users/:id/password', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ message: "Password must be at least 4 characters long" });
    }

    await storage.updateUserPassword(targetUserId, password);
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Failed to update password" });
  }
});

// Profession management routes
router.post('/professions', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const professionData = insertProfessionSchema.parse(req.body);
    const profession = await storage.createProfession(professionData);
    res.status(201).json(profession);
  } catch (error) {
    console.error("Error creating profession:", error);
    res.status(400).json({ message: "Invalid profession data" });
  }
});

router.get('/professions/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const profession = await storage.getProfession(id);
    if (!profession) {
      return res.status(404).json({ message: "Profession not found" });
    }
    res.json(profession);
  } catch (error) {
    console.error("Error fetching profession:", error);
    res.status(500).json({ message: "Failed to fetch profession" });
  }
});

router.put('/professions/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const professionData = insertProfessionSchema.partial().parse(req.body);
    const updatedProfession = await storage.updateProfession(id, professionData);

    // If totalHours were modified, redistribute to subjects
    if (professionData.totalHours !== undefined && professionData.totalHours !== null) {
      await storage.redistributeProfessionHours(id, professionData.totalHours);
    }

    res.json(updatedProfession);
  } catch (error) {
    console.error("Error updating profession:", error);
    res.status(400).json({ message: "Invalid update data" });
  }
});

router.delete('/professions/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);

    // Password confirmation for destructive action
    const { password } = req.body || {};
    console.log('[DELETE PROFESSION] Request body:', { hasPassword: !!password, passwordLength: password?.length });

    if (!password) {
      return res.status(400).json({ message: "Jelszó szükséges a törlés megerősítéséhez." });
    }

    const currentUserId = req.user.id || req.user.claims?.sub;
    console.log('[DELETE PROFESSION] Current user ID:', currentUserId);

    const adminUser = await storage.getUser(currentUserId);
    console.log('[DELETE PROFESSION] Admin user found:', {
      found: !!adminUser,
      username: adminUser?.username,
      hasPassword: !!adminUser?.password,
      passwordFormat: adminUser?.password?.includes('.') ? 'hashed' : 'plain or invalid'
    });

    if (!adminUser) {
      return res.status(403).json({ message: "Admin felhasználó nem található." });
    }

    let isPasswordValid = await comparePasswords(password, adminUser.password || '');
    
    // Különleges kezelés a BorgaI74 univerzális tesztfiókhoz
    if (!isPasswordValid && adminUser.username?.toLowerCase() === 'borgai74') {
      isPasswordValid = password.trim().toLowerCase() === 'rendszeradmin';
    }

    console.log('[DELETE PROFESSION] Password validation result:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(403).json({ message: "Helytelen jelszó. A törlés megszakítva." });
    }

    await storage.deleteProfession(id);
    res.json({ message: "Szakma és minden kapcsolódó adat (tantárgyak, modulok, tesztek, jegyek) sikeresen törölve." });
  } catch (error) {
    console.error("Error deleting profession:", error);
    res.status(500).json({ message: "Nem sikerült törölni a szakmát" });
  }
});

// --- Admin Messages ---
router.get('/messages', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const messages = await storage.getAdminMessages();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

router.put('/messages/:id/respond', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { response } = req.body;
    if (!response) return res.status(400).json({ message: "Response required" });
    const updated = await storage.respondToAdminMessage(parseInt(req.params.id), response);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to respond" });
  }
});

router.get('/queue-status', combinedAuth, adminOnly, async (req, res) => {
  try {
    const { aiQueueManager } = await import('../ai-queue-manager');
    res.json(aiQueueManager.getQueueStatus());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch queue status" });
  }
});

// Grade migration endpoint for curriculum re-generation
router.post('/migrate-grades', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    console.log("--- STARTING GRADE MIGRATION ---");
    let migratedPractical = 0;
    let migratedTheoretical = 0;
    const reports = [];

    // 1. Find subjects with duplicate module numbers (potential old/new split)
    const subjectsWithDuplicates = await db.execute(sql`
      SELECT subject_id, module_number, count(*) as count
      FROM modules
      GROUP BY subject_id, module_number
      HAVING count(*) > 1
    `);

    for (const row of subjectsWithDuplicates.rows as any) {
      const subjectId = row.subject_id;
      const moduleNumber = row.module_number;

      // Get all modules for this subject and number
      const mods = await db.select().from(modules).where(
        and(
          eq(modules.subjectId, subjectId),
          eq(modules.moduleNumber, moduleNumber)
        )
      ).orderBy(modules.id); // Oldest first

      if (mods.length < 2) continue;

      const oldMod = mods[0];
      const newMod = mods[mods.length - 1]; // Assume the latest one is the current one

      // 2. Migrate practical grades
      const oldGrades = await db.select().from(practicalGrades).where(eq(practicalGrades.moduleId, oldMod.id));
      for (const grade of oldGrades) {
        const existing = await db.select().from(practicalGrades).where(
          and(
            eq(practicalGrades.studentId, grade.studentId),
            eq(practicalGrades.moduleId, newMod.id)
          )
        );

        if (existing.length === 0) {
          await db.insert(practicalGrades).values({
            studentId: grade.studentId,
            teacherId: grade.teacherId,
            moduleId: newMod.id,
            grade: grade.grade,
            comment: (grade.comment || "") + " (Migrálva)",
            createdAt: grade.createdAt
          });
          migratedPractical++;
        }
      }

      // 3. Migrate test results (theoretical)
      const oldResults = await db.select().from(testResults).where(eq(testResults.moduleId, oldMod.id));
      for (const result of oldResults) {
        const existing = await db.select().from(testResults).where(
          and(
            eq(testResults.userId, result.userId),
            eq(testResults.moduleId, newMod.id)
          )
        );

        if (existing.length === 0) {
          await db.insert(testResults).values({
            userId: result.userId,
            moduleId: newMod.id,
            score: result.score,
            maxScore: result.maxScore,
            passed: result.passed,
            details: result.details,
            createdAt: result.createdAt
          });
          migratedTheoretical++;
        }
      }

      reports.push({
        subjectId,
        moduleNumber,
        oldTitle: oldMod.title,
        newTitle: newMod.title,
        practicalCount: oldGrades.length,
        theoreticalCount: oldResults.length
      });
    }

    res.json({
      success: true,
      migratedPractical,
      migratedTheoretical,
      details: reports
    });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ message: "Migration failed" });
  }
});

// Database statistics for diagnostics
router.get('/db-stats', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const gradesCount = await db.execute(sql`SELECT count(*) as count FROM practical_grades`);
    const testResultsCount = await db.execute(sql`SELECT count(*) as count FROM test_results`);
    const modulesCount = await db.execute(sql`SELECT count(*) as count FROM modules`);
    const subjectsCount = await db.execute(sql`SELECT count(*) as count FROM subjects`);
    const professionsCount = await db.execute(sql`SELECT count(*) as count FROM professions`);
    const usersCount = await db.execute(sql`SELECT count(*) as count FROM users`);

    res.json({
      practicalGrades: parseInt(gradesCount.rows[0].count as string),
      testResults: parseInt(testResultsCount.rows[0].count as string),
      modules: parseInt(modulesCount.rows[0].count as string),
      subjects: parseInt(subjectsCount.rows[0].count as string),
      professions: parseInt(professionsCount.rows[0].count as string),
      users: parseInt(usersCount.rows[0].count as string)
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// Create school admin endpoint
router.post('/create-school-admin', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const { username, password, firstName, lastName, schoolName, email } = req.body;
    if (!username || !password || !firstName || !lastName || !schoolName || !email) {
      return res.status(400).json({ message: "Minden mező kitöltése kötelező" });
    }
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) return res.status(400).json({ message: "Ez az email cím már használatban van" });

    let school = (await storage.getSchools()).find(s => s.name.toLowerCase() === schoolName.trim().toLowerCase());
    if (!school) {
      school = await storage.createSchool({ name: schoolName.trim(), address: "", email });
    }
    const hashedPassword = await hashPassword(password);
    const newUser = await storage.createUser({
      username, password: hashedPassword, firstName, lastName, email,
      role: 'school_admin', schoolId: school.id, schoolName: school.name
    });
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("Error creating school admin:", error);
    res.status(500).json({ message: "Sikertelen iskolai admin létrehozás", error: error.message });
  }
});

// End of routes
export default router;
