import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { insertProfessionSchema } from "@shared/schema";

const router = Router();

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

router.put('/professions/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const professionData = insertProfessionSchema.partial().parse(req.body);
    const updatedProfession = await storage.updateProfession(id, professionData);
    res.json(updatedProfession);
  } catch (error) {
    console.error("Error updating profession:", error);
    res.status(400).json({ message: "Invalid update data" });
  }
});

router.delete('/professions/:id', combinedAuth, adminOnly, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteProfession(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting profession:", error);
    res.status(500).json({ message: "Failed to delete profession" });
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

export default router;
