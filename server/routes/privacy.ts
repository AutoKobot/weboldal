import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

router.post('/consent', async (req, res) => {
  try {
    const { consentType, consentValue, sessionId, userId } = req.body;
    const consent = await storage.saveUserConsent({
      consentType, consentValue, sessionId, userId,
      ipAddress: req.ip, userAgent: req.get('User-Agent') || null
    });
    res.json(consent);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const { email, requestType, requestData } = req.body;
    const request = await storage.createPrivacyRequest({
      email, requestType, requestData: requestData || {}, status: 'pending'
    });
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.get('/export/:userId', combinedAuth, async (req: any, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const data = await storage.exportUserData(userId);
    res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

export default router;
