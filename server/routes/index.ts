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
import notificationsRouter from "./notifications";
import practicalGradesRouter from "./practical-grades";
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

  // Logging for API requests to help debugging
  app.use('/api', (req, res, next) => {
    console.log(`[API-DEBUG] ${req.method} ${req.url}`);
    next();
  });

  // Debug Schema (Temporary direct registration)
  app.get('/api/debug-schema', async (req: any, res) => {
    try {
      const { storage } = await import("../storage");
      const { sql } = await import("drizzle-orm");
      
      const tables = ['users', 'professions', 'subjects', 'modules'];
      const results: any = { schema: {}, counts: {} };

      for (const table of tables) {
        try {
          const columns = await (storage as any).db.execute(sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = ${table}
          `);
          results.schema[table] = columns.rows;
          
          const count = await (storage as any).db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
          results.counts[table] = count.rows[0].count;
        } catch (e: any) {
          results.schema[table] = { error: e.message };
        }
      }
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Module Routes
  app.use('/api/admin', adminRouter);
  app.use('/api/school-admin', schoolAdminRouter);
  app.use('/api/teacher', teacherRouter);
  app.use(['/api/admin/costs', '/api/costs'], costsRouter);
  app.use('/api/admin', costsRouter);
  app.use(['/api/admin/ikk', '/api/ikk'], ikkRouter);
  app.use(['/api/schedules', '/api/lesson-schedules'], schedulesRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use(['/api/settings', '/api/admin/settings'], settingsRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/gamification', gamificationRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/privacy', privacyRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/practical-grades', practicalGradesRouter);
  app.use('/api/admin', externalApisRouter);
  app.use('/api', externalApisRouter);
  app.use('/api/public', contentRouter);
  app.use('/api', contentRouter);

  // Global API 404 handler - MUST be after all API routers but BEFORE the SPA fallback
  app.use('/api/*', (req, res) => {
    console.log(`[API-404] Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      hint: "Ellenőrizd az útvonalat és a HTTP metódust!"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
