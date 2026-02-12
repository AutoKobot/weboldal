import { pgTable, index, varchar, jsonb, timestamp, foreignKey, serial, text, integer, boolean, unique, numeric, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const modules = pgTable("modules", {
	id: serial().primaryKey().notNull(),
	title: varchar().notNull(),
	content: text().notNull(),
	moduleNumber: integer("module_number").notNull(),
	videoUrl: varchar("video_url"),
	audioUrl: varchar("audio_url"),
	imageUrl: varchar("image_url"),
	isPublished: boolean("is_published").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	subjectId: integer("subject_id").notNull(),
	youtubeUrl: varchar("youtube_url"),
	podcastUrl: varchar("podcast_url"),
	conciseContent: text("concise_content"),
	detailedContent: text("detailed_content"),
	keyConceptsData: jsonb("key_concepts_data"),
}, (table) => [
	index("idx_modules_subject").using("btree", table.subjectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [subjects.id],
			name: "modules_subject_id_subjects_id_fk"
		}),
]);

export const chatMessages = pgTable("chat_messages", {
	id: serial().primaryKey().notNull(),
	message: text().notNull(),
	senderRole: varchar("sender_role").notNull(),
	userId: varchar("user_id").notNull(),
	relatedModuleId: integer("related_module_id"),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
	isSystemMessage: boolean("is_system_message").default(false),
	sessionId: varchar("session_id").default('default-session').notNull(),
	context: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_messages_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.relatedModuleId],
			foreignColumns: [modules.id],
			name: "chat_messages_related_module_id_modules_id_fk"
		}),
]);

export const groupMembers = pgTable("group_members", {
	id: serial().primaryKey().notNull(),
	groupId: integer("group_id").notNull(),
	userId: varchar("user_id").notNull(),
	role: varchar().default('member'),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [communityGroups.id],
			name: "group_members_group_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_members_user_id_fkey"
		}),
]);

export const subjects = pgTable("subjects", {
	id: serial().primaryKey().notNull(),
	professionId: integer("profession_id").notNull(),
	name: varchar().notNull(),
	description: text(),
	orderIndex: integer("order_index").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_subjects_profession").using("btree", table.professionId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.professionId],
			foreignColumns: [professions.id],
			name: "subjects_profession_id_professions_id_fk"
		}),
]);

export const systemSettings = pgTable("system_settings", {
	id: serial().primaryKey().notNull(),
	key: varchar().notNull(),
	value: text(),
	encrypted: boolean().default(false),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	updatedBy: varchar("updated_by"),
}, (table) => [
	unique("system_settings_key_unique").on(table.key),
]);

export const users = pgTable("users", {
	id: varchar().primaryKey().notNull(),
	email: varchar(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	role: varchar().default('student').notNull(),
	completedModules: jsonb("completed_modules").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	selectedProfessionId: integer("selected_profession_id"),
	username: varchar(),
	password: varchar(),
	authType: varchar("auth_type").default('replit'),
	assignedProfessionIds: jsonb("assigned_profession_ids").default([]),
	company: varchar(),
	position: varchar(),
	industry: varchar(),
	chatHistory: jsonb("chat_history").default([]),
	preferences: jsonb().default({}),
	emailVerified: boolean("email_verified").default(false),
	emailVerificationToken: varchar("email_verification_token"),
	passwordResetToken: varchar("password_reset_token"),
	passwordResetExpires: timestamp("password_reset_expires", { mode: 'string' }),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	loginAttempts: integer("login_attempts").default(0),
	accountLockedUntil: timestamp("account_locked_until", { mode: 'string' }),
	twoFactorSecret: varchar("two_factor_secret"),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
	refreshTokens: jsonb("refresh_tokens").default([]),
	assignedTeacherId: varchar("assigned_teacher_id"),
	schoolName: varchar("school_name"),
	schoolAdminId: text("school_admin_id"),
	classId: integer("class_id"),
}, (table) => [
	index("idx_users_role").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("idx_users_selected_profession").using("btree", table.selectedProfessionId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.selectedProfessionId],
			foreignColumns: [professions.id],
			name: "users_selected_profession_id_professions_id_fk"
		}),
	unique("users_email_unique").on(table.email),
	unique("users_username_key").on(table.username),
]);

