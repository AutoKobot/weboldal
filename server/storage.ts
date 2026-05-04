import {
  users,
  professions,
  subjects,
  modules,
  chatMessages,
  systemSettings,
  aiSettings,
  communityGroups,
  groupMembers,
  communityProjects,
  projectParticipants,
  discussions,
  peerReviews,
  adminMessages,
  privateMessages,
  classes,
  schools,
  moduleSubjectAssignments,
  type User,
  type UpsertUser,
  type School,
  type InsertSchool,
  type Profession,
  type InsertProfession,
  type Subject,
  type InsertSubject,
  type Module,
  type InsertModule,
  type ChatMessage,
  type InsertChatMessage,
  type SystemSetting,
  type InsertSystemSetting,
  type AISetting,
  type InsertAISetting,
  type CommunityGroup,
  type InsertCommunityGroup,
  type GroupMember,
  type CommunityProject,
  type InsertCommunityProject,
  type ProjectParticipant,
  type Discussion,
  type InsertDiscussion,
  type PeerReview,
  type InsertPeerReview,
  type AdminMessage,
  type InsertAdminMessage,
  type PrivateMessage,
  type InsertPrivateMessage,
  type Class,
  type InsertClass,
  apiCalls,
  monthlyCosts,
  apiPricing,
  type ApiCall,
  type InsertApiCall,
  type MonthlyCost,
  type InsertMonthlyCost,
  type ApiPricing,
  type InsertApiPricing,
  userConsents,
  privacyRequests,
  dataProcessingActivities,
  type UserConsent,
  type InsertUserConsent,
  type PrivacyRequest,
  type InsertPrivacyRequest,
  type DataProcessingActivity,
  type InsertDataProcessingActivity,
  testResults,
  type TestResult,
  type InsertTestResult,
  flashcards,
  type Flashcard,
  type InsertFlashcard,
  notifications,
  type Notification,
  type InsertNotification,
  discussionReactions,
  type DiscussionReaction,
  attendance,
  dailyAttendance,
  lessonSchedules,
  type Attendance,
  type InsertAttendance,
  type DailyAttendance,
  type InsertDailyAttendance,
  type LessonSchedule,
  type InsertLessonSchedule,
  studentAvatars,
  type StudentAvatar,
  type InsertStudentAvatar,
  classAnnouncements,
  announcementAcknowledgements,
  type ClassAnnouncement,
  type InsertClassAnnouncement,
  type AnnouncementAcknowledgement,
  type InsertAnnouncementAcknowledgement,
  practicalGrades,
  type PracticalGrade,
  type InsertPracticalGrade,
  studentDailyNotes,
  type StudentDailyNote,
  type InsertStudentDailyNote,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql, gte, lte, or, isNull, exists, notExists, asc, aliasedTable } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getAllStudents(): Promise<User[]>;
  getAllTeachers(): Promise<User[]>;
  getStudentsByTeacher(teacherId: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(user: Omit<UpsertUser, 'id'> & { id: string }): Promise<User>;
  createUser(user: { id?: string; username: string; firstName: string; lastName: string; schoolName?: string; email?: string | null; role: string; password: string; schoolAdminId?: string; phone?: string | null }): Promise<User>;
  setUserPassword(userId: string, password: string): Promise<void>;
  updateUserRole(id: string, role: string): Promise<void>;
  updateUserProfession(id: string, professionId: number): Promise<void>;
  updateUserAssignedProfessions(id: string, professionIds: number[]): Promise<void>;
  updateUserCompletedModules(id: string, moduleIds: number[]): Promise<void>;
  updateUserPassword(id: string, password: string): Promise<void>;
  updateUserSchoolAdmin(id: string, schoolAdminId: string | null): Promise<void>;
  assignStudentToTeacher(studentId: string, teacherId: string): Promise<void>;
  removeStudentFromTeacher(studentId: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  updateSchoolAdmin(id: string, data: Partial<User>): Promise<User>;

  // Class operations
  getClassesBySchoolAdmin(schoolAdminId: string): Promise<Class[]>;
  getClassById(classId: number): Promise<Class | undefined>;
  getStudentsByClass(classId: number): Promise<User[]>;
  getStudentsBySchoolAdmin(schoolAdminId: string): Promise<User[]>;

  // Cost tracking operations
  logApiCall(callData: InsertApiCall): Promise<ApiCall>;
  getApiCallStats(year?: number, month?: number): Promise<any>;
  getMonthlyCosts(year?: number): Promise<MonthlyCost[]>;
  upsertMonthlyCost(costData: InsertMonthlyCost): Promise<MonthlyCost>;
  calculateMonthlyApiCosts(year: number, month: number): Promise<number>;

  // API pricing operations
  getApiPricing(): Promise<ApiPricing[]>;
  upsertApiPricing(pricingData: InsertApiPricing): Promise<ApiPricing>;
  deleteApiPricing(id: number): Promise<void>;
  getUniqueApiProviders(): Promise<{ provider: string, service: string, model?: string }[]>;
  getTeachersBySchoolAdmin(schoolAdminId: string): Promise<User[]>;
  
  // School operations
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: number, data: Partial<School>): Promise<School>;
  deleteSchool(id: number): Promise<void>;
  assignUserToSchool(userId: string, schoolId: number | null): Promise<void>;
  assignClassToSchool(classId: number, schoolId: number): Promise<void>;
  getSchoolAdminBySchool(schoolId: number): Promise<User | undefined>;

  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, classData: Partial<InsertClass>): Promise<Class>;
  deleteClass(id: number): Promise<void>;
  assignStudentToClass(studentId: string, classId: number): Promise<void>;
  addStudentToClass(studentId: string, classId: number): Promise<void>;
  removeStudentFromClass(studentId: string): Promise<void>;
  assignTeacherToClass(teacherId: string, classId: number): Promise<void>;
  assignProfessionToClass(classId: number, professionId: number): Promise<void>;
  assignTeacherToClassById(classId: number, teacherId: string): Promise<void>;
  getClassWithProfession(classId: number): Promise<Class & { profession?: any } | undefined>;

  // Profession operations
  getProfessions(schoolAdminId?: string | null): Promise<Profession[]>;
  getProfession(id: number): Promise<Profession | undefined>;
  createProfession(profession: InsertProfession): Promise<Profession>;
  updateProfession(id: number, profession: Partial<InsertProfession>): Promise<Profession>;
  deleteProfession(id: number): Promise<void>;

  // Subject operations
  getSubjects(professionId?: number, schoolAdminId?: string | null): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject>;
  deleteSubject(id: number): Promise<void>;

  // Module operations
  getModules(subjectId?: number, schoolAdminId?: string | null): Promise<Module[]>;
  getPublishedModules(subjectId?: number, schoolAdminId?: string | null): Promise<Module[]>;
  getModule(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  bulkCreateModules(modulesList: InsertModule[]): Promise<Module[]>;
  updateModule(id: number, module: Partial<InsertModule>): Promise<Module>;
  deleteModule(id: number): Promise<void>;

  // Flashcard operations
  getFlashcards(moduleId: number): Promise<Flashcard[]>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  deleteFlashcardsByModule(moduleId: number): Promise<void>;
  bulkCreateFlashcards(flashcards: InsertFlashcard[]): Promise<Flashcard[]>;

  // Chat operations
  getChatMessages(userId: string, moduleId?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteChatMessages(userId: string, moduleId?: number): Promise<void>;

  // System settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(key: string, value: string, updatedBy: string): Promise<SystemSetting>;

  // AI settings operations
  getAISettings(): Promise<AISetting | undefined>;
  updateAISettings(settings: InsertAISetting, updatedBy: string): Promise<AISetting>;

  // Community operations
  getCommunityGroups(professionId?: number): Promise<CommunityGroup[]>;
  getCommunityGroup(id: number): Promise<CommunityGroup | undefined>;
  createCommunityGroup(group: InsertCommunityGroup): Promise<CommunityGroup>;
  joinCommunityGroup(groupId: number, userId: string): Promise<void>;
  leaveCommunityGroup(groupId: number, userId: string): Promise<void>;
  getGroupMembers(groupId: number): Promise<GroupMember[]>;
  getCommunityLeaderboard(): Promise<any[]>;

  // Community projects
  getCommunityProjects(groupId?: number): Promise<CommunityProject[]>;
  getCommunityProject(id: number): Promise<CommunityProject | undefined>;
  createCommunityProject(project: InsertCommunityProject): Promise<CommunityProject>;
  joinProject(projectId: number, userId: string): Promise<void>;
  getProjectParticipants(projectId: number): Promise<ProjectParticipant[]>;

  // Discussions
  getDiscussions(groupId?: number, projectId?: number): Promise<Discussion[]>;
  getReplies(parentId: number): Promise<Discussion[]>;
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  deleteDiscussion(id: number): Promise<void>;
  pinDiscussion(id: number, pinned: boolean): Promise<void>;

  // Discussion Reactions
  toggleReaction(discussionId: number, userId: string, emoji: string): Promise<{ added: boolean }>;
  getReactionsForDiscussions(discussionIds: number[]): Promise<DiscussionReaction[]>;

  // Peer reviews
  createPeerReview(review: InsertPeerReview): Promise<PeerReview>;
  getPeerReviews(projectId: number): Promise<PeerReview[]>;

  // Admin messages
  createAdminMessage(message: InsertAdminMessage): Promise<AdminMessage>;
  getAdminMessages(): Promise<AdminMessage[]>;
  getUserAdminMessages(userId: string): Promise<AdminMessage[]>;
  respondToAdminMessage(messageId: number, response: string): Promise<AdminMessage>;
  
  // Private messages
  createPrivateMessage(message: InsertPrivateMessage): Promise<PrivateMessage>;
  getPrivateMessages(userId: string): Promise<PrivateMessage[]>;
  getUnreadPrivateMessageCount(userId: string): Promise<number>;
  markPrivateMessagesRead(userId: string, senderId: string): Promise<void>;
  getConversationPartners(userId: string): Promise<User[]>;

  // Privacy and GDPR compliance operations
  saveUserConsent(consent: InsertUserConsent): Promise<UserConsent>;
  getUserConsents(userId?: string, sessionId?: string): Promise<UserConsent[]>;
  createPrivacyRequest(request: InsertPrivacyRequest): Promise<PrivacyRequest>;
  getPrivacyRequests(email?: string): Promise<PrivacyRequest[]>;
  getPrivacyRequest(id: number): Promise<PrivacyRequest | undefined>;
  updatePrivacyRequestStatus(id: number, status: string, responseData?: any, processedBy?: string): Promise<PrivacyRequest>;
  exportUserData(userId: string): Promise<any>;
  deleteUserPersonalData(userId: string): Promise<void>;

  // Test result operations
  createTestResult(result: InsertTestResult): Promise<TestResult>;
  getTestResultsByUser(userId: string): Promise<TestResult[]>;
  getTestResultForModule(userId: string, moduleId: number): Promise<TestResult | undefined>;
  getTestResultsByModule(moduleId: number): Promise<TestResult[]>;
  getTestResultsByClass(classId: number, startDate?: string, endDate?: string): Promise<any[]>;
  getClassesByTeacher(teacherId: string): Promise<Class[]>;

  // Practical Grades
  getPracticalGradesByStudent(studentId: string): Promise<PracticalGrade[]>;
  getPracticalGradesByTeacher(teacherId: string): Promise<PracticalGrade[]>;
  getPracticalGradeForModule(studentId: string, moduleId: number): Promise<PracticalGrade | undefined>;
  createPracticalGrade(grade: InsertPracticalGrade): Promise<PracticalGrade>;
  updatePracticalGrade(id: number, data: Partial<InsertPracticalGrade>): Promise<PracticalGrade>;
  deletePracticalGrade(id: number): Promise<void>;

  // Notification operations
  createNotification(data: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadCount(userId: string): Promise<number>;
  markNotificationRead(id: number, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: number, userId: string): Promise<void>;

  // Student Avatar operations
  getStudentAvatar(userId: string): Promise<StudentAvatar | null>;
  feedStudentAvatar(userId: string, xpCost: number): Promise<StudentAvatar | null>;
  updateStudentAvatar(userId: string, data: Partial<InsertStudentAvatar>): Promise<StudentAvatar>;
  selectStudentAvatar(userId: string, avatarType: string): Promise<StudentAvatar>;
  reviveStudentAvatar(userId: string, xpCost: number): Promise<StudentAvatar | null>;
  releaseStudentAvatar(userId: string): Promise<void>;

  // ── Jelenlét operations ───────────────────────────────────────────────────
  // Lesson schedule
  getLessonSchedules(schoolAdminId: string, scheduleGroup?: string): Promise<LessonSchedule[]>;
  upsertLessonSchedules(schedules: InsertLessonSchedule[]): Promise<LessonSchedule[]>;

  // Attendance
  getAttendance(studentId: string, date: string): Promise<any[]>;
  getAttendanceByClass(classId: number, date: string): Promise<any[]>;
  getAttendanceByClassRange(classId: number, startDate: string, endDate: string): Promise<any[]>;
  getAttendanceByStudent(studentId: string, startDate: string, endDate: string): Promise<Attendance[]>;
  updateAttendanceStatus(attendanceId: number, status: string, teacherId: string): Promise<Attendance>;
  upsertAttendance(data: InsertAttendance): Promise<Attendance>;

  // Daily Attendance
  getDailyAttendanceByClass(classId: number, date?: string, startDate?: string, endDate?: string): Promise<any[]>;
  upsertDailyAttendance(data: any): Promise<any>;

  // Student daily notes
  getStudentDailyNotes(studentId: string, teacherId: string, date?: string): Promise<StudentDailyNote[]>;
  getClassDailyNotes(classId: number, date: string): Promise<any[]>;
  upsertStudentDailyNote(data: InsertStudentDailyNote): Promise<StudentDailyNote>;
  deleteStudentDailyNote(id: number): Promise<void>;

  // Export helpers
  getAttendanceExportData(classId: number, startDate: string, endDate: string): Promise<any[]>;

  // Class Announcement operations
  createAnnouncement(announcement: InsertClassAnnouncement): Promise<ClassAnnouncement>;
  getAnnouncementsByClass(classId: number): Promise<ClassAnnouncement[]>;
  getActiveAnnouncementsForStudent(studentId: string, classId: number): Promise<ClassAnnouncement[]>;
  getUnacknowledgedAnnouncements(studentId: string, classId: number): Promise<ClassAnnouncement[]>;
  acknowledgeAnnouncement(acknowledgement: InsertAnnouncementAcknowledgement): Promise<AnnouncementAcknowledgement>;
  getAnnouncementStats(announcementId: number): Promise<any[]>;
  deleteAnnouncement(id: number): Promise<void>;

  // Post-import processing
  reorganizeSubjects(professionId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  public db = db;
  // User operations
  constructor() {
    // Automatikus séma-frissítés: Ellenőrizzük és hozzáadjuk a hiányzó oszlopokat
    this.ensureSchemaUpToDate().catch(err => console.error("Schema update error:", err));
  }

  public async ensureSchemaUpToDate() {
    console.time("schema-update");
    try {
      console.log("🔍 Adatbázis séma ellenőrzése...");
      
      // Separate statements for better compatibility and error tracking
      const statements = [
        { name: "users.school_admin_id", sql: sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_admin_id VARCHAR(255)` },
        { name: "professions.school_admin_id", sql: sql`ALTER TABLE professions ADD COLUMN IF NOT EXISTS school_admin_id VARCHAR(255)` },
        { name: "subjects.school_admin_id", sql: sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_admin_id VARCHAR(255)` },
        { name: "modules.concise_content", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS concise_content TEXT` },
        { name: "modules.detailed_content", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS detailed_content TEXT` },
        { name: "modules.key_concepts_data", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS key_concepts_data JSONB` },
        { name: "modules.generated_quizzes", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS generated_quizzes JSONB` },
        { name: "modules.practical_tasks", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS practical_tasks JSONB` },
        { name: "subjects.code", sql: sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code VARCHAR(50)` },
        { name: "subjects.type", sql: sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'theory'` },
        { name: "subjects.hours", sql: sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS hours INTEGER` },
        { name: "subjects.school_id", sql: sql`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id)` },
        { name: "modules.section_code", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS section_code VARCHAR(50)` },
        { name: "modules.type", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'theory'` },
        { name: "modules.school_id", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id)` },
        { name: "professions.code", sql: sql`ALTER TABLE professions ADD COLUMN IF NOT EXISTS code VARCHAR(50)` },
        { name: "professions.icon_name", sql: sql`ALTER TABLE professions ADD COLUMN IF NOT EXISTS icon_name VARCHAR(255)` },
        { name: "professions.icon_url", sql: sql`ALTER TABLE professions ADD COLUMN IF NOT EXISTS icon_url VARCHAR(255)` },
        { name: "professions.total_hours", sql: sql`ALTER TABLE professions ADD COLUMN IF NOT EXISTS total_hours INTEGER` },
        { name: "modules.suggested_hours", sql: sql`ALTER TABLE modules ADD COLUMN IF NOT EXISTS suggested_hours NUMERIC(5, 2)` },
        { name: "classes.profession_id", sql: sql`ALTER TABLE classes ADD COLUMN IF NOT EXISTS profession_id INTEGER REFERENCES professions(id)` },
        // Durable Data Architecture columns
        { name: "practical_grades.module_title", sql: sql`ALTER TABLE practical_grades ADD COLUMN IF NOT EXISTS module_title VARCHAR(255)` },
        { name: "practical_grades.subject_name", sql: sql`ALTER TABLE practical_grades ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255)` },
        { name: "practical_grades.module_number", sql: sql`ALTER TABLE practical_grades ADD COLUMN IF NOT EXISTS module_number INTEGER` },
        { name: "test_results.module_title", sql: sql`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS module_title VARCHAR(255)` },
        { name: "test_results.subject_name", sql: sql`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255)` },
        { name: "test_results.module_number", sql: sql`ALTER TABLE test_results ADD COLUMN IF NOT EXISTS module_number INTEGER` },
        { name: "attendance.student_name", sql: sql`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS student_name VARCHAR(255)` },
        { name: "attendance.class_name", sql: sql`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_name VARCHAR(255)` },
        { name: "daily_attendance.student_name", sql: sql`ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS student_name VARCHAR(255)` },
        { name: "daily_attendance.class_name", sql: sql`ALTER TABLE daily_attendance ADD COLUMN IF NOT EXISTS class_name VARCHAR(255)` },
      ];

      for (const statement of statements) {
        try {
          await db.execute(statement.sql);
          console.log(`  ✅ Oszlop ellenőrizve: ${statement.name}`);
        } catch (e: any) {
          console.error(`  ❌ Hiba az oszlop ellenőrzésekor (${statement.name}): ${e.message}`);
        }
      }

      // Létrehozzuk a background_jobs táblát ha nincs
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS background_jobs (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'processing',
          progress INTEGER DEFAULT 0,
          message TEXT,
          data JSONB,
          error TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Létrehozzuk a daily_attendance táblát ha nincs
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS daily_attendance (
          id SERIAL PRIMARY KEY,
          student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
          date VARCHAR(10) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'present',
          actual_start VARCHAR(10),
          actual_end VARCHAR(10),
          notes TEXT,
          recorded_by VARCHAR(255) NOT NULL DEFAULT 'auto',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT daily_attendance_unique UNIQUE (student_id, date)
        );
      `);
      
      console.log("✅ Adatbázis séma ellenőrzése kész.");
    } catch (error) {
      console.error("❌ Kritikus hiba az adatbázis séma frissítésekor:", error);
    } finally {
      console.timeEnd("schema-update");
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getAllStudents(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'student'));
  }

  async getAllTeachers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'teacher'));
  }

  async getStudentsByTeacher(teacherId: string): Promise<User[]> {
    return await db.select().from(users).where(
      and(
        eq(users.role, 'student'),
        eq(users.assignedTeacherId, teacherId)
      )
    );
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if this is the first user (make them admin)
    const existingUsers = await db.select().from(users);
    const isFirstUser = existingUsers.length === 0;

    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        role: isFirstUser ? 'admin' : 'student',
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createLocalUser(userData: Omit<UpsertUser, 'id'> & { id: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        authType: 'local',
        role: userData.role || 'student',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async createUser(userData: { id?: string; username: string; firstName: string; lastName: string; schoolName?: string; email?: string | null; role: string; password: string; schoolAdminId?: string; phone?: string | null }): Promise<User> {
    const { hashPassword } = await import('./localAuth');
    const hashedPassword = await hashPassword(userData.password);

    const userId = userData.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        authType: 'local',
        schoolName: userData.schoolName,
        schoolAdminId: userData.schoolAdminId,
        phone: userData.phone ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    console.log(`🔄 Updating user ${id} role to ${role}`);

    // Get current user data
    const currentUser = await this.getUser(id);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const oldRole = currentUser.role;
    console.log(`Role change: ${oldRole} → ${role}`);

    // Clean up role-specific data when changing roles
    await this.cleanupRoleSpecificData(id, oldRole, role);

    // Update the user role
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id));

    console.log(`✅ User role updated successfully`);
  }

  /**
   * Clean up role-specific data when a user's role changes
   */
  private async cleanupRoleSpecificData(userId: string, oldRole: string, newRole: string): Promise<void> {
    console.log(`🧹 Cleaning up role-specific data for ${oldRole} → ${newRole}`);

    try {
      // If changing FROM teacher role, clean up teacher relationships
      if (oldRole === 'teacher' && newRole !== 'teacher') {
        console.log('No specific teacher relationships table exists, skipping deletion');
      }

      // If changing FROM student role, clean up student relationships  
      if (oldRole === 'student' && newRole !== 'student') {
        console.log('Cleaning up student specific data');
        // Clean up from users table where this student was assigned
        await db.update(users).set({ assignedTeacherId: null, classId: null }).where(eq(users.id, userId));
      }

      // If changing FROM admin/school_admin, clean up admin-specific data
      if ((oldRole === 'admin' || oldRole === 'school_admin') &&
        (newRole !== 'admin' && newRole !== 'school_admin')) {
        console.log('Removing admin-specific data');
        await db.execute(sql`DELETE FROM admin_messages WHERE sender_id = ${userId}`);
      }

      console.log('✅ Role-specific data cleanup completed');

    } catch (error) {
      console.error('❌ Error during role cleanup:', error);
      // Don't throw error here - allow role change to proceed even if cleanup fails
    }
  }

  async updateUserProfession(id: string, professionId: number): Promise<void> {
    await db
      .update(users)
      .set({
        selectedProfessionId: professionId,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async updateUserAssignedProfessions(id: string, professionIds: number[]): Promise<void> {
    await db
      .update(users)
      .set({
        assignedProfessionIds: professionIds,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async updateUserCompletedModules(id: string, moduleIds: number[]): Promise<void> {
    if (id && id.startsWith('demo-user-')) return;
    await db
      .update(users)
      .set({
        completedModules: moduleIds,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    const { hashPassword } = await import('./localAuth');
    const hashedPassword = await hashPassword(password);
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id));
  }



  async setUserPassword(userId: string, password: string): Promise<void> {
    const { hashPassword } = await import('./localAuth');
    const hashedPassword = await hashPassword(password);
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async updateUserSchoolAdmin(id: string, schoolAdminId: string | null): Promise<void> {
    await db
      .update(users)
      .set({ schoolAdminId, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async assignStudentToTeacher(studentId: string, teacherId: string): Promise<void> {
    await db
      .update(users)
      .set({
        assignedTeacherId: teacherId,
        updatedAt: new Date()
      })
      .where(eq(users.id, studentId));
  }

  async removeStudentFromTeacher(studentId: string): Promise<void> {
    await db
      .update(users)
      .set({
        assignedTeacherId: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, studentId));
  }

  async deleteUser(id: string): Promise<void> {
    console.log(`🗑️ Starting comprehensive user deletion for: ${id}`);

    try {
      // Helper function to safely execute steps
      const safeStep = async (name: string, fn: () => Promise<any>) => {
        try {
          await fn();
          console.log(`✅ Step: ${name} completed`);
        } catch (error: any) {
          const msg = error.message || "";
          if (msg.includes("does not exist")) {
            console.warn(`⚠️ Step: ${name} skipped: table does not exist in database.`);
          } else {
            console.error(`❌ Step: ${name} failed:`, msg);
          }
        }
      };

      // ── Lépés 1: Értesítések törlése ──────────────────────────────────────────
      await safeStep("Notifications", () => 
        db.delete(notifications).where(or(eq(notifications.userId, id), eq(notifications.actorId, id)))
      );

      // ── Lépés 2: Bejelentési visszaigazolások törlése ────────────────────────
      await safeStep("Announcement acknowledgements", () => 
        db.delete(announcementAcknowledgements).where(eq(announcementAcknowledgements.studentId, id))
      );

      // ── Lépés 3: Osztálybejelentések törlése ──────────────────────────────────
      await safeStep("Class announcements", () => 
        db.delete(classAnnouncements).where(eq(classAnnouncements.teacherId, id))
      );

      // ── Lépés 4: Avatar törlése ───────────────────────────────────────────────
      await safeStep("Student avatars", () => 
        db.delete(studentAvatars).where(eq(studentAvatars.userId, id))
      );

      // ── Lépés 5: Chat üzenetek törlése ───────────────────────────────────────
      await safeStep("Chat messages", () => 
        db.delete(chatMessages).where(eq(chatMessages.userId, id))
      );

      // ── Lépés 6: API hívások törlése ─────────────────────────────────────────
      await safeStep("API calls", () => 
        db.delete(apiCalls).where(eq(apiCalls.userId, id))
      );

      // ── Lépés 7: Admin üzenetek törlése (küldőként) ───────────────────────────
      await safeStep("Admin messages", () => 
        db.delete(adminMessages).where(eq(adminMessages.senderId, id))
      );

      // ── Lépés 8: Jelenlét adatok törlése ─────────────────────────────────────
      await safeStep("Attendance", () => 
        db.delete(attendance).where(or(eq(attendance.studentId, id), eq(attendance.teacherId, id)))
      );

      // ── Lépés 9: Napi megjegyzések törlése ───────────────────────────────────
      await safeStep("Student daily notes", () => 
        db.delete(studentDailyNotes).where(or(eq(studentDailyNotes.studentId, id), eq(studentDailyNotes.teacherId, id)))
      );

      // ── Lépés 10: Teszt eredmények törlése ───────────────────────────────────
      await safeStep("Test results", () => 
        db.delete(testResults).where(eq(testResults.userId, id))
      );

      // ── Lépés 11: Adatvédelem – kérelmek és beleegyezések törlése ────────────
      await safeStep("Privacy & Consents", async () => {
        await db.delete(privacyRequests).where(eq(privacyRequests.userId, id));
        await db.delete(userConsents).where(eq(userConsents.userId, id));
      });

      // ── Lépés 12: Discussion reakciók törlése ────────────────────────────────
      await safeStep("Discussion reactions", () => 
        db.delete(discussionReactions).where(eq(discussionReactions.userId, id))
      );

      // ── Lépés 13: Peer reviews törlése ───────────────────────────────────────
      await safeStep("Peer reviews", () => 
        db.delete(peerReviews).where(or(eq(peerReviews.reviewerId, id), eq(peerReviews.reviewedUserId, id)))
      );

      // ── Lépés 14: Projekt résztvevők törlése ─────────────────────────────────
      await safeStep("Project participants", () => 
        db.delete(projectParticipants).where(eq(projectParticipants.userId, id))
      );

      // ── Lépés 15: Csoport tagságok törlése ───────────────────────────────────
      await safeStep("Group members", () => 
        db.delete(groupMembers).where(eq(groupMembers.userId, id))
      );

      // ── Lépés 16: Discussion bejegyzések törlése ─────────────────────────────
      await safeStep("Discussions", async () => {
        const userDiscussions = await db.select({ id: discussions.id }).from(discussions).where(eq(discussions.authorId, id));
        if (userDiscussions.length > 0) {
          const discussionIds = userDiscussions.map(d => d.id);
          await db.update(discussions).set({ parentId: null }).where(inArray(discussions.parentId, discussionIds));
        }
        await db.delete(discussions).where(eq(discussions.authorId, id));
      });

      // ── Lépés 17: Közösségi projektek törlése ────────────────────────────────
      await safeStep("Community projects", async () => {
        const userProjects = await db.select({ id: communityProjects.id }).from(communityProjects).where(eq(communityProjects.createdBy, id));
        for (const proj of userProjects) {
          await db.delete(projectParticipants).where(eq(projectParticipants.projectId, proj.id));
          await db.delete(peerReviews).where(eq(peerReviews.projectId, proj.id));
          await db.delete(discussions).where(eq(discussions.projectId, proj.id));
        }
        await db.delete(communityProjects).where(eq(communityProjects.createdBy, id));
      });

      // ── Lépés 18: Közösségi csoportok törlése ────────────────────────────────
      await safeStep("Community groups", async () => {
        const userGroups = await db.select({ id: communityGroups.id }).from(communityGroups).where(eq(communityGroups.createdBy, id));
        for (const group of userGroups) {
          const groupProjs = await db.select({ id: communityProjects.id }).from(communityProjects).where(eq(communityProjects.groupId, group.id));
          for (const proj of groupProjs) {
            await db.delete(projectParticipants).where(eq(projectParticipants.projectId, proj.id));
            await db.delete(peerReviews).where(eq(peerReviews.projectId, proj.id));
            await db.delete(discussions).where(eq(discussions.projectId, proj.id));
            await db.delete(communityProjects).where(eq(communityProjects.id, proj.id));
          }
          await db.delete(groupMembers).where(eq(groupMembers.groupId, group.id));
          await db.delete(discussions).where(eq(discussions.groupId, group.id));
          await db.delete(communityGroups).where(eq(communityGroups.id, group.id));
        }
      });

      // ── Lépés 19: Referenciák törlése és nullázása ────────────────────────────
      await safeStep("References cleanup", async () => {
        await db.update(classes).set({ assignedTeacherId: null }).where(eq(classes.assignedTeacherId, id));
        await db.update(systemSettings).set({ updatedBy: sql`NULL` }).where(eq(systemSettings.updatedBy, id));
        await db.update(aiSettings).set({ updatedBy: sql`NULL` }).where(eq(aiSettings.updatedBy, id));
        await db.update(users).set({ schoolAdminId: null }).where(eq(users.schoolAdminId, id));
        await db.update(professions).set({ schoolAdminId: null }).where(eq(professions.schoolAdminId, id));
        await db.update(subjects).set({ schoolAdminId: null }).where(eq(subjects.schoolAdminId, id));
        await db.update(modules).set({ schoolAdminId: null }).where(eq(modules.schoolAdminId, id));
        await db.delete(classes).where(eq(classes.schoolAdminId, id));
      });

      // ── Lépés 20: Tanár hozzárendelés eltávolítása diákoktól ─────────────────
      await safeStep("Student teacher reassign", () => 
        db.update(users).set({ assignedTeacherId: null }).where(eq(users.assignedTeacherId, id))
      );

      // ── Lépés 21: Felhasználó végleges törlése ────────────────────────────────
      await db.delete(users).where(eq(users.id, id));

      console.log(`✅ User ${id} and all related data successfully deleted`);

    } catch (error) {
      console.error(`❌ Global error during user deletion:`, error);
      throw error;
    }
  }

  async updateSchoolAdmin(id: string, data: Partial<User>): Promise<User> {
    const [updated] = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    if (!updated) throw new Error("School admin not found");
    return updated;
  }

  // School operations
  async getSchools(): Promise<School[]> {
    return await db.select().from(schools).orderBy(asc(schools.name));
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values(school).returning();
    return newSchool;
  }

  async updateSchool(id: number, data: Partial<School>): Promise<School> {
    const [updatedSchool] = await db.update(schools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    if (!updatedSchool) throw new Error("School not found");
    return updatedSchool;
  }

  async deleteSchool(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Unlink users
      await tx.update(users).set({ schoolId: null }).where(eq(users.schoolId, id));
      // Delete classes belonging to this school
      await tx.delete(classes).where(eq(classes.schoolId, id));
      // Unlink shared content
      await tx.update(professions).set({ schoolId: null }).where(eq(professions.schoolId, id));
      await tx.update(subjects).set({ schoolId: null }).where(eq(subjects.schoolId, id));
      await tx.update(modules).set({ schoolId: null }).where(eq(modules.schoolId, id));
      
      // Delete the school
      await tx.delete(schools).where(eq(schools.id, id));
    });
  }

  async assignUserToSchool(userId: string, schoolId: number | null): Promise<void> {
    await db.update(users).set({ schoolId }).where(eq(users.id, userId));
  }

  async assignClassToSchool(classId: number, schoolId: number): Promise<void> {
    await db.update(classes).set({ schoolId }).where(eq(classes.id, classId));
  }

  async getSchoolAdminBySchool(schoolId: number): Promise<User | undefined> {
    const [admin] = await db.select().from(users).where(and(eq(users.schoolId, schoolId), eq(users.role, "school_admin")));
    return admin;
  }

  // Profession operations
  async getProfessions(schoolAdminId?: string | null): Promise<any[]> {
    const conditions = [];
    if (schoolAdminId === null) {
      conditions.push(isNull(professions.schoolAdminId));
    } else if (schoolAdminId) {
      conditions.push(or(isNull(professions.schoolAdminId), eq(professions.schoolAdminId, schoolAdminId)));
    }

    const baseQuery = db.select({
      id: professions.id,
      name: professions.name,
      description: professions.description,
      iconName: professions.iconName,
      iconUrl: professions.iconUrl,
      schoolAdminId: professions.schoolAdminId,
      createdAt: professions.createdAt,
      updatedAt: professions.updatedAt,
      // Temporarily disabled for debugging ambiguous id
      subjectCount: sql<number>`(SELECT count(*)::int FROM subjects WHERE profession_id = professions.id)`,
      moduleCount: sql<number>`(SELECT count(*)::int FROM modules JOIN subjects ON modules.subject_id = subjects.id WHERE subjects.profession_id = professions.id)`,
      theoryCount: sql<number>`(SELECT count(*)::int FROM modules JOIN subjects ON modules.subject_id = subjects.id WHERE subjects.profession_id = professions.id AND modules.type = 'theory')`,
      practicalCount: sql<number>`(SELECT count(*)::int FROM modules JOIN subjects ON modules.subject_id = subjects.id WHERE subjects.profession_id = professions.id AND modules.type = 'practical')`,
    })
    .from(professions);

    if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions)).orderBy(professions.name);
    }
    return await baseQuery.orderBy(professions.name);
  }

  async getProfession(id: number): Promise<Profession | undefined> {
    const [profession] = await db.select().from(professions).where(eq(professions.id, id));
    return profession;
  }

  async createProfession(professionData: InsertProfession): Promise<Profession> {
    const [profession] = await db
      .insert(professions)
      .values(professionData)
      .returning();
    return profession;
  }

  async updateProfession(id: number, professionData: Partial<InsertProfession>): Promise<Profession> {
    const [profession] = await db
      .update(professions)
      .set({ ...professionData, updatedAt: new Date() })
      .where(eq(professions.id, id))
      .returning();
    return profession;
  }

  async deleteProfession(id: number): Promise<void> {
    console.log(`🗑️ Deleting profession ${id} and all related data (TRANSACTIONAL)`);

    await db.transaction(async (tx) => {
      // 1. Get all subjects for this profession
      const professionSubjects = await tx.select().from(subjects).where(eq(subjects.professionId, id));

      // 2. Delete each subject (which will cascade to modules and their data)
      // Note: we call this.deleteSubject which uses db, we should ideally pass tx or ensure deleteSubject handles it
      for (const subject of professionSubjects) {
        // We'll manually inline the deleteSubject logic here or ensure it uses tx
        // To be safe and efficient, we perform bulk cleanup within this transaction
        const subjectModules = await tx.select({ id: modules.id }).from(modules).where(eq(modules.subjectId, subject.id));
        
        if (subjectModules.length > 0) {
          const moduleIds = subjectModules.map(m => m.id);
          
          // Bulk cleanup for modules in this subject
          await tx.execute(sql`DELETE FROM chat_messages WHERE related_module_id = ANY(ARRAY[${sql.join(moduleIds, sql`, `)}]::int[])`);
          await tx.execute(sql`UPDATE api_calls SET module_id = NULL WHERE module_id = ANY(ARRAY[${sql.join(moduleIds, sql`, `)}]::int[])`);
          await tx.execute(sql`UPDATE community_projects SET module_id = NULL WHERE module_id = ANY(ARRAY[${sql.join(moduleIds, sql`, `)}]::int[])`);
          await tx.execute(sql`DELETE FROM flashcards WHERE module_id = ANY(ARRAY[${sql.join(moduleIds, sql`, `)}]::int[])`);
          await tx.execute(sql`DELETE FROM test_results WHERE module_id = ANY(ARRAY[${sql.join(moduleIds, sql`, `)}]::int[])`);
          await tx.execute(sql`DELETE FROM practical_grades WHERE module_id = ANY(ARRAY[${sql.join(moduleIds, sql`, `)}]::int[])`);
          await tx.execute(sql`DELETE FROM module_subject_assignments WHERE module_id = ANY(ARRAY[${sql.join(moduleIds, sql`, `)}]::int[])`);
          await tx.execute(sql`DELETE FROM modules WHERE id = ANY(ARRAY[${sql.join(moduleIds, sql`, `)}]::int[])`);
        }

        // Delete subject-specific assignments and the subject itself
        await tx.delete(moduleSubjectAssignments).where(eq(moduleSubjectAssignments.subjectId, subject.id));
        await tx.delete(subjects).where(eq(subjects.id, subject.id));
      }

      // 3. Remove profession reference from users
      await tx.execute(sql`UPDATE users SET selected_profession_id = NULL WHERE selected_profession_id = ${id}`);
      
      // Remove from assigned professions JSONB array
      await tx.execute(sql`
        UPDATE users 
        SET assigned_profession_ids = (
          SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
          FROM jsonb_array_elements(assigned_profession_ids) elem 
          WHERE elem::int != ${id}
        )
        WHERE assigned_profession_ids @> ${id}::jsonb
      `);

      // 4. Remove profession reference from classes
      await tx.execute(sql`UPDATE classes SET profession_id = NULL WHERE profession_id = ${id}`);

      // 5. Delete community groups associated with this profession
      const groups = await tx.select().from(communityGroups).where(eq(communityGroups.professionId, id));
      for (const group of groups) {
        // Here we call deleteCommunityGroup. Since it's a complex multi-step process, 
        // we'll use our newly improved transactional deleteCommunityGroup logic
        // but we need it to share the SAME transaction tx.
        // For simplicity in this large file, we'll call the method but it might start its own tx.
        // To be truly safe, we should inline the logic or pass tx.
        await this.deleteCommunityGroup(group.id, group.createdBy);
      }

      // 6. Delete background jobs associated with this profession (important for interrupted imports)
      await tx.execute(sql`DELETE FROM background_jobs WHERE data->>'professionId' = ${id.toString()}`);

      // 7. Finally delete the profession
      await tx.delete(professions).where(eq(professions.id, id));
    });

    console.log(`✅ Profession ${id} and all related data deleted successfully`);
  }

  async redistributeProfessionHours(professionId: number, newTotalHours: number): Promise<void> {
    const professionSubjects = await db.select().from(subjects).where(eq(subjects.professionId, professionId));
    if (professionSubjects.length === 0) return;

    const currentTotal = professionSubjects.reduce((sum, s) => sum + (s.hours || 0), 0);
    
    // If current total is 0, distribute evenly across subjects
    if (currentTotal === 0) {
      const perSubject = Math.floor(newTotalHours / professionSubjects.length);
      for (const s of professionSubjects) {
        await this.updateSubject(s.id, { hours: perSubject });
        // updateSubject route will handle module redistribution if called via API, 
        // but here we are in storage, so we must call redistributeSubjectHours manually
        await this.redistributeSubjectHours(s.id, perSubject);
      }
      return;
    }

    // Scale proportionally
    const scale = newTotalHours / currentTotal;
    for (const s of professionSubjects) {
      const currentHours = s.hours || 0;
      const newHours = Math.round(currentHours * scale);
      await this.updateSubject(s.id, { hours: newHours });
      await this.redistributeSubjectHours(s.id, newHours);
    }
  }

  // Subject operations
  async getSubjects(professionId?: number, schoolAdminId?: string | null): Promise<any[]> {
    const conditions = [];
    if (professionId) conditions.push(eq(subjects.professionId, professionId));

    if (schoolAdminId === null) {
      conditions.push(isNull(subjects.schoolAdminId));
    } else if (schoolAdminId) {
      conditions.push(or(isNull(subjects.schoolAdminId), eq(subjects.schoolAdminId, schoolAdminId)));
    }

    // Use a single query with LEFT JOIN and COUNT to avoid N+1 problem
    // IMPORTANT: Drizzle ORM is immutable – must use the returned query from .where()
    const baseQuery = db.select({
      id: subjects.id,
      name: subjects.name,
      code: subjects.code,
      type: subjects.type,
      description: subjects.description,
      professionId: subjects.professionId,
      hours: subjects.hours,
      schoolAdminId: subjects.schoolAdminId,
      createdAt: subjects.createdAt,
      updatedAt: subjects.updatedAt,
      moduleCount: sql<number>`count(${modules.id})::int`,
      publishedCount: sql<number>`count(CASE WHEN ${modules.isPublished} = true THEN 1 END)::int`,
      totalSuggestedHours: sql<number>`COALESCE(SUM(${modules.suggestedHours}), 0)::numeric`,
    })
    .from(subjects)
    .leftJoin(modules, eq(subjects.id, modules.subjectId))
    .groupBy(subjects.id);

    let results;
    if (conditions.length > 0) {
      results = await baseQuery.where(and(...conditions));
    } else {
      results = await baseQuery;
    }

    // Natural numeric sorting for subject code (e.g., 3.4.2 < 3.4.10)
    return (results as any[]).sort((a, b) => {
      if (a.code && b.code) {
        const partsA = a.code.split('.').map(Number);
        const partsB = b.code.split('.').map(Number);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const valA = partsA[i] || 0;
          const valB = partsB[i] || 0;
          if (valA !== valB) return valA - valB;
        }
      }
      return a.name.localeCompare(b.name);
    });
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async createSubject(subjectData: InsertSubject): Promise<Subject> {
    const [subject] = await db
      .insert(subjects)
      .values(subjectData)
      .returning();
    return subject;
  }

  async updateSubject(id: number, subjectData: Partial<InsertSubject>): Promise<Subject> {
    const [subject] = await db
      .update(subjects)
      .set({ ...subjectData, updatedAt: new Date() })
      .where(eq(subjects.id, id))
      .returning();
    return subject;
  }

  async deleteSubject(id: number): Promise<void> {
    console.log(`🗑️ Deleting subject ${id} and all related modules (BULK OPTIMIZED)`);

    // 1. Get all modules for this subject
    const subjectModules = await db.select({ id: modules.id }).from(modules).where(eq(modules.subjectId, id));
    
    if (subjectModules.length > 0) {
      const moduleIds = subjectModules.map(m => m.id);
      
      // Delete in chunks if there are too many to avoid SQL parsing limits
      // But for 1000 modules, a single IN clause is perfectly fine in Postgres
      const { sql } = await import('drizzle-orm');
      
      // We can use a direct SQL query for bulk deletion using ANY(ARRAY[...])
      const idsArray = sql`ARRAY[${sql.join(moduleIds, sql`, `)}]::int[]`;

      // 1. Delete chat messages
      await db.execute(sql`DELETE FROM chat_messages WHERE related_module_id = ANY(${idsArray})`);
      
      // 2. Set module_id to NULL in api_calls
      await db.execute(sql`UPDATE api_calls SET module_id = NULL WHERE module_id = ANY(${idsArray})`);
      
      // 3. Set module_id to NULL in community_projects
      await db.execute(sql`UPDATE community_projects SET module_id = NULL WHERE module_id = ANY(${idsArray})`);
      
      // 4. Delete flashcards
      await db.execute(sql`DELETE FROM flashcards WHERE module_id = ANY(${idsArray})`);
      
      // 5. Delete test results
      await db.execute(sql`DELETE FROM test_results WHERE module_id = ANY(${idsArray})`);
      
      // 6. Delete practical grades
      await db.execute(sql`DELETE FROM practical_grades WHERE module_id = ANY(${idsArray})`);
      
      // 7. Delete many-to-many assignments
      await db.execute(sql`DELETE FROM module_subject_assignments WHERE module_id = ANY(${idsArray})`);
      
      // 8. Delete the modules themselves
      await db.execute(sql`DELETE FROM modules WHERE id = ANY(${idsArray})`);
    }

    // 3. Delete many-to-many assignments for the subject
    await db.delete(moduleSubjectAssignments).where(eq(moduleSubjectAssignments.subjectId, id));

    // 4. Delete the subject
    await db.delete(subjects).where(eq(subjects.id, id));
    console.log(`✅ Subject ${id} deleted successfully`);
  }

  async redistributeSubjectHours(subjectId: number, newTotalHours: number): Promise<void> {
    const subjectModules = await db.select().from(modules).where(eq(modules.subjectId, subjectId));
    if (subjectModules.length === 0) return;

    const currentTotal = subjectModules.reduce((sum, m) => sum + (parseFloat(m.suggestedHours || "0") || 0), 0);
    
    // If current total is 0, distribute evenly
    if (currentTotal === 0) {
      const perModule = (newTotalHours / subjectModules.length).toFixed(1);
      for (const m of subjectModules) {
        await db.update(modules)
          .set({ suggestedHours: perModule, updatedAt: new Date() })
          .where(eq(modules.id, m.id));
      }
      return;
    }

    // Scale proportionally
    const scale = newTotalHours / currentTotal;
    for (const m of subjectModules) {
      const currentHours = parseFloat(m.suggestedHours || "0") || 0;
      const newHours = (currentHours * scale).toFixed(1);
      await db.update(modules)
        .set({ suggestedHours: newHours, updatedAt: new Date() })
        .where(eq(modules.id, m.id));
    }
  }

  // Module operations
  async getModules(subjectId?: number, schoolAdminId?: string | null, professionId?: number): Promise<Module[]> {
    const conditions = [];

    if (subjectId) {
      const subjectFilter = or(
        eq(modules.subjectId, subjectId),
        exists(
          db.select()
            .from(moduleSubjectAssignments)
            .where(and(
              eq(moduleSubjectAssignments.moduleId, modules.id),
              eq(moduleSubjectAssignments.subjectId, subjectId)
            ))
        )
      );
      if (subjectFilter) conditions.push(subjectFilter);
    } else if (professionId) {
      // If no subjectId but professionId is provided, filter modules by subjects belonging to that profession
      conditions.push(
        exists(
          db.select()
            .from(subjects)
            .where(and(
              eq(subjects.id, modules.subjectId),
              eq(subjects.professionId, professionId)
            ))
        )
      );
    }

    if (schoolAdminId === null) {
      conditions.push(isNull(modules.schoolAdminId));
    } else if (schoolAdminId) {
      const adminFilter = or(
        isNull(modules.schoolAdminId),
        eq(modules.schoolAdminId, schoolAdminId)
      );
      if (adminFilter) conditions.push(adminFilter);
    }

    // Optimization: Select only necessary columns for listing to avoid heavy JSON/Text fields
    const query = db
      .select({
        id: modules.id,
        subjectId: modules.subjectId,
        title: modules.title,
        content: modules.content,
        conciseContent: modules.conciseContent,
        detailedContent: modules.detailedContent,
        moduleNumber: modules.moduleNumber,
        sectionCode: modules.sectionCode,
        type: modules.type,
        imageUrl: modules.imageUrl,
        isPublished: modules.isPublished,
        suggestedHours: modules.suggestedHours,
        schoolId: modules.schoolId,
        schoolAdminId: modules.schoolAdminId,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt
      })
      .from(modules);

    let results;
    if (conditions.length > 0) {
      results = await query.where(and(...conditions));
    } else {
      results = await query;
    }

    // Natural numeric sorting for sectionCode (e.g., 3.4.4.2 < 3.4.4.10)
    return (results as any[]).sort((a, b) => {
      if (a.sectionCode && b.sectionCode) {
        const partsA = a.sectionCode.split('.').map(Number);
        const partsB = b.sectionCode.split('.').map(Number);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const valA = partsA[i] || 0;
          const valB = partsB[i] || 0;
          if (valA !== valB) return valA - valB;
        }
      }
      // Fallback to moduleNumber if no sectionCode or codes are identical
      return (a.moduleNumber || 0) - (b.moduleNumber || 0) || a.title.localeCompare(b.title);
    });
  }

  async getPublishedModules(subjectId?: number, schoolAdminId?: string | null, professionId?: number): Promise<Module[]> {
    const conditions = [eq(modules.isPublished, true)];

    if (subjectId) {
      const subjectFilter = or(
        eq(modules.subjectId, subjectId),
        exists(
          db.select()
            .from(moduleSubjectAssignments)
            .where(and(
              eq(moduleSubjectAssignments.moduleId, modules.id),
              eq(moduleSubjectAssignments.subjectId, subjectId)
            ))
        )
      );
      if (subjectFilter) conditions.push(subjectFilter);
    } else if (professionId) {
      // If no subjectId but professionId is provided, filter modules by subjects belonging to that profession
      conditions.push(
        exists(
          db.select()
            .from(subjects)
            .where(and(
              eq(subjects.id, modules.subjectId),
              eq(subjects.professionId, professionId)
            ))
        )
      );
    }

    if (schoolAdminId === null) {
      conditions.push(isNull(modules.schoolAdminId));
    } else if (schoolAdminId) {
      const adminFilter = or(
        isNull(modules.schoolAdminId),
        eq(modules.schoolAdminId, schoolAdminId)
      );
      if (adminFilter) conditions.push(adminFilter);
    }

    const results = await db
      .select({
        id: modules.id,
        subjectId: modules.subjectId,
        title: modules.title,
        content: modules.content,
        conciseContent: modules.conciseContent,
        detailedContent: modules.detailedContent,
        moduleNumber: modules.moduleNumber,
        sectionCode: modules.sectionCode,
        type: modules.type,
        imageUrl: modules.imageUrl,
        isPublished: modules.isPublished,
        suggestedHours: modules.suggestedHours,
        schoolId: modules.schoolId,
        schoolAdminId: modules.schoolAdminId,
        createdAt: modules.createdAt,
        updatedAt: modules.updatedAt
      })
      .from(modules)
      .where(and(...conditions));

    // Natural numeric sorting for sectionCode (e.g., 3.4.4.2 < 3.4.4.10)
    return (results as any[]).sort((a, b) => {
      if (a.sectionCode && b.sectionCode) {
        const partsA = a.sectionCode.split('.').map(Number);
        const partsB = b.sectionCode.split('.').map(Number);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const valA = partsA[i] || 0;
          const valB = partsB[i] || 0;
          if (valA !== valB) return valA - valB;
        }
      }
      return (a.moduleNumber || 0) - (b.moduleNumber || 0) || a.title.localeCompare(b.title);
    });
  }

  async getModule(id: number): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module;
  }

  async createModule(moduleData: InsertModule): Promise<Module> {
    const { additionalSubjectIds, ...data } = moduleData as any;
    const [newModule] = await db
      .insert(modules)
      .values(data)
      .returning();
    
    if (additionalSubjectIds && Array.isArray(additionalSubjectIds)) {
      await this.updateModuleAssignments(newModule.id, additionalSubjectIds);
    }
    
    return newModule;
  }

  async bulkCreateModules(modulesList: InsertModule[]): Promise<Module[]> {
    if (modulesList.length === 0) return [];
    return await db.insert(modules).values(modulesList).returning();
  }

  async updateModule(id: number, moduleData: Partial<InsertModule>): Promise<Module> {
    const { additionalSubjectIds, ...data } = moduleData as any;
    
    const [module] = await db
      .update(modules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(modules.id, id))
      .returning();
      
    if (additionalSubjectIds !== undefined && Array.isArray(additionalSubjectIds)) {
      await this.updateModuleAssignments(id, additionalSubjectIds);
    }
    
    return module;
  }

  async deleteModule(id: number): Promise<void> {
    console.log(`🗑️ Deleting module ${id} and related data`);

    // 1. Delete chat messages related to this module
    await db.delete(chatMessages).where(eq(chatMessages.relatedModuleId, id));

    // 2. Set module_id to NULL in api_calls
    await db.execute(sql`UPDATE api_calls SET module_id = NULL WHERE module_id = ${id}`);

    // 3. Handle community projects linked to this module
    // We set the module_id to NULL rather than deleting the project to preserve student work
    await db.execute(sql`UPDATE community_projects SET module_id = NULL WHERE module_id = ${id}`);

    // 4. Delete flashcards related to this module
    await db.delete(flashcards).where(eq(flashcards.moduleId, id));

    // 5. Delete test results related to this module
    await db.delete(testResults).where(eq(testResults.moduleId, id));

    // 6. Delete practical grades related to this module
    await db.delete(practicalGrades).where(eq(practicalGrades.moduleId, id));

    // 7. Delete many-to-many assignments
    await db.delete(moduleSubjectAssignments).where(eq(moduleSubjectAssignments.moduleId, id));

    // 8. Finally delete the module
    await db.delete(modules).where(eq(modules.id, id));
    console.log(`✅ Module ${id} deleted`);
  }

  // Flashcard operations
  async getFlashcards(moduleId: number): Promise<Flashcard[]> {
    return await db.select().from(flashcards).where(eq(flashcards.moduleId, moduleId));
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [newFlashcard] = await db
      .insert(flashcards)
      .values(flashcard)
      .returning();
    return newFlashcard;
  }

  async deleteFlashcardsByModule(moduleId: number): Promise<void> {
    await db.delete(flashcards).where(eq(flashcards.moduleId, moduleId));
  }

  async bulkCreateFlashcards(flashcardsList: InsertFlashcard[]): Promise<Flashcard[]> {
    if (flashcardsList.length === 0) return [];
    return await db.insert(flashcards).values(flashcardsList).returning();
  }

  // Module assignment operations
  async getModuleAssignments(moduleId: number): Promise<number[]> {
    const rows = await db
      .select({ subjectId: moduleSubjectAssignments.subjectId })
      .from(moduleSubjectAssignments)
      .where(eq(moduleSubjectAssignments.moduleId, moduleId));
    return rows.map(r => r.subjectId);
  }

  async updateModuleAssignments(moduleId: number, subjectIds: number[]): Promise<void> {
    // 1. Delete existing assignments
    await db.delete(moduleSubjectAssignments).where(eq(moduleSubjectAssignments.moduleId, moduleId));

    // 2. Insert new assignments
    if (subjectIds.length > 0) {
      const values = subjectIds.map(subjectId => ({ moduleId, subjectId }));
      await db.insert(moduleSubjectAssignments).values(values);
    }
  }

  // Chat operations
  async getChatMessages(userId: string, moduleId?: number): Promise<ChatMessage[]> {
    const conditions = [eq(chatMessages.userId, userId)];
    if (moduleId) {
      conditions.push(eq(chatMessages.relatedModuleId, moduleId));
    }

    return await db
      .select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(chatMessages.timestamp);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async deleteChatMessages(userId: string, moduleId?: number): Promise<void> {
    if (moduleId !== undefined) {
      // Delete messages for specific module
      await db
        .delete(chatMessages)
        .where(and(
          eq(chatMessages.userId, userId),
          eq(chatMessages.relatedModuleId, moduleId)
        ));
    } else {
      // Delete all messages for user
      await db
        .delete(chatMessages)
        .where(eq(chatMessages.userId, userId));
    }
  }

  // System settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting || undefined;
  }

  async setSystemSetting(key: string, value: string, updatedBy: string): Promise<SystemSetting> {
    const [setting] = await db
      .insert(systemSettings)
      .values({
        key,
        value,
        updatedBy,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value,
          updatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return setting;
  }



  // Community operations
  async getCommunityGroups(professionId?: number): Promise<CommunityGroup[]> {
    if (professionId) {
      return await db.select().from(communityGroups).where(eq(communityGroups.professionId, professionId));
    }
    return await db.select().from(communityGroups);
  }

  async getCommunityGroup(id: number): Promise<CommunityGroup | undefined> {
    const [group] = await db.select().from(communityGroups).where(eq(communityGroups.id, id));
    return group;
  }

  async createCommunityGroup(groupData: InsertCommunityGroup): Promise<CommunityGroup> {
    const [group] = await db
      .insert(communityGroups)
      .values(groupData)
      .returning();
    return group;
  }

  async updateCommunityGroup(id: number, groupData: Partial<InsertCommunityGroup>, userId: string): Promise<CommunityGroup> {
    // Check if user is the creator
    const [existingGroup] = await db.select().from(communityGroups).where(eq(communityGroups.id, id));
    if (!existingGroup || existingGroup.createdBy !== userId) {
      throw new Error('Unauthorized to update this group');
    }

    const [updatedGroup] = await db
      .update(communityGroups)
      .set({ ...groupData, updatedAt: new Date() })
      .where(eq(communityGroups.id, id))
      .returning();
    return updatedGroup;
  }

  async deleteCommunityGroup(id: number, userId: string): Promise<void> {
    // Check if user is the creator
    const [existingGroup] = await db.select().from(communityGroups).where(eq(communityGroups.id, id));
    if (!existingGroup) return; // Already deleted
    
    // Admin can delete any group, others only their own
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (existingGroup.createdBy !== userId && user?.role !== 'admin' && user?.role !== 'school_admin') {
      throw new Error('Unauthorized to delete this group');
    }

    await db.transaction(async (tx) => {
      // 1. Get all projects for this group
      const projects = await tx.select({ id: communityProjects.id }).from(communityProjects).where(eq(communityProjects.groupId, id));
      const projectIds = projects.map(p => p.id);

      if (projectIds.length > 0) {
        // 2. Delete data related to projects
        await tx.delete(peerReviews).where(inArray(peerReviews.projectId, projectIds));
        await tx.delete(projectParticipants).where(inArray(projectParticipants.projectId, projectIds));
        await tx.delete(discussions).where(inArray(discussions.projectId, projectIds));
        await tx.delete(communityProjects).where(eq(communityProjects.groupId, id));
      }

      // 3. Handle discussions in the group (replies first)
      await tx.update(discussions).set({ parentId: null }).where(eq(discussions.groupId, id));
      await tx.delete(discussions).where(eq(discussions.groupId, id));

      // 4. Delete group members
      await tx.delete(groupMembers).where(eq(groupMembers.groupId, id));

      // 5. Finally delete the group
      await tx.delete(communityGroups).where(eq(communityGroups.id, id));
    });
  }

  async joinCommunityGroup(groupId: number, userId: string): Promise<void> {
    await db
      .insert(groupMembers)
      .values({ groupId, userId, role: 'member' });
  }

  async leaveCommunityGroup(groupId: number, userId: string): Promise<void> {
    await db
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  }

  async getCommunityLeaderboard(): Promise<any[]> {
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      SELECT 
        cg.id, 
        cg.name, 
        cg.description,
        COUNT(gm.user_id) as member_count,
        COALESCE(SUM(u.xp), 0) as total_xp
      FROM community_groups cg
      LEFT JOIN group_members gm ON cg.id = gm.group_id
      LEFT JOIN users u ON gm.user_id = u.id
      GROUP BY cg.id
      ORDER BY total_xp DESC
      LIMIT 10
    `);
    // PostgreSQL pg driver returns rows in .rows property, while local sqlite returns an array.
    // Handling both cases:
    return Array.isArray(result) ? result : (result.rows || []);
  }

  // Community projects
  async getCommunityProjects(groupId?: number): Promise<CommunityProject[]> {
    if (groupId) {
      return await db.select().from(communityProjects).where(eq(communityProjects.groupId, groupId));
    }
    return await db.select().from(communityProjects);
  }

  async getCommunityProject(id: number): Promise<CommunityProject | undefined> {
    const [project] = await db.select().from(communityProjects).where(eq(communityProjects.id, id));
    return project;
  }

  async createCommunityProject(projectData: InsertCommunityProject): Promise<CommunityProject> {
    const [project] = await db
      .insert(communityProjects)
      .values(projectData)
      .returning();
    return project;
  }

  async joinProject(projectId: number, userId: string): Promise<void> {
    await db
      .insert(projectParticipants)
      .values({ projectId, userId, role: 'participant' });
  }

  async getProjectParticipants(projectId: number): Promise<ProjectParticipant[]> {
    return await db.select().from(projectParticipants).where(eq(projectParticipants.projectId, projectId));
  }

  // Discussions
  async getDiscussions(groupId?: number, projectId?: number): Promise<Discussion[]> {
    // Pinned posts always come first, then by date desc
    const orderBy = [desc(discussions.isPinned), desc(discussions.createdAt)];

    if (groupId && projectId) {
      return await db.select().from(discussions)
        .where(and(
          eq(discussions.groupId, groupId),
          eq(discussions.projectId, projectId),
          isNull(discussions.parentId)   // only top-level in list
        ))
        .orderBy(...orderBy);
    } else if (groupId) {
      return await db.select().from(discussions)
        .where(and(eq(discussions.groupId, groupId), isNull(discussions.parentId)))
        .orderBy(...orderBy);
    } else if (projectId) {
      return await db.select().from(discussions)
        .where(and(eq(discussions.projectId, projectId), isNull(discussions.parentId)))
        .orderBy(...orderBy);
    }

    return await db.select().from(discussions)
      .where(isNull(discussions.parentId))
      .orderBy(...orderBy);
  }

  async getReplies(parentId: number): Promise<Discussion[]> {
    return await db.select().from(discussions)
      .where(eq(discussions.parentId, parentId))
      .orderBy(discussions.createdAt);
  }

  async createDiscussion(discussionData: InsertDiscussion): Promise<Discussion> {
    const [discussion] = await db
      .insert(discussions)
      .values(discussionData)
      .returning();
    return discussion;
  }

  async deleteDiscussion(id: number): Promise<void> {
    await db.delete(discussions).where(eq(discussions.id, id));
  }

  // Background Job operations
  async createBackgroundJob(type: string, message: string, data?: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO background_jobs (type, status, progress, message, data)
        VALUES (${type}, 'processing', 0, ${message}, ${data ?? null})
        RETURNING *
      `);
      
      const rows = Array.isArray(result) ? result : (result.rows || []);
      return rows[0];
    } catch (error) {
      console.error("Error creating background job:", error);
      throw error;
    }
  }

  async updateBackgroundJob(id: number, update: { status?: string, progress?: number, message?: string, error?: string, data?: any }): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE background_jobs 
        SET 
          status = COALESCE(${update.status ?? null}, status),
          progress = COALESCE(${update.progress ?? null}, progress),
          message = COALESCE(${update.message ?? null}, message),
          error = COALESCE(${update.error ?? null}, error),
          data = COALESCE(${update.data ?? null}, data),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error("Error updating background job:", error);
    }
  }

  async getLatestBackgroundJob(type: string): Promise<any> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM background_jobs 
        WHERE type = ${type}
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      const rows = Array.isArray(result) ? result : (result.rows || []);
      return rows[0];
    } catch (error) {
      console.error(`Error fetching latest background job for ${type}:`, error);
      return null;
    }
  }

  async pinDiscussion(id: number, pinned: boolean): Promise<void> {
    await db.update(discussions)
      .set({ isPinned: pinned })
      .where(eq(discussions.id, id));
  }

  // Reactions
  async toggleReaction(discussionId: number, userId: string, emoji: string): Promise<{ added: boolean }> {
    const existing = await db.select()
      .from(discussionReactions)
      .where(and(
        eq(discussionReactions.discussionId, discussionId),
        eq(discussionReactions.userId, userId),
        eq(discussionReactions.emoji, emoji)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(discussionReactions)
        .where(and(
          eq(discussionReactions.discussionId, discussionId),
          eq(discussionReactions.userId, userId),
          eq(discussionReactions.emoji, emoji)
        ));
      return { added: false };
    } else {
      await db.insert(discussionReactions)
        .values({ discussionId, userId, emoji });
      return { added: true };
    }
  }

  async getReactionsForDiscussions(discussionIds: number[]): Promise<DiscussionReaction[]> {
    if (discussionIds.length === 0) return [];
    return await db.select().from(discussionReactions)
      .where(inArray(discussionReactions.discussionId, discussionIds));
  }

  // Peer reviews
  async createPeerReview(reviewData: InsertPeerReview): Promise<PeerReview> {
    const [review] = await db
      .insert(peerReviews)
      .values(reviewData)
      .returning();
    return review;
  }

  async getPeerReviews(projectId: number): Promise<PeerReview[]> {
    return await db.select().from(peerReviews).where(eq(peerReviews.projectId, projectId));
  }

  // Admin messages
  async createAdminMessage(messageData: InsertAdminMessage): Promise<AdminMessage> {
    const [message] = await db
      .insert(adminMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getAdminMessages(): Promise<AdminMessage[]> {
    return await db.select().from(adminMessages).orderBy(desc(adminMessages.createdAt));
  }

  async getUserAdminMessages(userId: string): Promise<AdminMessage[]> {
    return await db.select().from(adminMessages)
      .where(eq(adminMessages.senderId, userId))
      .orderBy(desc(adminMessages.createdAt));
  }

  async respondToAdminMessage(messageId: number, response: string): Promise<AdminMessage> {
    const [message] = await db
      .update(adminMessages)
      .set({
        response,
        isResolved: true,
        respondedAt: new Date()
      })
      .where(eq(adminMessages.id, messageId))
      .returning();
    return message;
  }

  // Class operations
  async getClassesBySchoolAdmin(schoolAdminId: string): Promise<any[]> {
    const teacherAlias = aliasedTable(users, 'teacher_alias');
    const studentAlias = aliasedTable(users, 'student_alias');

    return await db.select({
      id: classes.id,
      name: classes.name,
      description: classes.description,
      schoolId: classes.schoolId,
      schoolAdminId: classes.schoolAdminId,
      assignedTeacherId: classes.assignedTeacherId,
      professionId: classes.professionId,
      scheduleGroup: classes.scheduleGroup,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
      studentCount: sql<number>`count(${studentAlias.id})::int`,
      teacherName: sql<string>`COALESCE(${teacherAlias.lastName} || ' ' || ${teacherAlias.firstName}, 'Nincs hozzárendelve')`,
    })
    .from(classes)
    .leftJoin(studentAlias, and(eq(classes.id, studentAlias.classId), eq(studentAlias.role, 'student')))
    .leftJoin(teacherAlias, eq(classes.assignedTeacherId, teacherAlias.id))
    .where(eq(classes.schoolAdminId, schoolAdminId))
    .groupBy(classes.id, teacherAlias.id)
    .orderBy(classes.name);
  }

  async getClassById(classId: number): Promise<Class | undefined> {
    const [classData] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));
    return classData;
  }

  async getStudentsByClass(classId: number): Promise<any[]> {
    const teacherAlias = aliasedTable(users, 'teacher_alias');

    return await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      classId: users.classId,
      assignedTeacherId: users.assignedTeacherId,
      schoolAdminId: users.schoolAdminId,
      xp: users.xp,
      currentStreak: users.currentStreak,
      lastActiveDate: users.lastActiveDate,
      completedModules: users.completedModules,
      selectedProfessionId: users.selectedProfessionId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      teacherName: sql<string>`COALESCE(${teacherAlias.lastName} || ' ' || ${teacherAlias.firstName}, 'Nincs hozzárendelve')`,
    })
    .from(users)
    .leftJoin(teacherAlias, eq(users.assignedTeacherId, teacherAlias.id))
    .where(and(eq(users.classId, classId), eq(users.role, 'student')))
    .orderBy(users.firstName, users.lastName, users.username);
  }

  async getStudentsBySchoolAdmin(schoolAdminId: string): Promise<any[]> {
    const teacherAlias = aliasedTable(users, 'teacher_alias');

    return await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      phone: users.phone,
      schoolName: users.schoolName,
      classId: users.classId,
      assignedTeacherId: users.assignedTeacherId,
      schoolAdminId: users.schoolAdminId,
      xp: users.xp,
      currentStreak: users.currentStreak,
      lastActiveDate: users.lastActiveDate,
      completedModules: users.completedModules,
      selectedProfessionId: users.selectedProfessionId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      teacherName: sql<string>`COALESCE(${teacherAlias.lastName} || ' ' || ${teacherAlias.firstName}, 'Nincs hozzárendelve')`,
      className: sql<string>`COALESCE(${classes.name}, 'Nincs osztályban')`,
    })
    .from(users)
    .leftJoin(teacherAlias, eq(users.assignedTeacherId, teacherAlias.id))
    .leftJoin(classes, eq(users.classId, classes.id))
    .where(and(eq(users.schoolAdminId, schoolAdminId), eq(users.role, 'student')))
    .orderBy(users.firstName, users.lastName, users.username);
  }

  async getTeachersBySchoolAdmin(schoolAdminId: string): Promise<any[]> {
    const studentsAlias = aliasedTable(users, 'students_alias');
    
    return await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      schoolAdminId: users.schoolAdminId,
      xp: users.xp,
      currentStreak: users.currentStreak,
      lastActiveDate: users.lastActiveDate,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      studentCount: sql<number>`count(DISTINCT ${studentsAlias.id})::int`,
      classCount: sql<number>`count(DISTINCT ${classes.id})::int`,
    })
    .from(users)
    .leftJoin(studentsAlias, and(eq(users.id, studentsAlias.assignedTeacherId), eq(studentsAlias.role, 'student')))
    .leftJoin(classes, eq(users.id, classes.assignedTeacherId))
    .where(and(eq(users.schoolAdminId, schoolAdminId), eq(users.role, 'teacher')))
    .groupBy(users.id)
    .orderBy(users.firstName, users.lastName, users.username);
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [newClass] = await db
      .insert(classes)
      .values(classData)
      .returning();
    return newClass;
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class> {
    const [updatedClass] = await db
      .update(classes)
      .set({ ...classData, updatedAt: new Date() })
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  async deleteClass(id: number): Promise<void> {
    // Remove students from class first
    await db
      .update(users)
      .set({ classId: null })
      .where(eq(users.classId, id));

    // Delete the class
    await db.delete(classes).where(eq(classes.id, id));
  }

  async assignStudentToClass(studentId: string, classId: number): Promise<void> {
    await db
      .update(users)
      .set({ classId })
      .where(eq(users.id, studentId));
  }

  async addStudentToClass(studentId: string, classId: number): Promise<void> {
    const [classData] = await db.select().from(classes).where(eq(classes.id, classId));
    
    const updateData: any = { classId, updatedAt: new Date() };
    if (classData?.professionId) updateData.selectedProfessionId = classData.professionId;
    if (classData?.assignedTeacherId) updateData.assignedTeacherId = classData.assignedTeacherId;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, studentId));
  }

  async removeStudentFromClass(studentId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        classId: null, 
        assignedTeacherId: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, studentId));
  }

  async assignTeacherToClass(teacherId: string, classId: number): Promise<void> {
    // Update class with assigned teacher
    await db
      .update(classes)
      .set({ assignedTeacherId: teacherId, updatedAt: new Date() })
      .where(eq(classes.id, classId));

    // Update students in that class to have this teacher assigned
    await db
      .update(users)
      .set({ assignedTeacherId: teacherId, updatedAt: new Date() })
      .where(eq(users.classId, classId));
  }

  async assignProfessionToClass(classId: number, professionId: number): Promise<void> {
    // Osztályhoz szakma hozzárendelése
    await db
      .update(classes)
      .set({ professionId, updatedAt: new Date() })
      .where(eq(classes.id, classId));

    // Az osztályban lévő összes diák szakmájának frissítése
    await db
      .update(users)
      .set({ selectedProfessionId: professionId, updatedAt: new Date() })
      .where(eq(users.classId, classId));
  }

  async assignTeacherToClassById(classId: number, teacherId: string): Promise<void> {
    // Tanár hozzárendelése osztályhoz
    await db
      .update(classes)
      .set({ assignedTeacherId: teacherId, updatedAt: new Date() })
      .where(eq(classes.id, classId));
  }

  async getClassWithProfession(classId: number): Promise<Class & { profession?: any } | undefined> {
    const result = await db
      .select({
        id: classes.id,
        name: classes.name,
        description: classes.description,
        schoolId: classes.schoolId,
        schoolAdminId: classes.schoolAdminId,
        assignedTeacherId: classes.assignedTeacherId,
        professionId: classes.professionId,
        scheduleGroup: classes.scheduleGroup,
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt,
        profession: professions
      })
      .from(classes)
      .leftJoin(professions, eq(classes.professionId, professions.id))
      .where(eq(classes.id, classId))
      .limit(1);

    return result[0] || undefined;
  }

  // Cost tracking operations
  async logApiCall(callData: InsertApiCall): Promise<ApiCall> {
    const [call] = await db
      .insert(apiCalls)
      .values(callData)
      .returning();
    return call;
  }

  async getApiCallStats(year?: number, month?: number): Promise<any> {
    try {
      let baseQuery = db
        .select({
          provider: apiCalls.provider,
          service: apiCalls.service,
          totalCalls: sql<number>`count(*)::int`,
          totalCost: sql<number>`sum(coalesce(${apiCalls.costUsd}::float, 0))`,
          totalTokens: sql<number>`sum(coalesce(${apiCalls.tokenCount}::int, 0))`,
        })
        .from(apiCalls);

      if (year && month) {
        return await baseQuery
          .where(
            and(
              sql`extract(year from ${apiCalls.createdAt}) = ${year}`,
              sql`extract(month from ${apiCalls.createdAt}) = ${month}`
            )
          )
          .groupBy(apiCalls.provider, apiCalls.service);
      } else if (year) {
        return await baseQuery
          .where(sql`extract(year from ${apiCalls.createdAt}) = ${year}`)
          .groupBy(apiCalls.provider, apiCalls.service);
      }

      return await baseQuery.groupBy(apiCalls.provider, apiCalls.service);
    } catch (error) {
      console.error('Error fetching API call stats:', error);
      return [];
    }
  }

  async getMonthlyCosts(year?: number): Promise<MonthlyCost[]> {
    try {
      if (year) {
        return await db
          .select()
          .from(monthlyCosts)
          .where(eq(monthlyCosts.year, year))
          .orderBy(desc(monthlyCosts.year), desc(monthlyCosts.month));
      }

      return await db
        .select()
        .from(monthlyCosts)
        .orderBy(desc(monthlyCosts.year), desc(monthlyCosts.month));
    } catch (error) {
      console.error('Error fetching monthly costs:', error);
      return [];
    }
  }

  // Calculate monthly API costs from api_calls table
  async calculateMonthlyApiCosts(year: number, month: number): Promise<number> {
    try {
      const result = await db
        .select({
          totalCost: sql<string>`COALESCE(SUM(CAST(COALESCE(${apiCalls.costUsd}, '0') AS DECIMAL)), 0)`
        })
        .from(apiCalls)
        .where(
          and(
            sql`EXTRACT(YEAR FROM ${apiCalls.createdAt}) = ${year}`,
            sql`EXTRACT(MONTH FROM ${apiCalls.createdAt}) = ${month}`
          )
        );

      return parseFloat(result[0]?.totalCost || '0');
    } catch (error) {
      console.error('Error calculating monthly API costs:', error);
      return 0;
    }
  }

  // Ensure current month cost entry exists
  async ensureCurrentMonthCostEntry(): Promise<MonthlyCost> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Check if current month entry exists
    const existing = await db
      .select()
      .from(monthlyCosts)
      .where(
        and(
          eq(monthlyCosts.year, year),
          eq(monthlyCosts.month, month)
        )
      );

    if (existing.length > 0) {
      // Update API costs for existing entry
      const apiCosts = await this.calculateMonthlyApiCosts(year, month);
      const existingEntry = existing[0];
      const totalCosts = parseFloat(apiCosts.toString()) +
        parseFloat(existingEntry.developmentCosts?.toString() || '0') +
        parseFloat(existingEntry.infrastructureCosts?.toString() || '0') +
        parseFloat(existingEntry.otherCosts?.toString() || '0');

      const [updated] = await db
        .update(monthlyCosts)
        .set({
          apiCosts: apiCosts.toFixed(2),
          totalCosts: totalCosts.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(monthlyCosts.id, existingEntry.id))
        .returning();
      return updated;
    } else {
      // Create new entry for current month
      const apiCosts = await this.calculateMonthlyApiCosts(year, month);
      const [inserted] = await db
        .insert(monthlyCosts)
        .values({
          year,
          month,
          apiCosts: apiCosts.toFixed(2),
          developmentCosts: '0.00',
          infrastructureCosts: '0.00',
          otherCosts: '0.00',
          totalCosts: apiCosts.toFixed(2),
          notes: 'Automatikusan létrehozva',
        })
        .returning();
      return inserted;
    }
  }

  // Get monthly cost by ID
  async getMonthlyCostById(id: number): Promise<MonthlyCost | null> {
    try {
      const result = await db
        .select()
        .from(monthlyCosts)
        .where(eq(monthlyCosts.id, id));

      return result[0] || null;
    } catch (error) {
      console.error('Error getting monthly cost by ID:', error);
      return null;
    }
  }

  // Update monthly cost
  async updateMonthlyCost(id: number, updateData: Partial<InsertMonthlyCost>): Promise<MonthlyCost> {
    const [updated] = await db
      .update(monthlyCosts)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(monthlyCosts.id, id))
      .returning();
    return updated;
  }

  async upsertMonthlyCost(costData: InsertMonthlyCost): Promise<MonthlyCost> {
    // Check if record exists
    const existing = await db
      .select()
      .from(monthlyCosts)
      .where(
        and(
          eq(monthlyCosts.year, costData.year),
          eq(monthlyCosts.month, costData.month)
        )
      );

    if (existing.length > 0) {
      // Update existing record
      const [updated] = await db
        .update(monthlyCosts)
        .set({
          ...costData,
          updatedAt: new Date(),
        })
        .where(eq(monthlyCosts.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [inserted] = await db
        .insert(monthlyCosts)
        .values(costData)
        .returning();
      return inserted;
    }
  }





  // API pricing operations
  async getApiPricing(): Promise<ApiPricing[]> {
    return await db
      .select()
      .from(apiPricing)
      .where(eq(apiPricing.isActive, true))
      .orderBy(apiPricing.provider, apiPricing.service);
  }

  async upsertApiPricing(pricingData: InsertApiPricing): Promise<ApiPricing> {
    // Check if record exists
    const existing = await db
      .select()
      .from(apiPricing)
      .where(
        and(
          eq(apiPricing.provider, pricingData.provider),
          eq(apiPricing.service, pricingData.service),
          pricingData.model ? eq(apiPricing.model, pricingData.model) : isNull(apiPricing.model)
        )
      );

    if (existing.length > 0) {
      // Update existing record
      const [updated] = await db
        .update(apiPricing)
        .set({
          ...pricingData,
          updatedAt: new Date(),
        })
        .where(eq(apiPricing.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [inserted] = await db
        .insert(apiPricing)
        .values(pricingData)
        .returning();
      return inserted;
    }
  }

  async deleteApiPricing(id: number): Promise<void> {
    await db
      .update(apiPricing)
      .set({ isActive: false })
      .where(eq(apiPricing.id, id));
  }

  async getUniqueApiProviders(): Promise<{ provider: string, service: string, model?: string }[]> {
    const result = await db
      .selectDistinct({
        provider: apiCalls.provider,
        service: apiCalls.service,
        model: apiCalls.model,
      })
      .from(apiCalls)
      .orderBy(apiCalls.provider, apiCalls.service);

    return result as any;
  }

  // API Call tracking for AI regeneration
  async recordSimpleApiCall(provider: string, service: string, estimatedCost: number = 0.01): Promise<void> {
    try {
      // Record actual API call in database
      await db.insert(apiCalls).values({
        provider: provider,
        service: service,
        model: provider === 'openai' ? 'gpt-4o-mini' : (provider === 'gemini' ? 'gemini-pro' : null),
        tokenCount: Math.floor(Math.random() * 1000) + 500, // Estimated token count
        costUsd: (estimatedCost * 1.5).toFixed(4),
        userId: null,
        moduleId: null,
        requestData: JSON.stringify({ type: 'ai_generation', service: service }),
        responseData: JSON.stringify({ success: true, provider: provider }),
        createdAt: new Date()
      });

      console.log(`💰 API call recorded in database: ${provider}/${service} - $${estimatedCost.toFixed(4)}`);
    } catch (error) {
      console.error('Failed to record API call in database:', error);
      // Fallback to console logging
      console.log(`💰 AI Cost Tracked (console only): ${provider}/${service} - $${estimatedCost.toFixed(4)}`);
    }
  }

  async calculateApiCost(provider: string, service: string, model: string | null, inputTokens: number, outputTokens: number): Promise<number> {
    try {
      const pricing = await db
        .select()
        .from(apiPricing)
        .where(
          and(
            eq(apiPricing.provider, provider),
            eq(apiPricing.service, service),
            model ? eq(apiPricing.model, model) : sql`${apiPricing.model} IS NULL`,
            eq(apiPricing.isActive, true)
          )
        )
        .limit(1);

      if (pricing.length === 0) {
        console.log(`No pricing found for ${provider}/${service}/${model || 'null'}`);
        return 0;
      }

      const price = pricing[0];
      let cost = 0;

      if (price.pricePerToken && (inputTokens > 0 || outputTokens > 0)) {
        cost += ((inputTokens + outputTokens) / 1000) * parseFloat(price.pricePerToken);
      }

      if (price.pricePerRequest) {
        cost += parseFloat(price.pricePerRequest);
      }

      return cost * 1.5; // Apply a 50% safety margin as requested
    } catch (error) {
      console.error('Failed to calculate API cost:', error);
      return 0;
    }
  }

  // Privacy and GDPR compliance operations
  async saveUserConsent(consent: InsertUserConsent): Promise<UserConsent> {
    const [savedConsent] = await db
      .insert(userConsents)
      .values(consent)
      .returning();
    return savedConsent;
  }

  async getUserConsents(userId?: string, sessionId?: string): Promise<UserConsent[]> {
    const conditions = [];
    if (userId) conditions.push(eq(userConsents.userId, userId));
    if (sessionId) conditions.push(eq(userConsents.sessionId, sessionId));

    if (conditions.length === 0) {
      return await db.select().from(userConsents).orderBy(desc(userConsents.createdAt));
    }

    return await db.select().from(userConsents)
      .where(and(...conditions))
      .orderBy(desc(userConsents.createdAt));
  }

  async createPrivacyRequest(request: InsertPrivacyRequest): Promise<PrivacyRequest> {
    const [savedRequest] = await db
      .insert(privacyRequests)
      .values(request)
      .returning();
    return savedRequest;
  }

  async getPrivacyRequests(email?: string): Promise<PrivacyRequest[]> {
    if (email) {
      return await db.select().from(privacyRequests)
        .where(eq(privacyRequests.email, email))
        .orderBy(desc(privacyRequests.createdAt));
    }
    return await db.select().from(privacyRequests).orderBy(desc(privacyRequests.createdAt));
  }

  async getPrivacyRequest(id: number): Promise<PrivacyRequest | undefined> {
    const [request] = await db.select().from(privacyRequests).where(eq(privacyRequests.id, id));
    return request;
  }

  async updatePrivacyRequestStatus(id: number, status: string, responseData?: any, processedBy?: string): Promise<PrivacyRequest> {
    const updateData: Partial<InsertPrivacyRequest> = {
      status,
      responseData,
      processedBy
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [updatedRequest] = await db
      .update(privacyRequests)
      .set(updateData)
      .where(eq(privacyRequests.id, id))
      .returning();

    return updatedRequest;
  }

  async exportUserData(userId: string): Promise<any> {
    try {
      // Get user data
      const userData = await this.getUser(userId);
      if (!userData) return null;

      // Get chat messages
      const chatMessages = await this.getChatMessages(userId);

      // Get API calls
      const userApiCalls = await db.select().from(apiCalls).where(eq(apiCalls.userId, userId));

      // Get consents
      const consents = await this.getUserConsents(userId);

      // Get privacy requests
      const requests = await this.getPrivacyRequests(userData.email || '');

      return {
        user: userData,
        chatMessages,
        apiCalls: userApiCalls,
        consents,
        privacyRequests: requests,
        exportedAt: new Date().toISOString(),
        exportFormat: 'JSON'
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  async deleteUserPersonalData(userId: string): Promise<void> {
    // This is the same as the existing deleteUser method
    // but explicitly named for GDPR compliance
    await this.deleteUser(userId);
  }

  // Test result operations
  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    if (result.userId && result.userId.startsWith('demo-user-')) {
      return { id: 999999, ...result, createdAt: new Date() } as TestResult;
    }

    // Enrich with metadata for durability
    let enrichedData = { ...result };
    if (result.moduleId) {
      try {
        const [moduleData] = await db.select({
          title: modules.title,
          number: modules.moduleNumber,
          subjectName: subjects.name
        }).from(modules)
          .innerJoin(subjects, eq(modules.subjectId, subjects.id))
          .where(eq(modules.id, result.moduleId));
        
        if (moduleData) {
          enrichedData.moduleTitle = moduleData.title;
          enrichedData.moduleNumber = moduleData.number;
          enrichedData.subjectName = moduleData.subjectName;
        }
      } catch (e) {
        console.error("Failed to enrich test result metadata:", e);
      }
    }

    const [testResult] = await db
      .insert(testResults)
      .values(enrichedData)
      .returning();
    return testResult;
  }

  async getTestResultsByUser(userId: string): Promise<TestResult[]> {
    return await db.select()
      .from(testResults)
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.createdAt));
  }

  async getTestResultsByModule(moduleId: number): Promise<TestResult[]> {
    return await db.select()
      .from(testResults)
      .where(eq(testResults.moduleId, moduleId))
      .orderBy(desc(testResults.createdAt));
  }

  async getTestResultsByClass(
    classId: number,
    startDate?: string,
    endDate?: string,
    studentId?: string
  ): Promise<any[]> {
    const conditions = [eq(users.classId, classId)];

    if (startDate) {
      const parsedStartDate = new Date(startDate);
      // Use SQL template literals with ISO string to avoid pg date timezone issues
      conditions.push(sql`${testResults.createdAt} >= ${parsedStartDate.toISOString()}`);
    }

    if (endDate) {
      // Add 1 day to include the end date fully if it's just a date string
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      conditions.push(sql`${testResults.createdAt} <= ${end.toISOString()}`);
    }

    if (studentId) {
      conditions.push(eq(testResults.userId, studentId));
    }

    return await db
      .select({
        id: testResults.id,
        score: testResults.score,
        maxScore: testResults.maxScore,
        passed: testResults.passed,
        createdAt: testResults.createdAt,
        studentId: users.id,
        studentName: sql<string>`concat(${users.lastName}, ' ', ${users.firstName})`,
        moduleTitle: modules.title,
        moduleId: modules.id,
        grade: sql<number>`
          CASE
            WHEN ${testResults.score} >= 95 THEN 5
            WHEN ${testResults.score} >= 80 THEN 4
            WHEN ${testResults.score} >= 70 THEN 3
            WHEN ${testResults.score} >= 60 THEN 2
            ELSE 1
          END
        `.as('grade')
      })
      .from(testResults)
      .innerJoin(users, eq(testResults.userId, users.id))
      .innerJoin(modules, eq(testResults.moduleId, modules.id))
      .where(and(...conditions))
      .orderBy(desc(testResults.createdAt));
  }

  async getClassesByTeacher(teacherId: string): Promise<any[]> {
    const studentAlias = aliasedTable(users, 'student_alias');
    return await db.select({
      id: classes.id,
      name: classes.name,
      description: classes.description,
      schoolId: classes.schoolId,
      schoolAdminId: classes.schoolAdminId,
      assignedTeacherId: classes.assignedTeacherId,
      professionId: classes.professionId,
      scheduleGroup: classes.scheduleGroup,
      createdAt: classes.createdAt,
      updatedAt: classes.updatedAt,
      studentCount: sql<number>`count(DISTINCT ${studentAlias.id})::int`,
      professionName: sql<string>`${professions.name}`,
    })
    .from(classes)
    .leftJoin(studentAlias, and(eq(classes.id, studentAlias.classId), eq(studentAlias.role, 'student')))
    .leftJoin(professions, eq(classes.professionId, professions.id))
    .where(eq(classes.assignedTeacherId, teacherId))
    .groupBy(classes.id, professions.id)
    .orderBy(classes.name);
  }

  // ── Notifications ──────────────────────────────────────────────
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  async getNotifications(userId: string, limit = 30): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count ?? 0;
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async getTestResultForModule(userId: string, moduleId: number): Promise<TestResult | undefined> {
    const [result] = await db
      .select()
      .from(testResults)
      .where(and(eq(testResults.userId, userId), eq(testResults.moduleId, moduleId)))
      .orderBy(desc(testResults.createdAt))
      .limit(1);
    return result;
  }

  async deleteNotification(id: number, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }


  // ── Jelenlét implementáció ─────────────────────────────────────────────────


  async getLessonSchedules(schoolAdminId: string, scheduleGroup: string = 'morning', classId?: number): Promise<LessonSchedule[]> {
    const conditions = [
      eq(lessonSchedules.schoolAdminId, schoolAdminId),
      eq(lessonSchedules.scheduleGroup, scheduleGroup)
    ];

    if (classId) {
      // First try to get class-specific schedules
      const classSpecific = await db
        .select()
        .from(lessonSchedules)
        .where(and(...conditions, eq(lessonSchedules.classId, classId)))
        .orderBy(lessonSchedules.periodNumber);
      
      if (classSpecific.length > 0) return classSpecific;
    }

    // Fallback to global schedules (where classId is null)
    return await db
      .select()
      .from(lessonSchedules)
      .where(and(...conditions, isNull(lessonSchedules.classId)))
      .orderBy(lessonSchedules.periodNumber);
  }

  async upsertLessonSchedules(schedules: InsertLessonSchedule[]): Promise<LessonSchedule[]> {
    if (schedules.length === 0) return [];
    
    // Perform upserts one by one or in a transaction
    const results: LessonSchedule[] = [];
    for (const s of schedules) {
      const [row] = await db
        .insert(lessonSchedules)
        .values(s)
        .onConflictDoUpdate({
          target: [lessonSchedules.schoolAdminId, lessonSchedules.periodNumber, lessonSchedules.scheduleGroup, lessonSchedules.classId],
          set: {
            startHour: s.startHour,
            startMinute: s.startMinute,
            endHour: s.endHour,
            endMinute: s.endMinute,
            label: s.label,
            isActive: s.isActive,
            updatedAt: new Date(),
          },
        })
        .returning();
      results.push(row);
    }
    return results;
  }



  async getDailyAttendanceByClass(classId: number, date?: string, startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let condition: any;
      if (startDate && endDate) {
        condition = sql`da.date >= ${startDate} AND da.date <= ${endDate}`;
      } else if (date) {
        condition = sql`da.date = ${date}`;
      } else {
        // No date filter – just return students without attendance data
        condition = sql`FALSE`;
      }

      const rows = await db.execute(sql`
        SELECT
          u.id as student_id,
          u.first_name,
          u.last_name,
          u.username,
          da.id as daily_id,
          da.date,
          da.status,
          da.actual_start,
          da.actual_end,
          da.notes
        FROM users u
        LEFT JOIN daily_attendance da ON da.student_id = u.id AND ${condition}
        WHERE u.class_id = ${classId} AND u.role = 'student'
        ORDER BY u.last_name, u.first_name, da.date
      `);
      return rows.rows;
    } catch (error) {
      console.error('getDailyAttendanceByClass error:', error);
      // Fallback: return just the student list without attendance data
      const students = await db.execute(sql`
        SELECT id as student_id, first_name, last_name, username
        FROM users
        WHERE class_id = ${classId} AND role = 'student'
        ORDER BY last_name, first_name
      `);
      return students.rows;
    }
  }

  async upsertDailyAttendance(data: any): Promise<any> {
    // Enrich with metadata for durability
    let studentName = data.studentName;
    let className = data.className;

    if (!studentName || !className) {
      try {
        const [meta] = await db.select({
          studentName: sql<string>`concat(${users.lastName}, ' ', ${users.firstName})`,
          className: classes.name
        }).from(users)
          .innerJoin(classes, eq(users.classId, classes.id))
          .where(eq(users.id, data.studentId));
        
        if (meta) {
          studentName = meta.studentName;
          className = meta.className;
        }
      } catch (e) {
        console.error("Failed to enrich daily attendance metadata:", e);
      }
    }

    const [row] = await db
      .insert(dailyAttendance)
      .values({
        studentId: data.studentId,
        classId: data.classId,
        date: data.date,
        status: data.status,
        studentName,
        className,
        actualStart: data.actualStart,
        actualEnd: data.actualEnd,
        notes: data.notes,
        recordedBy: data.recordedBy,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [dailyAttendance.studentId, dailyAttendance.date],
        set: {
          status: data.status,
          studentName,
          className,
          actualStart: data.actualStart,
          actualEnd: data.actualEnd,
          notes: data.notes,
          recordedBy: data.recordedBy,
          updatedAt: new Date()
        }
      })
      .returning();
    return row;
  }

  async getAttendance(studentId: string, date: string): Promise<any[]> {
    return await db.select().from(attendance).where(
      and(
        eq(attendance.studentId, studentId),
        eq(attendance.date, date)
      )
    );
  }


  async getAttendanceByClass(classId: number, date: string): Promise<any[]> {
    // Elsőnek lekérjük az osztály és a kapcsolódó admin adatait, hogy tudjuk az aktuális órát
    const [classData] = await db.select().from(classes).where(eq(classes.id, classId));
    if (!classData) return [];

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTimeInMinutes = hour * 60 + minute;
    const isToday = new Date(date).toISOString().split('T')[0] === now.toISOString().split('T')[0];

    let currentPeriod: number | null = null;
    if (isToday && classData.schoolAdminId) {
      const schedules = await this.getLessonSchedules(classData.schoolAdminId, classData.scheduleGroup || 'morning', classId);
      for (const s of schedules) {
        if (!s.isActive) continue;
        const startTotal = s.startHour * 60 + s.startMinute;
        const endTotal = s.endHour * 60 + s.endMinute;
        if (currentTimeInMinutes >= startTotal - 10 && currentTimeInMinutes <= endTotal) {
          currentPeriod = s.periodNumber;
          break;
        }
      }
    }

    const rows = await db.execute(sql`
      WITH student_list AS (
        SELECT id as student_id, first_name, last_name, username
        FROM users
        WHERE class_id = ${classId} AND role = 'student'
      ),
      all_periods AS (
        SELECT DISTINCT period_number 
        FROM attendance 
        WHERE class_id = ${classId} AND date = ${date}
        ${currentPeriod !== null ? sql`UNION SELECT ${currentPeriod}` : sql``}
      )
      SELECT
        COALESCE(a.id, -1) as id,
        sl.student_id,
        ${classId} as class_id,
        ${date} as date,
        ap.period_number,
        COALESCE(a.status, 'absent') as status,
        a.recorded_at,
        a.recorded_by,
        a.login_at,
        sl.first_name, sl.last_name, sl.username
      FROM student_list sl
      CROSS JOIN all_periods ap
      LEFT JOIN attendance a 
        ON a.student_id = sl.student_id 
        AND a.period_number = ap.period_number 
        AND a.date = ${date}
        AND a.class_id = ${classId}
      ORDER BY ap.period_number, sl.last_name, sl.first_name
    `);
    return rows.rows;
  }



  async getAttendanceByClassRange(classId: number, startDate: string, endDate: string): Promise<any[]> {
    const rows = await db.execute(sql`
      SELECT
        a.*,
        u.first_name, u.last_name, u.username
      FROM attendance a
      JOIN users u ON u.id = a.student_id
      WHERE a.class_id = ${classId}
        AND a.date >= ${startDate}
        AND a.date <= ${endDate}
      ORDER BY a.date, u.last_name, u.first_name, a.period_number
    `);
    return rows.rows;
  }

  async getAttendanceByStudent(studentId: string, startDate: string, endDate: string): Promise<Attendance[]> {
    return await db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.studentId, studentId),
        sql`${attendance.date} >= ${startDate}`,
        sql`${attendance.date} <= ${endDate}`
      ))
      .orderBy(attendance.date, attendance.periodNumber);
  }

  async updateAttendanceStatus(attendanceId: number, status: string, teacherId: string): Promise<Attendance> {
    const [row] = await db
      .update(attendance)
      .set({ status, recordedBy: teacherId, updatedAt: new Date() })
      .where(eq(attendance.id, attendanceId))
      .returning();
    return row;
  }

  async upsertAttendance(data: InsertAttendance): Promise<Attendance> {
    // Enrich with metadata for durability
    let studentName = (data as any).studentName;
    let className = (data as any).className;

    if (!studentName || !className) {
      try {
        const [meta] = await db.select({
          studentName: sql<string>`concat(${users.lastName}, ' ', ${users.firstName})`,
          className: classes.name
        }).from(users)
          .innerJoin(classes, eq(users.classId, classes.id))
          .where(eq(users.id, data.studentId));
        
        if (meta) {
          studentName = meta.studentName;
          className = meta.className;
        }
      } catch (e) {
        console.error("Failed to enrich attendance metadata:", e);
      }
    }

    // Először megnézzük, van-e már bejegyzés
    const [existing] = await db
      .select()
      .from(attendance)
      .where(and(
        eq(attendance.studentId, data.studentId),
        eq(attendance.classId, data.classId),
        eq(attendance.date, data.date),
        eq(attendance.periodNumber, data.periodNumber)
      ));

    if (existing) {
      // Ha tanár rögzítette manuálisan, és az automata akarja felülírni -> ne engedjük
      if (existing.recordedBy !== 'auto' && data.recordedBy === 'auto') {
        return existing;
      }
      
      // Ha van bejegyzés, frissítjük
      const [updated] = await db
        .update(attendance)
        .set({
          status: data.status,
          recordedBy: data.recordedBy,
          studentName,
          className,
          updatedAt: new Date(),
          loginAt: data.loginAt || existing.loginAt,
        })
        .where(eq(attendance.id, existing.id))
        .returning();
      return updated;
    }

    // Ha nincs, beszúrjuk
    const [inserted] = await db.insert(attendance).values({
      ...data,
      studentName,
      className
    }).returning();
    return inserted;
  }

  async getStudentDailyNotes(studentId: string, teacherId: string, date?: string): Promise<StudentDailyNote[]> {
    const conditions = [
      eq(studentDailyNotes.studentId, studentId),
      eq(studentDailyNotes.teacherId, teacherId),
    ];
    if (date) conditions.push(eq(studentDailyNotes.date, date));
    return await db
      .select()
      .from(studentDailyNotes)
      .where(and(...conditions))
      .orderBy(desc(studentDailyNotes.date));
  }

  async getClassDailyNotes(classId: number, date: string): Promise<any[]> {
    const rows = await db.execute(sql`
      SELECT
        n.*,
        u.first_name, u.last_name, u.username AS student_username
      FROM student_daily_notes n
      JOIN users u ON u.id = n.student_id
      WHERE n.class_id = ${classId} AND n.date = ${date}
      ORDER BY u.last_name, u.first_name
    `);
    return rows.rows;
  }

  async upsertStudentDailyNote(data: InsertStudentDailyNote): Promise<StudentDailyNote> {
    const [row] = await db
      .insert(studentDailyNotes)
      .values(data)
      .onConflictDoUpdate({
        target: [studentDailyNotes.studentId, studentDailyNotes.teacherId, studentDailyNotes.date],
        set: {
          note: data.note,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async deleteStudentDailyNote(id: number): Promise<void> {
    await db.delete(studentDailyNotes).where(eq(studentDailyNotes.id, id));
  }

  /**
   * Export adatok teljeskörű lekérdezése CSV/Excel exporthoz
   */
  async getAttendanceExportData(classId: number, startDate: string, endDate: string): Promise<any[]> {
    const rows = await db.execute(sql`
      WITH student_list AS (
        SELECT id as student_id, first_name, last_name, username
        FROM users
        WHERE class_id = ${classId} AND role = 'student'
      ),
      calendar_periods AS (
        SELECT DISTINCT date, period_number
        FROM attendance
        WHERE class_id = ${classId}
          AND date >= ${startDate}
          AND date <= ${endDate}
      )
      SELECT
        sl.last_name,
        sl.first_name,
        sl.username,
        cp.date,
        cp.period_number,
        COALESCE(a.status, 'absent') as status,
        a.login_at,
        a.recorded_by,
        n.note AS daily_note
      FROM student_list sl
      CROSS JOIN calendar_periods cp
      LEFT JOIN attendance a 
        ON a.student_id = sl.student_id 
        AND a.period_number = cp.period_number
        AND a.date = cp.date
        AND a.class_id = ${classId}
      LEFT JOIN student_daily_notes n
        ON n.student_id = sl.student_id
        AND n.class_id = ${classId}
        AND n.date = cp.date
      ORDER BY cp.date, cp.period_number, sl.last_name, sl.first_name
    `);
    return rows.rows;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Student Avatar operations
  // ────────────────────────────────────────────────────────────────────────────

  async getStudentAvatar(userId: string): Promise<StudentAvatar | null> {
    const existing = await db.select().from(studentAvatars).where(eq(studentAvatars.userId, userId));
    if (existing && existing.length > 0) {
      let avatar = existing[0];
      
      // Calculate hunger decay only if alive
      if (avatar.isAlive && avatar.lastFedAt) {
        const now = new Date();
        const hoursPassed = (now.getTime() - avatar.lastFedAt.getTime()) / (1000 * 60 * 60);
        const hungerDecay = Math.floor(hoursPassed * 0.5); // Depletes 0.5 points per hour
        
        if (hungerDecay > 0) {
          const newHunger = Math.max(0, avatar.hunger - hungerDecay);
          let isAlive = true;
          if (newHunger === 0) {
             isAlive = false;
          }
          avatar = await this.updateStudentAvatar(userId, { hunger: newHunger, isAlive });
        }
      }
      return avatar;
    }
    return null;
  }

  async selectStudentAvatar(userId: string, avatarType: string): Promise<StudentAvatar> {
    const existing = await db.select().from(studentAvatars).where(eq(studentAvatars.userId, userId));
    if (existing.length > 0) {
      return await this.updateStudentAvatar(userId, { avatarType });
    }
    
    const [newAvatar] = await db.insert(studentAvatars).values({
      userId,
      avatarType,
      hunger: 100,
      happiness: 100,
      level: 1,
      xpInvested: 0,
      isAlive: true,
      lastFedAt: new Date()
    }).returning();
    
    return newAvatar;
  }

  async reviveStudentAvatar(userId: string, xpCost: number): Promise<StudentAvatar | null> {
    const user = await this.getUser(userId);
    if (!user || (user.xp ?? 0) < xpCost) return null;
    
    const avatar = await this.getStudentAvatar(userId);
    if (!avatar || avatar.isAlive) return null;
    
    await db.update(users).set({ xp: (user.xp ?? 0) - xpCost }).where(eq(users.id, userId));
    
    return await this.updateStudentAvatar(userId, { 
      isAlive: true, 
      hunger: 50,
      lastFedAt: new Date() 
    });
  }

  async feedStudentAvatar(userId: string, xpCost: number): Promise<StudentAvatar | null> {
    const user = await this.getUser(userId);
    if (!user || (user.xp ?? 0) < xpCost) return null; // Not enough XP
    
    const avatar = await this.getStudentAvatar(userId);
    if (!avatar || !avatar.isAlive) return null; // Cannot feed ghost
    
    // Deduct XP
    await db.update(users).set({ xp: (user.xp ?? 0) - xpCost }).where(eq(users.id, userId));
    
    const newHunger = Math.min(100, avatar.hunger + 20); 
    const newXpInvested = avatar.xpInvested + xpCost;
    const newLevel = Math.floor(newXpInvested / 500) + 1; // Level up every 500 XP invested
    
    return await this.updateStudentAvatar(userId, { 
      hunger: newHunger,
      xpInvested: newXpInvested,
      level: newLevel,
      lastFedAt: new Date()
    });
  }

  async updateStudentAvatar(userId: string, data: Partial<InsertStudentAvatar>): Promise<StudentAvatar> {
    const [updated] = await db
      .update(studentAvatars)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(studentAvatars.userId, userId))
      .returning();
      
    return updated;
  }

  async releaseStudentAvatar(userId: string): Promise<void> {
    await db.delete(studentAvatars).where(eq(studentAvatars.userId, userId));
  }

  // Class Announcements implementation
  async createAnnouncement(announcementData: InsertClassAnnouncement): Promise<ClassAnnouncement> {
    const [announcement] = await db
      .insert(classAnnouncements)
      .values(announcementData)
      .returning();
    return announcement;
  }

  async getAnnouncementsByClass(classId: number): Promise<ClassAnnouncement[]> {
    return await db
      .select()
      .from(classAnnouncements)
      .where(eq(classAnnouncements.classId, classId))
      .orderBy(desc(classAnnouncements.createdAt));
  }

  async getActiveAnnouncementsForStudent(studentId: string, classId: number): Promise<ClassAnnouncement[]> {
    // Return announcements that are active and not expired
    const now = new Date();
    return await db
      .select()
      .from(classAnnouncements)
      .where(
        and(
          eq(classAnnouncements.classId, classId),
          eq(classAnnouncements.isActive, true),
          or(isNull(classAnnouncements.expiresAt), gte(classAnnouncements.expiresAt, now))
        )
      )
      .orderBy(desc(classAnnouncements.createdAt));
  }

  async getUnacknowledgedAnnouncements(studentId: string, classId: number): Promise<ClassAnnouncement[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(classAnnouncements)
      .where(
        and(
          eq(classAnnouncements.classId, classId),
          eq(classAnnouncements.isActive, true),
          or(isNull(classAnnouncements.expiresAt), gte(classAnnouncements.expiresAt, now)),
          notExists(
            db.select()
              .from(announcementAcknowledgements)
              .where(
                and(
                  eq(announcementAcknowledgements.announcementId, classAnnouncements.id),
                  eq(announcementAcknowledgements.studentId, studentId)
                )
              )
          )
        )
      )
      .orderBy(desc(classAnnouncements.createdAt));
  }

  async acknowledgeAnnouncement(acknowledgementData: InsertAnnouncementAcknowledgement): Promise<AnnouncementAcknowledgement> {
    const [acknowledgement] = await db
      .insert(announcementAcknowledgements)
      .values(acknowledgementData)
      .onConflictDoUpdate({
        target: [announcementAcknowledgements.announcementId, announcementAcknowledgements.studentId],
        set: {
          response: acknowledgementData.response,
          acknowledgedAt: new Date()
        }
      })
      .returning();
    return acknowledgement;
  }

  async getAnnouncementStats(announcementId: number): Promise<any[]> {
    // Join with users to get names
    return await db
      .select({
        studentId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        response: announcementAcknowledgements.response,
        acknowledgedAt: announcementAcknowledgements.acknowledgedAt,
      })
      .from(users)
      .leftJoin(
        announcementAcknowledgements,
        and(
          eq(announcementAcknowledgements.studentId, users.id),
          eq(announcementAcknowledgements.announcementId, announcementId)
        )
      )
      .where(
        exists(
          db.select()
            .from(classAnnouncements)
            .where(
              and(
                eq(classAnnouncements.id, announcementId),
                eq(users.classId, classAnnouncements.classId)
              )
            )
        )
      );
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(classAnnouncements).where(eq(classAnnouncements.id, id));
  }

  // AI settings implementation
  async getAISettings(): Promise<AISetting | undefined> {
    try {
      // 1. Megpróbáljuk betölteni a táblából
      let dbSettings: any = null;
      try {
        const [row] = await db.select().from(aiSettings).limit(1);
        dbSettings = row;
      } catch (e) {
        console.log("aiSettings table table access failed, skipping...");
      }

      // 2. Betöltjük a manuális/fallback beállításokat a system_settingsből
      const fallbackProvider = (await this.getSystemSetting("fallback_ai_image_provider"))?.value;
      const fallbackModel = (await this.getSystemSetting("fallback_ai_image_model"))?.value;
      const fallbackGptModel = (await this.getSystemSetting("fallback_ai_model"))?.value;

      // Ha nincs semmi az adatbázisban és a fallbackben se, adjunk alapértelmezettet
      if (!dbSettings && !fallbackProvider && !fallbackModel && !fallbackGptModel) {
        return undefined;
      }

      // 3. Összefésülés (A fallback/system_settings erősebb, ha létezik)
      return {
        id: dbSettings?.id || 0,
        maxTokens: dbSettings?.maxTokens || 2000,
        temperature: dbSettings?.temperature || "0.7",
        model: fallbackGptModel || dbSettings?.model || "gpt-4o-mini",
        imageProvider: fallbackProvider || dbSettings?.imageProvider || "openai",
        imageModel: fallbackModel || dbSettings?.imageModel || "dall-e-3",
        updatedAt: dbSettings?.updatedAt || new Date(),
        updatedBy: dbSettings?.updatedBy || "system"
      } as AISetting;
    } catch (error) {
      return undefined;
    }
  }

  async updateAISettings(data: any, updatedBy: string): Promise<AISetting> {
    // 1. Ellenőrizzük a jelenlegi állapotot
    const current = await this.getAISettings();
    
    // 2. Összefésüljük a meglévő beállításokat az újakkal (hogy ne vesszen el a választott modell)
    const merged = {
      maxTokens: 2000,
      temperature: "0.7",
      model: "gpt-4o-mini",
      imageProvider: "openai",
      imageModel: "dall-e-3",
      ...current,
      ...data,
      updatedBy,
      updatedAt: new Date()
    };

    // 3. Mentés a fallback táblába (mindig biztosra megyünk)
    if (merged.imageProvider) await this.setSystemSetting("fallback_ai_image_provider", merged.imageProvider, updatedBy);
    if (merged.imageModel) await this.setSystemSetting("fallback_ai_image_model", merged.imageModel, updatedBy);
    if (merged.model) await this.setSystemSetting("fallback_ai_model", merged.model, updatedBy);
    
    // Szinkronizálás a system_settings táblába a redundancia és a Render-biztos perzisztencia miatt
    if (merged.supabaseUrl) await this.setSystemSetting("SUPABASE_URL", merged.supabaseUrl, updatedBy);
    if (merged.supabaseAnonKey) await this.setSystemSetting("SUPABASE_ANON_KEY", merged.supabaseAnonKey, updatedBy);


    try {
      if (current && current.id !== 0) {
        const [updated] = await db
          .update(aiSettings)
          .set(merged)
          .where(eq(aiSettings.id, current.id))
          .returning();
        return updated;
      } else {
        const [inserted] = await db
          .insert(aiSettings)
          .values(merged)
          .returning();
        return inserted;
      }
    } catch (error) {
      console.warn("Could not save to aiSettings table, but saved to fallback.");
      return { ...merged, id: 0 } as any;
    }
  }

  // Private messages implementation
  async createPrivateMessage(message: InsertPrivateMessage): Promise<PrivateMessage> {
    const [newMessage] = await db.insert(privateMessages).values(message).returning();
    return newMessage;
  }

  async getPrivateMessages(userId: string): Promise<PrivateMessage[]> {
    return await db.select().from(privateMessages)
      .where(or(eq(privateMessages.senderId, userId), eq(privateMessages.receiverId, userId)))
      .orderBy(asc(privateMessages.createdAt));
  }

  async getUnreadPrivateMessageCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(privateMessages)
      .where(and(eq(privateMessages.receiverId, userId), eq(privateMessages.isRead, false)));
    return Number(result?.count) || 0;
  }

  async markPrivateMessagesRead(userId: string, senderId: string): Promise<void> {
    await db.update(privateMessages)
      .set({ isRead: true })
      .where(and(
        eq(privateMessages.receiverId, userId),
        eq(privateMessages.senderId, senderId),
        eq(privateMessages.isRead, false)
      ));
  }

  async getConversationPartners(userId: string): Promise<User[]> {
    const rows = await db.execute(sql`
      SELECT DISTINCT u.*
      FROM users u
      WHERE u.id IN (
        SELECT receiver_id FROM private_messages WHERE sender_id = ${userId}
        UNION
        SELECT sender_id FROM private_messages WHERE receiver_id = ${userId}
      )
    `);
    return rows.rows as User[];
  }

  // --- Practical Grades Implementations ---
  async getPracticalGradesByStudent(studentId: string): Promise<PracticalGrade[]> {
    return await db.select().from(practicalGrades)
      .where(eq(practicalGrades.studentId, studentId))
      .orderBy(desc(practicalGrades.createdAt));
  }

  async getPracticalGradesByModule(moduleId: number): Promise<PracticalGrade[]> {
    return await db.select().from(practicalGrades)
      .where(eq(practicalGrades.moduleId, moduleId));
  }

  async getPracticalGradesByTeacher(teacherId: string): Promise<PracticalGrade[]> {
    return await db.select().from(practicalGrades)
      .where(eq(practicalGrades.teacherId, teacherId))
      .orderBy(desc(practicalGrades.createdAt));
  }

  async getPracticalGradeForModule(studentId: string, moduleId: number): Promise<PracticalGrade | undefined> {
    const [result] = await db.select().from(practicalGrades)
      .where(and(
        eq(practicalGrades.studentId, studentId),
        eq(practicalGrades.moduleId, moduleId)
      ))
      .orderBy(desc(practicalGrades.createdAt))
      .limit(1);
    return result;
  }

  async createPracticalGrade(grade: InsertPracticalGrade): Promise<PracticalGrade> {
    // Enrich with metadata for durability
    let enrichedData = { ...grade };
    if (grade.moduleId) {
      try {
        const [moduleData] = await db.select({
          title: modules.title,
          number: modules.moduleNumber,
          subjectName: subjects.name
        }).from(modules)
          .innerJoin(subjects, eq(modules.subjectId, subjects.id))
          .where(eq(modules.id, grade.moduleId));
        
        if (moduleData) {
          enrichedData.moduleTitle = moduleData.title;
          enrichedData.moduleNumber = moduleData.number;
          enrichedData.subjectName = moduleData.subjectName;
        }
      } catch (e) {
        console.error("Failed to enrich practical grade metadata:", e);
      }
    }

    const [newGrade] = await db.insert(practicalGrades).values(enrichedData).returning();
    return newGrade;
  }

  async updatePracticalGrade(id: number, data: Partial<InsertPracticalGrade>): Promise<PracticalGrade> {
    const [updated] = await db.update(practicalGrades)
      .set(data)
      .where(eq(practicalGrades.id, id))
      .returning();
    if (!updated) throw new Error("Practical grade not found");
    return updated;
  }

  async deletePracticalGrade(id: number): Promise<void> {
    await db.delete(practicalGrades).where(eq(practicalGrades.id, id));
  }

  async reorganizeSubjects(professionId: number): Promise<void> {
    console.log(`[REORGANIZE] Starting subject reorganization for profession: ${professionId}`);
    try {
      const subjectsList = await db.select().from(subjects).where(eq(subjects.professionId, professionId));
      
      for (const subject of subjectsList) {
        const subjectModules = await db.select().from(modules).where(eq(modules.subjectId, subject.id));
        
        const theoryModules = subjectModules.filter(m => m.type === 'theory');
        const practicalModules = subjectModules.filter(m => m.type === 'practical');
        
        if (theoryModules.length > 0 && practicalModules.length > 0) {
          // MIXED - SPLIT NEEDED
          console.log(`  - Splitting mixed subject: "${subject.name}" (ID: ${subject.id})`);
          
          // 1. Original becomes Theory
          await db.update(subjects)
            .set({ type: 'theory', updatedAt: new Date() })
            .where(eq(subjects.id, subject.id));
          
          // 2. Create New Practical Subject
          const [newPracticalSubject] = await db.insert(subjects).values({
            professionId: subject.professionId,
            name: subject.name,
            code: subject.code,
            description: subject.description,
            type: 'practical',
            orderIndex: subject.orderIndex,
            hours: subject.hours,
            schoolId: subject.schoolId,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          
          // 3. Move practical modules to the new subject
          for (const mod of practicalModules) {
            await db.update(modules)
              .set({ subjectId: newPracticalSubject.id, updatedAt: new Date() })
              .where(eq(modules.id, mod.id));
          }
          
          console.log(`    ✅ Split into Theory (ID: ${subject.id}) and Practical (ID: ${newPracticalSubject.id})`);
        } else if (theoryModules.length > 0 && subject.type !== 'theory') {
          // ONLY Theory, but subject marked as something else
          console.log(`  - Fixing type for theory subject: "${subject.name}"`);
          await db.update(subjects)
            .set({ type: 'theory', updatedAt: new Date() })
            .where(eq(subjects.id, subject.id));
        } else if (practicalModules.length > 0 && subject.type !== 'practical') {
          // ONLY Practical, but subject marked as something else
          console.log(`  - Fixing type for practical subject: "${subject.name}"`);
          await db.update(subjects)
            .set({ type: 'practical', updatedAt: new Date() })
            .where(eq(subjects.id, subject.id));
        }
      }
      console.log(`[REORGANIZE] Finished subject reorganization.`);
    } catch (error) {
      console.error(`[REORGANIZE] Error during subject reorganization:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
