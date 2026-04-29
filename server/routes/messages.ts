import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

router.get('/', combinedAuth, async (req: any, res) => {
  try {
    const messages = await storage.getPrivateMessages(req.user.id);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.get('/partners', combinedAuth, async (req: any, res) => {
  try {
    const partners = await storage.getConversationPartners(req.user.id);
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.get('/unread-count', combinedAuth, async (req: any, res) => {
  try {
    const count = await storage.getUnreadPrivateMessageCount(req.user.id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.post('/', combinedAuth, async (req: any, res) => {
  try {
    const { receiverId, message } = req.body;
    const newMessage = await storage.createPrivateMessage({
      senderId: req.user.id, receiverId, message, isRead: false
    });
    await storage.createNotification({
      userId: receiverId, type: 'private_message', title: 'Új üzenet',
      message: message.substring(0, 50), link: '/messages', actorId: req.user.id,
      metadata: { messageId: newMessage.id }
    });
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.post('/read', combinedAuth, async (req: any, res) => {
  try {
    await storage.markPrivateMessagesRead(req.user.id, req.body.senderId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

export default router;
