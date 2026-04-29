import type { Express } from "express";
import { createServer, type Server } from "http";
import adminRouter from "./admin";
import schoolAdminRouter from "./school-admin";
import teacherRouter from "./teacher";
import costsRouter from "./costs";
import ikkRouter from "./ikk";
import schedulesRouter from "./schedules";
import aiRouter from "./ai";
import announcementsRouter from "./announcements";
import settingsRouter from "./settings";
import contentRouter from "./content";
import communityRouter from "./community";
import uploadRouter from "./upload";
import authRouter from "./auth";
import gamificationRouter from "./gamification";
import messagesRouter from "./messages";
import privacyRouter from "./privacy";
import externalApisRouter from "./external-apis";
import { setupAuth } from "../replitAuth";
import { setupLocalAuth } from "../localAuth";
import express from "express";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication setup
  await setupAuth(app);
  setupLocalAuth(app);

  // Static files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Module Routes
  app.use('/api/admin', adminRouter);
  app.use('/api/school-admin', schoolAdminRouter);
  app.use('/api/teacher', teacherRouter);
  app.use('/api/costs', costsRouter);
  app.use('/api/ikk', ikkRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/public', contentRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/gamification', gamificationRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/privacy', privacyRouter);
  app.use('/api/external', externalApisRouter);

  const httpServer = createServer(app);
  return httpServer;
}
