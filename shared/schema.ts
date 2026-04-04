import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  integer,
  serial,
  boolean,
  numeric,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Iskolák tábla - ÚJ
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type School = typeof schools.$inferSelect;
export type InsertSchool = typeof schools.$inferInsert;
export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User storage table (supports both Replit Auth and local auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique(), // for local auth
  password: varchar("password"), // for local auth (hashed)
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("student"), // "student", "teacher", "admin", or "school_admin"
  authType: varchar("auth_type").notNull().default("replit"), // "replit" or "local"
  selectedProfessionId: integer("selected_profession_id").references((): AnyPgColumn => professions.id),
  assignedProfessionIds: jsonb("assigned_profession_ids").default([]).$type<number[]>(), // Admin által hozzárendelt szakmák
  assignedTeacherId: varchar("assigned_teacher_id"), // Iskolai admin által hozzárendelt tanár
  schoolId: integer("school_id").references(() => schools.id), // Iskola azonosító
  schoolName: varchar("school_name"), // Iskola neve (legacy / redundáns de megtartjuk a kompatibilitásért)
  schoolAdminId: varchar("school_admin_id"), // Melyik iskolai admin hozta létre (preferáltan schoolId használatával váltsuk ki)
  classId: integer("class_id"), // Melyik osztályhoz tartozik
  phone: varchar("phone"), // Telefonszám
  currentStreak: integer("current_streak").default(0), // Folytonos bejelentkezések
  lastActiveDate: timestamp("last_active_date"), // Utolsó aktív nap
  xp: integer("xp").default(0), // Tapasztalati pontok
  completedModules: jsonb("completed_modules").default([]).$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Professions table - szakmák (pl. Hegesztő)
export const professions = pgTable("professions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  iconName: varchar("icon_name"), // Lucide icon name (pl. "wrench", "hammer", "cpu")
  iconUrl: varchar("icon_url"), // Feltöltött kép URL
  schoolId: integer("school_id").references(() => schools.id), // Melyik iskolához tartozik (null = admin által globális)
  schoolAdminId: varchar("school_admin_id").references((): AnyPgColumn => users.id), // Legacy
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subjects table - tantárgyak egy szakmán belül (pl. Anyagismeret, Gépészet)
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  professionId: integer("profession_id").references(() => professions.id).notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  schoolId: integer("school_id").references(() => schools.id), // Melyik iskolához tartozik
  schoolAdminId: varchar("school_admin_id").references((): AnyPgColumn => users.id), // Legacy
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Modules table - modulok egy tantárgyon belül (pl. Kémiai tulajdonságok)
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  conciseContent: text("concise_content"), // Tömör verzió
  detailedContent: text("detailed_content"), // Bővített verzió
  keyConceptsData: jsonb("key_concepts_data"), // JSON struktura a kulcsfogalmakhoz és videókhoz
  moduleNumber: integer("module_number").notNull(),
  videoUrl: varchar("video_url"), // Feltöltött videó vagy YouTube URL
  audioUrl: varchar("audio_url"), // Feltöltött podcast/hang fájl
  imageUrl: varchar("image_url"), // Modul borítókép
  youtubeUrl: varchar("youtube_url"), // YouTube videó URL
  podcastUrl: varchar("podcast_url"), // Külső podcast URL
  presentationUrl: varchar("presentation_url"), // Feltöltött prezentáció URL (pl. pptx)
  presentationData: jsonb("presentation_data"), // Új: Strukturált JSON az interaktív HTML prezentációhoz
  isPublished: boolean("is_published").default(false),
  generatedQuizzes: jsonb("generated_quizzes"), // 5 elre generált tesztsor
  schoolId: integer("school_id").references(() => schools.id), // Melyik iskolához tartozik
  schoolAdminId: varchar("school_admin_id").references((): AnyPgColumn => users.id), // Legacy
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction table for many-to-many relationship between modules and subjects
export const moduleSubjectAssignments = pgTable("module_subject_assignments", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => modules.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Flashcards table for learning cards
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => modules.id).notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  senderRole: varchar("sender_role").notNull(), // "user" or "ai"
  userId: varchar("user_id").notNull().references(() => users.id),
  relatedModuleId: integer("related_module_id").references(() => modules.id),
  isSystemMessage: boolean("is_system_message").default(false), // jelzi, hogy rendszer üzenet-e
  timestamp: timestamp("timestamp").defaultNow(),
});

