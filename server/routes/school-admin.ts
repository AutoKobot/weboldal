import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { comparePasswords } from "../localAuth";

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

export default router;
