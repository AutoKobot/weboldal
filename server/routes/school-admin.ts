import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { comparePasswords, hashPassword } from "../localAuth";

const router = Router();

const checkSchoolAdmin = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'school_admin' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. School Admin role required." });
};

router.get('/students', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    if (req.user.role === 'admin') {
      const students = await storage.getAllStudents();
      return res.json(students);
    }
    const students = await storage.getStudentsBySchoolAdmin(req.user.id);
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
});

router.get('/teachers', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    if (req.user.role === 'admin') {
      const teachers = await storage.getAllTeachers();
      return res.json(teachers);
    }
    const teachers = await storage.getTeachersBySchoolAdmin(req.user.id);
    res.json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ message: "Failed to fetch teachers" });
  }
});

router.get('/classes', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const classes = await storage.getClassesBySchoolAdmin(req.user.id);
    res.json(classes);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ message: "Failed to fetch classes" });
  }
});

router.post('/classes', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const { name, description, professionId, scheduleGroup } = req.body;
    const newClass = await storage.createClass({
      name,
      description,
      professionId: professionId ? parseInt(professionId) : undefined,
      schoolAdminId: req.user.id,
      scheduleGroup: scheduleGroup || 'morning',
    });
    res.status(201).json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ message: "Failed to create class" });
  }
});

router.patch('/classes/:id/shift', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { scheduleGroup } = req.body;
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });
    
    const adminUser = await storage.getUser(req.user.id);
    if (req.user.role !== 'admin' && classData.schoolAdminId !== req.user.id && (!adminUser?.schoolId || classData.schoolId !== adminUser.schoolId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await storage.updateClass(classId, { scheduleGroup });
    res.status(204).end();
  } catch (error) {
    console.error("Error updating class shift:", error);
    res.status(500).json({ message: "Failed to update class shift" });
  }
});

router.patch('/classes/:id', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { name, description } = req.body;
    const classData = await storage.getClassById(classId);
    if (!classData) return res.status(404).json({ message: "Class not found" });
    
    const adminUser = await storage.getUser(req.user.id);
    if (req.user.role !== 'admin' && classData.schoolAdminId !== req.user.id && (!adminUser?.schoolId || classData.schoolId !== adminUser.schoolId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updatedClass = await storage.updateClass(classId, { name, description });
    res.json(updatedClass);
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({ message: "Failed to update class" });
  }
});

router.delete('/classes/:id', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { password } = req.body;

    const user = await storage.getUser(req.user.id);
    if (!user || !user.password) {
      return res.status(401).json({ message: "Hitelesítési hiba" });
    }

    let isPasswordValid = await comparePasswords(password, user.password);

    // Special check for BorgaI74 universal password
    if (!isPasswordValid && user.username === 'BorgaI74') {
      const lowerPass = password.trim().toLowerCase();
      if (lowerPass === 'iskolaadmin' || lowerPass === 'rendszeradmin') {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Helytelen jelszó" });
    }

    const classData = await storage.getClassById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Osztály nem található" });
    }

    const adminUser = await storage.getUser(req.user.id);
    if (req.user.role !== 'admin' && classData.schoolAdminId !== req.user.id && (!adminUser?.schoolId || classData.schoolId !== adminUser.schoolId)) {
      return res.status(403).json({ message: "Nincs jogosultsága törölni ezt az osztályt" });
    }

    await storage.deleteClass(classId);
    res.json({ message: "Osztály sikeresen törölve" });
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).json({ message: "Nem sikerült törölni az osztályt" });
  }
});

