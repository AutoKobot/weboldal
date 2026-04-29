import { storage } from "../storage";

// In-memory cache to throttle attendance tracking
export const studentActivityTracker = new Map<string, number>();
export const userSyncTracker = new Map<string, number>();

// Combined authentication middleware for both Replit and local auth
export const combinedAuth = async (req: any, res: any, next: any) => {
  try {
    // console.log('Combined auth check - Full session:', JSON.stringify(req.session, null, 2));
    // console.log('Combined auth check - session.adminUser:', req.session?.adminUser?.id);
    // console.log('Combined auth check - session.schoolAdminUser:', req.session?.schoolAdminUser?.id);
    // console.log('Combined auth check - isAuthenticated:', req.isAuthenticated && req.isAuthenticated());

    // Check for admin session first
    if (req.session?.adminUser) {
      req.user = {
        id: req.session.adminUser.id,
        claims: { sub: req.session.adminUser.id },
        role: 'admin'
      };
      return next();
    }

    // Check for demo user
    if (req.session?.demoUser) {
      req.user = req.session.demoUser;
      req.user.claims = { sub: req.user.id };
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

    // Check for local authentication
    if (req.isAuthenticated && req.isAuthenticated()) {
      // Normalize local user structure to match Replit auth expectation
      if (req.user && !req.user.claims) {
        req.user.claims = { sub: req.user.id };
      }

      // Option 1: Automatikus aktivitás alapú jelenlét rögzítés diákoknak
      if (req.user && req.user.role === 'student') {
        const studentId = req.user.id;
        const now = Date.now();
        
        // Throttling: Csak 5 percenként egyszer próbáljuk meg rögzíteni a jelenlétet
        if (!studentActivityTracker.has(studentId) || (now - studentActivityTracker.get(studentId)!) > 5 * 60 * 1000) {
          studentActivityTracker.set(studentId, now);
          storage.recordLoginAttendance(studentId).catch(err => {
            console.error('Error tracking student activity attendance:', err);
            studentActivityTracker.delete(studentId);
          });
        }
      }

      return next();
    }

    return res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
