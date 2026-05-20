import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { storage } from "./storage";


// Removed top-level check to allow running on non-Replit environments
// if (!process.env.REPLIT_DOMAINS) {
//   throw new Error("Environment variable REPLIT_DOMAINS not provided");
// }

const getOidcConfig = memoize(
  async () => {
    try {
      return await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    } catch (error) {
      console.warn("OIDC configuration discovery failed:", error);
      // Return a minimal config to prevent hanging, though Replit Auth won't work
      return { 
        issuer: process.env.ISSUER_URL ?? "https://replit.com/oidc",
        authorization_endpoint: `${process.env.ISSUER_URL ?? "https://replit.com/oidc"}/auth`,
        token_endpoint: `${process.env.ISSUER_URL ?? "https://replit.com/oidc"}/token`,
        jwks_uri: `${process.env.ISSUER_URL ?? "https://replit.com/oidc"}/jwks`
      } as any;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // Use MemoryStore – connect-pg-simple's CREATE TABLE DDL fails on Supabase
  // transaction-mode pooler (port 6543). MemoryStore is fine for Render
  // (sessions reset on deploy, which is acceptable).
  return session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Check if user already exists to preserve their role
  const existingUser = await storage.getUser(claims["sub"]);

  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    // Only set role to 'student' for new users, preserve existing role for existing users
    role: existingUser ? existingUser.role : 'student',
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Only setup Replit Auth if REPLIT_DOMAINS is present
  if (process.env.REPLIT_DOMAINS) {
    try {
      const config = await getOidcConfig();

      const verify: VerifyFunction = async (
        tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
        verified: passport.AuthenticateCallback
      ) => {
        const user = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
      };

      for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
        const strategy = new Strategy(
          {
            name: `replitauth:${domain}`,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
          },
          verify,
        );
        passport.use(strategy);
      }
    } catch (err) {
      console.error("Failed to setup Replit Auth:", err);
    }
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    if (!process.env.REPLIT_DOMAINS) {
      return res.status(501).json({ message: "Replit Auth not configured" });
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(async () => {
      try {
        const config = await getOidcConfig();
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } catch {
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Not logged in at all
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;

  // Local users (username/password auth) don't have Replit OIDC tokens.
  // If there's no expires_at, this is a local user – allow through.
  if (!user.expires_at) {
    return next();
  }

  // Replit OIDC user: check token expiry
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
