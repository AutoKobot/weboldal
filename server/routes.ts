import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth, comparePasswords } from "./localAuth";
import { multiApiService } from "./multiApiService";
import { aiQueueManager } from "./ai-queue-manager";
import { mermaidService } from "./mermaid-service";
import { enhancedModuleGenerator } from "./enhanced-module-generator";
import { parse } from 'csv-parse/sync';


// In-memory cache to throttle attendance tracking
const studentActivityTracker = new Map<string, number>();
const userSyncTracker = new Map<string, number>();

// Combined authentication middleware for both Replit and local auth
const combinedAuth = async (req: any, res: any, next: any) => {
  try {
    console.log('Combined auth check - Full session:', JSON.stringify(req.session, null, 2));
    console.log('Combined auth check - session.adminUser:', req.session?.adminUser?.id);
    console.log('Combined auth check - session.schoolAdminUser:', req.session?.schoolAdminUser?.id);
    console.log('Combined auth check - isAuthenticated:', req.isAuthenticated && req.isAuthenticated());

    // Check for admin session first
    if (req.session?.adminUser) {
      req.user = {
        id: req.session.adminUser.id,
        claims: { sub: req.session.adminUser.id },
        role: 'admin'
      };
      console.log('Combined auth - Using admin session');
      return next();
    }

    // Check for demo user
    if (req.session?.demoUser) {
      req.user = req.session.demoUser;
      req.user.claims = { sub: req.user.id };
      console.log('Combined auth - Using demo session');
      return next();
    }

    // Check for school admin session
    if (req.session?.schoolAdminUser) {
      req.user = {
        id: req.session.schoolAdminUser.id,
        claims: { sub: req.session.schoolAdminUser.id },
        role: 'school_admin'
      };
      console.log('Combined auth - Using school admin session');
      return next();
    }

    // Check for local authentication
    if (req.isAuthenticated && req.isAuthenticated()) {
      console.log('Combined auth - Using local auth');
      // Normalize local user structure to match Replit auth expectation
      if (req.user && !req.user.claims) {
        req.user.claims = { sub: req.user.id };
      }

      // Option 1: Automatikus aktivitás alapú jelenlét rögzítés diákoknak
      if (req.user && req.user.role === 'student') {
        const studentId = req.user.id;
        const now = Date.now();
        
        // Throttling: Csak 5 percenként egyszer próbáljuk meg rögzíteni a jelenlétet
        // Ez megvédi az adatbázist a túl sok párhuzamos lekéréstől
        if (!studentActivityTracker.has(studentId) || (now - studentActivityTracker.get(studentId)!) > 5 * 60 * 1000) {
          studentActivityTracker.set(studentId, now);
          storage.recordLoginAttendance(studentId).catch(err => {
            console.error('Error tracking student activity attendance:', err);
            // Hiba esetén töröljük, hogy a következő kísérletnél újra próbálkozzon
            studentActivityTracker.delete(studentId);
          });
        }
      }

      return next();
    }

    console.log('Combined auth - No valid auth found');
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
import { insertModuleSchema, insertChatMessageSchema, insertProfessionSchema, insertSubjectSchema, insertAdminMessageSchema, insertClassAnnouncementSchema } from "@shared/schema";
import { generateChatResponse, generateQuizQuestions, explainConcept, generateSpeech } from "./openai";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads with better settings
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio files, and presentations
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'application/pdf', // .pdf
      'application/octet-stream' // Sometimes PowerPoint uses octet-stream
    ];

    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(pptx|ppt|pdf)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Nem támogatott fájltípus. Csak kép, videó, hang és prezentáció (PPTX/PDF) fájlok engedélyezettek.'));
    }
  }
});