export const professions = pgTable("professions", {
	id: serial().primaryKey().notNull(),
	name: varchar().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	iconName: varchar("icon_name"),
	iconUrl: varchar("icon_url"),
});

export const communityGroups = pgTable("community_groups", {
	id: serial().primaryKey().notNull(),
	name: varchar().notNull(),
	description: text(),
	professionId: integer("profession_id"),
	createdBy: varchar("created_by").notNull(),
	isActive: boolean("is_active").default(true),
	memberLimit: integer("member_limit").default(50),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.professionId],
			foreignColumns: [professions.id],
			name: "community_groups_profession_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "community_groups_created_by_fkey"
		}),
]);

export const communityProjects = pgTable("community_projects", {
	id: serial().primaryKey().notNull(),
	title: varchar().notNull(),
	description: text(),
	groupId: integer("group_id").notNull(),
	moduleId: integer("module_id"),
	createdBy: varchar("created_by").notNull(),
	status: varchar().default('active'),
	dueDate: timestamp("due_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [communityGroups.id],
			name: "community_projects_group_id_fkey"
		}),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.id],
			name: "community_projects_module_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "community_projects_created_by_fkey"
		}),
]);

export const projectParticipants = pgTable("project_participants", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: varchar("user_id").notNull(),
	role: varchar().default('participant'),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [communityProjects.id],
			name: "project_participants_project_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_participants_user_id_fkey"
		}),
]);

export const discussions = pgTable("discussions", {
	id: serial().primaryKey().notNull(),
	title: varchar().notNull(),
	content: text().notNull(),
	authorId: varchar("author_id").notNull(),
	groupId: integer("group_id"),
	projectId: integer("project_id"),
	parentId: integer("parent_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "discussions_author_id_fkey"
		}),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [communityGroups.id],
			name: "discussions_group_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [communityProjects.id],
			name: "discussions_project_id_fkey"
		}),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "discussions_parent_id_fkey"
		}),
]);

export const moduleProgress = pgTable("module_progress", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	moduleId: integer("module_id").notNull(),
	professionId: integer("profession_id").notNull(),
	subjectId: integer("subject_id").notNull(),
	status: varchar().default('not_started').notNull(),
	timeSpentMinutes: integer("time_spent_minutes").default(0),
	score: numeric({ precision: 5, scale:  2 }),
	quizAttempts: integer("quiz_attempts").default(0),
	bestQuizScore: numeric("best_quiz_score", { precision: 5, scale:  2 }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	startedAt: timestamp("started_at", { mode: 'string' }),
	lastAccessedAt: timestamp("last_accessed_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_module_progress_module").using("btree", table.moduleId.asc().nullsLast().op("int4_ops")),
	index("idx_module_progress_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "module_progress_user_id_fkey"
		}),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.id],
			name: "module_progress_module_id_fkey"
		}),
	foreignKey({
			columns: [table.professionId],
			foreignColumns: [professions.id],
			name: "module_progress_profession_id_fkey"
		}),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [subjects.id],
			name: "module_progress_subject_id_fkey"
		}),
]);

export const peerReviews = pgTable("peer_reviews", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	reviewerId: varchar("reviewer_id").notNull(),
	reviewedUserId: varchar("reviewed_user_id").notNull(),
	rating: integer(),
	feedback: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [communityProjects.id],
			name: "peer_reviews_project_id_fkey"
		}),
	foreignKey({
			columns: [table.reviewerId],
			foreignColumns: [users.id],
			name: "peer_reviews_reviewer_id_fkey"
		}),
	foreignKey({
			columns: [table.reviewedUserId],
			foreignColumns: [users.id],
			name: "peer_reviews_reviewed_user_id_fkey"
		}),
]);

