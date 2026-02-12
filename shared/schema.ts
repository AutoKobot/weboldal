import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  serial,
  boolean,
  numeric,
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
  selectedProfessionId: integer("selected_profession_id").references(() => professions.id),
  assignedProfessionIds: jsonb("assigned_profession_ids").default([]).$type<number[]>(), // Admin által hozzárendelt szakmák
  assignedTeacherId: varchar("assigned_teacher_id"), // Iskolai admin által hozzárendelt tanár
  schoolName: varchar("school_name"), // Iskola neve (csak iskolai adminoknak)
  schoolAdminId: varchar("school_admin_id"), // Melyik iskolai admin hozta létre
  classId: integer("class_id"), // Melyik osztályhoz tartozik
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
  isPublished: boolean("is_published").default(false),
  generatedQuizzes: jsonb("generated_quizzes"), // 5 elre generált tesztsor
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  chatMessages: many(chatMessages),
  assignedClass: one(classes, { fields: [users.classId], references: [classes.id] }),
  testResults: many(testResults),
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
  chatMessages: many(chatMessages),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  schoolAdminId: varchar("school_admin_id").references(() => users.id).notNull(), // Melyik iskolai admin hozta létre
  assignedTeacherId: varchar("assigned_teacher_id").references(() => users.id), // Osztályfőnök
  professionId: integer("profession_id").references(() => professions.id), // Osztályhoz rendelt szakma
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
}).extend({
  youtubeUrl: z.string().optional().nullable(),
  podcastUrl: z.string().optional().nullable(),
  keyConceptsData: keyConceptsDataSchema.optional().nullable(),
  generatedQuizzes: z.array(z.any()).optional().nullable(),
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
export type InsertProfession = z.infer<typeof insertProfessionSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Profession = typeof professions.$inferSelect;
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
  email: varchar("email").notNull(),
  requestType: varchar("request_type").notNull(), // "data_export", "data_deletion", "data_correction", "restrict_processing"
  status: varchar("status").notNull().default("pending"), // "pending", "in_progress", "completed", "rejected"
  requestData: jsonb("request_data"), // Additional request details
  responseData: jsonb("response_data"), // Response/completion details
  processedBy: varchar("processed_by"), // Admin who processed the request
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

// Test results types and schemas
export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = typeof testResults.$inferInsert;
export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  createdAt: true,
});