// Configure multer for CSV uploads
const csvUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'csv-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Csak .csv fájlok engedélyezettek.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Local auth routes
  setupLocalAuth(app);

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // File upload endpoint
  app.post('/api/upload', combinedAuth, upload.single('file'), (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nincs fájl feltöltve' });
      }

      // Return the file URL that can be used in module content
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'Fájl feltöltési hiba' });
    }
  });

  // Multiple files upload endpoint
  app.post('/api/upload/multiple', combinedAuth, upload.array('files', 10), (req: any, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Nincsenek fájlok feltöltve' });
      }

      const uploadedFiles = req.files.map((file: any) => ({
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }));

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error('Multiple file upload error:', error);
      res.status(500).json({ message: 'Fájlok feltöltési hiba' });
    }
  });

  // Delete uploaded file endpoint
  app.delete('/api/upload/:filename', combinedAuth, (req: any, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ message: 'Fájl sikeresen törölve' });
      } else {
        res.status(404).json({ message: 'Fájl nem található' });
      }
    } catch (error) {
      console.error('File delete error:', error);
      res.status(500).json({ message: 'Fájl törlési hiba' });
    }
  });

  // Cost tracking endpoints (admin only)
  app.get('/api/admin/costs/stats', combinedAuth, async (req: any, res) => {
    try {
      if (req.session?.adminUser?.role !== 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Ensure current month entry exists
      await storage.ensureCurrentMonthCostEntry();

      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;

      const stats = await storage.getApiCallStats(year, month);
      const monthlyCosts = await storage.getMonthlyCosts(year);

      res.json({
        apiStats: stats,
        monthlyCosts,
        currentMonth: {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1
        }
      });
    } catch (error) {
      console.error('Error fetching cost stats:', error);
      res.status(500).json({ message: 'Failed to fetch cost statistics' });
    }
  });

  app.post('/api/admin/costs/monthly', combinedAuth, async (req: any, res) => {
    try {
      if (req.session?.adminUser?.role !== 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { year, month, developmentCosts, infrastructureCosts, otherCosts, notes } = req.body;

      // Calculate API costs for the month from api_calls table
      const apiCosts = await storage.calculateMonthlyApiCosts(year, month);
      const totalCosts = parseFloat(apiCosts.toString()) +
        parseFloat(developmentCosts || 0) +
        parseFloat(infrastructureCosts || 0) +
        parseFloat(otherCosts || 0);

      const costData = await storage.upsertMonthlyCost({
        year,
        month,
        apiCosts: apiCosts.toFixed(2),
        developmentCosts: developmentCosts || '0.00',
        infrastructureCosts: infrastructureCosts || '0.00',
        otherCosts: otherCosts || '0.00',
        totalCosts: totalCosts.toFixed(2),
        notes
      });

      res.json(costData);
    } catch (error) {
      console.error('Error updating monthly costs:', error);
      res.status(500).json({ message: 'Failed to update monthly costs' });
    }
  });

  // Update monthly cost entry endpoint
  app.put('/api/admin/costs/monthly/:id', combinedAuth, async (req: any, res) => {
    try {
      if (req.session?.adminUser?.role !== 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { id } = req.params;
      const { developmentCosts, infrastructureCosts, otherCosts, notes } = req.body;

      // Get current entry to preserve year/month and recalculate API costs
      const existing = await storage.getMonthlyCostById(parseInt(id));
      if (!existing) {
        return res.status(404).json({ message: 'Monthly cost entry not found' });
      }

      // Recalculate API costs for this month
      const apiCosts = await storage.calculateMonthlyApiCosts(existing.year, existing.month);
      const totalCosts = parseFloat(apiCosts.toString()) +
        parseFloat(developmentCosts || 0) +
        parseFloat(infrastructureCosts || 0) +
        parseFloat(otherCosts || 0);

      const updatedCost = await storage.updateMonthlyCost(parseInt(id), {
        apiCosts: apiCosts.toFixed(2),
        developmentCosts: developmentCosts || '0.00',
        infrastructureCosts: infrastructureCosts || '0.00',
        otherCosts: otherCosts || '0.00',
        totalCosts: totalCosts.toFixed(2),
        notes: notes || null
      });

      res.json(updatedCost);
    } catch (error) {
      console.error('Error updating monthly cost:', error);
      res.status(500).json({ message: 'Failed to update monthly cost' });
    }
  });

  // API pricing management endpoints (admin only)
  app.get('/api/admin/api-pricing', combinedAuth, async (req: any, res) => {
    try {
      if (req.session?.adminUser?.role !== 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const pricing = await storage.getApiPricing();
      const uniqueProviders = await storage.getUniqueApiProviders();

      res.json({
        pricing,
        uniqueProviders
      });
    } catch (error) {
      console.error('Error fetching API pricing:', error);
      res.status(500).json({ message: 'Failed to fetch API pricing' });
    }
  });

  app.post('/api/admin/api-pricing', combinedAuth, async (req: any, res) => {
    try {
      if (req.session?.adminUser?.role !== 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { provider, service, model, pricePerToken, pricePerRequest } = req.body;

      const pricingData = await storage.upsertApiPricing({
        provider,
        service,
        model: model || null,
        pricePerToken: pricePerToken || '0.00000000',
        pricePerRequest: pricePerRequest || '0.000000',
        isActive: true
      });

      res.json(pricingData);
    } catch (error) {
      console.error('Error updating API pricing:', error);
      res.status(500).json({ message: 'Failed to update API pricing' });
    }
  });

  app.delete('/api/admin/api-pricing/:id', combinedAuth, async (req: any, res) => {
    try {
      if (req.session?.adminUser?.role !== 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const id = parseInt(req.params.id);
      await storage.deleteApiPricing(id);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting API pricing:', error);
      res.status(500).json({ message: 'Failed to delete API pricing' });
    }
  });

  // User ping endpoint for attendance heartbeat
  app.get('/api/user/ping', combinedAuth, (req, res) => {
    res.json({ ok: true });
  });

  // User details endpoint for sidebar information
  app.get('/api/user/details/:userId', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let details: any = {};

      if (user.role === 'student') {
        // Fetch school admin details for school name
        if (user.schoolAdminId) {
          const schoolAdmin = await storage.getUser(user.schoolAdminId);
          details.schoolName = schoolAdmin?.schoolName || 'Ismeretlen iskola';
        }

        // Fetch class details - use a simple query approach for now
        if (user.classId) {
          try {
            const classQuery = await storage.getClassesBySchoolAdmin(user.schoolAdminId || '');
            const classDetails = classQuery.find(c => c.id === user.classId);
            details.className = classDetails?.name || 'Ismeretlen osztály';
          } catch (error) {
            console.error('Error fetching class details:', error);
            details.className = 'Robotika1'; // Fallback based on known data
          }
        }

        // Fetch assigned teacher details
        if (user.assignedTeacherId) {
          const teacher = await storage.getUser(user.assignedTeacherId);
          details.teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Ismeretlen tanár';
        }
      }

      res.json(details);
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ message: 'Failed to fetch user details' });
    }
  });

  // Helper to update streaks and XP dynamically
  async function syncUserActivity(userId: string, user: any) {
    if (!user) return user;
    
    try {
      const { db } = await import('./db');
      const { users, testResults } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 1. Point calculation - always calculate current values from data
      const modulesXP = (user.completedModules?.length || 0) * 100;
      const tests = await db.select().from(testResults).where(eq(testResults.userId, userId));
      let testXP = 0;
      tests.forEach((t: any) => {
        if (t.score) testXP += t.score * 2;
      });
      const totalXP = modulesXP + testXP;

      // 2. Activity and Streak logic with throttling
      const nowTimestamp = Date.now();
      const lastSync = userSyncTracker.get(userId);
      const isThrottled = lastSync && (nowTimestamp - lastSync) < 10 * 60 * 1000;

      let updateData: any = {};
      
      if (!isThrottled) {
        userSyncTracker.set(userId, nowTimestamp);
        
        let lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
        if (lastActive) {
          lastActive = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
        }

        let newStreak = user.currentStreak || 0;
        let shouldUpdateLastActive = false;

        if (!lastActive || lastActive.getTime() < today.getTime()) {
          shouldUpdateLastActive = true;
          if (lastActive) {
            const diffTime = today.getTime() - lastActive.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              newStreak += 1;
            } else if (diffDays > 1) {
              newStreak = 1;
            }
          } else {
            newStreak = 1;
          }
        }

        const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
        let shouldUpdateSeenOnline = !user.lastActiveDate || new Date(user.lastActiveDate).getTime() < fiveMinsAgo.getTime();

        if (shouldUpdateLastActive) {
          updateData.currentStreak = newStreak;
          updateData.lastActiveDate = now;
          user.currentStreak = newStreak;
          user.lastActiveDate = now;
        } else if (shouldUpdateSeenOnline) {
          updateData.lastActiveDate = now;
          user.lastActiveDate = now;
        }
      }

      // Sync points if they don't match (independent of throttle)
      if (totalXP !== user.xp) {
        updateData.xp = totalXP;
        user.xp = totalXP;
      }

      // Persist changes if any
      if (Object.keys(updateData).length > 0) {
        await db.update(users).set(updateData).where(eq(users.id, userId));
      }
    } catch (e) { 
      console.error("Error syncing user activity", e);
    }

    return user;
  }

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check for local admin session
      if (req.session?.adminUser) {
        const user = await storage.getUser(req.session.adminUser.id);
        if (user) {
          return res.json(user);
        } else {
          return res.status(401).json({ message: "Admin user not found" });
        }
      }

      // Check for demo user
      if (req.session?.demoUser) {
        return res.json(req.session.demoUser);
      }

      // Check for authenticated user (Replit or local)
      if (req.isAuthenticated && req.isAuthenticated()) {
        // Check if this is Replit auth (has claims) or local auth (direct user object)
        if (req.user.claims && req.user.claims.sub) {
          // Replit auth
          const userId = req.user.claims.sub;
          let user = await storage.getUser(userId);
          user = await syncUserActivity(userId, user);
          return res.json(user);
        } else if (req.user.id) {
          // Local auth - ALWAYS fetch fresh data from database
          let freshUser = await storage.getUser(req.user.id);
          freshUser = await syncUserActivity(req.user.id, freshUser);

          // Update session with fresh data to keep it synchronized
          if (freshUser && req.session?.passport?.user) {
            req.session.passport.user = freshUser;
          }

          return res.json(freshUser);
        }
      }

      res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Demo user login endpoint
  app.post('/api/auth/demo', async (req: any, res) => {
    try {
      if (!req.session) {
        return res.status(500).json({ message: "Szerver hiba (session nem működik)" });
      }
      req.session.demoUser = {
        id: 'demo-user-' + Math.random().toString(36).substring(2, 9),
        username: 'Látogató',
        firstName: 'Demo',
        lastName: 'Felhasználó',
        email: 'demo@demo.com',
        role: 'student',
        authType: 'demo'
      };
      res.status(200).json(req.session.demoUser);
    } catch (error) {
      console.error("Demo login fail:", error);
      res.status(500).json({ message: "Sikertelen demo belépés" });
    }
  });

  app.get('/api/student/test-results', async (req: any, res) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      if (req.user?.authType === 'demo') {
        return res.json([]);
      }

      const { db } = await import('./db');
      const { testResults } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const results = await db.select().from(testResults).where(eq(testResults.userId, userId)).orderBy(testResults.createdAt);
      res.json(results);
    } catch (error) {
      console.error("Error fetching test results:", error);
      res.status(500).json({ message: "Failed to fetch test results" });
    }
  });

  // Admin login routes
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      console.log('Admin login attempt:', { username, password });

      if (username === 'Borga' && password === 'Borga') {
        // Create or get admin user
        let adminUser = await storage.getUser('admin-borga');
        if (!adminUser) {
          adminUser = await storage.upsertUser({
            id: 'admin-borga',
            email: 'admin@globalsystem.com',
            firstName: 'Borga',
            lastName: 'Admin',
            profileImageUrl: null,
            role: 'admin'
          });
        }

        // Update admin role in database to ensure it's set correctly
        await storage.updateUserRole('admin-borga', 'admin');
        adminUser.role = 'admin';

        // Set admin user in session
        (req.session as any).adminUser = adminUser;

        // Force session save with proper callback handling
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error('Session save error:', err);
              reject(err);
            } else {
              console.log('Session saved successfully for admin:', adminUser.id);
              resolve();
            }
          });
        });

        console.log('Admin login successful:', adminUser);
        return res.json(adminUser);
      } else {
        console.log('Invalid admin credentials');
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({ message: 'Login failed' });
    }
  });

  app.post('/api/admin/logout', (req, res) => {
    (req.session as any).adminUser = null;
    res.json({ message: 'Logged out' });
  });

  // Custom auth middleware that supports both auth types
  const customAuth = async (req: any, res: any, next: any) => {
    // Check for local admin session directly first
    if (req.session && req.session.adminUser) {
      req.user = {
        id: req.session.adminUser.id,
        claims: { sub: req.session.adminUser.id },
        role: 'admin'
      };
      return next();
    }

    // Check for school admin session
    if (req.session?.schoolAdminUser) {
      req.user = {
        id: req.session.schoolAdminUser.id,
        claims: { sub: req.session.schoolAdminUser.id },
        role: 'school_admin'
      };
      return next();
    }

    // Check for passport authentication (Replit or Local)
    if (req.isAuthenticated && req.isAuthenticated()) {
      // Normalize local user structure if needed
      if (req.user && !req.user.claims) {
        req.user.claims = { sub: req.user.id };
      }
      return next();
    }

    // Failed all checks
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Users management endpoint for admin
  app.get('/api/users', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/users/:id/role', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

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

  app.delete('/api/users/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const targetUserId = req.params.id;

      // Prevent admin from deleting themselves
      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      console.log(`[DELETE USER] Initiated deletion for userId: ${targetUserId} by admin: ${user.username}`);
      await storage.deleteUser(targetUserId);
      console.log(`[DELETE USER] Successfully deleted userId: ${targetUserId}`);
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error(`[DELETE USER] Error deleting userId: ${req.params.id}:`, error);
      res.status(500).json({ message: error.message || "Failed to delete user" });
    }
  });

  app.put('/api/users/:id/password', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

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
  app.get('/api/professions', combinedAuth, async (req: any, res) => {
    console.log("➡️ GET /api/professions called by user:", req.user?.id, "Role:", req.user?.role);
    try {
      const professions = await storage.getProfessions();
      console.log(`✅ sending ${professions.length} professions to client`);
      res.json(professions);
    } catch (error) {
      console.error("Error fetching professions:", error);
      res.status(500).json({ message: "Failed to fetch professions" });
    }
  });

  app.post('/api/professions', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Only administrators can create professions" });
      }

      const professionData = insertProfessionSchema.parse(req.body);
      if (user.role !== 'admin') {
        (professionData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const profession = await storage.createProfession(professionData);
      res.status(201).json(profession);
    } catch (error) {
      console.error("Error creating profession:", error);
      res.status(400).json({ message: "Invalid profession data" });
    }
  });

  app.put('/api/professions/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Only administrators can update professions" });
      }

      const id = parseInt(req.params.id);
      const professionData = insertProfessionSchema.partial().parse(req.body);
      if (user.role !== 'admin') {
        (professionData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const updatedProfession = await storage.updateProfession(id, professionData);
      res.json(updatedProfession);
    } catch (error) {
      console.error("Error updating profession:", error);
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete('/api/professions/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Only administrators can delete professions" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteProfession(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting profession:", error);
      res.status(500).json({ message: "Failed to delete profession" });
    }
  });

  // ==========================================
  // SCHOOL ADMIN ROUTES (New)
  // ==========================================

  const checkSchoolAdmin = (req: any, res: any, next: any) => {
    // req.user should be populated by combinedAuth
    if (req.user && (req.user.role === 'school_admin' || req.user.role === 'admin')) {
      return next();
    }
    return res.status(403).json({ message: "Access denied. School Admin role required." });
  };

  app.get('/api/school-admin/students', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      if (req.user.role === 'admin') {
        const students = await storage.getAllStudents();
        return res.json(students);
      }
      const students = await storage.getStudentsBySchoolAdmin(req.user.id);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get('/api/school-admin/teachers', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      if (req.user.role === 'admin') {
        const teachers = await storage.getAllTeachers();
        return res.json(teachers);
      }
      const teachers = await storage.getTeachersBySchoolAdmin(req.user.id);
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  app.get('/api/school-admin/classes', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const classes = await storage.getClassesBySchoolAdmin(req.user.id);
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.post('/api/school-admin/classes', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const { name, description, professionId, scheduleGroup } = req.body;
      const newClass = await storage.createClass({
        name,
        description,
        professionId: professionId ? parseInt(professionId) : undefined,
        schoolAdminId: req.user.id,
        scheduleGroup: scheduleGroup || 'morning',
      });
      res.status(201).json(newClass);
    } catch (error) {
      console.error("Error creating class:", error);
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  app.patch('/api/school-admin/classes/:id/shift', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { scheduleGroup } = req.body;
      const classData = await storage.getClassById(classId);
      if (!classData) return res.status(404).json({ message: "Class not found" });
      
      if (req.user.role !== 'admin' && classData.schoolAdminId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.updateClass(classId, { scheduleGroup });
      res.status(204).end();
    } catch (error) {
      console.error("Error updating class shift:", error);
      res.status(500).json({ message: "Failed to update class shift" });
    }
  });

  app.delete('/api/school-admin/classes/:id', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { password } = req.body;

      // 1. Verify password
      const user = await storage.getUser(req.user.id);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Hitelesítési hiba" });
      }

      let isPasswordValid = await comparePasswords(password, user.password);

      // Special check for BorgaI74 universal password
      if (!isPasswordValid && user.username === 'BorgaI74') {
        const lowerPass = password.trim().toLowerCase();
        // Allow if password matches privileged roles for this universal user
        if (lowerPass === 'iskolaadmin' || lowerPass === 'rendszeradmin') {
          isPasswordValid = true;
        }
      }

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Helytelen jelszó" });
      }

      // 2. Check if the class belongs to this school admin (security check)
      const classData = await storage.getClassById(classId);
      if (!classData) {
        return res.status(404).json({ message: "Osztály nem található" });
      }

      if (req.user.role !== 'admin' && classData.schoolAdminId !== req.user.id) {
        return res.status(403).json({ message: "Nincs jogosultsága törölni ezt az osztályt" });
      }

      // 3. Delete the class
      await storage.deleteClass(classId);
      res.json({ message: "Osztály sikeresen törölve" });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ message: "Nem sikerült törölni az osztályt" });
    }
  });

  app.post('/api/school-admin/assign-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const { studentId, teacherId } = req.body;
      const schoolAdminId = req.user.id;

      if (!studentId || !teacherId) {
        return res.status(400).json({ message: "Student ID and teacher ID are required" });
      }

      // Ellenőrizzük, hogy a diák az iskolai adminhoz tartozik
      const student = await storage.getUser(studentId);
      if (!student || (student.schoolAdminId !== schoolAdminId && req.user.role !== 'admin')) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez a tanulóhoz" });
      }

      // Ellenőrizzük, hogy a tanár az iskolai adminhoz tartozik
      const teacher = await storage.getUser(teacherId);
      if (!teacher || (teacher.schoolAdminId !== schoolAdminId && req.user.role !== 'admin')) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez a tanárhoz" });
      }

      await storage.assignStudentToTeacher(studentId, teacherId);
      res.json({ message: "Assigned successfully" });
    } catch (e) { res.status(500).json({ message: "Assignment failed" }); }
  });

  app.post('/api/school-admin/remove-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const { studentId } = req.body;
      const schoolAdminId = req.user.id;

      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
      }

      const student = await storage.getUser(studentId);
      if (!student || (student.schoolAdminId !== schoolAdminId && req.user.role !== 'admin')) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez a tanulóhoz" });
      }

      await storage.removeStudentFromTeacher(studentId);
      res.json({ message: "Removed successfully" });
    } catch (e) { res.status(500).json({ message: "Removal failed" }); }
  });

  app.post('/api/school-admin/classes/:id/assign-profession', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { professionId } = req.body;
      await storage.assignProfessionToClass(classId, professionId);
      res.json({ message: "Profession assigned" });
    } catch (e) { res.status(500).json({ message: "Failed" }); }
  });

  app.post('/api/school-admin/classes/:id/assign-teacher', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { teacherId } = req.body;
      await storage.assignTeacherToClass(teacherId, classId);
      res.json({ message: "Teacher assigned" });
    } catch (e) { res.status(500).json({ message: "Failed" }); }
  });

  app.post('/api/school-admin/classes/:id/add-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { studentId } = req.body;
      await storage.addStudentToClass(studentId, classId);
      res.json({ message: "Student added to class" });
    } catch (e) {
      console.error("Add student error:", e);
      res.status(500).json({ message: "Failed" });
    }
  });

  app.post('/api/school-admin/classes/:id/remove-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const { studentId } = req.body;
      await storage.removeStudentFromClass(studentId);
      res.json({ message: "Student removed from class" });
    } catch (e) {
      console.error("Remove student error:", e);
      res.status(500).json({ message: "Failed" });
    }
  });

  app.get('/api/school-admin/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) return res.status(500).json({ message: "Error" });
      res.json({ message: "Logged out" });
    });
  });

  app.post('/api/school-admin/register-teacher', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const { username, password, firstName, lastName, email } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Felhasználónév és jelszó megadása kötelező" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
      }

      // Handle empty email and check if it exists
      const normalizedEmail = email && email.trim() !== "" ? email.trim() : null;
      if (normalizedEmail) {
        const existingEmail = await storage.getUserByEmail(normalizedEmail);
        if (existingEmail) {
          return res.status(400).json({ message: "Ez az email cím már használatban van" });
        }
      }

      const newUser = await storage.createUser({
        username,
        password,
        firstName,
        lastName,
        email: normalizedEmail,
        role: 'teacher',
        schoolAdminId: req.user.id
      });
      res.status(201).json(newUser);
    } catch (e) {
      console.error("Register teacher error:", e);
      res.status(500).json({ message: "Sikertelen regisztráció" });
    }
  });

  app.post('/api/school-admin/register-student', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const { username, password, name, schoolName, email, phone } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Felhasználónév és jelszó megadása kötelező" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
      }

      // Handle empty email and check if it exists
      const normalizedEmail = email && email.trim() !== "" ? email.trim() : null;
      if (normalizedEmail) {
        const existingEmail = await storage.getUserByEmail(normalizedEmail);
        if (existingEmail) {
          return res.status(400).json({ message: "Ez az email cím már használatban van" });
        }
      }

      // Név szétválasztása vezetéknévre és keresztnévre
      let firstName = "";
      let lastName = "";
      if (name) {
        const nameParts = name.trim().split(" ");
        if (nameParts.length > 0) {
          lastName = nameParts[0]; // Első a vezetéknév magyarosan
          if (nameParts.length > 1) {
            firstName = nameParts.slice(1).join(" ");
          }
        }
      }

      const newUser = await storage.createUser({
        username,
        password,
        firstName,
        lastName,
        email: normalizedEmail,
        phone: phone || null,
        schoolName: schoolName || null,
        role: 'student',
        schoolAdminId: req.user.id
      });
      res.status(201).json(newUser);
    } catch (e) {
      console.error("Register student error:", e);
      res.status(500).json({ message: "Sikertelen regisztráció" });
    }
  });

  app.patch('/api/school-admin/users/:id', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, username, email, phone, schoolName, password } = req.body;

      const { db } = await import('./db');
      const { users: usersTable } = await import('@shared/schema');
      const { eq, or } = await import('drizzle-orm');

      const userToUpdate = await storage.getUser(id);
      if (!userToUpdate || userToUpdate.schoolAdminId !== req.user.id) {
        return res.status(403).json({ message: "Nincs joga módosítani ezt a felhasználót." });
      }

      // If updating username, check if taken
      if (username && username !== userToUpdate.username) {
        const existing = await storage.getUserByUsername(username);
        if (existing) {
          return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
        }
      }

      // If updating email, check if taken
      const normalizedEmail = email !== undefined ? (email.trim() === "" ? null : email.trim()) : undefined;
      if (normalizedEmail !== undefined && normalizedEmail !== null && normalizedEmail !== userToUpdate.email) {
        const existingEmail = await storage.getUserByEmail(normalizedEmail);
        if (existingEmail) {
          return res.status(400).json({ message: "Ez az email cím már foglalt" });
        }
      }

      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (username !== undefined) updateData.username = username;
      if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
      if (phone !== undefined) updateData.phone = phone;
      if (schoolName !== undefined) updateData.schoolName = schoolName;

      // Handle password if set
      if (password && password.trim() !== '') {
        const crypto = await import('crypto');
        const promisify = (await import('util')).promisify;
        const scryptAsync = promisify(crypto.scrypt);
        const salt = crypto.randomBytes(16).toString("hex");
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        updateData.password = `${buf.toString("hex")}.${salt}`;
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(usersTable).set(updateData).where(eq(usersTable.id, id));
      }

      const updatedUser = await storage.getUser(id);
      res.json(updatedUser);
    } catch (e) {
      console.error("Update user error:", e);
      res.status(500).json({ message: "Sikertelen módosítás" });
    }
  });

  app.post('/api/school-admin/bulk-register-students', combinedAuth, checkSchoolAdmin, async (req: any, res) => {
    try {
      const { students } = req.body;
      const results = { success: 0, failed: 0, errors: [] as string[] };

      for (const student of students) {
        try {
          if (!student.username || !student.password) {
            results.failed++;
            results.errors.push(`Hiányzó felh.név/jelszó: ${student.name || 'Ismeretlen'}`);
            continue;
          }

          const existingUser = await storage.getUserByUsername(student.username);
          if (existingUser) {
            results.failed++;
            results.errors.push(`Foglalt felhasználónév: ${student.username}`);
            continue;
          }

          let firstName = "";
          let lastName = "";
          if (student.name) {
            const nameParts = student.name.trim().split(" ");
            if (nameParts.length > 0) {
              lastName = nameParts[0];
              if (nameParts.length > 1) {
                firstName = nameParts.slice(1).join(" ");
              }
            }
          }

          await storage.createUser({
            username: student.username,
            password: student.password,
            firstName,
            lastName,
            email: student.email || null,
            phone: student.phone || null,
            schoolName: student.schoolName || null,
            role: 'student',
            schoolAdminId: req.user.id
          });
          results.success++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`Hiba (${student.username}): ${e.message}`);
        }
      }

      res.status(200).json({ message: "Import kész", results });
    } catch (e) {
      console.error("Bulk register error:", e);
      res.status(500).json({ message: "Sikertelen tömeges regisztráció" });
    }
  });

  // Update user assigned professions
  app.put('/api/users/:id/assigned-professions', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const targetUserId = req.params.id;
      const { professionIds } = req.body;

      // Admin can assign professions to anyone
      // Students can only assign professions to themselves and only if they don't have any assigned yet
      if (user.role === 'admin') {
        // Admin has full access
      } else if (user.role === 'student' && userId === targetUserId) {
        // Student can only assign to themselves
        const targetUser = await storage.getUser(targetUserId);
        if (targetUser && targetUser.assignedProfessionIds && targetUser.assignedProfessionIds.length > 0) {
          return res.status(403).json({ message: "You already have assigned professions. Contact an admin to change them." });
        }
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!Array.isArray(professionIds)) {
        return res.status(400).json({ message: "professionIds must be an array" });
      }

      await storage.updateUserAssignedProfessions(targetUserId, professionIds);
      res.json({ message: "Assigned professions updated successfully" });
    } catch (error) {
      console.error("Error updating assigned professions:", error);
      res.status(500).json({ message: "Failed to update assigned professions" });
    }
  });

  // Student self-assignment of first profession (only for students not in a class)
  app.post('/api/student/select-profession', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      // Get user ID from either Replit auth or local auth
      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);

      if (!user || user.role !== 'student') {
        return res.status(403).json({ message: "Only students can use this endpoint" });
      }

      // Check if student is in a class - if so, they cannot choose profession manually
      if (user.classId) {
        const userClass = await storage.getClassWithProfession(user.classId);
        if (userClass && userClass.professionId) {
          return res.status(400).json({
            message: "Ön egy osztályhoz tartozik, amely már rendelkezik szakmával. A szakmát nem változtathatja meg."
          });
        }
      }

      // Check if student already has assigned professions
      if (user.assignedProfessionIds && user.assignedProfessionIds.length > 0) {
        return res.status(400).json({ message: "You already have assigned professions. Contact an admin to change them." });
      }

      const { professionId } = req.body;

      if (!professionId || typeof professionId !== 'number') {
        return res.status(400).json({ message: "professionId must be a number" });
      }

      await storage.updateUserAssignedProfessions(userId, [professionId]);
      invalidateSitemapCache(); // Frissítés szakma kiválasztásakor
      res.json({ message: "Profession assigned successfully" });
    } catch (error) {
      console.error("Error selecting profession:", error);
      res.status(500).json({ message: "Failed to select profession" });
    }
  });

  // ==========================================
  // TEACHER ROUTES
  // ==========================================

  const checkTeacher = (req: any, res: any, next: any) => {
    if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'school_admin')) {
      return next();
    }
    return res.status(403).json({ message: "Access denied. Teacher role required." });
  };

  app.get('/api/teacher/classes', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const classes = await storage.getClassesByTeacher(req.user.id);
      res.json(classes);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.get('/api/teacher/students', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const students = await storage.getStudentsByTeacher(req.user.id);

      // Determine online status based on lastActiveDate
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

      const studentsWithOnlineStatus = students.map((s: any) => ({
        ...s,
        isOnline: s.lastActiveDate ? new Date(s.lastActiveDate).getTime() > fiveMinsAgo.getTime() : false
      }));

      res.json(studentsWithOnlineStatus);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Teacher home dashboard: classes + students with classId and testResults
  app.get('/api/teacher/home-stats', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const teacherId = req.user.id;

      // 1. Az osztályok amihez a tanár hozzá van rendelve
      const teacherClasses = await storage.getClassesByTeacher(teacherId);

      // 2. Diákok lekérése az osztályokból (classId alapján)
      const { db } = await import('./db');
      const { users: usersTable, testResults: testResultsTable } = await import('@shared/schema');
      const { inArray, eq: eqDrizzle } = await import('drizzle-orm');

      const classIds = teacherClasses.map((c: any) => c.id);

      let studentsInClasses: any[] = [];
      if (classIds.length > 0) {
        studentsInClasses = await db
          .select()
          .from(usersTable)
          .where(
            inArray(usersTable.classId, classIds)
          );
      }

      // Fallback: tanárhoz közvetlenül rendelt diákok is (ha nincs classId)
      const directStudents = await storage.getStudentsByTeacher(teacherId);
      const allStudentIds = new Set([
        ...studentsInClasses.map((s: any) => s.id),
        ...directStudents.map((s: any) => s.id),
      ]);
      const allStudents = [
        ...studentsInClasses,
        ...directStudents.filter((s: any) => !studentsInClasses.find((sc: any) => sc.id === s.id)),
      ];

      // 3. Teszt eredmények minden diákhoz
      const studentsWithResults = await Promise.all(
        allStudents.map(async (student: any) => {
          const results = await db
            .select({
              id: testResultsTable.id,
              moduleId: testResultsTable.moduleId,
              score: testResultsTable.score,
              passed: testResultsTable.passed,
              createdAt: testResultsTable.createdAt,
            })
            .from(testResultsTable)
            .where(eqDrizzle(testResultsTable.userId, student.id))
            .orderBy(testResultsTable.createdAt);
          return {
            id: student.id,
            username: student.username,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            classId: student.classId,
            completedModules: student.completedModules || [],
            lastActiveDate: student.lastActiveDate,
            currentStreak: student.currentStreak,
            testResults: results,
          };
        })
      );

      res.json({
        classes: teacherClasses,
        students: studentsWithResults,
      });
    } catch (error) {
      console.error('Error fetching teacher home stats:', error);
      res.status(500).json({ message: 'Failed to fetch teacher home stats' });
    }
  });

  app.get('/api/teacher/classes/:id/grades', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { startDate, endDate, studentId } = req.query;

      const safeStartDate = typeof startDate === 'string' ? startDate : undefined;
      const safeEndDate = typeof endDate === 'string' ? endDate : undefined;
      const safeStudentId = typeof studentId === 'string' ? studentId : undefined;

      // Ensure class exists
      const classData = await storage.getClassById(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Teacher access check (admins can see everything)
      if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }

      // Fetch results
      const results = await storage.getTestResultsByClass(
        classId,
        safeStartDate,
        safeEndDate,
        safeStudentId
      );

      // Calculate grade (1-5) for each result
      const resultsWithGrades = results.map(r => {
        let grade = 1;
        if (r.score >= 95) grade = 5;
        else if (r.score >= 80) grade = 4;
        else if (r.score >= 70) grade = 3;
        else if (r.score >= 60) grade = 2;

        return {
          ...r,
          grade
        };
      });

      res.json(resultsWithGrades);
    } catch (error) {
      console.error("Error fetching class grades:", error);
      res.status(500).json({ message: "Failed to fetch grades" });
    }
  });

  // ── Class Roster endpoint ─────────────────────────────────────────────────
  // Returns each student's average grade and test count for the selected period.
  // Query params: startDate, endDate  (ISO strings, optional)
  // Response: { className, period, generatedAt, students: [{name, username, avgGrade, testCount, grades[]}] }
  app.get('/api/teacher/classes/:id/roster', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { startDate, endDate } = req.query;

      const classData = await storage.getClassById(classId);
      if (!classData) return res.status(404).json({ message: "Class not found" });

      if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }

      // Pull all grades in the requested window
      const allResults = await storage.getTestResultsByClass(
        classId,
        typeof startDate === 'string' ? startDate : undefined,
        typeof endDate === 'string' ? endDate : undefined,
        undefined // all students
      );

      // Compute grade (1-5) helper
      const toGrade = (score: number) => {
        if (score >= 95) return 5;
        if (score >= 80) return 4;
        if (score >= 70) return 3;
        if (score >= 60) return 2;
        return 1;
      };

      // Group results by student
      const byStudent: Record<string, typeof allResults> = {};
      for (const r of allResults) {
        const key = (r as any).studentId || (r as any).userId;
        if (!byStudent[key]) byStudent[key] = [];
        byStudent[key].push(r);
      }

      // Build roster rows
      const rosterRows = Object.entries(byStudent).map(([, results]) => {
        const first = results[0] as any;
        const grades = results.map(r => ({ ...r, grade: toGrade(r.score) }));
        const avgGrade = grades.length > 0
          ? parseFloat((grades.reduce((s, g) => s + g.grade, 0) / grades.length).toFixed(2))
          : null;
        return {
          studentName: first.studentName || 'Ismeretlen',
          username: first.username || '',
          avgGrade,
          testCount: grades.length,
          grades: grades.map(g => ({
            moduleTitle: g.moduleTitle || g.moduleId,
            score: g.score,
            grade: g.grade,
            createdAt: g.createdAt,
          })),
        };
      });

      // Sort by name alphabetically
      rosterRows.sort((a, b) => a.studentName.localeCompare(b.studentName, 'hu'));

      // Build period label
      let periodLabel = 'Mindenkori';
      if (startDate && endDate) {
        periodLabel = `${new Date(startDate as string).toLocaleDateString('hu-HU')} – ${new Date(endDate as string).toLocaleDateString('hu-HU')}`;
      } else if (startDate) {
        periodLabel = `${new Date(startDate as string).toLocaleDateString('hu-HU')} –tól`;
      }

      res.json({
        className: classData.name,
        period: periodLabel,
        generatedAt: new Date().toISOString(),
        students: rosterRows,
      });
    } catch (error) {
      console.error("Error fetching class roster:", error);
      res.status(500).json({ message: "Failed to fetch roster" });
    }
  });



  // ── Jelenl\u00e9t API endpoints ─────────────────────────────────────────────────

  // GET: Oszt\u00e1ly jelenl\u00e9ti adatai egy napra
  app.get('/api/teacher/classes/:id/attendance', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { date, startDate, endDate } = req.query;

      const classData = await storage.getClassById(classId);
      if (!classData) return res.status(404).json({ message: "Class not found" });

      if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }

      if (startDate && endDate) {
        const rows = await storage.getAttendanceByClassRange(
          classId,
          startDate as string,
          endDate as string
        );
        return res.json(rows);
      }

      const targetDate = (date as string) || new Date().toISOString().split('T')[0];
      const rows = await storage.getAttendanceByClass(classId, targetDate);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  // PATCH: Jelenl\u00e9t st\u00e1tusz m\u00f3dos\u00edt\u00e1sa (tan\u00e1r m\u00f3dos\u00edthatja k\u00e9zi m\u00f3don)
  app.patch('/api/teacher/attendance/:id', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const attendanceId = parseInt(req.params.id);
      const { status } = req.body;

      const validStatuses = ['present', 'absent', 'late', 'excused'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Érvénytelen státusz. Lehetséges értékek: present, absent, late, excused" });
      }

      const updated = await storage.updateAttendanceStatus(attendanceId, status, req.user.id);
      res.json(updated);
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ message: "Failed to update attendance" });
    }
  });

  // POST: Kézi jelenlétrögzítés (pl. ha a diák nem lépett be, de jelen volt)
  app.post('/api/teacher/classes/:id/attendance', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { studentId, date, periodNumber, status } = req.body;

      if (!studentId || !date || !periodNumber || !status) {
        return res.status(400).json({ message: "studentId, date, periodNumber, status megadása kötelező" });
      }

      const classData = await storage.getClassById(classId);
      if (!classData) return res.status(404).json({ message: "Class not found" });

      if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }

      const row = await storage.upsertAttendance({
        studentId,
        classId,
        teacherId: req.user.id,
        date,
        periodNumber: parseInt(periodNumber),
        status,
        recordedBy: req.user.id,
      });

      res.json(row);
    } catch (error) {
      console.error("Error recording attendance:", error);
      res.status(500).json({ message: "Failed to record attendance" });
    }
  });

  // GET: Napi megjegyzések egy osztályhoz
  app.get('/api/teacher/classes/:id/notes', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { date } = req.query;
      const targetDate = (date as string) || new Date().toISOString().split('T')[0];

      const classData = await storage.getClassById(classId);
      if (!classData) return res.status(404).json({ message: "Class not found" });

      if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }

      const notes = await storage.getClassDailyNotes(classId, targetDate);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  // POST: Napi megjegyzés mentése / frissítése
  app.post('/api/teacher/students/:studentId/notes', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const { studentId } = req.params;
      const { date, note, classId } = req.body;

      if (!date || !note) {
        return res.status(400).json({ message: "date és note megadása kötelező" });
      }

      const targetDate = date || new Date().toISOString().split('T')[0];

      const row = await storage.upsertStudentDailyNote({
        studentId,
        teacherId: req.user.id,
        classId: classId ? parseInt(classId) : null,
        date: targetDate,
        note,
      });

      res.json(row);
    } catch (error) {
      console.error("Error saving note:", error);
      res.status(500).json({ message: "Failed to save note" });
    }
  });

  // GET: Órarend lekérdezése (school admin ID alapján)
  app.get('/api/lesson-schedules', combinedAuth, async (req: any, res) => {
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

  // POST: Órarend mentése (school admin)
  app.post('/api/lesson-schedules', combinedAuth, async (req: any, res) => {
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

  // GET: CSV / Excel export adat
  app.get('/api/teacher/classes/:id/attendance/export', combinedAuth, checkTeacher, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { startDate, endDate, format } = req.query;

      const classData = await storage.getClassById(classId);
      if (!classData) return res.status(404).json({ message: "Class not found" });

      if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
        return res.status(403).json({ message: "You are not assigned to this class" });
      }

      const sd = (startDate as string) || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const ed = (endDate as string) || new Date().toISOString().split('T')[0];

      const rows = await storage.getAttendanceExportData(classId, sd, ed);

      // CSV formátum
      if (format === 'csv') {
        const statusMap: Record<string, string> = {
          present: 'Jelen', absent: 'Hiányzik', late: 'Késő', excused: 'Igazolt'
        };

        const headerLine = 'Vezetéknév;Keresztnév;Felhasználó;Dátum;Óra sorszáma;Státusz;Belépés ideje;Napi megjegyzés\n';
        const csvRows = rows.map((r: any) => [
          r.last_name || '',
          r.first_name || '',
          r.username || '',
          r.date || '',
          r.period_number || '',
          statusMap[r.status] || r.status || '',
          r.login_at ? new Date(r.login_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '',
          (r.daily_note || '').replace(/;/g, ',').replace(/\n/g, ' ')
        ].join(';')).join('\n');

        const safeClassName = (classData.name || 'class').replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `jelenlét_${safeClassName}_${sd}_${ed}.csv`.replace(/[^a-zA-Z0-9\._-]/g, '_');
        
        // Use Buffer with BOM to ensure correct encoding in Excel
        const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
        const content = Buffer.from(headerLine + csvRows, 'utf8');
        const responseBuffer = Buffer.concat([bom, content]);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', responseBuffer.length.toString());
        res.end(responseBuffer);
      } else {
        // JSON (alapértelmezett – a frontend rendereli PDF-be)
        res.json({
          className: classData.name,
          startDate: sd,
          endDate: ed,
          generatedAt: new Date().toISOString(),
          rows
        });
      }
    } catch (error) {
      console.error("Error exporting attendance:", error);
      res.status(500).json({ message: "Failed to export attendance" });
    }
  });

  // Public API endpoints (for authenticated users with profession-based access control)
  app.get('/api/public/professions', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let user = await storage.getUser(userId);
      if (!user && req.user?.authType === 'demo') {
        user = req.user;
      }

      if (!user) return res.status(401).json({ message: "User not found" });

      // Admin: mindent lát
      if (user.role === 'admin') {
        return res.json(await storage.getProfessions());
      }

      // Tanár és school_admin: az iskolájuk szakmáit látják (schoolAdminId alapján)
      if (user.role === 'teacher' || user.role === 'school_admin') {
        const schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
        return res.json(await storage.getProfessions(schoolAdminId));
      }

      // Demo mód: csak az engedélyezett szakmák
      if (user.authType === 'demo') {
        const mind = await storage.getProfessions();
        const demoProfessions = mind.filter(p => p.name.toLowerCase().includes('hegesztő') || (p.name.toLowerCase().includes('épület') && p.name.toLowerCase().includes('lakatos')));
        return res.json(demoProfessions);
      }

      // Diák: szigorú szűrés
      const hasAssigned = user.assignedProfessionIds && user.assignedProfessionIds.length > 0;
      const hasSelected = !!user.selectedProfessionId;

      if (hasAssigned) {
        // Admin rendelte hozzá → csak az engedélyezett szakmák
        const allProfessions = await storage.getProfessions();
        return res.json(allProfessions.filter(p => user.assignedProfessionIds!.includes(p.id)));
      }

      if (hasSelected) {
        // Diák maga választotta / osztályon keresztül → csak az egy szakma
        const allProfessions = await storage.getProfessions();
        return res.json(allProfessions.filter(p => p.id === user.selectedProfessionId));
      }

      // Még nem választott szakmát → mindenki látható a választáshoz
      return res.json(await storage.getProfessions());

    } catch (error) {
      console.error("Error fetching public professions:", error);
      res.status(500).json({ message: "Failed to fetch professions" });
    }
  });

  app.get('/api/public/subjects', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      // Get user ID from either Replit auth or local auth
      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let user = await storage.getUser(userId);
      if (!user && req.user?.authType === 'demo') {
        user = req.user;
      }

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const professionId = req.query.professionId ? parseInt(req.query.professionId as string) : undefined;

      // Admin and teacher can see all subjects
      if (user.role === 'admin' || user.role === 'teacher') {
        const subjects = await storage.getSubjects(professionId);
        return res.json(subjects);
      }

      // Students can only see subjects from their assigned professions
      if (user.authType === 'demo') {
        const mind = await storage.getSubjects(professionId);
        const demoSubjects = mind.filter(s => s.name.toLowerCase().includes('alapozó'));
        return res.json(demoSubjects);
      }

      const hasAssignedProfessions = user.assignedProfessionIds && user.assignedProfessionIds.length > 0;

      if (!hasAssignedProfessions) {
        // If student hasn't chosen profession yet, allow seeing subjects from any profession
        const subjects = await storage.getSubjects(professionId);
        return res.json(subjects);
      }

      // Check if the requested profession is in user's assigned professions
      if (professionId && !user.assignedProfessionIds!.includes(professionId)) {
        return res.status(403).json({ message: "Access denied to this profession" });
      }

      const subjects = await storage.getSubjects(professionId);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching public subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // OpenAI API key update endpoint
  app.post('/api/admin/update-openai-key', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { openaiApiKey } = req.body;
      if (!openaiApiKey || !openaiApiKey.startsWith('sk-')) {
        return res.status(400).json({ message: "Invalid OpenAI API key format" });
      }

      // Store the API key securely in the database
      await storage.setSystemSetting('openai_api_key', openaiApiKey, userId);
      console.log('OpenAI API key updated by admin:', userId);

      res.json({ message: "OpenAI API key updated successfully" });
    } catch (error) {
      console.error("Error updating OpenAI API key:", error);
      res.status(500).json({ message: "Failed to update OpenAI API key" });
    }
  });

  // Gemini API key update endpoint
  app.post('/api/admin/update-gemini-key', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { geminiApiKey } = req.body;
      if (!geminiApiKey || !geminiApiKey.startsWith('AIza')) {
        return res.status(400).json({ message: "Invalid Gemini API key format" });
      }

      // Store the API key securely in the database
      await storage.setSystemSetting('gemini_api_key', geminiApiKey, userId);
      console.log('Gemini API key updated by admin:', userId);

      res.json({ message: "Gemini API key updated successfully" });
    } catch (error) {
      console.error("Error updating Gemini API key:", error);
      res.status(500).json({ message: "Failed to update Gemini API key" });
    }
  });

  // AI Provider selection endpoint
  app.post('/api/admin/update-ai-provider', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { provider } = req.body;
      if (!provider || !['openai', 'gemini'].includes(provider)) {
        return res.status(400).json({ message: "Invalid AI provider. Must be 'openai' or 'gemini'" });
      }

      // Store the AI provider preference in the database
      await storage.setSystemSetting('ai_provider', provider, userId);
      console.log('AI provider updated by admin:', userId, 'to:', provider);

      res.json({ message: "AI provider updated successfully" });
    } catch (error) {
      console.error("Error updating AI provider:", error);
      res.status(500).json({ message: "Failed to update AI provider" });
    }
  });

  // SerpAPI key update endpoint
  app.post('/api/admin/update-serp-key', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { serpApiKey } = req.body;
      if (!serpApiKey) {
        return res.status(400).json({ message: "SerpAPI key is required" });
      }

      await storage.setSystemSetting('serp_api_key', serpApiKey, userId);
      console.log('SerpAPI key updated by admin:', userId);

      res.json({ message: "SerpAPI key updated successfully" });
    } catch (error) {
      console.error("Error updating SerpAPI key:", error);
      res.status(500).json({ message: "Failed to update SerpAPI key" });
    }
  });

  // YouTube API key update endpoint
  app.post('/api/admin/update-youtube-key', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { youtubeApiKey } = req.body;
      if (!youtubeApiKey) {
        return res.status(400).json({ message: "YouTube API key is required" });
      }

      await storage.setSystemSetting('youtube_api_key', youtubeApiKey, userId);
      console.log('YouTube API key updated by admin:', userId);

      res.json({ message: "YouTube API key updated successfully" });
    } catch (error) {
      console.error("Error updating YouTube API key:", error);
      res.status(500).json({ message: "Failed to update YouTube API key" });
    }
  });

  // ElevenLabs API key update endpoint
  app.post('/api/admin/update-elevenlabs-key', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { elevenLabsKey } = req.body;
      if (!elevenLabsKey) {
        return res.status(400).json({ message: "ElevenLabs API key is required" });
      }

      await storage.setSystemSetting('elevenlabs_api_key', elevenLabsKey, userId);
      console.log('ElevenLabs API key updated by admin:', userId);

      res.json({ message: "ElevenLabs API key updated successfully" });
    } catch (error) {
      console.error("Error updating ElevenLabs API key:", error);
      res.status(500).json({ message: "Failed to update ElevenLabs API key" });
    }
  });

  // Admin: összes osztály lekérdezése (felhasználói csoportosításhoz)
  app.get('/api/admin/all-classes', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      const { db } = await import('./db');
      const { classes } = await import('@shared/schema');
      const allClasses = await db.select({
        id: classes.id,
        name: classes.name,
        schoolAdminId: classes.schoolAdminId,
      }).from(classes);
      res.json(allClasses);
    } catch (error) {
      console.error('Error fetching all classes:', error);
      res.status(500).json({ message: 'Failed to fetch classes' });
    }
  });

  // AI System Message Management
  app.post('/api/admin/settings/system-message', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Valid message is required" });
      }

      // Store the system message in the database
      await storage.setSystemSetting('ai_system_message', message, userId);
      console.log('AI system message updated by admin:', userId);

      res.json({ message: "System message updated successfully" });
    } catch (error) {
      console.error("Error updating system message:", error);
      res.status(500).json({ message: "Failed to update system message" });
    }
  });

  app.get('/api/admin/settings/system-message', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const systemMessageSetting = await storage.getSystemSetting('ai_system_message');

      res.json({
        message: systemMessageSetting?.value || 'Te egy szakértő oktatási AI asszisztens vagy, aki magyar nyelven segít a tanulásban. Használj szakmai nyelvezetet, de egyszerű magyarázatokat. Tartsd meg a lényeges információkat és javítsd a szerkezetet. A tartalom legyen logikus és könnyen érthető.\n\nFONTOS YOUTUBE KERESÉSI IRÁNYELVEK:\n- Csak a legfontosabb fogalmakhoz generálj YouTube keresési kifejezéseket\n- Fogalmanként MAXIMUM 1 keresési kifejezést használj\n- Kerüld a túl sok vagy ismétlődő keresést\n- Fókuszálj a gyakorlati, oktatási tartalmakra\n- A keresési kifejezések legyenek specifikusak és relevánsak'
      });
    } catch (error) {
      console.error("Error fetching system message:", error);
      res.status(500).json({ message: "Failed to fetch system message" });
    }
  });

  // AI Chat Enable/Disable Setting
  app.get('/api/settings/ai-chat-enabled', combinedAuth, async (req: any, res) => {
    try {
      const setting = await storage.getSystemSetting('ai_chat_enabled');
      // Default to true if not set
      const enabled = setting ? setting.value === 'true' : true;
      res.json({ enabled });
    } catch (error) {
      console.error("Error fetching ai-chat-enabled setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.post('/api/admin/settings/ai-chat-enabled', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "Value must be a boolean" });
      }

      await storage.setSystemSetting('ai_chat_enabled', String(enabled), userId);
      console.log('AI chat enabled setting updated by admin:', userId, 'to:', enabled);

      res.json({ message: "Setting updated successfully", enabled });
    } catch (error) {
      console.error("Error updating ai-chat-enabled setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Iskolai admin regisztrálás
  app.post('/api/admin/create-school-admin', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { username, password, firstName, lastName, schoolName, email } = req.body;

      if (!username || !password || !firstName || !lastName || !schoolName) {
        return res.status(400).json({ message: "Username, password, firstName, lastName, and schoolName are required" });
      }

      // Ellenőrizzük, hogy létezik-e már ilyen felhasználónév
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
      }

      // Hozzunk létre új iskolai admin felhasználót
      const newUser = await storage.createUser({
        username,
        firstName,
        lastName,
        schoolName,
        email: email || null,
        role: 'school_admin',
        password
      });

      res.json({
        message: "Iskolai admin sikeresen létrehozva",
        userId: newUser.id,
        schoolName: newUser.schoolName
      });
    } catch (error) {
      console.error("Error creating school admin:", error);
      res.status(500).json({ message: "Failed to create school admin" });
    }
  });

  // AI Module Update Message Management
  app.post('/api/admin/settings/module-update-message', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Valid message is required" });
      }

      // Store the module update message in the database
      await storage.setSystemSetting('ai_module_update_message', message, userId);
      console.log('AI module update message updated by admin:', userId);

      res.json({ message: "Module update message updated successfully" });
    } catch (error) {
      console.error("Error updating module update message:", error);
      res.status(500).json({ message: "Failed to update module update message" });
    }
  });

  app.get('/api/admin/settings/module-update-message', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleUpdateMessageSetting = await storage.getSystemSetting('ai_module_update_message');

      res.json({
        message: moduleUpdateMessageSetting?.value || 'Frissítsd a következő tananyag modult. Használj szakmai nyelvezetet, de egyszerű magyarázatokat. Tartsd meg a lényeges információkat és javítsd a szerkezetet. A tartalom legyen logikus és könnyen érthető. FONTOS: Automatikusan adj hozzá Wikipedia hivatkozásokat a szakmai kifejezésekhez és fogalmakhoz - használj [szöveg](https://hu.wikipedia.org/wiki/Címszó) formátumot. Keress releváns YouTube videó témákat és adj hozzá DataForSEO alapú friss információkat a tartalom gazdagításához.'
      });
    } catch (error) {
      console.error("Error fetching module update message:", error);
      res.status(500).json({ message: "Failed to fetch module update message" });
    }
  });

  // YouTube Search Prompt Management
  app.post('/api/admin/settings/youtube-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Valid message is required" });
      }

      await storage.setSystemSetting('ai_youtube_prompt', message, userId);
      console.log('YouTube prompt updated by admin:', userId);

      res.json({ message: "YouTube prompt updated successfully" });
    } catch (error) {
      console.error("Error updating YouTube prompt:", error);
      res.status(500).json({ message: "Failed to update YouTube prompt" });
    }
  });

  app.get('/api/admin/settings/youtube-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const youtubeSetting = await storage.getSystemSetting('ai_youtube_prompt');

      res.json({
        message: youtubeSetting?.value || 'Generálj 1-2 konkrét YouTube keresési kifejezést a modul legfontosabb fogalmaihoz. Fókuszálj praktikus, oktatási tartalmakra és kerüld az ismétlődő kereséseket. Modulcím: {title}, Tartalom: {content}'
      });
    } catch (error) {
      console.error("Error fetching YouTube prompt:", error);
      res.status(500).json({ message: "Failed to fetch YouTube prompt" });
    }
  });

  // Wikipedia Search Prompt Management
  app.post('/api/admin/settings/wikipedia-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Valid message is required" });
      }

      await storage.setSystemSetting('ai_wikipedia_prompt', message, userId);
      console.log('Wikipedia prompt updated by admin:', userId);

      res.json({ message: "Wikipedia prompt updated successfully" });
    } catch (error) {
      console.error("Error updating Wikipedia prompt:", error);
      res.status(500).json({ message: "Failed to update Wikipedia prompt" });
    }
  });

  app.get('/api/admin/settings/wikipedia-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const wikipediaSetting = await storage.getSystemSetting('ai_wikipedia_prompt');

      res.json({
        message: wikipediaSetting?.value || 'Azonosítsd a modul legfontosabb szakmai kifejezéseit és fogalmait, amelyekhez Wikipedia linkeket kell hozzáadni. Csak azokat a kifejezéseket válaszd ki, amelyek valóban fontosak a témához. Modulcím: {title}, Tartalom: {content}'
      });
    } catch (error) {
      console.error("Error fetching Wikipedia prompt:", error);
      res.status(500).json({ message: "Failed to fetch Wikipedia prompt" });
    }
  });

  // Internet Content Generation Prompt Management
  app.post('/api/admin/settings/internet-content-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Valid message is required" });
      }

      await storage.setSystemSetting('ai_internet_content_prompt', message, userId);
      console.log('Internet content prompt updated by admin:', userId);

      res.json({ message: "Internet content prompt updated successfully" });
    } catch (error) {
      console.error("Error updating internet content prompt:", error);
      res.status(500).json({ message: "Failed to update internet content prompt" });
    }
  });

  // Concise Content Generation Prompt Management
  app.post('/api/admin/settings/concise-content-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Valid message is required" });
      }

      await storage.setSystemSetting('concise-content-prompt', message, userId);
      console.log('Concise content prompt updated by admin:', userId);

      res.json({ message: "Concise content prompt updated successfully" });
    } catch (error) {
      console.error("Error updating concise content prompt:", error);
      res.status(500).json({ message: "Failed to update concise content prompt" });
    }
  });

  app.get('/api/admin/settings/concise-content-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const conciseContentSetting = await storage.getSystemSetting('concise-content-prompt');

      res.json({
        message: conciseContentSetting?.value || 'Készíts tömör, lényegre törő tananyagot a következő címhez: {title}. Alapanyag: {content}. Követelmények: Maximum 300-400 szó, csak a legfontosabb információk, egyszerű nyelvezet, markdown formázás.'
      });
    } catch (error) {
      console.error("Error fetching concise content prompt:", error);
      res.status(500).json({ message: "Failed to fetch concise content prompt" });
    }
  });

  // Audio Explanation Prompt Management
  app.post('/api/admin/settings/audio-explanation-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Valid message is required" });
      }

      await storage.setSystemSetting('audio-explanation-prompt', message, userId);
      console.log('Audio explanation prompt updated by admin:', userId);

      res.json({ message: "Audio explanation prompt updated successfully" });
    } catch (error) {
      console.error("Error updating audio explanation prompt:", error);
      res.status(500).json({ message: "Failed to update audio explanation prompt" });
    }
  });

  app.get('/api/admin/settings/audio-explanation-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const audioExplanationSetting = await storage.getSystemSetting('audio-explanation-prompt');

      res.json({
        message: audioExplanationSetting?.value || 'Készíts rövid, érthető hangos magyarázatot a tanuló kérdésére a modul tartalmának alapján. Használj egyszerű nyelvezetet és konkrét példákat. Kérdés: {question}, Modul: {title}, Tartalom: {content}'
      });
    } catch (error) {
      console.error("Error fetching audio explanation prompt:", error);
      res.status(500).json({ message: "Failed to fetch audio explanation prompt" });
    }
  });

  // Text Explanation Prompt Management
  app.post('/api/admin/settings/text-explanation-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Valid message is required" });
      }

      await storage.setSystemSetting('text-explanation-prompt', message, userId);
      console.log('Text explanation prompt updated by admin:', userId);

      res.json({ message: "Text explanation prompt updated successfully" });
    } catch (error) {
      console.error("Error updating text explanation prompt:", error);
      res.status(500).json({ message: "Failed to update text explanation prompt" });
    }
  });

  app.get('/api/admin/settings/text-explanation-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const textExplanationSetting = await storage.getSystemSetting('text-explanation-prompt');

      res.json({
        message: textExplanationSetting?.value || 'Készíts részletes, strukturált szöveges magyarázatot a tanuló kérdésére. Használj pontokat, példákat és gyakorlati alkalmazásokat. Kérdés: {question}, Modul: {title}, Tartalom: {content}'
      });
    } catch (error) {
      console.error("Error fetching text explanation prompt:", error);
      res.status(500).json({ message: "Failed to fetch text explanation prompt" });
    }
  });

  app.get('/api/admin/settings/internet-content-prompt', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const internetContentSetting = await storage.getSystemSetting('ai_internet_content_prompt');

      res.json({
        message: internetContentSetting?.value || 'Generálj frissített, részletes tartalmat az internet segítségével. Használj aktuális információkat, gyakorlati példákat és strukturált felépítést. Modulcím: {title}, Eredeti tartalom: {content}'
      });
    } catch (error) {
      console.error("Error fetching internet content prompt:", error);
      res.status(500).json({ message: "Failed to fetch internet content prompt" });
    }
  });

  // User management routes (Admin only)
  app.get('/api/admin/users', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id/role', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const targetUserId = req.params.id;
      const { role } = req.body;

      if (!['admin', 'student'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      await storage.updateUserRole(targetUserId, role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Unlock all modules for a user (Admin only)
  app.post('/api/admin/users/:id/unlock-all-modules', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const targetUserId = req.params.id;

      // Get all published modules
      const allModules = await storage.getPublishedModules();
      const allModuleIds = allModules.map(m => m.id);

      // Update user's completed modules to include all module IDs
      await storage.updateUserCompletedModules(targetUserId, allModuleIds);

      console.log(`Admin ${userId} unlocked all ${allModuleIds.length} modules for user ${targetUserId}`);

      res.json({
        message: "All modules unlocked successfully",
        unlockedCount: allModuleIds.length
      });
    } catch (error) {
      console.error("Error unlocking all modules:", error);
      res.status(500).json({ message: "Failed to unlock all modules" });
    }
  });

  // Jelszó visszaállítási endpoint
  app.post('/api/admin/reset-password', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user && req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { userId: targetUserId, newPassword } = req.body;

      if (!targetUserId || !newPassword) {
        return res.status(400).json({ message: "User ID and new password are required" });
      }

      // Minimum password length check
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      await storage.updateUserPassword(targetUserId, newPassword);
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.delete('/api/admin/users/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const targetUserId = req.params.id;

      // Prevent admin from deleting themselves
      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(targetUserId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Public/Student routes for reading data
  app.get('/api/public/professions', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
      const professions = await storage.getProfessions(schoolAdminId);
      res.json(professions);
    } catch (error) {
      console.error("Error fetching professions:", error);
      res.status(500).json({ message: "Failed to fetch professions" });
    }
  });

  // Subject operations
  app.post('/api/subjects', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectData = insertSubjectSchema.parse(req.body);
      if (user.role !== 'admin') {
        (subjectData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const subject = await storage.createSubject(subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ message: "Failed to create subject" });
    }
  });

  app.put('/api/subjects/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);
      const subjectData = insertSubjectSchema.parse(req.body);
      if (user.role !== 'admin') {
        (subjectData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const subject = await storage.updateSubject(subjectId, subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ message: "Failed to update subject" });
    }
  });

  app.delete('/api/subjects/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);
      await storage.deleteSubject(subjectId);
      res.json({ message: "Subject deleted successfully" });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // Module operations
  app.get('/api/modules/:id/assignments', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const assignments = await storage.getModuleAssignments(moduleId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching module assignments:", error);
      res.status(500).json({ message: "Failed to fetch module assignments" });
    }
  });

  app.post('/api/modules', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleData = insertModuleSchema.parse(req.body);
      if (user.role !== 'admin') {
        (moduleData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const module = await storage.createModule(moduleData);
      res.json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  app.patch('/api/modules/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleId = parseInt(req.params.id);
      const moduleData = insertModuleSchema.partial().parse(req.body);
      const additionalSubjectIds = req.body.additionalSubjectIds;

      if (user.role !== 'admin') {
        (moduleData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }

      const module = await storage.updateModule(moduleId, moduleData);
      
      // Update additional assignments if provided
      if (Array.isArray(additionalSubjectIds)) {
        await storage.updateModuleAssignments(module.id, additionalSubjectIds);
      }

      res.json(module);
    } catch (error) {
      console.error("Error updating module:", error);
      res.status(500).json({ message: "Failed to update module" });
    }
  });





  app.get('/api/public/modules', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      let user = await storage.getUser(userId);
      if (!user && req.user?.authType === 'demo') {
        user = req.user;
      }
      const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Apply Mermaid syntax fixes to remove Wikipedia links from diagrams
      const { fixMermaidSyntax } = await import('./openai');

      const cleanModules = (modules: any[]) => modules.map(module => ({
        ...module,
        content: module.content ? fixMermaidSyntax(module.content) : module.content,
        conciseContent: module.conciseContent ? fixMermaidSyntax(module.conciseContent) : module.conciseContent,
        detailedContent: module.detailedContent ? fixMermaidSyntax(module.detailedContent) : module.detailedContent,
      }));

      // --- Demo mode restriction ---
      if (user.authType === 'demo') {
        let allowedModules: any[] = [];

        const professions = await storage.getProfessions();
        const allSubjects = await storage.getSubjects();

        const hegeszto = professions.find(p => p.name.toLowerCase().includes('hegesztő'));
        const epulet = professions.find(p => p.name.toLowerCase().includes('épület') && p.name.toLowerCase().includes('lakatos'));

        const allowedSubjects = allSubjects.filter(sub => {
          if (!sub.professionId) return false;
          // "hegesztő/műszaki alapozó ismeretek" and "Épület- és szerkezetlakatos/műszaki dokumentáció és alapozó ismeretek"
          const isHegesztoAlapozo = hegeszto && sub.professionId === hegeszto.id && sub.name.toLowerCase().includes('alapozó');
          const isEpuletAlapozo = epulet && sub.professionId === epulet.id && sub.name.toLowerCase().includes('alapozó');
          return isHegesztoAlapozo || isEpuletAlapozo;
        });

        if (subjectId) {
          if (allowedSubjects.find(s => s.id === subjectId)) {
            const mods = await storage.getPublishedModules(subjectId);
            allowedModules = mods.slice(0, 3);
          }
        } else {
          for (const sub of allowedSubjects) {
            const mods = await storage.getPublishedModules(sub.id);
            allowedModules.push(...mods.slice(0, 3));
          }
        }

        return res.json(cleanModules(allowedModules));
      }

      // For teachers and admins, show all modules; for students, only published ones
      if (user.role === 'teacher' || user.role === 'admin') {
        // If subjectId is provided, use it directly
        if (subjectId) {
          const schoolAdminId = user?.role === 'admin' ? undefined : ((user?.role as string) === 'school_admin' ? user.id : user?.schoolAdminId);
          const modules = await storage.getModules(subjectId, schoolAdminId);
          res.json(cleanModules(modules));
          return;
        }

        // Otherwise, get all modules from all subjects
        const allSubjects = await storage.getSubjects(); // Get all subjects
        let allModules = [];

        for (const subject of allSubjects) {
          const schoolAdminId = user?.role === 'admin' ? undefined : ((user?.role as string) === 'school_admin' ? user.id : user?.schoolAdminId);
          const modules = await storage.getModules(subject.id, schoolAdminId);
          allModules.push(...modules);
        }

        res.json(cleanModules(allModules));
      } else {
        // Regular students - only published modules
        if (subjectId) {
          const schoolAdminId = user?.role === 'admin' ? undefined : ((user?.role as string) === 'school_admin' ? user.id : user?.schoolAdminId);
          const modules = await storage.getPublishedModules(subjectId, schoolAdminId);
          res.json(cleanModules(modules));
          return;
        }

        // Otherwise, get modules for user's profession subjects
        if (user.selectedProfessionId) {
          const subjects = await storage.getSubjects(user.selectedProfessionId);
          let allModules = [];

          for (const subject of subjects) {
            const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
            const modules = await storage.getPublishedModules(subject.id, schoolAdminId);
            allModules.push(...modules);
          }

          res.json(cleanModules(allModules));
        } else {
          res.json([]);
        }
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // Profession routes
  app.post('/api/professions', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const professionData = insertProfessionSchema.parse(req.body);
      if (user.role !== 'admin') {
        (professionData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const profession = await storage.createProfession(professionData);
      res.json(profession);
    } catch (error) {
      console.error("Error creating profession:", error);
      res.status(500).json({ message: "Failed to create profession" });
    }
  });

  app.patch('/api/professions/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const professionId = parseInt(req.params.id);
      const professionData = insertProfessionSchema.partial().parse(req.body);
      if (user.role !== 'admin') {
        (professionData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const profession = await storage.updateProfession(professionId, professionData);
      res.json(profession);
    } catch (error) {
      console.error("Error updating profession:", error);
      res.status(500).json({ message: "Failed to update profession" });
    }
  });

  app.put('/api/professions/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const professionId = parseInt(req.params.id);
      const professionData = insertProfessionSchema.parse(req.body);
      if (user.role !== 'admin') {
        (professionData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const profession = await storage.updateProfession(professionId, professionData);
      res.json(profession);
    } catch (error) {
      console.error("Error updating profession:", error);
      res.status(500).json({ message: "Failed to update profession" });
    }
  });



  app.delete('/api/professions/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const professionId = parseInt(req.params.id);

      // Check if profession has subjects
      const subjects = await storage.getSubjects(professionId);
      if (subjects.length > 0) {
        return res.status(400).json({
          message: "Nem törölhető a szakma, mert tartoznak hozzá tantárgyak"
        });
      }

      await storage.deleteProfession(professionId);
      res.json({ message: "Profession deleted successfully" });
    } catch (error) {
      console.error("Error deleting profession:", error);
      res.status(500).json({ message: "Failed to delete profession" });
    }
  });

  // Subject routes  
  app.post('/api/subjects', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectData = insertSubjectSchema.parse(req.body);
      if (user.role !== 'admin') {
        (subjectData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const subject = await storage.createSubject(subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ message: "Failed to create subject" });
    }
  });

  app.patch('/api/subjects/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);
      const subjectData = insertSubjectSchema.partial().parse(req.body);
      if (user.role !== 'admin') {
        (subjectData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const subject = await storage.updateSubject(subjectId, subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ message: "Failed to update subject" });
    }
  });

  app.put('/api/subjects/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);
      const subjectData = insertSubjectSchema.parse(req.body);
      if (user.role !== 'admin') {
        (subjectData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const subject = await storage.updateSubject(subjectId, subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(500).json({ message: "Failed to update subject" });
    }
  });

  app.delete('/api/subjects/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);

      // Check if subject has modules
      const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
      const modules = await storage.getModules(subjectId, schoolAdminId);
      if (modules.length > 0) {
        return res.status(400).json({
          message: "Nem törölhető a tantárgy, mert tartoznak hozzá modulok"
        });
      }

      await storage.deleteSubject(subjectId);
      res.json({ message: "Subject deleted successfully" });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // Module routes
  app.get('/api/modules', combinedAuth, async (req: any, res) => {
    try {
      console.log('Modules fetch - req.user:', req.user);

      if (!req.user) {
        console.log('Modules fetch - No user in request');
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.user.claims?.sub || req.user.id;
      console.log('Modules fetch - userId:', userId);
      const user = await storage.getUser(userId);
      console.log('Modules fetch - user:', { id: user?.id, role: user?.role });
      const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
      console.log('Modules fetch - subjectId:', subjectId);

      if (!user) {
        console.log('Modules fetch - User not found');
        return res.status(404).json({ message: "User not found" });
      }

      let modules;
      if (user.role === 'admin' || user.role === 'teacher') {
        console.log('Modules fetch - Admin/Teacher role, fetching all modules');
        modules = await storage.getModules(subjectId);
      } else {
        console.log('Modules fetch - Student role, fetching published modules');
        modules = await storage.getPublishedModules(subjectId);
      }

      console.log('Modules fetch - Result count:', modules.length);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules - Details:", error);
      console.error("Error stack:", (error as Error).stack);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.get('/api/modules/:id', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);

      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Apply Mermaid syntax fixes to remove Wikipedia links from diagrams
      const { fixMermaidSyntax } = await import('./openai');

      const cleanedModule = {
        ...module,
        content: module.content ? fixMermaidSyntax(module.content) : module.content,
        conciseContent: module.conciseContent ? fixMermaidSyntax(module.conciseContent) : module.conciseContent,
        detailedContent: module.detailedContent ? fixMermaidSyntax(module.detailedContent) : module.detailedContent,
      };

      res.json(cleanedModule);
    } catch (error) {
      console.error("Error fetching module:", error);
      res.status(500).json({ message: "Failed to fetch module" });
    }
  });

  app.get('/api/modules/:id/flashcards', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const flashcards = await storage.getFlashcards(moduleId);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  app.post('/api/modules/:id/flashcards/import', combinedAuth, csvUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nincs fájl feltöltve' });
      }

      const moduleId = parseInt(req.params.id);
      const csvData = fs.readFileSync(req.file.path, 'utf-8');

      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true
      });

      console.log('Importing flashcards from CSV. Records found:', records.length);

      const flashcardsToInsert = records.map((record: any) => {
        // Try to find Front/Back or Question/Answer or just use first two columns
        const keys = Object.keys(record);
        const front = record.Front || record.Question || record[keys[0]];
        const back = record.Back || record.Answer || record[keys[1]];

        return {
          moduleId,
          front: String(front || '').trim(),
          back: String(back || '').trim(),
        };
      }).filter((f: any) => f.front && f.back);

      if (flashcardsToInsert.length === 0) {
        return res.status(400).json({ message: 'A CSV fájl nem tartalmaz érvényes tanulókártyákat. Ellenőrizd a fejlécet (Front, Back vagy Question, Answer)!' });
      }

      const inserted = await storage.bulkCreateFlashcards(flashcardsToInsert);

      // Delete temporary file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Error deleting temp CSV file:', e);
      }

      res.status(201).json({
        message: `${inserted.length} tanulókártya sikeresen importálva`,
        count: inserted.length
      });
    } catch (error) {
      console.error("Error importing flashcards:", error);
      res.status(500).json({ message: "Failed to import flashcards: " + (error as Error).message });
    }
  });

  app.delete('/api/modules/:id/flashcards', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      await storage.deleteFlashcardsByModule(moduleId);
      res.json({ message: "Minden tanulókártya törölve a modulhoz" });
    } catch (error) {
      console.error("Error deleting flashcards:", error);
      res.status(500).json({ message: "Failed to delete flashcards" });
    }
  });

  // URL-alapú flashcard import – a szerver tölti le, nincs CORS gond
  app.post('/api/modules/:id/flashcards/import-url', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: 'Hiányzó CSV URL' });
      }

      // Google Drive megosztási link → közvetlen letöltési linkké alakítás
      let downloadUrl = url;
      const gdriveMatcher = url.match(/\/file\/d\/([^/]+)\//);
      if (gdriveMatcher) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${gdriveMatcher[1]}`;
      }
      // Google Sheets → CSV export
      const sheetsMatcher = url.match(/\/spreadsheets\/d\/([^/]+)/);
      if (sheetsMatcher) {
        downloadUrl = `https://docs.google.com/spreadsheets/d/${sheetsMatcher[1]}/export?format=csv`;
      }

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        return res.status(400).json({ message: `Nem sikerült letölteni a CSV-t: HTTP ${response.status}` });
      }
      const csvData = await response.text();

      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
      });

      const flashcardsToInsert = records.map((record: any) => {
        const keys = Object.keys(record);
        const front = record.Front || record.front || record.Question || record.question || record[keys[0]];
        const back = record.Back || record.back || record.Answer || record.answer || record[keys[1]];
        return {
          moduleId,
          front: String(front || '').trim(),
          back: String(back || '').trim(),
        };
      }).filter((f: any) => f.front && f.back);

      if (flashcardsToInsert.length === 0) {
        return res.status(400).json({ message: 'A CSV nem tartalmaz érvényes tanulókártyákat (Front/Back fejléc szükséges).' });
      }

      const inserted = await storage.bulkCreateFlashcards(flashcardsToInsert);
      res.status(201).json({
        message: `${inserted.length} tanulókártya sikeresen importálva`,
        count: inserted.length
      });
    } catch (error) {
      console.error("Error importing flashcards from URL:", error);
      res.status(500).json({ message: "Importálás sikertelen: " + (error as Error).message });
    }
  });


  app.post('/api/modules', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleData = insertModuleSchema.parse(req.body);
      if (user.role !== 'admin') {
        (moduleData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }



      const module = await storage.createModule(moduleData);
      res.json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  app.patch('/api/modules/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleId = parseInt(req.params.id);

      console.log('PATCH /api/modules/:id - Raw request body:', JSON.stringify(req.body, null, 2));

      const moduleData = insertModuleSchema.partial().parse(req.body);
      if (user.role !== 'admin') {
        (moduleData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }




      console.log(`Admin ${userId} updating module ${moduleId}:`, {
        title: moduleData.title,
        content: moduleData.content ? `${moduleData.content.substring(0, 100)}...` : 'NO CONTENT',
        contentLength: moduleData.content?.length || 0,
        conciseContent: moduleData.conciseContent ? `${moduleData.conciseContent.substring(0, 50)}...` : 'NO CONCISE',
        detailedContent: moduleData.detailedContent ? `${moduleData.detailedContent.substring(0, 50)}...` : 'NO DETAILED',
        keyConceptsData: moduleData.keyConceptsData ? `${Array.isArray(moduleData.keyConceptsData) ? moduleData.keyConceptsData.length : 0} concepts` : 'NO KEY CONCEPTS',
        isPublished: moduleData.isPublished,
        allFields: Object.keys(moduleData)
      });

      // Get original module before update for comparison
      const originalModule = await storage.getModule(moduleId);
      console.log('Original module content length:', originalModule?.content?.length || 0);

      const module = await storage.updateModule(moduleId, moduleData);

      console.log(`Module ${moduleId} successfully updated. New content length:`, module?.content?.length || 0);
      console.log('Updated module title:', module.title);

      res.json(module);
    } catch (error) {
      console.error("Error updating module:", error);
      res.status(500).json({ message: "Failed to update module" });
    }
  });

  // AI Regenerate Module Content
  app.post('/api/modules/:id/ai-regenerate', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      // Only allow teachers and admins to regenerate content
      if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const module = await storage.getModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      const { title, content } = req.body;
      const baseContent = content || module.content;
      const moduleTitle = title || module.title;

      console.log(`Regenerating AI content for module ${moduleId}: "${moduleTitle}"`);

      // Get subject context if available
      let subjectContext = '';
      let subjectName = '';
      let professionName = '';

      if (module.subjectId) {
        const subject = await storage.getSubject(module.subjectId);
        if (subject) {
          subjectName = subject.name;
          subjectContext = `Tantárgy: ${subject.name}`;

          if (subject.professionId) {
            const professions = await storage.getProfessions();
            const profession = professions.find(p => p.id === subject.professionId);
            if (profession) {
              professionName = profession.name;
              subjectContext += `, Szakma: ${profession.name}`;
            }
          }
        }
      }

      // Generate enhanced content with Mermaid diagrams
      const enhancedContent = await enhancedModuleGenerator.generateEnhancedModule(
        moduleTitle,
        baseContent,
        subjectContext,
        undefined, // customSystemMessage
        subjectName,
        professionName
      );

      // Update the module with new content
      const updatedModule = await storage.updateModule(moduleId, {
        conciseContent: enhancedContent.conciseVersion,
        detailedContent: enhancedContent.detailedVersion,
        keyConceptsData: enhancedContent.keyConceptsWithVideos,
        generatedQuizzes: enhancedContent.generatedQuizzes
      });

      console.log(`Module ${moduleId} successfully regenerated with visual aids.`);
      res.json(updatedModule);

    } catch (error) {
      console.error("Error regenerating module:", error);
      res.status(500).json({ message: "Failed to regenerate module content" });
    }
  });

  app.delete('/api/modules/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleId = parseInt(req.params.id);
      await storage.deleteModule(moduleId);
      res.json({ message: "Module deleted successfully" });
    } catch (error) {
      console.error("Error deleting module:", error);
      res.status(500).json({ message: "Failed to delete module" });
    }
  });

  // Profession routes
  app.get('/api/professions', combinedAuth, async (req: any, res) => {
    try {
      const professions = await storage.getProfessions();
      res.json(professions);
    } catch (error) {
      console.error("Error fetching professions:", error);
      res.status(500).json({ message: "Failed to fetch professions" });
    }
  });

  // Subject routes
  app.get('/api/subjects', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // For admin and teacher users, use professionId from query params or get all subjects
      // For regular users, use their selected profession
      const professionId = (user.role === 'admin' || user.role === 'teacher')
        ? (req.query.professionId ? parseInt(req.query.professionId) : undefined)
        : user.selectedProfessionId;

      const subjects = (user.role === 'admin' || user.role === 'teacher')
        ? await storage.getSubjects(professionId ?? undefined)
        : (professionId ? await storage.getSubjects(professionId) : []);

      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.get('/api/subjects/:id', customAuth, async (req: any, res) => {
    try {
      const subjectId = parseInt(req.params.id);
      const subject = await storage.getSubject(subjectId);

      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      res.json(subject);
    } catch (error) {
      console.error("Error fetching subject:", error);
      res.status(500).json({ message: "Failed to fetch subject" });
    }
  });

  // User profession update
  app.put('/api/user/profession', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      // Get user ID from either Replit auth or local auth
      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { professionId } = req.body;
      await storage.updateUserProfession(userId, professionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user profession:", error);
      res.status(500).json({ message: "Failed to update user profession" });
    }
  });

  // Progress tracking
  app.post('/api/modules/:id/complete', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const moduleId = parseInt(req.params.id);

      console.log('Module completion started:', { userId, moduleId });

      const user = await storage.getUser(userId);
      if (!user) {
        console.log('User not found:', userId);
        return res.status(404).json({ message: "User not found" });
      }

      console.log('User before completion:', {
        userId: user.id,
        completedModules: user.completedModules
      });

      const completedModules = user.completedModules || [];
      if (!completedModules.includes(moduleId)) {
        completedModules.push(moduleId);
        console.log('Updating completed modules:', { userId, newCompletedModules: completedModules });
        await storage.updateUserCompletedModules(userId, completedModules);

        // CRITICAL FIX: Update session data for local auth users
        if (req.user.id && !req.user.claims) {
          // This is a local auth user, update session
          const updatedUser = await storage.getUser(userId);
          if (updatedUser) {
            req.user.completedModules = updatedUser.completedModules;
            console.log('Session updated with fresh completed modules:', req.user.completedModules);
          }
        }

        // Verify the update worked
        const updatedUser = await storage.getUser(userId);
        console.log('User after completion:', {
          userId: updatedUser?.id,
          completedModules: updatedUser?.completedModules
        });
      } else {
        console.log('Module already completed:', { userId, moduleId, completedModules });
      }

      invalidateSitemapCache(); // Frissítés a haladás változásakor
      res.json({ message: "Module completed successfully" });
    } catch (error) {
      console.error("Error completing module:", error);
      res.status(500).json({ message: "Failed to complete module" });
    }
  });

  // Cache for sitemap to avoid repeated database queries
  let sitemapCache: any = null;
  let sitemapCacheTime: number = 0;
  const SITEMAP_CACHE_DURATION = 30000; // 30 seconds cache

  // Generate website sitemap for ChatGPT context with real-time updates
  const generateSitemap = async (userId: string, forceRefresh: boolean = false) => {
    try {
      const now = Date.now();

      // Return cached sitemap if still valid and not forcing refresh
      if (!forceRefresh && sitemapCache && (now - sitemapCacheTime) < SITEMAP_CACHE_DURATION) {
        return sitemapCache;
      }

      const user = await storage.getUser(userId);
      const professions = await storage.getProfessions();
      const subjects = await storage.getSubjects();
      const modules = await storage.getModules();

      // Get user's completed modules for better context
      const completedModules = user?.completedModules || [];
      const totalModules = modules.length;
      const completionPercentage = totalModules > 0 ? Math.round((completedModules.length / totalModules) * 100) : 0;

      const sitemap = {
        website: "Global Learning System - AI Oktatási Platform",
        user_role: user?.role || 'student',
        user_progress: {
          completed_modules: completedModules,
          total_modules: totalModules,
          completion_percentage: completionPercentage,
          current_profession: (user?.assignedProfessionIds && user.assignedProfessionIds.length > 0) ?
            professions.find(p => p.id === (user.assignedProfessionIds || [])[0])?.name : 'Nincs kiválasztva'
        },
        main_sections: [
          {
            name: "Főoldal",
            url: "/",
            description: "Dashboard és áttekintés"
          },
          {
            name: "Szakmák",
            url: "/tananyagok",
            description: "Elérhető szakmák listája",
            subsections: professions.map(prof => ({
              name: prof.name,
              id: prof.id,
              description: prof.description,
              is_assigned: (user?.assignedProfessionIds && user.assignedProfessionIds.includes(prof.id)) || false
            }))
          },
          {
            name: "Közösségi Tanulás",
            url: "/community",
            description: "Csoportos tanulás és megbeszélések"
          },
          {
            name: "Haladásom",
            url: "/progress",
            description: "Tanulási előrehaladás követése"
          },
          {
            name: "Beállítások",
            url: "/settings",
            description: "Felhasználói beállítások"
          }
        ],
        available_modules: modules.map(module => ({
          id: module.id,
          title: module.title,
          url: `/modules/${module.id}`,
          subject_id: module.subjectId,
          subject_name: subjects.find(s => s.id === module.subjectId)?.name,
          profession_name: subjects.find(s => s.id === module.subjectId) ?
            professions.find(p => p.id === subjects.find(s => s.id === module.subjectId)?.professionId)?.name : null,
          is_completed: completedModules.includes(module.id),
          is_accessible: true // All modules are accessible in this system
        })),
        available_subjects: subjects.map((subject: any) => ({
          id: subject.id,
          name: subject.name,
          profession_id: subject.professionId,
          profession_name: professions.find((p: any) => p.id === subject.professionId)?.name
        })),
        navigation_help: {
          voice_commands: [
            "Menj a főoldalra",
            "Nyisd meg a [modul neve] modult",
            "Mutasd a haladásomat",
            "Keress [kifejezés] modulokban",
            "Menj a közösségi oldalra",
            "Milyen modulok vannak?",
            "Hol tartok a tanulásban?"
          ],
          features: [
            "Sidebar keresőmező - modulok tartalmában keres",
            "AI chat asszisztens minden oldalon",
            "Hangos navigáció (Szabolcs)",
            "Modulok progresszív feloldása",
            "Mermaid diagramok automatikus renderelése",
            "Valós idejű haladáskövetés"
          ]
        },
        last_updated: new Date().toISOString()
      };

      // Update cache
      sitemapCache = sitemap;
      sitemapCacheTime = now;

      return sitemap;
    } catch (error) {
      console.error("Error generating sitemap:", error);
      return sitemapCache || null; // Return cached version if available
    }
  };

  // Invalidate sitemap cache when data changes
  const invalidateSitemapCache = () => {
    sitemapCache = null;
    sitemapCacheTime = 0;
    console.log('Sitemap cache invalidated - will regenerate on next request');
  };

  // Class Announcement routes
  app.post('/api/announcements', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'school_admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const announcementData = insertClassAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement({
        ...announcementData,
        teacherId: userId
      });

      res.status(201).json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.get('/api/classes/:classId/announcements', combinedAuth, async (req: any, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const announcements = await storage.getAnnouncementsByClass(classId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching class announcements:", error);
      res.status(500).json({ message: "Failed to fetch class announcements" });
    }
  });

  app.get('/api/announcements/my', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'student' && user.role !== 'teacher') || !user.classId) {
        return res.json([]);
      }

      const announcements = await storage.getUnacknowledgedAnnouncements(userId, user.classId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching my announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post('/api/announcements/:id/acknowledge', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
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

  app.get('/api/announcements/:id/stats', combinedAuth, async (req: any, res) => {
    try {
      const announcementId = parseInt(req.params.id);
      const stats = await storage.getAnnouncementStats(announcementId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching announcement stats:", error);
      res.status(500).json({ message: "Failed to fetch announcement statistics" });
    }
  });

  app.delete('/api/announcements/:id', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteAnnouncement(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Test sitemap generation endpoint with cache status
  app.get('/api/sitemap/test', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const forceRefresh = req.query.refresh === 'true';
      const sitemap = await generateSitemap(userId, forceRefresh);

      res.json({
        sitemap,
        cache_info: {
          has_cache: !!sitemapCache,
          cache_age_seconds: sitemapCache ? Math.floor((Date.now() - sitemapCacheTime) / 1000) : 0,
          force_refreshed: forceRefresh
        }
      });
    } catch (error) {
      console.error("Error generating test sitemap:", error);
      res.status(500).json({ message: "Failed to generate sitemap" });
    }
  });

  // Voice chat endpoint for intelligent responses
  app.post('/api/chat/voice', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { message, context } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Check if AI chat is enabled
      const chatEnabledSetting = await storage.getSystemSetting('ai_chat_enabled');
      const isChatEnabled = chatEnabledSetting ? chatEnabledSetting.value === 'true' : true;

      // Allow admins to bypass this check
      const user = await storage.getUser(userId);
      if (!isChatEnabled && user?.role !== 'admin') {
        return res.status(403).json({ message: "Az AI chat funkció jelenleg ki van kapcsolva." });
      }

      // Generate sitemap for better navigation context
      const sitemap = await generateSitemap(userId);
      console.log('Voice chat - Sitemap generated:', sitemap ? 'SUCCESS' : 'FAILED');
      console.log('Voice chat - User message:', message);

      // Enhanced system message with sitemap context
      const systemMessage = `Szabolcs vagyok, a magyar hangnavigációs asszisztensed. Segítek neked a platform használatában és navigációban.

WEBOLDAL TÉRKÉP ÉS KONTEXTUS:
${JSON.stringify(sitemap, null, 2)}

Képességeim:
- Navigációs segítség minden oldalra
- Modulok keresése és megnyitása
- Tanulási út tervezése
- Platform funkcióinak magyarázata
- Specifikus modulokra és témákra való irányítás

FONTOS: Használd a fenti weboldal térképet a navigációs kérések megválaszolásához. Konkrét URL-eket és funkciókat említs meg a válaszaidban.`;

      console.log('Voice chat - System message length:', systemMessage.length);

      const response = await generateChatResponse(message, systemMessage, []);

      res.json({ message: response.message });
    } catch (error) {
      console.error("Voice chat error:", error);
      res.status(500).json({ message: "Hiba történt a válasz generálása során" });
    }
  });

  // Chat routes
  app.get('/api/chat/messages', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      // Get user ID from either Replit auth or local auth
      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const moduleId = req.query.moduleId ? parseInt(req.query.moduleId as string) : undefined;

      const allMessages = await storage.getChatMessages(userId, moduleId);
      // Szűrjük ki a rendszer üzeneteket, csak a felhasználói üzeneteket és AI válaszokat jelenítjük meg
      const visibleMessages = allMessages.filter(msg => !msg.isSystemMessage);



      // Disable caching to ensure fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');

      res.json(visibleMessages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  // Streaming chat endpoint with immediate audio
  app.post('/api/chat/message/stream', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { isSystemMessage, ...messageBody } = req.body;
      const messageData = insertChatMessageSchema.parse({
        ...messageBody,
        userId,
        senderRole: 'user',
        isSystemMessage: isSystemMessage || false,
      });

      const isVoiceRequest = messageData.message.includes('Hangos magyarázat kérése');

      // Check if AI chat is enabled
      const chatEnabledSetting = await storage.getSystemSetting('ai_chat_enabled');
      const isChatEnabled = chatEnabledSetting ? chatEnabledSetting.value === 'true' : true;

      // Allow admins to bypass this check
      const user = await storage.getUser(userId);
      if (!isChatEnabled && user?.role !== 'admin') {
        // Send error as SSE event because the connection is already established/expected to be SSE
        // However, we haven't sent headers yet, so we can return JSON error if we do it before writeHead
        // Logic below sends headers at line 2418. So we must do this BEFORE line 2418.
        return res.status(403).json({ message: "Az AI chat funkció jelenleg ki van kapcsolva." });
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Save user message first
      const userMessage = await storage.createChatMessage(messageData);
      res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`);

      // Get module content and chat history
      let moduleContent = undefined;
      if (messageData.relatedModuleId) {
        const module = await storage.getModule(messageData.relatedModuleId);
        moduleContent = module?.content;
      }

      const recentMessages = await storage.getChatMessages(userId, messageData.relatedModuleId || undefined);
      const chatHistory = recentMessages.slice(-3).map(msg => ({
        role: msg.senderRole === 'user' ? 'user' : 'assistant',
        content: msg.message,
      }));

      // Load custom prompts from admin settings
      const [audioPromptSetting, textPromptSetting] = await Promise.all([
        storage.getSystemSetting('audio-explanation-prompt'),
        storage.getSystemSetting('text-explanation-prompt')
      ]);

      // Determine which prompt to use based on request type
      let customPrompt = null;
      let moduleTitle = '';
      if (messageData.relatedModuleId) {
        const module = await storage.getModule(messageData.relatedModuleId);
        moduleTitle = module?.title || '';
      }

      if (isVoiceRequest && audioPromptSetting?.value) {
        // Use audio explanation prompt for voice requests
        customPrompt = audioPromptSetting.value
          .replace('{question}', messageData.message)
          .replace('{title}', moduleTitle || 'Tananyag')
          .replace('{content}', (moduleContent || '').substring(0, 800));
        console.log('🎵 Using custom audio explanation prompt for voice request (regular streaming)');
      } else if (!isVoiceRequest && textPromptSetting?.value) {
        // Use text explanation prompt for text requests
        customPrompt = textPromptSetting.value
          .replace('{question}', messageData.message)
          .replace('{title}', moduleTitle || 'Tananyag')
          .replace('{content}', (moduleContent || '').substring(0, 800));
        console.log('📝 Using custom text explanation prompt for text request (regular streaming)');
      }

      // Generate sitemap for enhanced context
      const sitemap = await generateSitemap(userId);

      // Enhanced module content with sitemap context for navigation
      const enhancedContent = `${moduleContent || ''}

WEBOLDAL NAVIGÁCIÓS TÉRKÉP:
${JSON.stringify(sitemap, null, 2)}

Platform funkciók és navigáció:
- Sidebar keresőmező minden oldalon - modulok tartalmában keres
- Hangos navigáció Szabolcs asszisztenssel
- Progresszív modul feloldás rendszer
- Mermaid diagramok automatikus renderelése
- AI chat minden oldalon elérhető`;

      // Generate streaming AI response
      const openaiModule = await import('./openai');
      let fullResponse = '';

      await openaiModule.generateStreamingChatResponse(
        messageData.message,
        enhancedContent,
        chatHistory,
        (chunk: string) => {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ type: 'ai_chunk', data: chunk })}\n\n`);
        },
        customPrompt
      );

      // Record API cost for text generation
      const textTokens = Math.ceil(fullResponse.length / 4); // Approximate token count
      const textCost = textTokens * 0.00015; // GPT-4o-mini pricing
      await storage.recordSimpleApiCall('OpenAI', 'Chat', textCost);

      // Generate audio AFTER streaming is complete for voice requests
      if (isVoiceRequest && fullResponse) {
        try {
          console.log('Generating audio for voice request, text length:', fullResponse.length);
          const finalAudio = await openaiModule.generateSpeech(fullResponse);
          console.log('Audio generated successfully, size:', finalAudio.length);

          // Record API cost for audio generation
          const audioCharacters = fullResponse.length;
          const audioCost = audioCharacters * 0.000015; // TTS pricing per character
          await storage.recordSimpleApiCall('OpenAI', 'TTS', audioCost);

          const audioBase64 = finalAudio.toString('base64');
          console.log('Audio base64 length:', audioBase64.length);

          const audioEvent = JSON.stringify({
            type: 'final_audio',
            data: audioBase64,
            length: finalAudio.length
          });

          console.log('Sending final_audio event, payload size:', audioEvent.length);
          res.write(`data: ${audioEvent}\n\n`);
        } catch (error) {
          console.error('Final audio generation error:', error);
          res.write(`data: ${JSON.stringify({
            type: 'audio_error',
            message: 'Audio generation failed'
          })}\n\n`);
        }
      }

      // Save complete AI response
      const aiMessage = await storage.createChatMessage({
        message: fullResponse,
        userId,
        senderRole: 'ai',
        relatedModuleId: messageData.relatedModuleId,
        isSystemMessage: false,
      });

      res.write(`data: ${JSON.stringify({ type: 'ai_complete', data: aiMessage })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();

    } catch (error) {
      console.error("Error in streaming chat:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
      res.end();
    }
  });

  // NEW: True SSE streaming endpoint with immediate sentence-based chunking
  app.post('/api/chat/message/stream-sse', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { isSystemMessage, ...messageBody } = req.body;
      const messageData = insertChatMessageSchema.parse({
        ...messageBody,
        userId,
        senderRole: 'user',
        isSystemMessage: isSystemMessage || false,
      });

      const isVoiceRequest = messageData.message.includes('Hangos magyarázat kérése');
      console.log('🚀 SSE Stream request - Voice:', isVoiceRequest, 'ModuleId:', messageData.relatedModuleId);

      // Set up true SSE headers with anti-buffering
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      res.flushHeaders();

      // Save user message first
      const userMessage = await storage.createChatMessage(messageData);
      res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`);

      // Get module content and chat history
      let moduleContent = undefined;
      if (messageData.relatedModuleId) {
        const module = await storage.getModule(messageData.relatedModuleId);
        moduleContent = module?.content;
      }

      const recentMessages = await storage.getChatMessages(userId, messageData.relatedModuleId || undefined);
      const chatHistory = recentMessages.slice(-3).map(msg => ({
        role: msg.senderRole === 'user' ? 'user' : 'assistant',
        content: msg.message,
      }));

      // Load custom prompts
      const [audioPromptSetting, textPromptSetting] = await Promise.all([
        storage.getSystemSetting('audio-explanation-prompt'),
        storage.getSystemSetting('text-explanation-prompt')
      ]);

      let customPrompt = null;
      let moduleTitle = '';
      if (messageData.relatedModuleId) {
        const module = await storage.getModule(messageData.relatedModuleId);
        moduleTitle = module?.title || '';
      }

      if (isVoiceRequest && audioPromptSetting?.value) {
        customPrompt = `RÖVID, BESZÉLGETŐS VÁLASZ (maximum 2-3 mondat):
        
${audioPromptSetting.value
            .replace('{question}', messageData.message)
            .replace('{title}', moduleTitle || 'Tananyag')
            .replace('{content}', (moduleContent || '').substring(0, 800))}

FONTOS: Adj rövid, természetes választ. Mintha barátságos tanárként beszélgetnél. Maximum 50-60 szó.`;
      } else if (!isVoiceRequest && textPromptSetting?.value) {
        customPrompt = textPromptSetting.value
          .replace('{question}', messageData.message)
          .replace('{title}', moduleTitle || 'Tananyag')
          .replace('{content}', (moduleContent || '').substring(0, 800));
      }

      // Generate sitemap for enhanced context
      const sitemap = await generateSitemap(userId);
      const enhancedContent = `${moduleContent || ''}

WEBOLDAL NAVIGÁCIÓS TÉRKÉP:
${JSON.stringify(sitemap, null, 2)}

Platform funkciók és navigáció:
- Sidebar keresőmező minden oldalon - modulok tartalmában keres
- Hangos navigáció Szabolcs asszisztenssel
- Progresszív modul feloldás rendszer
- Mermaid diagramok automatikus renderelése
- AI chat minden oldalon elérhető`;

      // Generate TRUE streaming AI response
      const openaiModule = await import('./openai');
      let fullResponse = '';
      let accumulatedSentence = '';
      const audioQueue: Array<{ text: string, timestamp: number }> = [];
      let audioProcessing = false;

      // Process audio queue asynchronously
      const processAudioQueue = async () => {
        if (audioProcessing || audioQueue.length === 0) return;
        audioProcessing = true;

        const item = audioQueue.shift();
        if (item && isVoiceRequest) {
          try {
            // Use OpenAI directly for TTS generation
            const openaiModule = await import('./openai');
            const audioBuffer = await openaiModule.generateSpeech(item.text);
            const audioBase64 = audioBuffer.toString('base64');
            res.write(`data: ${JSON.stringify({
              type: 'audio_chunk',
              data: audioBase64,
              timestamp: item.timestamp,
              text: item.text,
              length: audioBuffer.length
            })}\n\n`);
          } catch (error) {
            console.error('TTS error:', error);
          }
        }

        audioProcessing = false;
        // Process next item if available
        if (audioQueue.length > 0) {
          setTimeout(processAudioQueue, 50);
        }
      };

      // TRUE streaming text and audio generation
      await openaiModule.generateStreamingChatResponse(
        customPrompt || messageData.message,
        enhancedContent,
        chatHistory,
        (chunk: string, timestamp?: number) => {
          fullResponse += chunk;
          accumulatedSentence += chunk;

          // Send text chunk immediately
          res.write(`data: ${JSON.stringify({
            type: 'text_chunk',
            data: chunk,
            timestamp: timestamp || Date.now()
          })}\n\n`);

          // Hungarian-optimized sentence boundary detection for natural TTS
          const sentenceBoundaryRegex = /([.!?])\s*(?=[A-Z\n#\-\*]|$)/g;
          const sentences = [];
          let lastIndex = 0;

          let match;
          while ((match = sentenceBoundaryRegex.exec(accumulatedSentence)) !== null) {
            const sentence = accumulatedSentence.slice(lastIndex, match.index + match[1].length).trim();
            if (sentence.length > 15) { // Longer minimum for better Hungarian pronunciation
              sentences.push(sentence);
            }
            lastIndex = match.index + match[0].length;
          }

          // Process complete sentences for TTS
          for (const sentence of sentences) {
            audioQueue.push({
              text: sentence,
              timestamp: timestamp || Date.now()
            });
            // Start processing immediately
            if (!audioProcessing) {
              processAudioQueue();
            }
          }

          // Keep remaining text for next chunk
          if (sentences.length > 0) {
            accumulatedSentence = accumulatedSentence.slice(lastIndex).trim();
          }
        },
        customPrompt
      );

      // Process any remaining sentence
      if (accumulatedSentence.trim().length > 10 && isVoiceRequest) {
        audioQueue.push({
          text: accumulatedSentence.trim(),
          timestamp: Date.now()
        });
        processAudioQueue();
      }

      // Wait for all audio to finish processing
      while (audioQueue.length > 0 || audioProcessing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Record costs
      const textTokens = Math.ceil(fullResponse.length / 4);
      const textCost = textTokens * 0.00015;
      await storage.recordSimpleApiCall('OpenAI', 'Chat', textCost);

      if (isVoiceRequest) {
        const audioCost = fullResponse.length * 0.000015;
        await storage.recordSimpleApiCall('OpenAI', 'TTS', audioCost);
      }

      // Save complete AI response
      const aiMessage = await storage.createChatMessage({
        message: fullResponse,
        userId,
        senderRole: 'ai',
        relatedModuleId: messageData.relatedModuleId,
        isSystemMessage: false,
      });

      res.write(`data: ${JSON.stringify({ type: 'ai_complete', data: aiMessage })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();

    } catch (error) {
      console.error("Error in SSE streaming chat:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
      res.end();
    }
  });

  // Synchronized streaming endpoint with timestamped text and audio chunks (LEGACY)
  app.post('/api/chat/message/synchronized-stream', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { isSystemMessage, ...messageBody } = req.body;
      const messageData = insertChatMessageSchema.parse({
        ...messageBody,
        userId,
        senderRole: 'user',
        isSystemMessage: isSystemMessage || false,
      });

      const isVoiceRequest = messageData.message.includes('Hangos magyarázat kérése') || true; // Always treat as voice request for synchronized stream

      // Check if AI chat is enabled
      const chatEnabledSetting = await storage.getSystemSetting('ai_chat_enabled');
      const isChatEnabled = chatEnabledSetting ? chatEnabledSetting.value === 'true' : true;

      // Allow admins to bypass this check
      const user = await storage.getUser(userId);
      if (!isChatEnabled && user?.role !== 'admin') {
        // Send error as SSE event because the connection is already established
        // But again, we haven't sent headers yet, so return JSON error
        return res.status(403).json({ message: "Az AI chat funkció jelenleg ki van kapcsolva." });
      }

      console.log('🔍 Synchronized request - Voice:', isVoiceRequest, 'ModuleId:', messageData.relatedModuleId, 'Message:', messageData.message.substring(0, 100));

      // Set up Server-Sent Events with immediate header flush
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // CRITICAL: Flush headers immediately to start streaming
      res.flushHeaders();

      // Save user message first
      const userMessage = await storage.createChatMessage(messageData);
      res.write(`data: ${JSON.stringify({ type: 'user_message', data: userMessage })}\n\n`);

      // Get module content and chat history
      let moduleContent = undefined;
      if (messageData.relatedModuleId) {
        const module = await storage.getModule(messageData.relatedModuleId);
        moduleContent = module?.content;
      }

      const recentMessages = await storage.getChatMessages(userId, messageData.relatedModuleId || undefined);
      const chatHistory = recentMessages.slice(-3).map(msg => ({
        role: msg.senderRole === 'user' ? 'user' : 'assistant',
        content: msg.message,
      }));

      // Load custom prompts from admin settings
      const [audioPromptSetting, textPromptSetting] = await Promise.all([
        storage.getSystemSetting('audio-explanation-prompt'),
        storage.getSystemSetting('text-explanation-prompt')
      ]);

      // Determine which prompt to use based on request type
      let customPrompt = null;
      let moduleTitle = '';
      if (messageData.relatedModuleId) {
        const module = await storage.getModule(messageData.relatedModuleId);
        moduleTitle = module?.title || '';
      }

      if (isVoiceRequest && audioPromptSetting?.value) {
        // Use audio explanation prompt for voice requests
        customPrompt = audioPromptSetting.value
          .replace('{question}', messageData.message)
          .replace('{title}', moduleTitle || 'Tananyag')
          .replace('{content}', (moduleContent || '').substring(0, 800));
        console.log('🎵 Using custom audio explanation prompt for voice request');
        console.log('🎵 Custom prompt created:', customPrompt.substring(0, 200) + '...');
      } else if (!isVoiceRequest && textPromptSetting?.value) {
        // Use text explanation prompt for text requests
        customPrompt = textPromptSetting.value
          .replace('{question}', messageData.message)
          .replace('{title}', moduleTitle || 'Tananyag')
          .replace('{content}', (moduleContent || '').substring(0, 800));
        console.log('📝 Using custom text explanation prompt for text request');
      }

      // Generate sitemap for enhanced context
      const sitemap = await generateSitemap(userId);

      // Enhanced module content with sitemap context for navigation
      const enhancedContent = `${moduleContent || ''}

WEBOLDAL NAVIGÁCIÓS TÉRKÉP:
${JSON.stringify(sitemap, null, 2)}

Platform funkciók és navigáció:
- Sidebar keresőmező minden oldalon - modulok tartalmában keres
- Hangos navigáció Szabolcs asszisztenssel
- Progresszív modul feloldás rendszer
- Mermaid diagramok automatikus renderelése
- AI chat minden oldalon elérhető`;

      // Generate synchronized streaming AI response
      const openaiModule = await import('./openai');
      let fullResponse = '';

      if (isVoiceRequest) {
        // Debug: check what prompt gets sent to AI
        console.log('🔍 VOICE - customPrompt exists:', !!customPrompt, 'moduleId:', messageData.relatedModuleId);
        if (customPrompt) {
          console.log('🔍 VOICE - prompt preview:', customPrompt.substring(0, 200) + '...');
        }

        // Use synchronized streaming for voice requests with custom prompt
        await openaiModule.generateSynchronizedStreamingResponse(
          customPrompt || messageData.message,
          enhancedContent,
          chatHistory,
          (chunk: string, timestamp: number) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({
              type: 'text_chunk',
              data: chunk,
              timestamp
            })}\n\n`);
          },
          (audioBuffer: Buffer, timestamp: number, textChunk: string) => {
            const audioBase64 = audioBuffer.toString('base64');
            res.write(`data: ${JSON.stringify({
              type: 'audio_chunk',
              data: audioBase64,
              timestamp,
              text: textChunk,
              length: audioBuffer.length
            })}\n\n`);
          },
          customPrompt
        );
      } else {
        // Use regular streaming for text-only requests with custom prompt
        await openaiModule.generateStreamingChatResponse(
          messageData.message,
          moduleContent,
          chatHistory,
          (chunk: string, timestamp?: number) => {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({
              type: 'text_chunk',
              data: chunk,
              timestamp: timestamp || 0
            })}\n\n`);
          },
          customPrompt
        );
      }

      // Record API cost for text generation
      const textTokens = Math.ceil(fullResponse.length / 4); // Approximate token count
      const textCost = textTokens * 0.00015; // GPT-4o-mini pricing
      await storage.recordSimpleApiCall('OpenAI', 'Chat', textCost);

      // Record additional cost for audio if it was a voice request
      if (isVoiceRequest) {
        const audioCharacters = fullResponse.length;
        const audioCost = audioCharacters * 0.000015; // TTS pricing per character
        await storage.recordSimpleApiCall('OpenAI', 'TTS', audioCost);
      }

      // Save complete AI response
      const aiMessage = await storage.createChatMessage({
        message: fullResponse,
        userId,
        senderRole: 'ai',
        relatedModuleId: messageData.relatedModuleId,
        isSystemMessage: false,
      });

      res.write(`data: ${JSON.stringify({ type: 'ai_complete', data: aiMessage })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();

    } catch (error) {
      console.error("Error in synchronized streaming chat:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate response' })}\n\n`);
      res.end();
    }
  });

  // Simple chat endpoint for testing
  app.post('/api/chat', combinedAuth, async (req: any, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const { generateChatResponse } = await import('./openai');
      const response = await generateChatResponse(message, 'chat');

      res.json(response);
    } catch (error) {
      console.error("Error in simple chat:", error);
      res.status(500).json({ message: "Failed to generate response" });
    }
  });

  app.post('/api/chat/message', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      // Get user ID from either Replit auth or local auth
      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { isSystemMessage, ...messageBody } = req.body;
      const messageData = insertChatMessageSchema.parse({
        ...messageBody,
        userId,
        senderRole: 'user',
        isSystemMessage: isSystemMessage || false,
      });

      // Save user message first
      const userMessage = await storage.createChatMessage(messageData);

      // Get module content if related to a specific module
      let moduleContent = undefined;
      if (messageData.relatedModuleId) {
        const module = await storage.getModule(messageData.relatedModuleId);
        moduleContent = module?.content;
      }

      // Generate sitemap for enhanced context
      const sitemap = await generateSitemap(userId);

      // Enhanced module content with sitemap context for navigation
      const enhancedContent = `${moduleContent || ''}

WEBOLDAL NAVIGÁCIÓS TÉRKÉP:
${JSON.stringify(sitemap, null, 2)}

Platform funkciók és navigáció:
- Sidebar keresőmező minden oldalon - modulok tartalmában keres
- Hangos navigáció Szabolcs asszisztenssel
- Progresszív modul feloldás rendszer
- Mermaid diagramok automatikus renderelése
- AI chat minden oldalon elérhető`;

      // Get recent chat history for better context
      const recentMessages = await storage.getChatMessages(userId, messageData.relatedModuleId || undefined);
      const chatHistory = recentMessages.slice(-3).map(msg => ({
        role: msg.senderRole === 'user' ? 'user' : 'assistant',
        content: msg.message,
      }));

      // Generate AI response
      const aiResponse = await generateChatResponse(
        messageData.message,
        enhancedContent,
        chatHistory
      );

      // Save AI response
      const aiMessage = await storage.createChatMessage({
        message: aiResponse.message,
        senderRole: 'ai',
        userId,
        relatedModuleId: messageData.relatedModuleId,
      });

      res.json({
        userMessage,
        aiMessage,
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Delete chat messages
  app.delete('/api/chat/messages', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      // Get user ID from either Replit auth or local auth
      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { moduleId } = req.query;

      await storage.deleteChatMessages(userId, moduleId ? parseInt(moduleId) : undefined);

      // Disable caching for this response to ensure fresh data on next fetch
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');

      res.json({ success: true, timestamp: Date.now() });
    } catch (error) {
      console.error("Error deleting chat messages:", error);
      res.status(500).json({ message: "Failed to delete chat messages" });
    }
  });

  // Audio generation endpoint
  app.post('/api/chat/audio', combinedAuth, async (req: any, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      // Generate speech from text
      const audioBuffer = await generateSpeech(text);

      // Set appropriate headers for audio response
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-cache'
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating audio:", error);
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });

  // Audio transcription endpoint
  app.post('/api/chat/transcribe', combinedAuth, upload.single('audio'), async (req: any, res) => {
    try {
      console.log('🔍 TRANSCRIBE - Audio file received, size:', req.file?.size);
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      // Read the file from disk since we're using diskStorage
      const audioBuffer = fs.readFileSync(req.file.path);

      const { transcribeAudio } = await import('./openai');
      const transcription = await transcribeAudio(audioBuffer, req.file.originalname);

      // Clean up the temporary file
      fs.unlinkSync(req.file.path);

      res.json({ text: transcription });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  // Direct TTS endpoint for welcome messages (no AI needed)
  app.post('/api/chat/tts-direct', combinedAuth, async (req: any, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }

      console.log('🔊 TTS-Direct - Generating audio for:', text);

      const { generateSpeech } = await import('./openai');
      const audioBuffer = await generateSpeech(text);

      // Record API cost for TTS
      const ttsCost = text.length * 0.000015; // OpenAI TTS pricing
      await storage.recordSimpleApiCall('OpenAI', 'TTS-Direct', ttsCost);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating direct TTS audio:", error);
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });

  app.post('/api/modules/:id/quiz-result', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const userId = req.user.claims?.sub || req.user.id;
      const { score, maxScore, passed, details } = req.body;

      if (score === undefined || maxScore === undefined || passed === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // 1. Create test result record
      const result = await storage.createTestResult({
        userId,
        moduleId,
        score,
        maxScore,
        passed,
        details: details || {},
        createdAt: new Date()
      });

      // 2. If passed, update user's completed modules
      if (passed) {
        const user = await storage.getUser(userId);
        if (user) {
          const completedModules = user.completedModules || [];
          if (!completedModules.includes(moduleId)) {
            await storage.updateUserCompletedModules(userId, [...completedModules, moduleId]);
          }
        }
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Error saving quiz result:", error);
      res.status(500).json({ message: "Failed to save quiz result" });
    }
  });

  app.post('/api/modules/:id/quiz', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);

      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Only serve pre-generated quizzes - NO on-the-fly API calls
      if (module.generatedQuizzes && Array.isArray(module.generatedQuizzes) && module.generatedQuizzes.length > 0) {
        console.log(`Using pre-generated quiz for module ${moduleId}. Total sets available: ${module.generatedQuizzes.length}`);

        // Randomly select one quiz set from the available sets
        const randomIndex = Math.floor(Math.random() * module.generatedQuizzes.length);
        const selectedQuizSet = module.generatedQuizzes[randomIndex];

        // Ensure the selected set is valid
        if (selectedQuizSet && Array.isArray(selectedQuizSet) && selectedQuizSet.length > 0) {
          console.log(`Selected quiz set index: ${randomIndex} with ${selectedQuizSet.length} questions`);
          return res.json({ questions: selectedQuizSet });
        }
      }

      // No pre-generated quizzes available - return error instead of making API calls
      console.log(`No pre-generated quizzes found for module ${moduleId}. Module needs regeneration.`);
      return res.status(404).json({
        message: "Ehhez a modulhoz még nem készültek tesztkérdések. Kérem az adminisztrátort, hogy generálja újra a modult a 'Varázspálca' funkcióval.",
        needsRegeneration: true
      });
    } catch (error) {
      console.error("Error serving quiz:", error);
      res.status(500).json({ message: "Failed to load quiz" });
    }
  });

  app.post('/api/quiz/evaluate', combinedAuth, async (req: any, res) => {
    try {
      const { question, correctAnswer, userAnswer, explanation } = req.body;

      if (!question || !correctAnswer || !userAnswer) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check for exact match (case-insensitive) to avoid API call
      const normalizedUser = userAnswer.trim().toLowerCase();
      const normalizedCorrect = correctAnswer.trim().toLowerCase();

      if (normalizedUser === normalizedCorrect) {
        return res.json({
          score: 100,
          feedback: "Helyes válasz! Pontosan megegyezik a megoldással.",
          isCorrect: true
        });
      }

      // Check if AI chat is enabled
      const aiChatSetting = await storage.getSystemSetting('ai_chat_enabled');
      const aiEnabled = aiChatSetting ? aiChatSetting.value === 'true' : true;

      if (!aiEnabled) {
        // If AI is disabled and it wasn't an exact match, mark as incorrect
        // This ensures quizzes still work (are usable) even without AI, just less forgiving for typos
        return res.json({
          score: 0,
          feedback: "A válasz nem egyezik meg a helyes megoldással. (AI értékelés kikapcsolva)",
          isCorrect: false
        });
      }

      const { evaluateAnswer } = await import('./openai');
      const evaluation = await evaluateAnswer(question, correctAnswer, userAnswer, explanation || '');

      // Record API cost for quiz evaluation
      const evaluationTokens = Math.ceil((question.length + correctAnswer.length + userAnswer.length + 200) / 4);
      const evaluationCost = evaluationTokens * 0.0003; // GPT-4o pricing for evaluation
      await storage.recordSimpleApiCall('OpenAI', 'Quiz-Evaluation', evaluationCost);

      res.json(evaluation);
    } catch (error) {
      console.error("Error evaluating answer:", error);
      res.status(500).json({ message: "Failed to evaluate answer" });
    }
  });

  // Quiz generation
  app.post('/api/quiz/generate', combinedAuth, async (req: any, res) => {
    try {
      const { moduleId, numQuestions = 3 } = req.body;

      const module = await storage.getModule(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      const questions = await generateQuizQuestions(module.content, numQuestions);

      // Record API cost for quiz generation
      const quizTokens = Math.ceil((module.content.length + 500) / 4); // Content + prompt tokens
      const quizCost = quizTokens * 0.00015; // GPT-4o-mini pricing
      await storage.recordSimpleApiCall('OpenAI', 'Quiz', quizCost);

      res.json(questions);
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  // File upload for modules
  app.post('/api/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // In a production environment, you would upload to a cloud storage service
      // For now, we'll just return the local file path
      const fileUrl = `/uploads/${req.file.filename}`;

      res.json({ url: fileUrl });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Admin user management routes
  app.get('/api/admin/users', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:userId/role', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { userId: targetUserId } = req.params;
      const { role } = req.body;

      await storage.updateUserRole(targetUserId, role);
      res.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // AI Settings Routes (Admin only)
  app.get('/api/ai-settings', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const settings = await storage.getAISettings();
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          maxTokens: 2000,
          temperature: "0.7",
          model: "gpt-4o-mini",
          systemMessage: null
        });
      }

      res.json(settings);
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  app.put('/api/ai-settings', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { insertAISettingsSchema } = await import('@shared/schema');
      const validatedData = insertAISettingsSchema.parse(req.body);

      const updatedSettings = await storage.updateAISettings(validatedData, userId);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating AI settings:", error);
      res.status(500).json({ message: "Failed to update AI settings" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Community Groups Routes
  app.get("/api/community-groups/leaderboard", combinedAuth, async (req: any, res) => {
    try {
      const topGroups = await storage.getCommunityLeaderboard();
      res.json(topGroups);
    } catch (error) {
      console.error("Error fetching community leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/community-groups", combinedAuth, async (req: any, res) => {
    try {
      const professionId = req.query.professionId ? parseInt(req.query.professionId) : undefined;
      const groups = await storage.getCommunityGroups(professionId);

      // Get current user ID for isMember check
      const userId = req.user.claims?.sub || req.user.id || null;

      // Enrich each group with real member count and membership status
      const enrichedGroups = await Promise.all(groups.map(async (group) => {
        const members = await storage.getGroupMembers(group.id);
        return {
          ...group,
          realMemberCount: members.length,
          isMember: userId ? members.some(m => m.userId === userId) : false,
        };
      }));

      res.json(enrichedGroups);
    } catch (error) {
      console.error("Error fetching community groups:", error);
      res.status(500).json({ message: "Failed to fetch community groups" });
    }
  });

  app.post("/api/community-groups", combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const groupData = { ...req.body, createdBy: userId };
      const group = await storage.createCommunityGroup(groupData);

      // Auto-join creator as admin
      await storage.joinCommunityGroup(group.id, userId);

      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating community group:", error);
      res.status(500).json({ message: "Failed to create community group" });
    }
  });

  app.post("/api/community-groups/:id/join", combinedAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.joinCommunityGroup(groupId, userId);
      res.json({ message: "Successfully joined group" });
    } catch (error) {
      console.error("Error joining community group:", error);
      res.status(500).json({ message: "Failed to join community group" });
    }
  });

  app.delete("/api/community-groups/:id/leave", combinedAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      await storage.leaveCommunityGroup(groupId, userId);
      res.json({ message: "Successfully left group" });
    } catch (error) {
      console.error("Error leaving community group:", error);
      res.status(500).json({ message: "Failed to leave community group" });
    }
  });

  app.post("/api/community-groups/:id/leave", combinedAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.leaveCommunityGroup(groupId, userId);
      res.json({ message: "Successfully left group" });
    } catch (error) {
      console.error("Error leaving community group:", error);
      res.status(500).json({ message: "Failed to leave community group" });
    }
  });

  app.put("/api/community-groups/:id", combinedAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { insertCommunityGroupSchema } = await import('@shared/schema');
      const validatedData = insertCommunityGroupSchema.partial().parse(req.body);

      const updatedGroup = await storage.updateCommunityGroup(groupId, validatedData, userId);
      res.json(updatedGroup);
    } catch (error: any) {
      console.error("Error updating community group:", error);
      if (error.message === 'Unauthorized to update this group') {
        res.status(403).json({ message: "Csak a csoport létrehozója szerkesztheti" });
      } else {
        res.status(500).json({ message: "Failed to update community group" });
      }
    }
  });

  app.delete("/api/community-groups/:id", combinedAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.deleteCommunityGroup(groupId, userId);
      res.json({ message: "Community group deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting community group:", error);
      if (error.message === 'Unauthorized to delete this group') {
        res.status(403).json({ message: "Csak a csoport létrehozója törölheti" });
      } else {
        res.status(500).json({ message: "Failed to delete community group" });
      }
    }
  });

  app.get("/api/community-groups/:id/members", combinedAuth, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  // Community Projects Routes
  app.get("/api/community-projects", combinedAuth, async (req: any, res) => {
    try {
      const groupId = req.query.groupId ? parseInt(req.query.groupId) : undefined;
      const projects = await storage.getCommunityProjects(groupId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching community projects:", error);
      res.status(500).json({ message: "Failed to fetch community projects" });
    }
  });

  app.post("/api/community-projects", combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const projectData = { ...req.body, createdBy: userId };
      const project = await storage.createCommunityProject(projectData);

      // Auto-join creator as lead
      await storage.joinProject(project.id, userId);

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating community project:", error);
      res.status(500).json({ message: "Failed to create community project" });
    }
  });

  app.post("/api/community-projects/:id/join", combinedAuth, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.joinProject(projectId, userId);
      res.json({ message: "Successfully joined project" });
    } catch (error) {
      console.error("Error joining project:", error);
      res.status(500).json({ message: "Failed to join project" });
    }
  });

  app.get("/api/community-projects/:id/participants", combinedAuth, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const participants = await storage.getProjectParticipants(projectId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching project participants:", error);
      res.status(500).json({ message: "Failed to fetch project participants" });
    }
  });

  // Discussions Routes
  app.get("/api/discussions", combinedAuth, async (req: any, res) => {
    try {
      const groupId = req.query.groupId ? parseInt(req.query.groupId) : undefined;
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : undefined;
      const search = req.query.search as string | undefined;      // keyword filter
      const tag = req.query.tag as string | undefined;            // #tag filter
      const currentUserId = req.user.claims?.sub || req.user.id;

      let discussionsRows = await storage.getDiscussions(groupId, projectId);

      // Client-side search and tag filter (simple – no extra DB query)
      if (search && search.trim().length >= 2) {
        const q = search.toLowerCase();
        discussionsRows = discussionsRows.filter(d =>
          d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
        );
      }
      if (tag) {
        discussionsRows = discussionsRows.filter(d => d.tags?.includes(tag));
      }

      // Fetch authors, reply counts and reactions in parallel
      const ids = discussionsRows.map(d => d.id);
      const [usersData, reactions, replyCounts] = await Promise.all([
        Promise.all(discussionsRows.map(d => storage.getUser(d.authorId))),
        storage.getReactionsForDiscussions(ids),
        Promise.all(ids.map(id => storage.getReplies(id))),
      ]);

      // Build reaction summary: { discussionId: { emoji: count, myReactions: string[] } }
      const reactionMap: Record<number, Record<string, { count: number; mine: boolean }>> = {};
      for (const r of reactions) {
        if (!reactionMap[r.discussionId]) reactionMap[r.discussionId] = {};
        if (!reactionMap[r.discussionId][r.emoji]) {
          reactionMap[r.discussionId][r.emoji] = { count: 0, mine: false };
        }
        reactionMap[r.discussionId][r.emoji].count++;
        if (r.userId === currentUserId) reactionMap[r.discussionId][r.emoji].mine = true;
      }

      const enriched = discussionsRows.map((d, i) => ({
        ...d,
        author: {
          username: usersData[i]?.username || 'Ismeretlen',
          firstName: usersData[i]?.firstName || '',
          lastName: usersData[i]?.lastName || '',
          profileImageUrl: usersData[i]?.profileImageUrl || null
        },
        replyCount: replyCounts[i]?.length ?? 0,
        reactions: reactionMap[d.id] ?? {},
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching discussions:", error);
      res.status(500).json({ message: "Failed to fetch discussions" });
    }
  });

  // Get replies (thread) for a discussion
  app.get("/api/discussions/:id/replies", combinedAuth, async (req: any, res) => {
    try {
      const parentId = parseInt(req.params.id);
      const currentUserId = req.user.claims?.sub || req.user.id;
      const replies = await storage.getReplies(parentId);
      const ids = replies.map(r => r.id);
      const [usersData, reactions] = await Promise.all([
        Promise.all(replies.map(r => storage.getUser(r.authorId))),
        storage.getReactionsForDiscussions(ids),
      ]);
      const reactionMap: Record<number, Record<string, { count: number; mine: boolean }>> = {};
      for (const r of reactions) {
        if (!reactionMap[r.discussionId]) reactionMap[r.discussionId] = {};
        if (!reactionMap[r.discussionId][r.emoji]) reactionMap[r.discussionId][r.emoji] = { count: 0, mine: false };
        reactionMap[r.discussionId][r.emoji].count++;
        if (r.userId === currentUserId) reactionMap[r.discussionId][r.emoji].mine = true;
      }
      const enriched = replies.map((r, i) => ({
        ...r,
        author: {
          username: usersData[i]?.username || 'Ismeretlen',
          firstName: usersData[i]?.firstName || '',
          lastName: usersData[i]?.lastName || '',
          profileImageUrl: usersData[i]?.profileImageUrl || null
        },
        reactions: reactionMap[r.id] ?? {},
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching replies:", error);
      res.status(500).json({ message: "Failed to fetch replies" });
    }
  });

  // Toggle emoji reaction
  app.post("/api/discussions/:id/react", combinedAuth, async (req: any, res) => {
    try {
      const discussionId = parseInt(req.params.id);
      const { emoji } = req.body;
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId || !emoji) return res.status(400).json({ message: "Missing params" });
      const ALLOWED = ["👍", "❤️", "🔥", "💡"];
      if (!ALLOWED.includes(emoji)) return res.status(400).json({ message: "Invalid emoji" });
      const result = await storage.toggleReaction(discussionId, userId, emoji);
      res.json(result);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      res.status(500).json({ message: "Failed to toggle reaction" });
    }
  });

  // Pin / unpin a discussion (teacher/admin only)
  app.patch("/api/discussions/:id/pin", combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Csak tanár rögzíthet bejegyzést" });
      }
      const id = parseInt(req.params.id);
      const { pinned } = req.body;
      await storage.pinDiscussion(id, !!pinned);
      res.json({ success: true });
    } catch (error) {
      console.error("Error pinning discussion:", error);
      res.status(500).json({ message: "Failed to pin discussion" });
    }
  });



  app.post("/api/discussions", combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const discussionData = { ...req.body, authorId: userId };
      const discussion = await storage.createDiscussion(discussionData);
      res.status(201).json(discussion);

      // Fire-and-forget: notify group members
      if (discussion.groupId) {
        notifyGroupMembers(
          discussion.groupId,
          userId,
          discussion.title || "Új bejegyzés",
          discussion.id
        ).catch(console.error);
      }
    } catch (error) {
      console.error("Error creating discussion:", error);
      res.status(500).json({ message: "Failed to create discussion" });
    }
  });

  app.delete("/api/discussions/:id", combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
        return res.status(403).json({ message: "Hozzáférés megtagadva. Csak tanárok és adminok törölhetnek bejegyzéseket." });
      }

      const discussionId = parseInt(req.params.id);
      if (isNaN(discussionId)) {
        return res.status(400).json({ message: "Érvénytelen azonosító" });
      }

      await storage.deleteDiscussion(discussionId);
      res.status(200).json({ message: "Bejegyzés törölve" });
    } catch (error) {
      console.error("Error deleting discussion:", error);
      res.status(500).json({ message: "Nem sikerült törölni a bejegyzést" });
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // REAL-TIME NOTIFICATION SYSTEM (SSE)
  // ──────────────────────────────────────────────────────────────────

  // In-memory connected SSE clients: Map<userId, Set<res>>
  const sseClients = new Map<string, Set<any>>();

  function sendSseToUser(userId: string, data: object) {
    const clients = sseClients.get(userId);
    if (clients) {
      const payload = `data: ${JSON.stringify(data)}\n\n`;
      clients.forEach(res => {
        try { res.write(payload); } catch { /* client disconnected */ }
      });
    }
  }

  // SSE stream endpoint
  app.get("/api/notifications/stream", combinedAuth, (req: any, res) => {
    const userId = req.user.claims?.sub || req.user.id;
    if (!userId) return res.status(401).end();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Register client
    if (!sseClients.has(userId)) sseClients.set(userId, new Set());
    sseClients.get(userId)!.add(res);

    // Send ping every 30s to keep alive
    const keepAlive = setInterval(() => {
      try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
    }, 30000);

    req.on("close", () => {
      clearInterval(keepAlive);
      sseClients.get(userId)?.delete(res);
      if (sseClients.get(userId)?.size === 0) sseClients.delete(userId);
    });
  });

  // GET notifications for current user
  app.get("/api/notifications", combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const limit = req.query.limit ? parseInt(req.query.limit) : 30;
      const notifs = await storage.getNotifications(userId, limit);
      const unreadCount = await storage.getUnreadCount(userId);
      res.json({ notifications: notifs, unreadCount });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark single notification as read
  app.patch("/api/notifications/:id/read", combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const id = parseInt(req.params.id);
      if (!userId || isNaN(id)) return res.status(400).json({ message: "Invalid" });
      await storage.markNotificationRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification" });
    }
  });

  // Mark ALL notifications as read
  app.post("/api/notifications/read-all", combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications" });
    }
  });

  // Delete a notification
  app.delete("/api/notifications/:id", combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const id = parseInt(req.params.id);
      if (!userId || isNaN(id)) return res.status(400).json({ message: "Invalid" });
      await storage.deleteNotification(id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Hook into discussion creation to auto-notify group members
  // (called internally, not exposed separately – we patch the POST /api/discussions handler below)
  async function notifyGroupMembers(groupId: number, authorId: string, discussionTitle: string, discussionId: number) {
    try {
      const members = await storage.getGroupMembers(groupId);
      const group = await storage.getCommunityGroup(groupId);
      const author = await storage.getUser(authorId);
      const authorName = author?.firstName
        ? `${author.firstName} ${author.lastName || ''}`.trim()
        : author?.username || 'Valaki';

      for (const member of members) {
        if (member.userId === authorId) continue; // Don't notify yourself
        const notif = await storage.createNotification({
          userId: member.userId,
          type: "discussion_reply",
          title: `Új bejegyzés: ${group?.name || 'Csoport'}`,
          message: `${authorName} elindított egy új témát: "${discussionTitle}"`,
          link: "/community",
          isRead: false,
          actorId: authorId,
          metadata: { groupId, discussionId },
        });
        // Push real-time
        sendSseToUser(member.userId, { type: "notification", data: notif });
      }
    } catch (err) {
      console.error("Error sending group notifications:", err);
    }
  }

  // Teacher Routes
  app.get("/api/teacher/students", combinedAuth, async (req: any, res) => {
    try {
      // Check if user is a teacher
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied. Teachers only." });
      }

      // Get students assigned to this teacher
      const students = await storage.getStudentsByTeacher(userId);

      // Attach test results to each student
      const studentsWithResults = await Promise.all(students.map(async (student) => {
        const testResults = await storage.getTestResultsByUser(student.id);
        return {
          ...student,
          testResults
        };
      }));

      res.json(studentsWithResults);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Peer Reviews Routes
  app.get("/api/peer-reviews/:projectId", combinedAuth, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reviews = await storage.getPeerReviews(projectId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching peer reviews:", error);
      res.status(500).json({ message: "Failed to fetch peer reviews" });
    }
  });

  app.post("/api/peer-reviews", combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else if (req.session?.adminUser) {
        userId = req.session.adminUser.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const reviewData = { ...req.body, reviewerId: userId };
      const review = await storage.createPeerReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating peer review:", error);
      res.status(500).json({ message: "Failed to create peer review" });
    }
  });

  // Multi-API service endpoints
  app.post('/api/search/internet', customAuth, async (req: any, res) => {
    try {
      const { query } = req.body;
      const results = await multiApiService.searchInternet(query);
      res.json({ results });
    } catch (error) {
      console.error("Internet search error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to search internet" });
    }
  });

  app.post('/api/search/youtube', customAuth, async (req: any, res) => {
    try {
      const { query } = req.body;
      const results = await multiApiService.searchYoutube(query);
      res.json({ results });
    } catch (error) {
      console.error("YouTube search error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to search YouTube" });
    }
  });

  app.post('/api/tts/generate', async (req: any, res) => {
    try {
      const { text, voice } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const audioBuffer = await multiApiService.generateSpeech(text, voice || 'Bella');

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="bella-speech.mp3"');
      res.send(audioBuffer);
    } catch (error) {
      console.error("TTS generation error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate speech" });
    }
  });

  app.get('/api/admin/api-status', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const dataForSeoLogin = await storage.getSystemSetting('dataforseo_login');
      const dataForSeoPassword = await storage.getSystemSetting('dataforseo_password');

      const status = {
        openai: !!(await storage.getSystemSetting('openai_api_key'))?.value,
        gemini: !!(await storage.getSystemSetting('gemini_api_key'))?.value,
        dataForSeo: !!(dataForSeoLogin?.value && dataForSeoPassword?.value),
        youtube: !!(await storage.getSystemSetting('youtube_api_key'))?.value,
        elevenLabs: !!(await storage.getSystemSetting('elevenlabs_api_key'))?.value
      };

      res.json(status);
    } catch (error) {
      console.error("API status check error:", error);
      res.status(500).json({ message: "Failed to check API status" });
    }
  });

  // Iskolai admin bejelentkezés és kezelés
  app.post('/api/school-admin/login', async (req: any, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Felhasználónév és jelszó szükséges" });
      }

      // Check for universal Borga access
      if (username === 'Borga' && password === 'Borga') {
        // Create or get school admin user
        let schoolAdminUser = await storage.getUser('school-admin-borga');
        if (!schoolAdminUser) {
          schoolAdminUser = await storage.upsertUser({
            id: 'school-admin-borga',
            email: 'schooladmin@globalsystem.com',
            firstName: 'Borga',
            lastName: 'School Admin',
            profileImageUrl: null,
            role: 'school_admin',
            schoolName: 'Global System School'
          });
        }

        // Update school admin role in database to ensure it's set correctly
        await storage.updateUserRole('school-admin-borga', 'school_admin');
        schoolAdminUser.role = 'school_admin';

        // Set school admin session
        req.session.schoolAdminUser = {
          id: schoolAdminUser.id,
          username: 'Borga',
          role: schoolAdminUser.role,
          schoolName: schoolAdminUser.schoolName
        };

        // Force session save
        await new Promise<void>((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) {
              console.error('Borga school admin session save error:', err);
              reject(err);
            } else {
              console.log('Borga school admin session saved successfully for:', schoolAdminUser.id);
              resolve();
            }
          });
        });

        return res.json({
          id: schoolAdminUser.id,
          username: 'Borga',
          role: schoolAdminUser.role,
          firstName: schoolAdminUser.firstName,
          lastName: schoolAdminUser.lastName,
          schoolName: schoolAdminUser.schoolName
        });
      }

      // Find school admin user by username
      const user = await storage.getUserByUsername(username);

      if (!user || user.role !== 'school_admin') {
        return res.status(401).json({ message: "Helytelen felhasználónév vagy jelszó" });
      }

      // Check password using the same method as local auth
      const { comparePasswords } = await import('./localAuth');
      const isPasswordValid = await comparePasswords(password, user.password || '');

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Helytelen felhasználónév vagy jelszó" });
      }

      // Set session for school admin
      req.session.schoolAdminUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        schoolName: user.schoolName
      };

      // Force session save with proper callback handling
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('School admin session save error:', err);
            reject(err);
          } else {
            console.log('School admin session saved successfully for:', user.id);
            resolve();
          }
        });
      });

      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolName: user.schoolName
      });
    } catch (error) {
      console.error("School admin login error:", error);
      res.status(500).json({ message: "Bejelentkezési hiba történt" });
    }
  });

  // Iskolai admin kijelentkezés
  app.get('/api/school-admin/logout', (req: any, res) => {
    try {
      // Töröljük az iskolai admin session-t
      if (req.session) {
        req.session.schoolAdminUser = null;
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Session destroy error:", err);
          }
          res.clearCookie('connect.sid');
          res.json({ message: "Sikeresen kijelentkezve" });
        });
      } else {
        res.json({ message: "Sikeresen kijelentkezve" });
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Kijelentkezési hiba" });
    }
  });

  // Enhanced module generation endpoints
  app.post('/api/admin/modules/generate-enhanced', combinedAuth, async (req: any, res) => {
    try {
      let user: any;

      // Handle both Replit auth and local admin auth
      if (req.user?.claims?.sub) {
        user = await storage.getUser(req.user.claims.sub);
      } else if (req.session?.adminUser) {
        // For local admin, use the session data directly since it contains role info
        user = req.session.adminUser;
      } else if (req.user?.id) {
        user = await storage.getUser(req.user.id);
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { title, content, subjectId } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      // Get subject context for better AI generation
      const subject = subjectId ? await storage.getSubject(subjectId) : null;
      const subjectContext = subject?.name;

      const { enhancedModuleGenerator } = await import('./enhanced-module-generator');
      const enhancedContent = await enhancedModuleGenerator.generateEnhancedModule(
        title,
        content,
        subjectContext
      );

      res.json(enhancedContent);
    } catch (error) {
      console.error("Enhanced module generation error:", error);
      res.status(500).json({ message: "Failed to generate enhanced module content" });
    }
  });

  app.post('/api/admin/modules/create-with-enhancement', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || !['admin', 'school_admin', 'teacher'].includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const {
        title,
        content,
        subjectId,
        moduleNumber,
        conciseContent,
        detailedContent,
        keyConceptsData,
        videoUrl,
        audioUrl,
        imageUrl
      } = req.body;

      if (!title || !content || !subjectId || moduleNumber === undefined) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      const moduleData = {
        title,
        content: conciseContent || detailedContent || content, // Use AI content if available
        subjectId,
        moduleNumber,
        conciseContent: conciseContent || null,
        detailedContent: detailedContent || null,
        keyConceptsData: keyConceptsData || null,
        videoUrl: videoUrl || null,
        audioUrl: audioUrl || null,
        imageUrl: imageUrl || null,
        isPublished: false
      };
      if (user.role !== 'admin') {
        (moduleData as any).schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }




      const module = await storage.createModule(moduleData);

      // Auto-publish AI Enhanced modules
      if (conciseContent || detailedContent) {
        await storage.updateModule(module.id, { isPublished: true });
        const publishedModule = await storage.getModule(module.id);
        invalidateSitemapCache(); // Frissítés új modul létrehozásakor
        res.status(201).json(publishedModule);
      } else {
        invalidateSitemapCache(); // Frissítés új modul létrehozásakor
        res.status(201).json(module);
      }
    } catch (error) {
      console.error("Enhanced module creation error:", error);
      res.status(500).json({ message: "Failed to create enhanced module" });
    }
  });

  // AI regenerate existing module endpoint
  app.post("/api/admin/modules/:id/regenerate-ai", customAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleId = parseInt(req.params.id);
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content required" });
      }

      // Get existing module with full context
      const existingModule = await storage.getModule(moduleId);
      if (!existingModule) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Get subject and profession information for context
      const subject = await storage.getSubject(existingModule.subjectId);
      const profession = subject ? await storage.getProfession(subject.professionId) : null;

      console.log(`Queueing AI regeneration for module ${moduleId}: ${title}`);

      // Get the custom module update message from settings
      const moduleUpdateMessageSetting = await storage.getSystemSetting('ai_module_update_message');
      const customSystemMessage = moduleUpdateMessageSetting?.value || 'Frissítsd a következő tananyag modult. Használj szakmai nyelvezetet, de egyszerű magyarázatokat. Tartsd meg a lényeges információkat és javítsd a szerkezetet. A tartalom legyen logikus és könnyen érthető. FONTOS: Automatikusan adj hozzá Wikipedia hivatkozásokat a szakmai kifejezésekhez és fogalmakhoz - használj [szöveg](https://hu.wikipedia.org/wiki/Címszó) formátumot. Keress releváns YouTube videó témákat és adj hozzá DataForSEO alapú friss információkat a tartalom gazdagításához.';

      try {
        // Use queue manager for safe concurrent processing
        const { aiQueueManager } = await import('./ai-queue-manager');
        const result = await aiQueueManager.queueAIRegeneration(
          moduleId,
          title,
          content,
          existingModule.subjectId.toString(),
          customSystemMessage,
          subject?.name,
          profession?.name,
          existingModule.moduleNumber
        );

        res.json(result);

      } catch (queueError) {
        console.error(`Queue error for module ${moduleId}:`, queueError);

        // Fallback: just mark as published without enhancement
        const fallbackUpdate = { isPublished: true };
        const updatedModule = await storage.updateModule(moduleId, fallbackUpdate);

        res.json({
          success: true,
          module: updatedModule,
          message: 'Modul publikálva (AI fejlesztés sikertelen)',
          warning: 'AI fejlesztés nem sikerült, eredeti tartalom megtartva'
        });
      }
    } catch (error) {
      console.error("AI regeneration error:", error);
      res.status(500).json({ message: "Failed to regenerate module with AI" });
    }
  });

  // AI regenerate only quizzes for existing module endpoint
  app.post("/api/admin/modules/:id/regenerate-quizzes", customAuth, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleId = parseInt(req.params.id);
      
      // Get existing module to ensure it exists and get title/content
      const existingModule = await storage.getModule(moduleId);
      if (!existingModule) {
        return res.status(404).json({ message: "Module not found" });
      }

      console.log(`Queueing AI quiz regeneration for module ${moduleId}: ${existingModule.title}`);

      const { aiQueueManager } = await import('./ai-queue-manager');
      const result = await aiQueueManager.queueAIQuizRegeneration(
        moduleId,
        existingModule.title,
        existingModule.content
      );

      res.json({
        success: true,
        message: 'A tesztkérdések újragenerálása sorba állítva.',
        queueStatus: result
      });

    } catch (error) {
      console.error("AI quiz regeneration error:", error);
      res.status(500).json({ message: "Failed to queue quiz regeneration" });
    }
  });

  // AI Queue status endpoint
  app.get("/api/admin/ai-queue-status", isAuthenticated, async (req, res) => {
    try {
      const { aiQueueManager } = await import('./ai-queue-manager');
      const status = aiQueueManager.getQueueStatus();
      res.json(status);
    } catch (error) {
      console.error("AI queue status error:", error);
      res.status(500).json({ message: "Failed to get queue status" });
    }
  });

  // DataForSEO credentials update endpoints
  app.post('/api/admin/update-dataforseo-login', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { dataForSeoLogin } = req.body;

      if (!dataForSeoLogin) {
        return res.status(400).json({ message: "DataForSEO login is required" });
      }

      await storage.setSystemSetting('dataforseo_login', dataForSeoLogin, userId);
      res.json({ message: "DataForSEO login updated successfully" });
    } catch (error) {
      console.error("DataForSEO login update error:", error);
      res.status(500).json({ message: "Failed to update DataForSEO login" });
    }
  });

  app.post('/api/admin/update-dataforseo-password', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { dataForSeoPassword } = req.body;

      if (!dataForSeoPassword) {
        return res.status(400).json({ message: "DataForSEO password is required" });
      }

      await storage.setSystemSetting('dataforseo_password', dataForSeoPassword, userId);
      res.json({ message: "DataForSEO password updated successfully" });
    } catch (error) {
      console.error("DataForSEO password update error:", error);
      res.status(500).json({ message: "Failed to update DataForSEO password" });
    }
  });

  // Bella TTS endpoint with specific voice
  app.post('/api/tts/generate', customAuth, async (req: any, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const audioBuffer = await multiApiService.generateSpeech(text, 'Bella');

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="bella-speech.mp3"');
      res.send(audioBuffer);
    } catch (error) {
      console.error("Bella TTS error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to generate Bella speech" });
    }
  });

  // Test YouTube API functionality
  app.post('/api/test-youtube', async (req, res) => {
    try {
      const { query } = req.body;
      console.log('Testing YouTube API with query:', query);
      const result = await multiApiService.searchYoutube(query);
      console.log('YouTube API result:', result);
      res.json({ success: true, videos: result });
    } catch (error) {
      console.error('YouTube test error:', error);
      res.status(500).json({ error: 'YouTube test failed', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // YouTube API test endpoint
  app.get("/api/test-youtube-direct", async (req, res) => {
    try {
      const query = req.query.q as string || 'lecsó készítése magyar konyha';
      const { multiApiService } = await import('./multiApiService');
      const results = await multiApiService.searchYoutube(query);
      res.json({
        success: true,
        query: query,
        count: results.length,
        results: results
      });
    } catch (error: any) {
      console.error('YouTube test error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.stack
      });
    }
  });

  // Wikipedia proxy endpoint with improved search and fallbacks
  app.get('/api/wikipedia/:title', async (req, res) => {
    try {
      const { title } = req.params;
      let searchTerm = decodeURIComponent(title);

      console.log(`Wikipedia search for: "${searchTerm}"`);

      // Normalize Hungarian technical terms and common variations
      const termMappings: { [key: string]: string } = {
        'Számítógépes programozás': 'Programozás',
        'számítógépes programozás': 'programozás',
        'Robot technológia': 'Robot',
        'robot technológia': 'robot',
        'Mesterséges intelligencia': 'Mesterséges intelligencia',
        'mesterséges intelligencia': 'mesterséges intelligencia',
        'Adatbázis kezelés': 'Adatbázis',
        'adatbázis kezelés': 'adatbázis',
        'Webes alkalmazás': 'Webes alkalmazás fejlesztése',
        'webes alkalmazás': 'webalkalmazás'
      };

      // Apply term mapping
      if (termMappings[searchTerm]) {
        searchTerm = termMappings[searchTerm];
        console.log(`Mapped to: "${searchTerm}"`);
      }

      // Function to try Wikipedia search API for better results
      const tryWikipediaSearch = async (query: string): Promise<any> => {
        const searchUrl = `https://hu.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`;
        const searchResponse = await fetch(searchUrl);

        if (searchResponse.ok) {
          const [, titles, descriptions, urls] = await searchResponse.json();
          if (titles && titles.length > 0) {
            // Find best match (prefer exact or close matches)
            const bestMatch = titles.find((t: string) =>
              t.toLowerCase().includes(query.toLowerCase()) ||
              query.toLowerCase().includes(t.toLowerCase())
            ) || titles[0];

            console.log(`Search found: "${bestMatch}" for query: "${query}"`);
            return bestMatch;
          }
        }
        return null;
      };

      // Function to get content from Wikipedia
      const getWikipediaContent = async (pageTitle: string): Promise<any> => {
        // Try extract API first
        const extractUrl = `https://hu.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(pageTitle)}&prop=extracts&exlimit=1&explaintext=1&exsectionformat=plain&exintro=1`;

        try {
          const extractResponse = await fetch(extractUrl);
          if (extractResponse.ok) {
            const extractData = await extractResponse.json();
            const pages = extractData.query?.pages;

            if (pages) {
              const pageId = Object.keys(pages)[0];
              const page = pages[pageId];

              if (page && page.extract && page.extract.length > 50 && !page.missing) {
                const extract = page.extract;

                // Filter out disambiguation and redirect pages
                if (!extract.includes('egyértelműsítő lap') &&
                  !extract.includes('átirányítás') &&
                  !extract.includes('disambiguation') &&
                  !extract.includes('lehet:')) {

                  // Get first 3-4 meaningful sentences
                  const sentences = extract.split(/[.!?]+/).filter((s: string) => s.trim().length > 30);
                  const limitedContent = sentences.slice(0, 3).join('. ') + '.';

                  return {
                    title: page.title || pageTitle,
                    content: limitedContent,
                    source: 'extract',
                    url: `https://hu.wikipedia.org/wiki/${encodeURIComponent(page.title || pageTitle)}`
                  };
                }
              }
            }
          }
        } catch (extractError) {
          console.log('Extract API failed for', pageTitle);
        }

        // Fallback to summary API
        try {
          const summaryUrl = `https://hu.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
          const summaryResponse = await fetch(summaryUrl);

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            if (summaryData.extract && summaryData.extract.length > 30) {
              return {
                title: summaryData.title || pageTitle,
                content: summaryData.extract,
                source: 'summary',
                url: `https://hu.wikipedia.org/wiki/${encodeURIComponent(summaryData.title || pageTitle)}`
              };
            }
          }
        } catch (summaryError) {
          console.log('Summary API failed for', pageTitle);
        }

        return null;
      };

      // Try 1: Direct lookup with original term
      let content = await getWikipediaContent(searchTerm);

      // Try 2: Search for similar terms if direct lookup fails
      if (!content) {
        console.log('Direct lookup failed, trying search...');
        const searchResult = await tryWikipediaSearch(searchTerm);
        if (searchResult) {
          content = await getWikipediaContent(searchResult);
        }
      }

      // Try 3: Try with simplified search terms (remove common suffixes)
      if (!content) {
        const simplifiedTerms = [
          searchTerm.replace(/\s+(technológia|kezelés|alkalmazás|fejlesztés)$/i, ''),
          searchTerm.split(' ')[0], // First word only
          searchTerm.replace(/és$/, ''), // Remove "és" suffix
        ].filter(term => term.length > 2 && term !== searchTerm);

        for (const term of simplifiedTerms) {
          console.log(`Trying simplified term: "${term}"`);
          const searchResult = await tryWikipediaSearch(term);
          if (searchResult) {
            content = await getWikipediaContent(searchResult);
            if (content) break;
          }
        }
      }

      if (content) {
        console.log(`Successfully found Wikipedia content for: "${searchTerm}"`);
        res.json(content);
      } else {
        console.log(`No Wikipedia content found for: "${searchTerm}"`);
        res.status(404).json({
          error: 'Wikipedia tartalom nem található',
          searchTerm: searchTerm,
          suggestion: 'Próbálj meg egyszerűbb vagy általánosabb kifejezéseket használni.'
        });
      }

    } catch (error) {
      console.error('Wikipedia proxy error:', error);
      res.status(500).json({ error: 'Hiba a Wikipedia tartalom betöltésekor' });
    }
  });

  // AI Queue status endpoint
  app.get('/api/admin/queue-status', combinedAuth, async (req, res) => {
    try {
      const status = aiQueueManager.getQueueStatus();
      const detailedStatus = {
        ...status,
        estimatedTimeRemaining: status.queueSize * 45, // ~45 seconds per module
        canAddMore: status.queueSize < 50, // Limit to 50 modules in queue
        processingSpeed: `${status.maxConcurrent} modul párhuzamosan`,
        queueLimit: 50,
        message: status.queueSize > 0
          ? `${status.queueSize} modul várakozik, ${status.processing} feldolgozás alatt`
          : 'Nincs várakozó feladat'
      };
      res.json(detailedStatus);
    } catch (error) {
      console.error('Error getting queue status:', error);
      res.status(500).json({ error: 'Failed to get queue status' });
    }
  });

  // Mermaid diagram to SVG endpoint
  app.post('/api/mermaid/svg', express.json(), (req, res) => {
    try {
      const { mermaidCode } = req.body;

      if (!mermaidCode) {
        return res.status(400).json({ error: 'Mermaid code is required' });
      }

      // Parse Mermaid code and generate intelligent SVG
      const svg = generateIntelligentSVG(mermaidCode);

      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(svg);
    } catch (error) {
      console.error('Mermaid SVG generation error:', error);
      res.status(500).json({ error: 'Failed to generate SVG' });
    }
  });

  // Setup admin messages routes
  setupAdminMessagesRoutes(app);

  // Setup privacy/GDPR compliance routes
  setupPrivacyRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}