// Test results table - teszt eredmények
export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  moduleId: integer("module_id").references(() => modules.id).notNull(),
  score: integer("score").notNull(),
  maxScore: integer("max_score").default(100).notNull(),
  passed: boolean("passed").default(false).notNull(),
  details: jsonb("details"), // Store question/answer details
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  selectedProfession: one(professions, { fields: [users.selectedProfessionId], references: [professions.id] }),
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  chatMessages: many(chatMessages),
  assignedClass: one(classes, { fields: [users.classId], references: [classes.id] }),
  testResults: many(testResults),
}));

export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  classes: many(classes),
  professions: many(professions),
  subjects: many(subjects),
  modules: many(modules),
}));

export const professionsRelations = relations(professions, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  profession: one(professions, { fields: [subjects.professionId], references: [professions.id] }),
  modules: many(modules),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  subject: one(subjects, { fields: [modules.subjectId], references: [subjects.id] }),
  additionalAssignments: many(moduleSubjectAssignments),
  chatMessages: many(chatMessages),
  flashcards: many(flashcards),
}));

export const moduleSubjectAssignmentsRelations = relations(moduleSubjectAssignments, ({ one }) => ({
  module: one(modules, { fields: [moduleSubjectAssignments.moduleId], references: [modules.id] }),
  subject: one(subjects, { fields: [moduleSubjectAssignments.subjectId], references: [subjects.id] }),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  module: one(modules, { fields: [flashcards.moduleId], references: [modules.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  relatedModule: one(modules, {
    fields: [chatMessages.relatedModuleId],
    references: [modules.id],
  }),
}));

// System settings table for storing API keys and configurations
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").unique().notNull(),
  value: text("value"),
  encrypted: boolean("encrypted").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

// AI settings table for OpenAI configuration
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  maxTokens: integer("max_tokens").default(2000).notNull(),
  temperature: text("temperature").default("0.7").notNull(),
  model: varchar("model", { length: 100 }).default("gpt-4o-mini").notNull(),
  systemMessage: text("system_message"),
  imageProvider: varchar("image_provider", { length: 50 }).default("openai").notNull(),
  imageModel: varchar("image_model", { length: 100 }).default("dall-e-3").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by", { length: 255 }).notNull(),
});

// Community groups for collaborative learning
export const communityGroups = pgTable("community_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  professionId: integer("profession_id").references(() => professions.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  memberLimit: integer("member_limit").default(50),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group membership table
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => communityGroups.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role").default("member"), // "admin", "moderator", "member"
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Community projects for collaborative learning
export const communityProjects = pgTable("community_projects", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  groupId: integer("group_id").references(() => communityGroups.id).notNull(),
  moduleId: integer("module_id").references(() => modules.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  status: varchar("status").default("active"), // "active", "completed", "cancelled"
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project participants
export const projectParticipants = pgTable("project_participants", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => communityProjects.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role").default("participant"), // "lead", "participant"
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Discussion threads for groups and projects
export const discussions = pgTable("discussions", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  groupId: integer("group_id").references(() => communityGroups.id),
  projectId: integer("project_id").references(() => communityProjects.id),
  parentId: integer("parent_id"), // Self-reference handled separately
  isPinned: boolean("is_pinned").default(false).notNull(),
  tags: text("tags").array().default([]),  // ["#kérdés", "#tipp", "#bejelentés"]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Emoji reactions on discussion posts
export const discussionReactions = pgTable("discussion_reactions", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id").references(() => discussions.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(), // "👍" "❤️" "🔥" "💡"
  createdAt: timestamp("created_at").defaultNow(),
});

// Peer reviews and feedback
export const peerReviews = pgTable("peer_reviews", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => communityProjects.id).notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id).notNull(),
  reviewedUserId: varchar("reviewed_user_id").references(() => users.id).notNull(),
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admin messages from students
export const adminMessages = pgTable("admin_messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  response: text("response"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

// Classes table for school admin organization
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // pl. "9.A", "Hegesztő 2024"
  description: text("description"), // Osztály leírása
  schoolId: integer("school_id").references(() => schools.id), // Melyik iskolához tartozik
  schoolAdminId: varchar("school_admin_id").references(() => users.id), // Legacy / Melyik admin hozta létre
  assignedTeacherId: varchar("assigned_teacher_id").references(() => users.id), // Osztályfőnök
  professionId: integer("profession_id").references(() => professions.id), // Osztályhoz rendelt szakma
  scheduleGroup: varchar("schedule_group").notNull().default("morning"), // pl. "morning", "afternoon"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Class announcements for teacher -> class messages
export const classAnnouncements = pgTable("class_announcements", {
  id: serial("id").primaryKey(),
  teacherId: varchar("teacher_id").references(() => users.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").default("info").notNull(), // "info", "action_required", "event"
  options: jsonb("options").default(["Értettem"]), // Custom response buttons if needed
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// Acknowledgment tracking for announcements
export const announcementAcknowledgements = pgTable("announcement_acknowledgements", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => classAnnouncements.id, { onDelete: "cascade" }).notNull(),
  studentId: varchar("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  response: varchar("response"), // Which button they clicked
  acknowledgedAt: timestamp("acknowledged_at").defaultNow().notNull(),
}, (t) => ({
  uniqueAck: uniqueIndex("unique_acknowledgement").on(t.announcementId, t.studentId),
}));

// ── Jelenlét kezelés ──────────────────────────────────────────────────────────

// Lesson schedule table – iskolai órarend (tanórák kezdési/befejezési ideje)
export const lessonSchedules = pgTable("lesson_schedules", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id), // Melyik iskolához tartozik
  schoolAdminId: varchar("school_admin_id").references((): AnyPgColumn => users.id), // Legacy
  periodNumber: integer("period_number").notNull(), // 1, 2, 3, ... (hányadik tanóra)
  startHour: integer("start_hour").notNull(),   // pl. 8  (08:00)
  startMinute: integer("start_minute").notNull().default(0), // pl. 0
  endHour: integer("end_hour").notNull(),       // pl. 8  (08:45)
  endMinute: integer("end_minute").notNull().default(45),
  label: varchar("label"), // pl. "1. óra", "Szünet utáni 1."
  scheduleGroup: varchar("schedule_group").notNull().default("morning"), // ÚJ: melyik műszakhoz tartozik
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  lessonScheduleUnique: uniqueIndex("lesson_schedule_unique").on(t.schoolId, t.periodNumber, t.scheduleGroup),
}));

// Attendance table – jelenlét nyilvántartás (tanóránkénti, automatikus login alapján)
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").references((): AnyPgColumn => users.id, { onDelete: "cascade" }).notNull(),
  classId: integer("class_id").references((): AnyPgColumn => classes.id).notNull(),
  teacherId: varchar("teacher_id").references((): AnyPgColumn => users.id),
  date: varchar("date").notNull(), // "YYYY-MM-DD" formátum
  periodNumber: integer("period_number").notNull(), // hányadik óra
  status: varchar("status").notNull().default("present"), // "present" | "absent" | "late" | "excused"
  recordedAt: timestamp("recorded_at").defaultNow(), // mikor lett rögzítve
  recordedBy: varchar("recorded_by").notNull().default("auto"), // "auto" | tanár userId
  loginAt: timestamp("login_at"), // mikor lépett be a diák
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  attendanceUnique: uniqueIndex("attendance_unique").on(t.studentId, t.classId, t.date, t.periodNumber),
}));

// Student daily notes – napi megjegyzések tanártól diákonként
export const studentDailyNotes = pgTable("student_daily_notes", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").references((): AnyPgColumn => users.id, { onDelete: "cascade" }).notNull(),
  teacherId: varchar("teacher_id").references((): AnyPgColumn => users.id).notNull(),
  classId: integer("class_id").references((): AnyPgColumn => classes.id),
  date: varchar("date").notNull(), // "YYYY-MM-DD"
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student avatars (Tamagotchi)
export const studentAvatars = pgTable("student_avatars", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references((): AnyPgColumn => users.id, { onDelete: "cascade" }).notNull(),
  avatarType: varchar("avatar_type").default("test").notNull(),
  name: varchar("name"),
  level: integer("level").default(1).notNull(),
  hunger: integer("hunger").default(100).notNull(),
  happiness: integer("happiness").default(100).notNull(),
  xpInvested: integer("xp_invested").default(0).notNull(),
  isAlive: boolean("is_alive").default(true).notNull(),
  lastFedAt: timestamp("last_fed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  authType: true,
  phone: true,
  schoolId: true,
  schoolName: true,
  schoolAdminId: true,
});

// Schema for local user registration
export const localUserRegisterSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firstName: true,
  lastName: true,
}).extend({
  email: z.string().email("Érvényes email címet adj meg"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"],
});

// Schema for local user login
export const localUserLoginSchema = z.object({
  username: z.string().min(1, "Felhasználónév szükséges"),
  password: z.string().min(1, "Jelszó szükséges"),
});

// API Cost Tracking tables
export const apiCalls = pgTable("api_calls", {
  id: serial("id").primaryKey(),
  provider: varchar("provider").notNull(), // "openai", "google", "youtube", "wikipedia", etc.
  service: varchar("service").notNull(), // "chat", "tts", "search", "video_search", etc.
  model: varchar("model"), // "gpt-4", "gemini-pro", etc.
  tokenCount: integer("token_count").default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(), // Cost in USD with 6 decimal precision
  userId: varchar("user_id").references(() => users.id),
  moduleId: integer("module_id").references(() => modules.id),
  requestData: jsonb("request_data"), // Store request details for analysis
  responseData: jsonb("response_data"), // Store response details for analysis
  createdAt: timestamp("created_at").defaultNow(),
});

export const monthlyCosts = pgTable("monthly_costs", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  apiCosts: numeric("api_costs", { precision: 10, scale: 2 }).default("0.00"),
  developmentCosts: numeric("development_costs", { precision: 10, scale: 2 }).default("0.00"),
  infrastructureCosts: numeric("infrastructure_costs", { precision: 10, scale: 2 }).default("0.00"),
  otherCosts: numeric("other_costs", { precision: 10, scale: 2 }).default("0.00"),
  totalCosts: numeric("total_costs", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cost tracking types
export type ApiCall = typeof apiCalls.$inferSelect;
export type InsertApiCall = typeof apiCalls.$inferInsert;

export type MonthlyCost = typeof monthlyCosts.$inferSelect;
export type InsertMonthlyCost = typeof monthlyCosts.$inferInsert;

export const insertApiCallSchema = createInsertSchema(apiCalls);
export const insertMonthlyCostSchema = createInsertSchema(monthlyCosts);

// API pricing configuration table
export const apiPricing = pgTable("api_pricing", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull(),
  service: varchar("service", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }),
  pricePerToken: text("price_per_token").default("0.00000000"),
  pricePerRequest: text("price_per_request").default("0.000000"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ApiPricing = typeof apiPricing.$inferSelect;
export type InsertApiPricing = typeof apiPricing.$inferInsert;

export const insertApiPricingSchema = createInsertSchema(apiPricing);

export const insertProfessionSchema = createInsertSchema(professions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  schoolAdminId: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  schoolAdminId: true,
});

// Type definitions for key concepts data structure
export const youtubeVideoSchema = z.object({
  title: z.string(),
  videoId: z.string(),
  description: z.string(),
  url: z.string(),
});

// Wikipedia link schema
export const wikipediaLinkSchema = z.object({
  text: z.string(),
  url: z.string(),
  description: z.string().optional(),
});

export const keyConceptSchema = z.object({
  concept: z.string(),
  definition: z.string(),
  youtubeVideos: z.array(youtubeVideoSchema),
  wikipediaLinks: z.array(wikipediaLinkSchema).optional(),
});

export const keyConceptsDataSchema = z.array(keyConceptSchema);

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  schoolAdminId: true,
}).extend({
  youtubeUrl: z.string().optional().nullable(),
  podcastUrl: z.string().optional().nullable(),
  presentationUrl: z.string().optional().nullable(),
  keyConceptsData: keyConceptsDataSchema.optional().nullable(),
  generatedQuizzes: z.array(z.any()).optional().nullable(),
  additionalSubjectIds: z.array(z.number()).optional(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

// Community relations (after all table declarations)
export const communityGroupsRelations = relations(communityGroups, ({ one, many }) => ({
  profession: one(professions, { fields: [communityGroups.professionId], references: [professions.id] }),
  creator: one(users, { fields: [communityGroups.createdBy], references: [users.id] }),
  members: many(groupMembers),
  projects: many(communityProjects),
  discussions: many(discussions),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(communityGroups, { fields: [groupMembers.groupId], references: [communityGroups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const communityProjectsRelations = relations(communityProjects, ({ one, many }) => ({
  group: one(communityGroups, { fields: [communityProjects.groupId], references: [communityGroups.id] }),
  module: one(modules, { fields: [communityProjects.moduleId], references: [modules.id] }),
  creator: one(users, { fields: [communityProjects.createdBy], references: [users.id] }),
  participants: many(projectParticipants),
  discussions: many(discussions),
  reviews: many(peerReviews),
}));

export const projectParticipantsRelations = relations(projectParticipants, ({ one }) => ({
  project: one(communityProjects, { fields: [projectParticipants.projectId], references: [communityProjects.id] }),
  user: one(users, { fields: [projectParticipants.userId], references: [users.id] }),
}));

export const discussionsRelations = relations(discussions, ({ one, many }) => ({
  author: one(users, { fields: [discussions.authorId], references: [users.id] }),
  group: one(communityGroups, { fields: [discussions.groupId], references: [communityGroups.id] }),
  project: one(communityProjects, { fields: [discussions.projectId], references: [communityProjects.id] }),
  parent: one(discussions, { fields: [discussions.parentId], references: [discussions.id] }),
  replies: many(discussions),
}));

export const peerReviewsRelations = relations(peerReviews, ({ one }) => ({
  project: one(communityProjects, { fields: [peerReviews.projectId], references: [communityProjects.id] }),
  reviewer: one(users, { fields: [peerReviews.reviewerId], references: [users.id] }),
  reviewedUser: one(users, { fields: [peerReviews.reviewedUserId], references: [users.id] }),
}));

export const adminMessagesRelations = relations(adminMessages, ({ one }) => ({
  sender: one(users, { fields: [adminMessages.senderId], references: [users.id] }),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  schoolAdmin: one(users, { fields: [classes.schoolAdminId], references: [users.id] }),
  assignedTeacher: one(users, { fields: [classes.assignedTeacherId], references: [users.id] }),
  profession: one(professions, { fields: [classes.professionId], references: [professions.id] }),
  students: many(users),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  user: one(users, { fields: [testResults.userId], references: [users.id] }),
  module: one(modules, { fields: [testResults.moduleId], references: [modules.id] }),
}));


// Community schemas
export const insertCommunityGroupSchema = createInsertSchema(communityGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityProjectSchema = createInsertSchema(communityProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscussionSchema = createInsertSchema(discussions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscussionReactionSchema = createInsertSchema(discussionReactions).omit({
  id: true,
  createdAt: true,
});
export type DiscussionReaction = typeof discussionReactions.$inferSelect;
export type InsertDiscussionReaction = z.infer<typeof insertDiscussionReactionSchema>;

export const ALLOWED_EMOJIS = ["👍", "❤️", "🔥", "💡"] as const;
export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

export const DISCUSSION_TAGS = ["#kérdés", "#tipp", "#bejelentés", "#segítség", "#megbeszélés"] as const;
export type DiscussionTag = (typeof DISCUSSION_TAGS)[number];

export const insertPeerReviewSchema = createInsertSchema(peerReviews).omit({
  id: true,
  createdAt: true,
});

export const insertAdminMessageSchema = createInsertSchema(adminMessages).omit({
  id: true,
  createdAt: true,
  respondedAt: true,
  isResolved: true,
  response: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
// Performed deduplication and added missing type exports
export type Profession = typeof professions.$inferSelect;
export type InsertProfession = z.infer<typeof insertProfessionSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modules.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type YoutubeVideo = z.infer<typeof youtubeVideoSchema>;
export type WikipediaLink = z.infer<typeof wikipediaLinkSchema>;
export type KeyConcept = z.infer<typeof keyConceptSchema>;
export type KeyConceptsData = z.infer<typeof keyConceptsDataSchema>;

// Flashcard types
export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;

// Community types
export type CommunityGroup = typeof communityGroups.$inferSelect;
export type InsertCommunityGroup = z.infer<typeof insertCommunityGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type CommunityProject = typeof communityProjects.$inferSelect;
export type InsertCommunityProject = z.infer<typeof insertCommunityProjectSchema>;
export type ProjectParticipant = typeof projectParticipants.$inferSelect;
export type Discussion = typeof discussions.$inferSelect;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type PeerReview = typeof peerReviews.$inferSelect;
export type InsertPeerReview = z.infer<typeof insertPeerReviewSchema>;
export type AdminMessage = typeof adminMessages.$inferSelect;
export type InsertAdminMessage = z.infer<typeof insertAdminMessageSchema>;

// Notifications table – real-time user notification system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // "discussion_reply" | "group_join" | "group_activity" | "system"
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  link: varchar("link"), // Optional: navigate to this URL when clicked
  isRead: boolean("is_read").default(false).notNull(),
  actorId: varchar("actor_id").references(() => users.id, { onDelete: "set null" }), // Who triggered the notification
  metadata: jsonb("metadata").default({}), // Extra data (groupId, discussionId, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

export type AISetting = typeof aiSettings.$inferSelect;
export type InsertAISetting = typeof aiSettings.$inferInsert;

// AI settings schema for validation
export const insertAISettingsSchema = z.object({
  maxTokens: z.number().min(100).max(4000).default(2000),
  temperature: z.string().default("0.7"),
  model: z.string().default("gpt-4o-mini"),
  systemMessage: z.string().optional(),
  imageProvider: z.string().default("openai"),
  imageModel: z.string().default("dall-e-3"),
});

// Privacy compliance tables
export const userConsents = pgTable("user_consents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  sessionId: varchar("session_id"), // For users not yet registered
  consentType: varchar("consent_type").notNull(), // "cookies", "analytics", "marketing", "data_processing"
  consentValue: boolean("consent_value").notNull(),
  consentSource: varchar("consent_source").default("website"), // "website", "email", "phone"
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const privacyRequests = pgTable("privacy_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email"),
  requestType: varchar("request_type").notNull(), // "access", "erasure", etc.
  requestData: jsonb("request_data").default({}),
  responseData: jsonb("response_data").default({}),
  status: varchar("status").default("pending"),
  adminNotes: text("admin_notes"),
  processedBy: varchar("processed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const dataProcessingActivities = pgTable("data_processing_activities", {
  id: serial("id").primaryKey(),
  activityName: varchar("activity_name").notNull(),
  purpose: text("purpose").notNull(),
  legalBasis: varchar("legal_basis").notNull(), // "consent", "contract", "legal_obligation", "legitimate_interest"
  dataCategories: text("data_categories").array(), // ["personal_data", "sensitive_data", "technical_data"]
  dataSubjects: text("data_subjects").array(), // ["students", "teachers", "admins"]
  recipients: text("recipients").array(), // Who has access to this data
  retentionPeriod: varchar("retention_period"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Privacy compliance types and schemas
export type UserConsent = typeof userConsents.$inferSelect;
export type InsertUserConsent = typeof userConsents.$inferInsert;
export type PrivacyRequest = typeof privacyRequests.$inferSelect;
export type InsertPrivacyRequest = typeof privacyRequests.$inferInsert;
export type DataProcessingActivity = typeof dataProcessingActivities.$inferSelect;
export type InsertDataProcessingActivity = typeof dataProcessingActivities.$inferInsert;


export const insertUserConsentSchema = createInsertSchema(userConsents);
export const insertPrivacyRequestSchema = createInsertSchema(privacyRequests);
export const insertDataProcessingActivitySchema = createInsertSchema(dataProcessingActivities);

// Student avatars types and schemas
export type StudentAvatar = typeof studentAvatars.$inferSelect;
export type InsertStudentAvatar = typeof studentAvatars.$inferInsert;
export const insertStudentAvatarSchema = createInsertSchema(studentAvatars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Test results types and schemas
export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = typeof testResults.$inferInsert;
export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  createdAt: true,
});

// ── Relations ────────────────────────────────────────────────────────
export const lessonSchedulesRelations = relations(lessonSchedules, ({ one }) => ({
  school: one(schools, { fields: [lessonSchedules.schoolId], references: [schools.id] }),
  schoolAdmin: one(users, { fields: [lessonSchedules.schoolAdminId], references: [users.id] }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(users, { fields: [attendance.studentId], references: [users.id] }),
  class: one(classes, { fields: [attendance.classId], references: [classes.id] }),
  teacher: one(users, { fields: [attendance.teacherId], references: [users.id] }),
}));

export const studentDailyNotesRelations = relations(studentDailyNotes, ({ one }) => ({
  student: one(users, { fields: [studentDailyNotes.studentId], references: [users.id] }),
  teacher: one(users, { fields: [studentDailyNotes.teacherId], references: [users.id] }),
  class: one(classes, { fields: [studentDailyNotes.classId], references: [classes.id] }),
}));

export const classAnnouncementsRelations = relations(classAnnouncements, ({ one, many }) => ({
  teacher: one(users, { fields: [classAnnouncements.teacherId], references: [users.id] }),
  class: one(classes, { fields: [classAnnouncements.classId], references: [classes.id] }),
  acknowledgements: many(announcementAcknowledgements),
}));

export const announcementAcknowledgementsRelations = relations(announcementAcknowledgements, ({ one }) => ({
  announcement: one(classAnnouncements, { fields: [announcementAcknowledgements.announcementId], references: [classAnnouncements.id] }),
  student: one(users, { fields: [announcementAcknowledgements.studentId], references: [users.id] }),
}));

// Announcement types & schemas
export type ClassAnnouncement = typeof classAnnouncements.$inferSelect;
export type InsertClassAnnouncement = typeof classAnnouncements.$inferInsert;
export const insertClassAnnouncementSchema = createInsertSchema(classAnnouncements).omit({
  id: true,
  createdAt: true,
});

export type AnnouncementAcknowledgement = typeof announcementAcknowledgements.$inferSelect;
export type InsertAnnouncementAcknowledgement = typeof announcementAcknowledgements.$inferInsert;
export const insertAnnouncementAcknowledgementSchema = createInsertSchema(announcementAcknowledgements).omit({
  id: true,
  acknowledgedAt: true,
});

// ── Jelenlét Types & Schemas ──────────────────────────────────────────────────
export type LessonSchedule = typeof lessonSchedules.$inferSelect;
export type InsertLessonSchedule = typeof lessonSchedules.$inferInsert;
export const insertLessonScheduleSchema = createInsertSchema(lessonSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;
export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  recordedAt: true,
});

export type StudentDailyNote = typeof studentDailyNotes.$inferSelect;
export type InsertStudentDailyNote = typeof studentDailyNotes.$inferInsert;
export const insertStudentDailyNoteSchema = createInsertSchema(studentDailyNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Attendance status constants
export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  EXCUSED: "excused",
} as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];
