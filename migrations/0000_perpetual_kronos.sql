CREATE TABLE "admin_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" varchar NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"response" text,
	"is_resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"max_tokens" integer DEFAULT 2000 NOT NULL,
	"temperature" text DEFAULT '0.7' NOT NULL,
	"model" varchar(100) DEFAULT 'gpt-4o-mini' NOT NULL,
	"system_message" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar NOT NULL,
	"service" varchar NOT NULL,
	"model" varchar,
	"token_count" integer DEFAULT 0,
	"cost_usd" numeric(10, 6) NOT NULL,
	"user_id" varchar,
	"module_id" integer,
	"request_data" jsonb,
	"response_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(50) NOT NULL,
	"service" varchar(50) NOT NULL,
	"model" varchar(100),
	"price_per_token" text DEFAULT '0.00000000',
	"price_per_request" text DEFAULT '0.000000',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"sender_role" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"related_module_id" integer,
	"is_system_message" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"school_admin_id" varchar NOT NULL,
	"assigned_teacher_id" varchar,
	"profession_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"profession_id" integer,
	"created_by" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"member_limit" integer DEFAULT 50,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"group_id" integer NOT NULL,
	"module_id" integer,
	"created_by" varchar NOT NULL,
	"status" varchar DEFAULT 'active',
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_processing_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_name" varchar NOT NULL,
	"purpose" text NOT NULL,
	"legal_basis" varchar NOT NULL,
	"data_categories" text[],
	"data_subjects" text[],
	"recipients" text[],
	"retention_period" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discussions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar NOT NULL,
	"group_id" integer,
	"project_id" integer,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"concise_content" text,
	"detailed_content" text,
	"key_concepts_data" jsonb,
	"module_number" integer NOT NULL,
	"video_url" varchar,
	"audio_url" varchar,
	"image_url" varchar,
	"youtube_url" varchar,
	"podcast_url" varchar,
	"is_published" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monthly_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"api_costs" numeric(10, 2) DEFAULT '0.00',
	"development_costs" numeric(10, 2) DEFAULT '0.00',
	"infrastructure_costs" numeric(10, 2) DEFAULT '0.00',
	"other_costs" numeric(10, 2) DEFAULT '0.00',
	"total_costs" numeric(10, 2) DEFAULT '0.00',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "peer_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"reviewer_id" varchar NOT NULL,
	"reviewed_user_id" varchar NOT NULL,
	"rating" integer,
	"feedback" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "privacy_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"email" varchar NOT NULL,
	"request_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"request_data" jsonb,
	"response_data" jsonb,
	"processed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "professions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"icon_name" varchar,
	"icon_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'participant',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"profession_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"value" text,
	"encrypted" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "test_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"module_id" integer NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer DEFAULT 100 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"session_id" varchar,
	"consent_type" varchar NOT NULL,
	"consent_value" boolean NOT NULL,
	"consent_source" varchar DEFAULT 'website',
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"username" varchar,
	"password" varchar,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'student' NOT NULL,
	"auth_type" varchar DEFAULT 'replit' NOT NULL,
	"selected_profession_id" integer,
	"assigned_profession_ids" jsonb DEFAULT '[]'::jsonb,
	"assigned_teacher_id" varchar,
	"school_name" varchar,
	"school_admin_id" varchar,
	"class_id" integer,
	"completed_modules" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admin_messages" ADD CONSTRAINT "admin_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_related_module_id_modules_id_fk" FOREIGN KEY ("related_module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_admin_id_users_id_fk" FOREIGN KEY ("school_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_assigned_teacher_id_users_id_fk" FOREIGN KEY ("assigned_teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "public"."professions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_groups" ADD CONSTRAINT "community_groups_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "public"."professions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_groups" ADD CONSTRAINT "community_groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_projects" ADD CONSTRAINT "community_projects_group_id_community_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."community_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_projects" ADD CONSTRAINT "community_projects_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_projects" ADD CONSTRAINT "community_projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_group_id_community_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."community_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_project_id_community_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."community_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_community_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."community_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_project_id_community_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."community_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_reviews" ADD CONSTRAINT "peer_reviews_reviewed_user_id_users_id_fk" FOREIGN KEY ("reviewed_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_project_id_community_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."community_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_participants" ADD CONSTRAINT "project_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_profession_id_professions_id_fk" FOREIGN KEY ("profession_id") REFERENCES "public"."professions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_selected_profession_id_professions_id_fk" FOREIGN KEY ("selected_profession_id") REFERENCES "public"."professions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");