// Intelligent SVG generator from Mermaid code
function generateIntelligentSVG(mermaidCode: string): string {
  const lines = mermaidCode.split('\n').filter(line => line.trim());
  const nodes = new Map<string, { id: string, label: string, type: string }>();
  const edges: Array<{ from: string, to: string, label?: string }> = [];

  // Parse the mermaid code with improved regex patterns
  lines.forEach(line => {
    const trimmed = line.trim();

    // Skip diagram type declarations
    if (trimmed.startsWith('graph') || trimmed.startsWith('flowchart')) {
      return;
    }

    // Parse node definitions and connections in a single line
    // Pattern: A[Label] --> B[Label] or A --> B[Label] etc.
    const fullLineMatch = trimmed.match(/(\w+)(?:\[([^\]]+)\])?\s*-->\s*(\w+)(?:\[([^\]]+)\])?/);

    if (fullLineMatch) {
      const [, fromId, fromLabel, toId, toLabel] = fullLineMatch;

      // Add or update nodes
      if (!nodes.has(fromId)) {
        nodes.set(fromId, {
          id: fromId,
          label: fromLabel || fromId,
          type: 'rect'
        });
      } else if (fromLabel) {
        // Update label if provided
        const node = nodes.get(fromId)!;
        node.label = fromLabel;
      }

      if (!nodes.has(toId)) {
        nodes.set(toId, {
          id: toId,
          label: toLabel || toId,
          type: 'rect'
        });
      } else if (toLabel) {
        // Update label if provided
        const node = nodes.get(toId)!;
        node.label = toLabel;
      }

      edges.push({ from: fromId, to: toId });
    }
  });

  // Convert to array for positioning
  const nodeArray = Array.from(nodes.values());

  if (nodeArray.length === 0) {
    return `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
      <text x="100" y="50" text-anchor="middle" fill="#666">No diagram content</text>
    </svg>`;
  }

  // Create a hierarchical layout based on the flow
  const levels: string[][] = [];
  const visited = new Set<string>();
  const incomingEdges = new Map<string, number>();

  // Count incoming edges for each node
  nodeArray.forEach(node => incomingEdges.set(node.id, 0));
  edges.forEach(edge => {
    const count = incomingEdges.get(edge.to) || 0;
    incomingEdges.set(edge.to, count + 1);
  });

  // Find root nodes (no incoming edges)
  let currentLevel = nodeArray.filter(node => incomingEdges.get(node.id) === 0);
  if (currentLevel.length === 0) {
    // If no clear root, start with first node
    currentLevel = [nodeArray[0]];
  }

  // Build levels using topological sort
  while (currentLevel.length > 0) {
    const levelIds = currentLevel.map(n => n.id);
    levels.push(levelIds);

    currentLevel.forEach(node => visited.add(node.id));

    // Find next level
    const nextLevel: typeof nodeArray = [];
    currentLevel.forEach(node => {
      edges
        .filter(edge => edge.from === node.id)
        .forEach(edge => {
          const targetNode = nodeArray.find(n => n.id === edge.to);
          if (targetNode && !visited.has(targetNode.id) && !nextLevel.includes(targetNode)) {
            nextLevel.push(targetNode);
          }
        });
    });

    currentLevel = nextLevel;
  }

  // Add any remaining nodes to the last level
  const remainingNodes = nodeArray.filter(node => !visited.has(node.id));
  if (remainingNodes.length > 0) {
    levels.push(remainingNodes.map(n => n.id));
  }

  // Layout parameters
  const nodeWidth = 160;
  const nodeHeight = 60;
  const horizontalSpacing = 200;
  const verticalSpacing = 120;
  const padding = 60;

  // Calculate SVG dimensions
  const maxNodesInLevel = Math.max(...levels.map(level => level.length));
  const svgWidth = Math.max(500, maxNodesInLevel * horizontalSpacing + padding * 2);
  const svgHeight = Math.max(400, levels.length * verticalSpacing + padding * 2);

  // Position nodes
  const nodePositions = new Map<string, { x: number, y: number }>();
  levels.forEach((level, levelIndex) => {
    const levelWidth = (level.length - 1) * horizontalSpacing;
    const startX = (svgWidth - levelWidth) / 2;

    level.forEach((nodeId, nodeIndex) => {
      const x = startX + nodeIndex * horizontalSpacing;
      const y = padding + levelIndex * verticalSpacing + nodeHeight / 2;
      nodePositions.set(nodeId, { x, y });
    });
  });

  // Generate SVG with enhanced styling
  let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .node { 
          fill: #e8f4fd; 
          stroke: #1976d2; 
          stroke-width: 2.5; 
          rx: 12; 
          filter: drop-shadow(0 2px 4px rgba(25,118,210,0.2)); 
        }
        .node-text { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          font-size: 13px; 
          text-anchor: middle; 
          fill: #1565c0; 
          font-weight: 600; 
        }
        .edge { 
          stroke: #424242; 
          stroke-width: 2.5; 
          marker-end: url(#arrowhead); 
        }
        .edge-label { 
          font-family: Arial, sans-serif; 
          font-size: 11px; 
          text-anchor: middle; 
          fill: #666; 
        }
      </style>
      <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto">
        <polygon points="0 0, 12 4, 0 8" fill="#424242" />
      </marker>
    </defs>`;

  // Draw edges with improved routing
  edges.forEach(edge => {
    const fromPos = nodePositions.get(edge.from);
    const toPos = nodePositions.get(edge.to);

    if (fromPos && toPos) {
      const fromX = fromPos.x;
      const fromY = fromPos.y + nodeHeight / 2;
      const toX = toPos.x;
      const toY = toPos.y - nodeHeight / 2;

      // Create smooth curved paths for better visual flow
      if (Math.abs(fromX - toX) > 50) {
        const controlY = fromY + (toY - fromY) * 0.6;
        svg += `<path d="M ${fromX} ${fromY} Q ${fromX} ${controlY} ${toX} ${toY}" class="edge" fill="none" />`;
      } else {
        svg += `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" class="edge" />`;
      }

      if (edge.label) {
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        svg += `<rect x="${midX - edge.label.length * 4}" y="${midY - 10}" width="${edge.label.length * 8}" height="20" fill="white" stroke="#ddd" rx="4" />`;
        svg += `<text x="${midX}" y="${midY + 4}" class="edge-label">${edge.label}</text>`;
      }
    }
  });

  // Draw nodes with dynamic sizing
  nodeArray.forEach(node => {
    const pos = nodePositions.get(node.id);
    if (pos) {
      const textWidth = Math.max(120, node.label.length * 9 + 30);
      const rectWidth = Math.min(textWidth, 200);

      svg += `<rect x="${pos.x - rectWidth / 2}" y="${pos.y - nodeHeight / 2}" width="${rectWidth}" height="${nodeHeight}" class="node" />`;

      // Smart text wrapping
      const words = node.label.split(' ');
      if (words.length > 2 && node.label.length > 20) {
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        svg += `<text x="${pos.x}" y="${pos.y - 6}" class="node-text">${line1}</text>`;
        svg += `<text x="${pos.x}" y="${pos.y + 12}" class="node-text">${line2}</text>`;
      } else {
        svg += `<text x="${pos.x}" y="${pos.y + 5}" class="node-text">${node.label}</text>`;
      }
    }
  });

  svg += '</svg>';
  return svg;
}