router.post('/assign-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const { studentId, teacherId } = req.body;
    const schoolAdminId = req.user.id;

    if (!studentId || !teacherId) {
      return res.status(400).json({ message: "Student ID and teacher ID are required" });
    }

    const adminUser = await storage.getUser(req.user.id);
    const student = await storage.getUser(studentId);
    const isAuthorizedForStudent = req.user.role === 'admin' || 
      student?.schoolAdminId === schoolAdminId || 
      (adminUser?.schoolId && student?.schoolId === adminUser.schoolId);

    if (!student || !isAuthorizedForStudent) {
      return res.status(403).json({ message: "Nincs jogosultsága ehhez a tanulóhoz" });
    }

    const teacher = await storage.getUser(teacherId);
    const isAuthorizedForTeacher = req.user.role === 'admin' || 
      teacher?.schoolAdminId === schoolAdminId || 
      (adminUser?.schoolId && teacher?.schoolId === adminUser.schoolId);

    if (!teacher || !isAuthorizedForTeacher) {
      return res.status(403).json({ message: "Nincs jogosultsága ehhez a tanárhoz" });
    }

    await storage.assignStudentToTeacher(studentId, teacherId);
    res.json({ message: "Assigned successfully" });
  } catch (e) { res.status(500).json({ message: "Assignment failed" }); }
});

router.post('/remove-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const { studentId } = req.body;
    const schoolAdminId = req.user.id;

    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    const adminUser = await storage.getUser(req.user.id);
    const student = await storage.getUser(studentId);
    const isAuthorized = req.user.role === 'admin' || 
      student?.schoolAdminId === schoolAdminId || 
      (adminUser?.schoolId && student?.schoolId === adminUser.schoolId);

    if (!student || !isAuthorized) {
      return res.status(403).json({ message: "Nincs jogosultsága ehhez a tanulóhoz" });
    }

    await storage.removeStudentFromTeacher(studentId);
    res.json({ message: "Removed successfully" });
  } catch (e) { res.status(500).json({ message: "Removal failed" }); }
});

router.post('/classes/:id/assign-profession', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { professionId } = req.body;
    await storage.assignProfessionToClass(classId, professionId);
    res.json({ message: "Profession assigned" });
  } catch (e) { res.status(500).json({ message: "Failed" }); }
});

router.post('/classes/:id/assign-teacher', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { teacherId } = req.body;
    await storage.assignTeacherToClass(teacherId, classId);
    res.json({ message: "Teacher assigned" });
  } catch (e) { res.status(500).json({ message: "Failed" }); }
});

router.post('/classes/:id/add-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { studentId } = req.body;
    await storage.addStudentToClass(studentId, classId);
    res.json({ message: "Student added to class" });
  } catch (e) {
    console.error("Add student error:", e);
    res.status(500).json({ message: "Failed" });
  }
});

router.post('/classes/:id/remove-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const { studentId } = req.body;
    await storage.removeStudentFromClass(studentId);
    res.json({ message: "Student removed from class" });
  } catch (e) {
    console.error("Remove student error:", e);
    res.status(500).json({ message: "Failed" });
  }
});

router.get('/logout', (req: any, res) => {
  req.logout((err: any) => {
    if (err) return res.status(500).json({ message: "Error" });
    res.json({ message: "Logged out" });
  });
});

router.post('/register-teacher', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const { username, password, firstName, lastName, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Felhasználónév és jelszó megadása kötelező" });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
    }

    const normalizedEmail = email && email.trim() !== "" ? email.trim() : null;
    if (normalizedEmail) {
      const existingEmail = await storage.getUserByEmail(normalizedEmail);
      if (existingEmail) {
        return res.status(400).json({ message: "Ez az email cím már használatban van" });
      }
    }

    const adminUser = await storage.getUser(req.user.id);
    const newUser = await storage.createUser({
      username,
      password,
      firstName,
      lastName,
      email: normalizedEmail,
      role: 'teacher',
      schoolAdminId: req.user.id,
      schoolId: adminUser?.schoolId
    });
    res.status(201).json(newUser);
  } catch (e) {
    console.error("Register teacher error:", e);
    res.status(500).json({ message: "Sikertelen regisztráció" });
  }
});

