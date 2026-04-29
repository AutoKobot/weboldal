import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { insertClassAnnouncementSchema } from "@shared/schema";

const router = Router();

const checkTeacherOrAdmin = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'school_admin')) {
    return next();
  }
  return res.status(403).json({ message: "Access denied." });
};

router.post('/', combinedAuth, checkTeacherOrAdmin, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const announcementData = insertClassAnnouncementSchema.omit({ teacherId: true }).parse(req.body);
    const announcement = await storage.createAnnouncement({
      ...announcementData,
      teacherId: userId
    } as any);
    res.status(201).json(announcement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ message: "Failed to create announcement" });
  }
});

router.get('/class/:classId', combinedAuth, async (req: any, res) => {
  try {
    const classId = parseInt(req.params.classId);
    const announcements = await storage.getAnnouncementsByClass(classId);
    res.json(announcements);
  } catch (error) {
    console.error("Error fetching class announcements:", error);
    res.status(500).json({ message: "Failed to fetch class announcements" });
  }
});

router.get('/my', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user || !user.classId) return res.json([]);

    const announcements = await storage.getUnacknowledgedAnnouncements(userId, user.classId);
    res.json(announcements);
  } catch (error) {
    console.error("Error fetching my announcements:", error);
    res.json([]);
  }
});

router.post('/:id/acknowledge', combinedAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const announcementId = parseInt(req.params.id);
    const { response } = req.body;

    const acknowledgement = await storage.acknowledgeAnnouncement({
      announcementId,
      studentId: userId,
      response: response || "Értettem"
    });
    res.json(acknowledgement);
  } catch (error) {
    console.error("Error acknowledging announcement:", error);
    res.status(500).json({ message: "Failed to acknowledge announcement" });
  }
});

router.get('/:id/stats', combinedAuth, checkTeacherOrAdmin, async (req: any, res) => {
  try {
    const announcementId = parseInt(req.params.id);
    const stats = await storage.getAnnouncementStats(announcementId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching announcement stats:", error);
    res.status(500).json({ message: "Failed to fetch announcement statistics" });
  }
});

router.delete('/:id', combinedAuth, checkTeacherOrAdmin, async (req: any, res) => {
  try {
    await storage.deleteAnnouncement(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
});

export default router;