// Admin Messages API endpoints
export function setupAdminMessagesRoutes(app: Express) {
  // Send message to admin (students)
  app.post('/api/admin/messages', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const messageData = insertAdminMessageSchema.parse(req.body);
      const message = await storage.createAdminMessage({
        ...messageData,
        senderId: userId
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending admin message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get all admin messages (admin only)
  app.get('/api/admin/messages', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getAdminMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching admin messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Respond to admin message (admin only)
  app.put('/api/admin/messages/:id/respond', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const messageId = parseInt(req.params.id);
      const { response } = req.body;

      if (!response || typeof response !== 'string') {
        return res.status(400).json({ message: "Valid response is required" });
      }

      const updatedMessage = await storage.respondToAdminMessage(messageId, response);
      res.json(updatedMessage);
    } catch (error) {
      console.error("Error responding to admin message:", error);
      res.status(500).json({ message: "Failed to respond to message" });
    }
  });

  // Get user's sent messages (for students to see their messages)
  app.get('/api/admin/messages/sent', combinedAuth, async (req: any, res) => {
    try {
      let userId: string;

      if (req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      } else if (req.user.id) {
        userId = req.user.id;
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const messages = await storage.getUserAdminMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching user messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
}

// Privacy and GDPR compliance API endpoints
export function setupPrivacyRoutes(app: Express) {
  // Save user consent
  app.post('/api/privacy/consent', async (req: any, res) => {
    try {
      const { consentType, consentValue, sessionId, userId } = req.body;

      if (!consentType || typeof consentValue !== 'boolean') {
        return res.status(400).json({ message: 'Invalid consent data' });
      }

      const consentData = {
        consentType,
        consentValue,
        sessionId: sessionId || null,
        userId: userId || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
        userAgent: req.get('User-Agent') || null
      };

      const consent = await storage.saveUserConsent(consentData);
      res.json(consent);
    } catch (error) {
      console.error('Error saving consent:', error);
      res.status(500).json({ message: 'Failed to save consent' });
    }
  });

  // Create privacy request
  app.post('/api/privacy/requests', async (req: any, res) => {
    try {
      const { email, requestType, requestData } = req.body;

      if (!email || !requestType) {
        return res.status(400).json({ message: 'Email and request type are required' });
      }

      const request = await storage.createPrivacyRequest({
        email,
        requestType,
        requestData: requestData || {},
        status: 'pending'
      });

      res.json(request);
    } catch (error) {
      console.error('Error creating privacy request:', error);
      res.status(500).json({ message: 'Failed to create privacy request' });
    }
  });

  // Get privacy requests by email
  app.get('/api/privacy/requests', async (req: any, res) => {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const requests = await storage.getPrivacyRequests(email as string);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching privacy requests:', error);
      res.status(500).json({ message: 'Failed to fetch privacy requests' });
    }
  });

  // Export user data (GDPR data portability)
  app.get('/api/privacy/export/:userId', combinedAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const requestingUserId = req.user?.claims?.sub || req.user?.id;
      const requestingUser = await storage.getUser(requestingUserId);

      // Users can export their own data, or admins can export any user's data
      if (userId !== requestingUserId && requestingUser?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      const exportData = await storage.exportUserData(userId);

      if (!exportData) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}-${Date.now()}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting user data:', error);
      res.status(500).json({ message: 'Failed to export user data' });
    }
  });

  // Admin: Get all privacy requests
  app.get('/api/admin/privacy/requests', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const requests = await storage.getPrivacyRequests();
      res.json(requests);
    } catch (error) {
      console.error('Error fetching admin privacy requests:', error);
      res.status(500).json({ message: 'Failed to fetch privacy requests' });
    }
  });

  // Admin: Update privacy request status
  app.put('/api/admin/privacy/requests/:id/status', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const requestId = parseInt(req.params.id);
      const { status, responseData } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      const updatedRequest = await storage.updatePrivacyRequestStatus(
        requestId,
        status,
        responseData,
        userId
      );

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error updating privacy request status:', error);
      res.status(500).json({ message: 'Failed to update request status' });
    }
  });

  // ==========================================
  // STUDENT AVATAR ROUTES
  // ==========================================
  app.get('/api/student/avatar', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const avatar = await storage.getStudentAvatar(userId);
      res.json(avatar);
    } catch (error) {
      console.error('Error fetching student avatar:', error);
      res.status(500).json({ message: 'Failed to fetch avatar' });
    }
  });

  app.post('/api/student/avatar/feed', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const { xpCost } = req.body;
      if (!xpCost || typeof xpCost !== 'number' || xpCost <= 0) {
        return res.status(400).json({ message: 'Invalid XP cost' });
      }
      
      const updatedAvatar = await storage.feedStudentAvatar(userId, xpCost);
      if (!updatedAvatar) {
        return res.status(400).json({ message: 'Nem elegendő XP vagy hiba történt' });
      }
      
      res.json(updatedAvatar);
    } catch (error) {
      console.error('Error feeding avatar:', error);
      res.status(500).json({ message: 'Failed to feed avatar' });
    }
  });

  app.post('/api/student/avatar/select', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      const { avatarType } = req.body;
      if (!avatarType) {
        return res.status(400).json({ message: 'Avatar type is required' });
      }
      
      const newAvatar = await storage.selectStudentAvatar(userId, avatarType);
      res.json(newAvatar);
    } catch (error) {
      console.error('Error selecting avatar:', error);
      res.status(500).json({ message: 'Failed to select avatar' });
    }
  });

  app.post('/api/student/avatar/revive', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      // Fixed cost for resurrection, could be configurable
      const xpCost = 1000; 
      
      const revivedAvatar = await storage.reviveStudentAvatar(userId, xpCost);
      if (!revivedAvatar) {
        return res.status(400).json({ message: 'Nem elegendő XP az újraélesztéshez, vagy az avatár még él.' });
      }
      
      res.json(revivedAvatar);
    } catch (error) {
      console.error('Error reviving avatar:', error);
      res.status(500).json({ message: 'Failed to revive avatar' });
    }
  });

  app.delete('/api/student/avatar/release', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      await storage.releaseStudentAvatar(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error releasing avatar:', error);
      res.status(500).json({ message: 'Failed to release avatar' });
    }
  });
}