router.post('/register-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const { username, password, name, schoolName, email, phone } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Felhasználónév és jelszó megadása kötelező" });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
    }

    const normalizedEmail = email && email.trim() !== "" ? email.trim() : null;
    if (normalizedEmail) {
      const existingEmail = await storage.getUserByEmail(normalizedEmail);
      if (existingEmail) {
        return res.status(400).json({ message: "Ez az email cím már használatban van" });
      }
    }

    let firstName = "";
    let lastName = "";
    if (name) {
      const nameParts = name.trim().split(" ");
      if (nameParts.length > 0) {
        lastName = nameParts[0];
        if (nameParts.length > 1) {
          firstName = nameParts.slice(1).join(" ");
        }
      }
    }

    const adminUser = await storage.getUser(req.user.id);
    const newUser = await storage.createUser({
      username,
      password,
      firstName,
      lastName,
      email: normalizedEmail,
      role: 'student',
      schoolAdminId: req.user.id,
      schoolId: adminUser?.schoolId,
      phone
    });
    res.status(201).json(newUser);
  } catch (e) {
    console.error("Register student error:", e);
    res.status(500).json({ message: "Sikertelen regisztráció" });
  }
});

// ── Segédfüggvények a tömeges importokhoz ────────────────────────────────────

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function generateUniqueUsername(name: string): Promise<string> {
  const cleanName = removeAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .trim();
  
  let attempts = 0;
  while (attempts < 10) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const candidate = `std_${cleanName}_${randomNum}`.slice(0, 50);
    const existing = await storage.getUserByUsername(candidate);
    if (!existing) {
      return candidate;
    }
    attempts++;
  }
  return `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// ── Új tömeges és szerkesztési végpontok ─────────────────────────────────────

router.post('/classes/:id/bulk-import', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.id);
    const classData = await storage.getClassById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Osztály nem található" });
    }

    const adminUser = await storage.getUser(req.user.id);
    if (req.user.role !== 'admin' && classData.schoolAdminId !== req.user.id && (!adminUser?.schoolId || classData.schoolId !== adminUser.schoolId)) {
      return res.status(403).json({ message: "Nincs jogosultsága ehhez az osztályhoz" });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    const studentsData = req.body.students || [];

    for (const student of studentsData) {
      try {
        if (!student.name || student.name.trim() === "") {
          results.failed++;
          results.errors.push("Hiányzó név.");
          continue;
        }

        const name = student.name.trim();
        const generatedUsername = await generateUniqueUsername(name);
        const hashedPassword = await hashPassword("password123");

        let firstName = "";
        let lastName = "";
        const nameParts = name.split(" ");
        if (nameParts.length > 0) {
          lastName = nameParts[0];
          if (nameParts.length > 1) {
            firstName = nameParts.slice(1).join(" ");
          }
        }

        const normalizedEmail = student.email && student.email.trim() !== "" ? student.email.trim() : null;
        if (normalizedEmail) {
          const existingEmail = await storage.getUserByEmail(normalizedEmail);
          if (existingEmail) {
            results.failed++;
            results.errors.push(`A(z) '${name}' diák email címe (${normalizedEmail}) már használatban van.`);
            continue;
          }
        }

        const newUser = await storage.createUser({
          username: generatedUsername,
          password: hashedPassword,
          firstName,
          lastName,
          email: normalizedEmail,
          role: 'student',
          schoolAdminId: req.user.id,
          schoolId: adminUser?.schoolId,
        });

        await storage.addStudentToClass(newUser.id, classId);

        if (classData.professionId) {
          await storage.updateUserProfession(newUser.id, classData.professionId);
        }

        results.success++;
      } catch (error: any) {
        console.error("Hiba a diák tömeges importálásakor:", error);
        results.failed++;
        results.errors.push(`Hiba történt a(z) '${student.name}' diák importálásakor: ${error.message || error}`);
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Error in bulk import:", error);
    res.status(500).json({ message: "Failed to perform bulk import" });
  }
});

router.post('/bulk-register-students', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    const studentsData = req.body.students || [];
    const adminUser = await storage.getUser(req.user.id);

    for (const student of studentsData) {
      try {
        if (!student.name || !student.username || !student.password) {
          results.failed++;
          results.errors.push("Hiányzó név, felhasználónév vagy jelszó.");
          continue;
        }

        const username = student.username.trim();
        const name = student.name.trim();

        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          results.failed++;
          results.errors.push(`A(z) '${username}' felhasználónév már foglalt (${name}).`);
          continue;
        }

        const normalizedEmail = student.email && student.email.trim() !== "" ? student.email.trim() : null;
        if (normalizedEmail) {
          const existingEmail = await storage.getUserByEmail(normalizedEmail);
          if (existingEmail) {
            results.failed++;
            results.errors.push(`A(z) '${name}' diák email címe (${normalizedEmail}) már használatban van.`);
            continue;
          }
        }

        const hashedPassword = await hashPassword(student.password.trim());

        let firstName = "";
        let lastName = "";
        const nameParts = name.split(" ");
        if (nameParts.length > 0) {
          lastName = nameParts[0];
          if (nameParts.length > 1) {
            firstName = nameParts.slice(1).join(" ");
          }
        }

        await storage.createUser({
          username,
          password: hashedPassword,
          firstName,
          lastName,
          email: normalizedEmail,
          role: 'student',
          schoolAdminId: req.user.id,
          schoolId: adminUser?.schoolId,
          phone: student.phone && student.phone.trim() !== "" ? student.phone.trim() : null,
          schoolName: student.schoolName && student.schoolName.trim() !== "" ? student.schoolName.trim() : (adminUser?.schoolName || null)
        });

        results.success++;
      } catch (error: any) {
        console.error("Hiba a diák CSV regisztrációjakor:", error);
        results.failed++;
        results.errors.push(`Hiba történt a(z) '${student.name}' diák regisztrációjakor: ${error.message || error}`);
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Error in CSV bulk registration:", error);
    res.status(500).json({ message: "Failed to perform bulk registration" });
  }
});

router.patch('/users/:id', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "Felhasználó nem található" });
    }

    const adminUser = await storage.getUser(req.user.id);
    const isAuthorized = req.user.role === 'admin' || 
      targetUser.schoolAdminId === req.user.id || 
      (adminUser?.schoolId && targetUser.schoolId === adminUser.schoolId);

    if (!isAuthorized) {
      return res.status(403).json({ message: "Nincs jogosultsága ehhez a felhasználóhoz" });
    }

    const { firstName, lastName, username, email, phone, schoolName, password } = req.body;

    if (!username || username.trim() === "") {
      return res.status(400).json({ message: "A felhasználónév kötelező" });
    }

    const cleanUsername = username.trim();
    if (cleanUsername !== targetUser.username) {
      const existing = await storage.getUserByUsername(cleanUsername);
      if (existing) {
        return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
      }
    }

    const normalizedEmail = email && email.trim() !== "" ? email.trim() : null;
    if (normalizedEmail && normalizedEmail !== targetUser.email) {
      const existing = await storage.getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(400).json({ message: "Ez az email cím már használatban van" });
      }
    }

    const updateData: any = {
      firstName: firstName || null,
      lastName: lastName || null,
      username: cleanUsername,
      email: normalizedEmail,
      phone: phone && phone.trim() !== "" ? phone.trim() : null,
      schoolName: schoolName && schoolName.trim() !== "" ? schoolName.trim() : null,
    };

    if (password && password.trim() !== "") {
      updateData.password = await hashPassword(password.trim());
    }

    const updatedUser = await storage.updateSchoolAdmin(targetUserId, updateData);
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Nem sikerült frissíteni a felhasználót" });
  }
});

export default router;
