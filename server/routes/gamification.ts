import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";

const router = Router();

router.get('/avatar', combinedAuth, async (req: any, res) => {
  try {
    const avatar = await storage.getStudentAvatar(req.user.id);
    res.json(avatar);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.post('/avatar/feed', combinedAuth, async (req: any, res) => {
  try {
    const { xpCost } = req.body;
    const updated = await storage.feedStudentAvatar(req.user.id, Number(xpCost));
    if (!updated) return res.status(400).json({ message: "Nem elegendő XP" });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.post('/avatar/select', combinedAuth, async (req: any, res) => {
  try {
    const { avatarType } = req.body;
    const newAvatar = await storage.selectStudentAvatar(req.user.id, avatarType);
    res.json(newAvatar);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

router.post('/avatar/revive', combinedAuth, async (req: any, res) => {
  try {
    const revived = await storage.reviveStudentAvatar(req.user.id, 1000);
    if (!revived) return res.status(400).json({ message: "Nem elegendő XP" });
    res.json(revived);
  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});

export default router;
