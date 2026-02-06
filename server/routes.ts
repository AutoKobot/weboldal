import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth } from "./localAuth";
import { multiApiService } from "./multiApiService";
import { aiQueueManager } from "./ai-queue-manager";
import { mermaidService } from "./mermaid-service";


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
      return next();
    }

    console.log('Combined auth - No valid auth found');
    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
import { insertModuleSchema, insertChatMessageSchema, insertProfessionSchema, insertSubjectSchema, insertAdminMessageSchema } from "@shared/schema";
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
    // Allow images, videos, and audio files
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nem támogatott fájltípus. Csak kép, videó és hang fájlok engedélyezettek.'));
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

      // Check for authenticated user (Replit or local)
      if (req.isAuthenticated && req.isAuthenticated()) {
        // Check if this is Replit auth (has claims) or local auth (direct user object)
        if (req.user.claims && req.user.claims.sub) {
          // Replit auth
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);
          console.log('Replit user fetched:', { userId: user?.id, completedModules: user?.completedModules });
          return res.json(user);
        } else if (req.user.id) {
          // Local auth - ALWAYS fetch fresh data from database
          console.log('Local user from session:', { userId: req.user.id, completedModules: req.user.completedModules });

          const freshUser = await storage.getUser(req.user.id);
          console.log('Fresh local user from DB:', { userId: freshUser?.id, completedModules: freshUser?.completedModules, assignedProfessionIds: freshUser?.assignedProfessionIds });

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
    if (req.session && req.session.adminUser) {
      req.user = { claims: { sub: req.session.adminUser.id } };
      return next();
    }
    return isAuthenticated(req, res, next);
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

      if (!['admin', 'student', 'teacher'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
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

      await storage.deleteUser(targetUserId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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

  // Public API endpoints (for authenticated users with profession-based access control)
  app.get('/api/public/professions', combinedAuth, async (req: any, res) => {
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

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admin can see all professions
      if (user.role === 'admin') {
        const professions = await storage.getProfessions();
        return res.json(professions);
      }

      // Students can see assigned professions or all if they haven't chosen any
      const hasAssignedProfessions = user.assignedProfessionIds && user.assignedProfessionIds.length > 0;

      if (hasAssignedProfessions) {
        // Return only assigned professions
        const allProfessions = await storage.getProfessions();
        const assignedProfessions = allProfessions.filter(p =>
          user.assignedProfessionIds!.includes(p.id)
        );
        return res.json(assignedProfessions);
      } else {
        // Return all professions for first-time selection
        const professions = await storage.getProfessions();
        return res.json(professions);
      }
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

      const user = await storage.getUser(userId);

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
        userId = req.session.adminUser;
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
      const professions = await storage.getProfessions();
      res.json(professions);
    } catch (error) {
      console.error("Error fetching professions:", error);
      res.status(500).json({ message: "Failed to fetch professions" });
    }
  });

  // Subject operations
  app.post('/api/subjects', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectData = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(500).json({ message: "Failed to create subject" });
    }
  });

  app.put('/api/subjects/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);
      const subjectData = insertSubjectSchema.parse(req.body);
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

      if (!user || user.role !== 'admin') {
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
  app.post('/api/modules', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleData = insertModuleSchema.parse(req.body);
      const module = await storage.createModule(moduleData);
      res.json(module);
    } catch (error) {
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  app.patch('/api/modules/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleId = parseInt(req.params.id);
      const moduleData = insertModuleSchema.partial().parse(req.body);
      const module = await storage.updateModule(moduleId, moduleData);
      res.json(module);
    } catch (error) {
      console.error("Error updating module:", error);
      res.status(500).json({ message: "Failed to update module" });
    }
  });

  app.delete('/api/modules/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
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



  app.get('/api/public/modules', combinedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.id;
      const user = await storage.getUser(userId);
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

      // For teachers and admins, show all modules; for students, only published ones
      if (user.role === 'teacher' || user.role === 'admin') {
        // If subjectId is provided, use it directly
        if (subjectId) {
          const modules = await storage.getModules(subjectId);
          res.json(cleanModules(modules));
          return;
        }

        // Otherwise, get all modules from all subjects
        const allSubjects = await storage.getSubjects(); // Get all subjects
        let allModules = [];

        for (const subject of allSubjects) {
          const modules = await storage.getModules(subject.id);
          allModules.push(...modules);
        }

        res.json(cleanModules(allModules));
      } else {
        // Regular students - only published modules
        if (subjectId) {
          const modules = await storage.getPublishedModules(subjectId);
          res.json(cleanModules(modules));
          return;
        }

        // Otherwise, get modules for user's profession subjects
        if (user.selectedProfessionId) {
          const subjects = await storage.getSubjects(user.selectedProfessionId);
          let allModules = [];

          for (const subject of subjects) {
            const modules = await storage.getPublishedModules(subject.id);
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
  app.post('/api/professions', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const professionData = insertProfessionSchema.parse(req.body);
      const profession = await storage.createProfession(professionData);
      res.json(profession);
    } catch (error) {
      console.error("Error creating profession:", error);
      res.status(500).json({ message: "Failed to create profession" });
    }
  });

  app.patch('/api/professions/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const professionId = parseInt(req.params.id);
      const professionData = insertProfessionSchema.partial().parse(req.body);
      const profession = await storage.updateProfession(professionId, professionData);
      res.json(profession);
    } catch (error) {
      console.error("Error updating profession:", error);
      res.status(500).json({ message: "Failed to update profession" });
    }
  });

  app.put('/api/professions/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const professionId = parseInt(req.params.id);
      const professionData = insertProfessionSchema.parse(req.body);
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

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const professionId = parseInt(req.params.id);
      await storage.deleteProfession(professionId);
      res.json({ message: "Profession deleted successfully" });
    } catch (error) {
      console.error("Error deleting profession:", error);
      res.status(500).json({ message: "Failed to delete profession" });
    }
  });

  app.delete('/api/professions/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
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

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectData = insertSubjectSchema.parse(req.body);
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

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);
      const subjectData = insertSubjectSchema.partial().parse(req.body);
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

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);
      const subjectData = insertSubjectSchema.parse(req.body);
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

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const subjectId = parseInt(req.params.id);

      // Check if subject has modules
      const modules = await storage.getModules(subjectId);
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

  app.post('/api/modules', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleData = insertModuleSchema.parse(req.body);
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

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const moduleId = parseInt(req.params.id);

      console.log('PATCH /api/modules/:id - Raw request body:', JSON.stringify(req.body, null, 2));

      const moduleData = insertModuleSchema.partial().parse(req.body);

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

  app.delete('/api/modules/:id', customAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user || user.role !== 'admin') {
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

      const isVoiceRequest = messageData.message.includes('Hangos magyarázat kérése');
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

  // Quiz endpoints
  app.post('/api/modules/:id/quiz', combinedAuth, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModule(moduleId);

      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      const { generateQuizFromModule } = await import('./openai');
      const moduleContent = module.content || '';
      const questions = await generateQuizFromModule(moduleContent);

      // Record API cost for quiz generation
      const quizTokens = Math.ceil((moduleContent.length + 500) / 4); // Content + prompt tokens
      const quizCost = quizTokens * 0.00015; // GPT-4o-mini pricing
      await storage.recordSimpleApiCall('OpenAI', 'Quiz', quizCost);

      res.json({ questions });
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  app.post('/api/quiz/evaluate', combinedAuth, async (req: any, res) => {
    try {
      const { question, correctAnswer, userAnswer, explanation } = req.body;

      if (!question || !correctAnswer || !userAnswer) {
        return res.status(400).json({ message: "Missing required fields" });
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
  app.get("/api/community-groups", combinedAuth, async (req: any, res) => {
    try {
      const professionId = req.query.professionId ? parseInt(req.query.professionId) : undefined;
      const groups = await storage.getCommunityGroups(professionId);
      res.json(groups);
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
      const discussions = await storage.getDiscussions(groupId, projectId);
      res.json(discussions);
    } catch (error) {
      console.error("Error fetching discussions:", error);
      res.status(500).json({ message: "Failed to fetch discussions" });
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
    } catch (error) {
      console.error("Error creating discussion:", error);
      res.status(500).json({ message: "Failed to create discussion" });
    }
  });

  // Teacher Routes
  app.get("/api/teacher/students", combinedAuth, async (req: any, res) => {
    try {
      // Check if user is a teacher
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'teacher') {
        return res.status(403).json({ message: "Access denied. Teachers only." });
      }

      const students = await storage.getAllStudents();
      res.json(students);
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

  // Iskolai admin middleware
  const schoolAdminAuth = (req: any, res: any, next: any) => {
    if (!req.session?.schoolAdminUser || req.session.schoolAdminUser.role !== 'school_admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Tanulók listája az iskolai admin számára
  app.get('/api/school-admin/students', schoolAdminAuth, async (req: any, res) => {
    try {
      const schoolAdminId = req.session.schoolAdminUser.id;
      console.log("Fetching students for school admin ID:", schoolAdminId);
      const students = await storage.getStudentsBySchoolAdmin(schoolAdminId);
      console.log("Found students count:", students.length);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  // Tanárok listája az iskolai admin számára
  app.get('/api/school-admin/teachers', schoolAdminAuth, async (req: any, res) => {
    try {
      const schoolAdminId = req.session.schoolAdminUser.id;
      console.log("Fetching teachers for school admin ID:", schoolAdminId);
      const teachers = await storage.getTeachersBySchoolAdmin(schoolAdminId);
      console.log("Found teachers count:", teachers.length);
      res.json(teachers);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      res.status(500).json({ message: "Failed to fetch teachers" });
    }
  });

  // Osztályok listája az iskolai admin számára
  app.get('/api/school-admin/classes', schoolAdminAuth, async (req: any, res) => {
    try {
      const schoolAdminId = req.session.schoolAdminUser.id;
      const classes = await storage.getClassesBySchoolAdmin(schoolAdminId);
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Új osztály létrehozása
  app.post('/api/school-admin/classes', schoolAdminAuth, async (req: any, res) => {
    try {
      const { name, description, professionId } = req.body;
      const schoolAdminId = req.session.schoolAdminUser.id;

      if (!name) {
        return res.status(400).json({ message: "Az osztály neve kötelező" });
      }

      const classData = {
        name,
        description: description || null,
        schoolAdminId,
        professionId: professionId || null
      };

      const newClass = await storage.createClass(classData);
      res.json({ message: "Osztály sikeresen létrehozva", class: newClass });
    } catch (error) {
      console.error("Error creating class:", error);
      res.status(500).json({ message: "Hiba történt az osztály létrehozása során" });
    }
  });

  // Szakma hozzárendelése osztályhoz
  app.post('/api/school-admin/classes/:classId/assign-profession', schoolAdminAuth, async (req: any, res) => {
    try {
      const { classId } = req.params;
      const { professionId } = req.body;
      const schoolAdminId = req.session.schoolAdminUser.id;

      if (!professionId || professionId === "none") {
        return res.status(400).json({ message: "Szakma kiválasztása kötelező" });
      }

      // Ellenőrizzük, hogy az osztály az iskolai adminhoz tartozik
      const classes = await storage.getClassesBySchoolAdmin(schoolAdminId);
      const classExists = classes.find(c => c.id === parseInt(classId));

      if (!classExists) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez az osztályhoz" });
      }

      await storage.assignProfessionToClass(parseInt(classId), professionId);
      res.json({ message: "Szakma sikeresen hozzárendelve az osztályhoz és a diákokhoz" });
    } catch (error) {
      console.error("Error assigning profession to class:", error);
      res.status(500).json({ message: "Hiba történt a szakma hozzárendelése során" });
    }
  });

  // Tanár hozzárendelése osztályhoz
  app.post('/api/school-admin/classes/:classId/assign-teacher', schoolAdminAuth, async (req: any, res) => {
    try {
      const { classId } = req.params;
      const { teacherId } = req.body;
      const schoolAdminId = req.session.schoolAdminUser.id;

      // Ellenőrizzük, hogy az osztály az iskolai adminhoz tartozik
      const classes = await storage.getClassesBySchoolAdmin(schoolAdminId);
      const classExists = classes.find(c => c.id === parseInt(classId));

      if (!classExists) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez az osztályhoz" });
      }

      // Ellenőrizzük, hogy a tanár az iskolai adminhoz tartozik
      const teachers = await storage.getTeachersBySchoolAdmin(schoolAdminId);
      const teacherExists = teachers.find(t => t.id === teacherId);

      if (!teacherExists) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez a tanárhoz" });
      }

      await storage.assignTeacherToClassById(parseInt(classId), teacherId);
      res.json({ message: "Tanár sikeresen hozzárendelve az osztályhoz" });
    } catch (error) {
      console.error("Error assigning teacher to class:", error);
      res.status(500).json({ message: "Hiba történt a tanár hozzárendelése során" });
    }
  });

  // Diák hozzáadása osztályhoz
  app.post('/api/school-admin/classes/:classId/add-student', schoolAdminAuth, async (req: any, res) => {
    try {
      const { classId } = req.params;
      const { studentId } = req.body;
      const schoolAdminId = req.session.schoolAdminUser.id;

      // Ellenőrizzük, hogy az osztály az iskolai adminhoz tartozik
      const classes = await storage.getClassesBySchoolAdmin(schoolAdminId);
      const classExists = classes.find(c => c.id === parseInt(classId));

      if (!classExists) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez az osztályhoz" });
      }

      // Ellenőrizzük, hogy a diák az iskolai adminhoz tartozik
      const students = await storage.getStudentsBySchoolAdmin(schoolAdminId);
      const studentExists = students.find(s => s.id === studentId);

      if (!studentExists) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez a diákhoz" });
      }

      await storage.addStudentToClass(studentId, parseInt(classId));
      res.json({ message: "Diák sikeresen hozzáadva az osztályhoz" });
    } catch (error) {
      console.error("Error adding student to class:", error);
      res.status(500).json({ message: "Hiba történt a diák hozzáadása során" });
    }
  });

  // Diák eltávolítása osztályból
  app.post('/api/school-admin/classes/:classId/remove-student', schoolAdminAuth, async (req: any, res) => {
    try {
      const { classId } = req.params;
      const { studentId } = req.body;
      const schoolAdminId = req.session.schoolAdminUser.id;

      // Ellenőrizzük, hogy az osztály az iskolai adminhoz tartozik
      const classes = await storage.getClassesBySchoolAdmin(schoolAdminId);
      const classExists = classes.find(c => c.id === parseInt(classId));

      if (!classExists) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez az osztályhoz" });
      }

      // Ellenőrizzük, hogy a diák az iskolai adminhoz tartozik
      const students = await storage.getStudentsBySchoolAdmin(schoolAdminId);
      const studentExists = students.find(s => s.id === studentId);

      if (!studentExists) {
        return res.status(403).json({ message: "Nincs jogosultsága ehhez a diákhoz" });
      }

      await storage.removeStudentFromClass(studentId);
      res.json({ message: "Diák sikeresen eltávolítva az osztályból" });
    } catch (error) {
      console.error("Error removing student from class:", error);
      res.status(500).json({ message: "Hiba történt a diák eltávolítása során" });
    }
  });

  // Tanuló hozzárendelése tanárhoz
  app.post('/api/school-admin/assign-student', schoolAdminAuth, async (req: any, res) => {
    try {
      const { studentId, teacherId } = req.body;

      if (!studentId || !teacherId) {
        return res.status(400).json({ message: "Student ID and teacher ID are required" });
      }

      await storage.assignStudentToTeacher(studentId, teacherId);
      res.json({ success: true, message: "Student assigned to teacher successfully" });
    } catch (error) {
      console.error("Error assigning student to teacher:", error);
      res.status(500).json({ message: "Failed to assign student to teacher" });
    }
  });

  // Tanuló eltávolítása tanártól
  app.post('/api/school-admin/remove-student', schoolAdminAuth, async (req: any, res) => {
    try {
      const { studentId } = req.body;

      if (!studentId) {
        return res.status(400).json({ message: "Student ID is required" });
      }

      await storage.removeStudentFromTeacher(studentId);
      res.json({ success: true, message: "Student removed from teacher successfully" });
    } catch (error) {
      console.error("Error removing student from teacher:", error);
      res.status(500).json({ message: "Failed to remove student from teacher" });
    }
  });

  // Tanár regisztráció iskolai admin által
  app.post("/api/school-admin/register-teacher", schoolAdminAuth, async (req: any, res) => {
    try {
      const { firstName, lastName, username, email, password } = req.body;
      const schoolAdminId = req.session.schoolAdminUser.id;

      if (!username || !password) {
        return res.status(400).json({ message: "Felhasználónév és jelszó kötelező" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "A jelszónak legalább 6 karakterből kell állnia" });
      }

      // Ellenőrizzük, hogy a felhasználónév egyedi-e
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
      }

      // Tanár regisztrálása az iskolai admin alatt
      const teacherData = {
        firstName: firstName || null,
        lastName: lastName || null,
        username,
        email: email || null,
        password,
        role: "teacher" as const,
        schoolAdminId
      };

      const newTeacher = await storage.createUser(teacherData);

      res.json({
        message: "Tanár sikeresen regisztrálva",
        teacher: {
          id: newTeacher.id,
          username: newTeacher.username,
          firstName: newTeacher.firstName,
          lastName: newTeacher.lastName,
          email: newTeacher.email
        }
      });
    } catch (error) {
      console.error("Teacher registration error:", error);
      res.status(500).json({ message: "Szerver hiba történt a tanár regisztráció során" });
    }
  });

  // Diák regisztráció iskolai admin által
  app.post("/api/school-admin/register-student", schoolAdminAuth, async (req: any, res) => {
    try {
      const { firstName, lastName, username, email, password } = req.body;
      const schoolAdminId = req.session.schoolAdminUser.id;

      if (!username || !password) {
        return res.status(400).json({ message: "Felhasználónév és jelszó kötelező" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "A jelszónak legalább 6 karakterből kell állnia" });
      }

      // Ellenőrizzük, hogy a felhasználónév egyedi-e
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Ez a felhasználónév már foglalt" });
      }

      // Diák regisztrálása az iskolai admin alatt
      const studentData = {
        firstName: firstName || null,
        lastName: lastName || null,
        username,
        email: email || null,
        password,
        role: "student" as const,
        schoolAdminId
      };

      const newStudent = await storage.createUser(studentData);

      res.json({
        message: "Diák sikeresen regisztrálva",
        student: {
          id: newStudent.id,
          username: newStudent.username,
          firstName: newStudent.firstName,
          lastName: newStudent.lastName,
          email: newStudent.email
        }
      });
    } catch (error) {
      console.error("Student registration error:", error);
      res.status(500).json({ message: "Szerver hiba történt a diák regisztráció során" });
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

      if (!user || user.role !== 'admin') {
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

      if (!user || user.role !== 'admin') {
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
        return res.status(403).json({ message: 'Access denied' });
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
        return res.status(403).json({ message: 'Access denied' });
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
}
