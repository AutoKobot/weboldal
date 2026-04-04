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
  // Jelenlét
  attendance,
  studentDailyNotes,
  lessonSchedules,
  type Attendance,
  type InsertAttendance,
  type StudentDailyNote,
  type InsertStudentDailyNote,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql, gte, lte, or, isNull, exists, asc } from "drizzle-orm";

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
  getTestResultsByModule(moduleId: number): Promise<TestResult[]>;
  getTestResultsByClass(classId: number, startDate?: string, endDate?: string): Promise<any[]>;
  getClassesByTeacher(teacherId: string): Promise<Class[]>;

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

  // Attendance auto-recording
  recordLoginAttendance(studentId: string, loginAt?: Date): Promise<Attendance | null>;
  getAttendanceByClass(classId: number, date: string): Promise<any[]>;
  getAttendanceByClassRange(classId: number, startDate: string, endDate: string): Promise<any[]>;
  getAttendanceByStudent(studentId: string, startDate: string, endDate: string): Promise<Attendance[]>;
  updateAttendanceStatus(attendanceId: number, status: string, teacherId: string): Promise<Attendance>;
  upsertAttendance(data: InsertAttendance): Promise<Attendance>;

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
}

export class DatabaseStorage implements IStorage {
  // User operations
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
        await db.update(systemSettings).set({ updatedBy: null }).where(eq(systemSettings.updatedBy, id));
        await db.update(aiSettings).set({ updatedBy: null }).where(eq(aiSettings.updatedBy, id));
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
  async getProfessions(schoolAdminId?: string | null): Promise<Profession[]> {
    if (schoolAdminId === null) {
      return await db.select().from(professions).where(isNull(professions.schoolAdminId)).orderBy(professions.name);
    } else if (schoolAdminId) {
      return await db.select().from(professions)
        .where(
          or(
            isNull(professions.schoolAdminId),
            eq(professions.schoolAdminId, schoolAdminId)
          )
        )
        .orderBy(professions.name);
    }
    return await db.select().from(professions).orderBy(professions.name);
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
    console.log(`🗑️ Deleting profession ${id} and all related data`);

    // 1. Get all subjects for this profession
    const professionSubjects = await db.select().from(subjects).where(eq(subjects.professionId, id));

    // 2. Delete each subject (which will cascade to modules)
    for (const subject of professionSubjects) {
      await this.deleteSubject(subject.id);
    }

    // 3. Remove profession reference from users
    await db.execute(sql`UPDATE users SET selected_profession_id = NULL WHERE selected_profession_id = ${id}`);

    // Remove from assigned professions (complex due to JSONB array)
    // For now, we leave the ID in the array as it won't break anything immediately, 
    // but ideally we should remove it.

    // 4. Remove profession reference from classes
    await db.execute(sql`UPDATE classes SET profession_id = NULL WHERE profession_id = ${id}`);

    // 5. Delete community groups associated with this profession
    const groups = await db.select().from(communityGroups).where(eq(communityGroups.professionId, id));
    for (const group of groups) {
      await this.deleteCommunityGroup(group.id, group.createdBy);
    }

    // 6. Finally delete the profession
    await db.delete(professions).where(eq(professions.id, id));
    console.log(`✅ Profession ${id} deleted`);
  }

  // Subject operations
  async getSubjects(professionId?: number, schoolAdminId?: string | null): Promise<Subject[]> {
    const conditions = [];
    if (professionId) conditions.push(eq(subjects.professionId, professionId));

    if (schoolAdminId === null) {
      conditions.push(isNull(subjects.schoolAdminId));
    } else if (schoolAdminId) {
      conditions.push(or(
        isNull(subjects.schoolAdminId),
        eq(subjects.schoolAdminId, schoolAdminId)
      ));
    }

    if (conditions.length > 0) {
      return await db.select().from(subjects).where(and(...conditions)).orderBy(subjects.name);
    }
    return await db.select().from(subjects).orderBy(subjects.name);
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
    console.log(`🗑️ Deleting subject ${id} and all related modules`);

    // 1. Get all modules for this subject
    const subjectModules = await db.select().from(modules).where(eq(modules.subjectId, id));

    // 2. Delete each module (cascading)
    for (const module of subjectModules) {
      await this.deleteModule(module.id);
    }

    // 3. Delete the subject
    await db.delete(subjects).where(eq(subjects.id, id));
    console.log(`✅ Subject ${id} deleted`);
  }