export const adminMessages = pgTable("admin_messages", {
	id: serial().primaryKey().notNull(),
	senderId: varchar("sender_id").notNull(),
	subject: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	response: text(),
	isResolved: boolean("is_resolved").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	respondedAt: timestamp("responded_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "admin_messages_sender_id_fkey"
		}),
]);

export const teacherStudents = pgTable("teacher_students", {
	id: serial().primaryKey().notNull(),
	teacherId: varchar("teacher_id").notNull(),
	studentId: varchar("student_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_teacher_students_student").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	index("idx_teacher_students_teacher").using("btree", table.teacherId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [users.id],
			name: "teacher_students_teacher_id_fkey"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [users.id],
			name: "teacher_students_student_id_fkey"
		}),
	unique("teacher_students_teacher_id_student_id_key").on(table.teacherId, table.studentId),
]);

export const aiSettings = pgTable("ai_settings", {
	id: serial().primaryKey().notNull(),
	googleAiKey: text("google_ai_key"),
	openaiKey: text("openai_key"),
	youtubeApiKey: text("youtube_api_key"),
	updatedBy: text("updated_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const equipmentCategories = pgTable("equipment_categories", {
	id: serial().primaryKey().notNull(),
	name: varchar().notNull(),
	description: text(),
	icon: varchar(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const classes = pgTable("classes", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	schoolAdminId: text("school_admin_id").notNull(),
	teacherId: text("teacher_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	professionId: integer("profession_id"),
	assignedTeacherId: varchar("assigned_teacher_id"),
}, (table) => [
	foreignKey({
			columns: [table.assignedTeacherId],
			foreignColumns: [users.id],
			name: "classes_assigned_teacher_id_fkey"
		}),
]);

export const apiCalls = pgTable("api_calls", {
	id: serial().primaryKey().notNull(),
	provider: varchar().notNull(),
	service: varchar().notNull(),
	model: varchar(),
	tokenCount: integer("token_count").default(0),
	costUsd: numeric("cost_usd", { precision: 10, scale:  6 }).notNull(),
	userId: varchar("user_id"),
	moduleId: integer("module_id"),
	requestData: jsonb("request_data"),
	responseData: jsonb("response_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "api_calls_user_id_fkey"
		}),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.id],
			name: "api_calls_module_id_fkey"
		}),
]);

