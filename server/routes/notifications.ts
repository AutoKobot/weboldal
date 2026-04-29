import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

router.get('/', combinedAuth, async (req: any, res) => {
  try {
    const notifications = await storage.getNotifications(req.user.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

router.get('/stream', combinedAuth, (req: any, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const userId = req.user.id;
  
  // Custom event emitter logic could go here if storage supported it
  // For now, we'll just send an initial heartbeat
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  const interval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

router.patch('/:id/read', combinedAuth, async (req: any, res) => {
  try {
    await storage.markNotificationRead(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.post('/read-all', combinedAuth, async (req: any, res) => {
  try {
    await storage.markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.delete('/:id', combinedAuth, async (req: any, res) => {
  try {
    await storage.deleteNotification(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

export default router;