  // Module operations
  async getModules(subjectId?: number, schoolAdminId?: string | null): Promise<Module[]> {
    const conditions = [];

    if (subjectId) {
      // Modulok, amik közvetlenül a tantárgyhoz tartoznak, VAGY a junction táblán keresztül hozzá vannak rendelve
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

    if (conditions.length > 0) {
      return await db.select().from(modules).where(and(...conditions)).orderBy(asc(modules.moduleNumber), asc(modules.title));
    }
    return await db.select().from(modules).orderBy(asc(modules.moduleNumber), asc(modules.title));
  }

  async getPublishedModules(subjectId?: number, schoolAdminId?: string | null): Promise<Module[]> {
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

    return await db
      .select()
      .from(modules)
      .where(and(...conditions))
      .orderBy(asc(modules.moduleNumber), asc(modules.title));
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

    // 6. Delete many-to-many assignments
    await db.delete(moduleSubjectAssignments).where(eq(moduleSubjectAssignments.moduleId, id));

    // 7. Finally delete the module
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

  // AI settings operations
  async getAISettings(): Promise<AISetting | undefined> {
    const [settings] = await db.select().from(aiSettings).limit(1);
    return settings || undefined;
  }

  async updateAISettings(settingsData: any, updatedBy: string): Promise<AISetting> {
    // Check if AI settings exist
    const existing = await this.getAISettings();

    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(aiSettings)
        .set({
          ...settingsData,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(aiSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [created] = await db
        .insert(aiSettings)
        .values({
          ...settingsData,
          updatedBy,
          updatedAt: new Date(),
        })
        .returning();
      return created;
    }
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
    if (!existingGroup || existingGroup.createdBy !== userId) {
      throw new Error('Unauthorized to delete this group');
    }

    // Delete all related data first
    await db.delete(groupMembers).where(eq(groupMembers.groupId, id));
    await db.delete(discussions).where(eq(discussions.groupId, id));
    await db.delete(communityGroups).where(eq(communityGroups.id, id));
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
  async getClassesBySchoolAdmin(schoolAdminId: string): Promise<Class[]> {
    return await db
      .select()
      .from(classes)
      .where(eq(classes.schoolAdminId, schoolAdminId))
      .orderBy(classes.name);
  }

  async getClassById(classId: number): Promise<Class | undefined> {
    const [classData] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, classId));
    return classData;
  }

  async getStudentsByClass(classId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.classId, classId), eq(users.role, 'student')))
      .orderBy(users.firstName, users.lastName, users.username);
  }