export const monthlyCosts = pgTable("monthly_costs", {
	id: serial().primaryKey().notNull(),
	year: integer().notNull(),
	month: integer().notNull(),
	apiCosts: numeric("api_costs", { precision: 10, scale:  2 }).default('0.00'),
	developmentCosts: numeric("development_costs", { precision: 10, scale:  2 }).default('0.00'),
	infrastructureCosts: numeric("infrastructure_costs", { precision: 10, scale:  2 }).default('0.00'),
	otherCosts: numeric("other_costs", { precision: 10, scale:  2 }).default('0.00'),
	totalCosts: numeric("total_costs", { precision: 10, scale:  2 }).default('0.00'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const apiPricing = pgTable("api_pricing", {
	id: serial().primaryKey().notNull(),
	provider: varchar({ length: 50 }).notNull(),
	service: varchar({ length: 50 }).notNull(),
	model: varchar({ length: 100 }),
	pricePerToken: text("price_per_token").default('0.00000000'),
	pricePerRequest: text("price_per_request").default('0.000000'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("api_pricing_provider_service_model_key").on(table.provider, table.service, table.model),
]);

export const equipmentModels = pgTable("equipment_models", {
	id: serial().primaryKey().notNull(),
	manufacturerId: varchar("manufacturer_id"),
	categoryId: integer("category_id"),
	manufacturer: varchar().notNull(),
	model: varchar().notNull(),
	type: varchar(),
	description: text(),
	specifications: jsonb(),
	imageUrl: varchar("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	name: varchar(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	index("idx_equipment_models_manufacturer_id").using("btree", table.manufacturerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.manufacturerId],
			foreignColumns: [users.id],
			name: "equipment_models_manufacturer_id_fkey"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [equipmentCategories.id],
			name: "equipment_models_category_id_fkey"
		}),
]);

export const equipmentManuals = pgTable("equipment_manuals", {
	id: serial().primaryKey().notNull(),
	equipmentModelId: integer("equipment_model_id"),
	title: varchar().notNull(),
	version: varchar(),
	filePath: varchar("file_path"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	mimeType: varchar("mime_type"),
	uploadedBy: varchar("uploaded_by"),
	uploadDate: timestamp("upload_date", { mode: 'string' }).defaultNow(),
	processingStatus: varchar("processing_status").default('pending'),
	textContent: text("text_content"),
	metadata: jsonb(),
	tags: varchar().array(),
	downloadCount: integer("download_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	originalLanguage: varchar("original_language").default('en'),
	translatedContent: jsonb("translated_content"),
	availableLanguages: varchar("available_languages").array().default(["RAY['en'::tex"]),
}, (table) => [
	index("idx_equipment_manuals_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_equipment_manuals_processing_status").using("btree", table.processingStatus.asc().nullsLast().op("text_ops")),
	index("idx_equipment_manuals_uploaded_by").using("btree", table.uploadedBy.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.equipmentModelId],
			foreignColumns: [equipmentModels.id],
			name: "equipment_manuals_equipment_model_id_fkey"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "equipment_manuals_uploaded_by_fkey"
		}),
]);

export const equipmentManualTextChunks = pgTable("equipment_manual_text_chunks", {
	id: serial().primaryKey().notNull(),
	manualId: integer("manual_id").notNull(),
	chunkId: varchar("chunk_id", { length: 255 }).notNull(),
	chunkText: text("chunk_text").notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	startPosition: integer("start_position"),
	endPosition: integer("end_position"),
	tokenCount: integer("token_count"),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.manualId],
			foreignColumns: [equipmentManuals.id],
			name: "equipment_manual_text_chunks_manual_id_fkey"
		}),
]);

export const manualImages = pgTable("manual_images", {
	id: serial().primaryKey().notNull(),
	manualId: integer("manual_id").notNull(),
	pageNumber: integer("page_number").notNull(),
	s3Url: varchar("s3_url").notNull(),
	description: text(),
	extractedAt: timestamp("extracted_at", { mode: 'string' }).defaultNow(),
	fileSize: integer("file_size"),
	width: integer(),
	height: integer(),
	format: varchar().notNull(),
	quality: integer(),
	processingStatus: varchar("processing_status").default('pending'),
	processingError: text("processing_error"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.manualId],
			foreignColumns: [equipmentManuals.id],
			name: "manual_images_manual_id_fkey"
		}).onDelete("cascade"),
]);

export const userConsents = pgTable("user_consents", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id"),
	sessionId: varchar("session_id"),
	consentType: varchar("consent_type").notNull(),
	consentValue: boolean("consent_value").notNull(),
	consentSource: varchar("consent_source").default('website'),
	ipAddress: varchar("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_consents_user_id_fkey"
		}),
]);

export const privacyRequests = pgTable("privacy_requests", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id"),
	email: varchar().notNull(),
	requestType: varchar("request_type").notNull(),
	status: varchar().default('pending'),
	requestData: jsonb("request_data"),
	responseData: jsonb("response_data"),
	processedBy: varchar("processed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "privacy_requests_user_id_fkey"
		}),
]);

export const dataProcessingActivities = pgTable("data_processing_activities", {
	id: serial().primaryKey().notNull(),
	activityName: varchar("activity_name").notNull(),
	purpose: text().notNull(),
	legalBasis: varchar("legal_basis").notNull(),
	dataCategories: text("data_categories").array(),
	dataSubjects: text("data_subjects").array(),
	recipients: text().array(),
	retentionPeriod: varchar("retention_period"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});
