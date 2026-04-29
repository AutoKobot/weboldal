import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

router.get('/', combinedAuth, async (req: any, res) => {
  try {
    let schoolAdminId: string;
    const user = req.user;

    if (user.role === 'school_admin') {
      schoolAdminId = user.id;
    } else if (user.role === 'teacher' && user.schoolAdminId) {
      schoolAdminId = user.schoolAdminId;
    } else if (user.role === 'admin') {
      schoolAdminId = req.query.schoolAdminId as string;
      if (!schoolAdminId) return res.status(400).json({ message: "schoolAdminId query param required for admin" });
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const { scheduleGroup } = req.query;
    const schedules = await storage.getLessonSchedules(schoolAdminId, (scheduleGroup as string) || 'morning');
    res.json(schedules);
  } catch (error) {
    console.error("Error fetching lesson schedules:", error);
    res.status(500).json({ message: "Failed to fetch lesson schedules" });
  }
});

router.post('/', combinedAuth, async (req: any, res) => {
  try {
    const user = req.user;
    if (user.role !== 'school_admin' && user.role !== 'admin') {
      return res.status(403).json({ message: "Only school admins can manage lesson schedules" });
    }

    const { schedules, scheduleGroup } = req.body;
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ message: "schedules array required" });
    }

    const schoolAdminId = user.role === 'school_admin' ? user.id : req.body.schoolAdminId;
    if (!schoolAdminId) return res.status(400).json({ message: "schoolAdminId required" });

    const targetGroup = scheduleGroup || 'morning';

    const result = await storage.upsertLessonSchedules(
      schedules.map((s: any) => ({
        schoolAdminId,
        periodNumber: parseInt(s.periodNumber),
        startHour: parseInt(s.startHour),
        startMinute: parseInt(s.startMinute || 0),
        endHour: parseInt(s.endHour),
        endMinute: parseInt(s.endMinute || 45),
        label: s.label || `${s.periodNumber}. óra`,
        scheduleGroup: targetGroup,
        isActive: true,
      }))
    );

    res.json(result);
  } catch (error) {
    console.error("Error saving lesson schedules:", error);
    res.status(500).json({ message: "Failed to save lesson schedules" });
  }
});

export default router;