  async getStudentsBySchoolAdmin(schoolAdminId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.schoolAdminId, schoolAdminId), eq(users.role, 'student')))
      .orderBy(users.firstName, users.lastName, users.username);
  }

  async getTeachersBySchoolAdmin(schoolAdminId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.schoolAdminId, schoolAdminId), eq(users.role, 'teacher')))
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
    let baseQuery = db
      .select({
        provider: apiCalls.provider,
        service: apiCalls.service,
        totalCalls: sql<number>`count(*)::int`,
        totalCost: sql<number>`sum(${apiCalls.costUsd})::float`,
        totalTokens: sql<number>`sum(${apiCalls.tokenCount})::int`,
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
  }

  async getMonthlyCosts(year?: number): Promise<MonthlyCost[]> {
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
  }

  // Calculate monthly API costs from api_calls table
  async calculateMonthlyApiCosts(year: number, month: number): Promise<number> {
    try {
      const result = await db
        .select({
          totalCost: sql<string>`COALESCE(SUM(CAST(${apiCalls.costUsd} AS DECIMAL)), 0)`
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
        requestData: { type: 'ai_generation', service: service },
        responseData: { success: true, provider: provider },
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
    const [testResult] = await db
      .insert(testResults)
      .values(result)
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

  async getClassesByTeacher(teacherId: string): Promise<Class[]> {
    return await db
      .select()
      .from(classes)
      .where(eq(classes.assignedTeacherId, teacherId))
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

  async deleteNotification(id: number, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  }


  // ── Jelenlét implementáció ─────────────────────────────────────────────────


  async getLessonSchedules(schoolAdminId: string, scheduleGroup: string = 'morning'): Promise<LessonSchedule[]> {
    return await db
      .select()
      .from(lessonSchedules)
      .where(and(
        eq(lessonSchedules.schoolAdminId, schoolAdminId),
        eq(lessonSchedules.scheduleGroup, scheduleGroup)
      ))
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
          target: [lessonSchedules.schoolAdminId, lessonSchedules.periodNumber, lessonSchedules.scheduleGroup],
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

  async recordLoginAttendance(studentId: string, loginAt: Date = new Date()): Promise<Attendance | null> {
    const user = await this.getUser(studentId);
    if (!user || user.role !== 'student' || !user.classId) return null;

    const dateStr = loginAt.toISOString().split('T')[0];
    const hour = loginAt.getHours();
    const minute = loginAt.getMinutes();
    const currentTimeInMinutes = hour * 60 + minute;

    // Osztály adatainak lekérése a műszak (scheduleGroup) meghatározásához
    const [classData] = await db.select().from(classes).where(eq(classes.id, user.classId));
    const scheduleGroup = classData?.scheduleGroup || 'morning';

    // Iskola admin ID lekérése
    const schoolAdminId = user.schoolAdminId;
    if (!schoolAdminId) return null;

    const schedules = await this.getLessonSchedules(schoolAdminId, scheduleGroup);
    let activePeriod: number | null = null;

    if (schedules.length > 0) {
      // Megkeressük az aktuális periódust
      for (const s of schedules) {
        if (!s.isActive) continue;
        const startTotal = s.startHour * 60 + s.startMinute;
        const endTotal = s.endHour * 60 + s.endMinute;
        
        // Adjunk egy nagyobb puffert (pl. bejöhet 15 perccel előbb)
        // És ha az órák között van 5-10 perc szünet, azt is kezeljük le
        if (currentTimeInMinutes >= startTotal - 15 && currentTimeInMinutes <= endTotal + 2) {
          activePeriod = s.periodNumber;
          break;
        }
      }
    } else {
      // Fallback: ha nincs órarend beállítva
      // Délelőtti: 8-16h
      // Délutáni: 13-21h
      if (scheduleGroup === 'morning') {
        if (hour >= 7 && hour < 17) { // 07:45-től már az 1. órát számoljuk
          const totalMins = hour * 60 + minute;
          if (totalMins >= 7 * 60 + 45) { // 7:45 után
             activePeriod = Math.floor((totalMins - 7 * 60) / 60) + 1;
             if (activePeriod > 8) activePeriod = 8;
          }
        }
      } else {
        if (hour >= 12 && hour < 22) {
          const totalMins = hour * 60 + minute;
          if (totalMins >= 12 * 60 + 45) {
             activePeriod = Math.floor((totalMins - 12 * 60) / 60) + 1;
             if (activePeriod > 8) activePeriod = 8;
          }
        }
      }
    }

    if (activePeriod === null) return null;

    // Rögzítés
    return await this.upsertAttendance({
      studentId,
      classId: user.classId,
      date: dateStr,
      periodNumber: activePeriod,
      status: 'present',
      loginAt: loginAt,
      recordedBy: 'auto',
    });
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
      const schedules = await this.getLessonSchedules(classData.schoolAdminId, classData.scheduleGroup || 'morning');
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
          updatedAt: new Date(),
          loginAt: data.loginAt || existing.loginAt,
        })
        .where(eq(attendance.id, existing.id))
        .returning();
      return updated;
    }

    // Ha nincs, beszúrjuk
    const [inserted] = await db.insert(attendance).values(data).returning();
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
    
    // Subquery to find already acknowledged announcement IDs
    const acknowledgedIds = db
      .select({ id: announcementAcknowledgements.announcementId })
      .from(announcementAcknowledgements)
      .where(eq(announcementAcknowledgements.studentId, studentId));

    return await db
      .select()
      .from(classAnnouncements)
      .where(
        and(
          eq(classAnnouncements.classId, classId),
          eq(classAnnouncements.isActive, true),
          or(isNull(classAnnouncements.expiresAt), gte(classAnnouncements.expiresAt, now)),
          sql`${classAnnouncements.id} NOT IN (${acknowledgedIds})`
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
}

export const storage = new DatabaseStorage();
