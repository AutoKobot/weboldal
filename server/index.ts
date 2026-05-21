import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import compression from "compression";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Serve uploads directory statically so audio/images are accessible
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// CORS middleware for proper cookie handling
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(compression());

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;

  if (path.startsWith("/api")) {
    log(`>>> START: ${req.method} ${path}`);
  }

  const timeout = setTimeout(() => {
    if (!res.writableEnded) {
      log(`!!! HANGING REQUEST: ${req.method} ${path} is taking > 15s`);
    }
  }, 15000);

  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args] as any);
  } as any;

  res.on("finish", () => {
    clearTimeout(timeout);
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `<<< END: ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // A DatabaseStorage konstruktora automatikusan hívja az ensureSchemaUpToDate()-t,
  // ezért itt nem kell duplikálni – csak logoljuk hogy a storage kész.
  try {
    const { storage } = await import("./storage");
    await storage.initializeDefaultPrompts();
    log("🚀 Adatbázis séma ellenőrizve és készen áll.");
  } catch (err) {
    log(`❌ Kritikus hiba az adatbázis inicializálásakor: ${err}`);
  }

  const server = await registerRoutes(app);

  // Automatikus "Okos Mentés" indítása (Google Drive API) -- IDEIGLENESEN LETILTVA a hibajavítás idejére
  // Első futás 1 perc múlva, utána 24 óránként
  // const { runSmartBackup } = await import("./drive-backup");
  // setTimeout(() => {
  //   runSmartBackup().catch(err => console.error("Hiba az automatikus mentés indításakor:", err));
  //   setInterval(() => {
  //     runSmartBackup().catch(err => console.error("Hiba az ütemezett mentés során:", err));
  //   }, 24 * 60 * 60 * 1000);
  // }, 60000);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Express Error Handler:", err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000");
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
