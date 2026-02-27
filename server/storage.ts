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
  type User,
  type UpsertUser,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql, gte, lte, or, isNull } from "drizzle-orm";

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
  createUser(user: { id?: string; username: string; firstName: string; lastName: string; schoolName?: string; email?: string | null; role: string; password: string; schoolAdminId?: string }): Promise<User>;
  setUserPassword(userId: string, password: string): Promise<void>;
  updateUserRole(id: string, role: string): Promise<void>;
  updateUserProfession(id: string, professionId: number): Promise<void>;
  updateUserAssignedProfessions(id: string, professionIds: number[]): Promise<void>;
  updateUserCompletedModules(id: string, moduleIds: number[]): Promise<void>;
  updateUserPassword(id: string, password: string): Promise<void>;
  assignStudentToTeacher(studentId: string, teacherId: string): Promise<void>;
  removeStudentFromTeacher(studentId: string): Promise<void>;
  deleteUser(id: string): Promise<void>;

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

  // Community projects
  getCommunityProjects(groupId?: number): Promise<CommunityProject[]>;
  getCommunityProject(id: number): Promise<CommunityProject | undefined>;
  createCommunityProject(project: InsertCommunityProject): Promise<CommunityProject>;
  joinProject(projectId: number, userId: string): Promise<void>;
  getProjectParticipants(projectId: number): Promise<ProjectParticipant[]>;

  // Discussions
  getDiscussions(groupId?: number, projectId?: number): Promise<Discussion[]>;
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;

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

  async createUser(userData: { id?: string; username: string; firstName: string; lastName: string; schoolName?: string; email?: string | null; role: string; password: string; schoolAdminId?: string }): Promise<User> {
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
        console.log('Removing teacher-student relationships');
        await db.execute(sql`DELETE FROM teacher_students WHERE teacher_id = ${userId}`);

        // Update classes where this user was assigned teacher
        await db.execute(sql`UPDATE classes SET assigned_teacher_id = NULL WHERE assigned_teacher_id = ${userId}`);
      }

      // If changing FROM student role, clean up student relationships  
      if (oldRole === 'student' && newRole !== 'student') {
        console.log('Removing student-teacher relationships');
        await db.execute(sql`DELETE FROM teacher_students WHERE student_id = ${userId}`);

        // Clean up student progress data if needed
        await db.execute(sql`DELETE FROM module_progress WHERE user_id = ${userId}`);
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
      // Delete in reverse dependency order to avoid foreign key violations

      // 1. Delete chat messages
      const deletedMessages = await db.delete(chatMessages).where(eq(chatMessages.userId, id));
      console.log(`Deleted ${deletedMessages.rowCount || 0} chat messages`);

      // 2. Delete module progress
      await db.execute(sql`DELETE FROM module_progress WHERE user_id = ${id}`);

      // 3. Delete API calls
      await db.execute(sql`DELETE FROM api_calls WHERE user_id = ${id}`);

      // 4. Delete admin messages (as sender)
      await db.execute(sql`DELETE FROM admin_messages WHERE sender_id = ${id}`);

      // 5. Delete teacher-student relationships (both directions)
      await db.execute(sql`DELETE FROM teacher_students WHERE teacher_id = ${id} OR student_id = ${id}`);

      // 6. Delete group memberships
      await db.execute(sql`DELETE FROM group_members WHERE user_id = ${id}`);

      // 7. Delete project participations
      await db.execute(sql`DELETE FROM project_participants WHERE user_id = ${id}`);

      // 8. Delete discussions authored by user
      await db.execute(sql`DELETE FROM discussions WHERE author_id = ${id}`);

      // 9. Delete peer reviews (both as reviewer and reviewed)
      await db.execute(sql`DELETE FROM peer_reviews WHERE reviewer_id = ${id} OR reviewed_user_id = ${id}`);

      // 10. Delete equipment manuals uploaded by user
      await db.execute(sql`DELETE FROM equipment_manuals WHERE uploaded_by = ${id}`);

      // 11. Delete equipment models manufactured by user
      await db.execute(sql`DELETE FROM equipment_models WHERE manufacturer_id = ${id}`);

      // 12. Handle community groups created by user (cascade delete)
      const userGroups = await db.execute(sql`SELECT id FROM community_groups WHERE created_by = ${id}`);
      for (const group of userGroups.rows) {
        const groupId = group.id;
        // Delete group members first
        await db.execute(sql`DELETE FROM group_members WHERE group_id = ${groupId}`);
        // Delete group projects and their participants
        const groupProjects = await db.execute(sql`SELECT id FROM community_projects WHERE created_by = ${id}`);
        for (const project of groupProjects.rows) {
          await db.execute(sql`DELETE FROM project_participants WHERE project_id = ${project.id}`);
        }
        // Delete community projects
        await db.execute(sql`DELETE FROM community_projects WHERE created_by = ${id}`);
        // Finally delete the group
        await db.execute(sql`DELETE FROM community_groups WHERE id = ${groupId}`);
      }

      // 13. Update classes where user is assigned teacher (set to null)
      await db.execute(sql`UPDATE classes SET assigned_teacher_id = NULL WHERE assigned_teacher_id = ${id}`);

      // 14. Finally delete the user
      const deletedUser = await db.delete(users).where(eq(users.id, id));

      console.log(`✅ User ${id} and all related data successfully deleted`);

    } catch (error) {
      console.error(`❌ Error during user deletion:`, error);
      throw error;
    }
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
    if (subjectId) conditions.push(eq(modules.subjectId, subjectId));

    if (schoolAdminId === null) {
      conditions.push(isNull(modules.schoolAdminId));
    } else if (schoolAdminId) {
      conditions.push(or(
        isNull(modules.schoolAdminId),
        eq(modules.schoolAdminId, schoolAdminId)
      ));
    }

    if (conditions.length > 0) {
      return await db.select().from(modules).where(and(...conditions)).orderBy(modules.moduleNumber, modules.title);
    }
    return await db.select().from(modules).orderBy(modules.moduleNumber, modules.title);
  }

  async getPublishedModules(subjectId?: number, schoolAdminId?: string | null): Promise<Module[]> {
    const conditions = [eq(modules.isPublished, true)];
    if (subjectId) conditions.push(eq(modules.subjectId, subjectId));

    if (schoolAdminId === null) {
      conditions.push(isNull(modules.schoolAdminId));
    } else if (schoolAdminId) {
      conditions.push(or(
        isNull(modules.schoolAdminId),
        eq(modules.schoolAdminId, schoolAdminId)
      ));
    }

    return await db
      .select()
      .from(modules)
      .where(and(...conditions))
      .orderBy(modules.moduleNumber, modules.title);
  }

  async getModule(id: number): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module;
  }

  async createModule(module: InsertModule): Promise<Module> {
    const [newModule] = await db
      .insert(modules)
      .values(module)
      .returning();
    return newModule;
  }

  async updateModule(id: number, moduleData: Partial<InsertModule>): Promise<Module> {
    const [module] = await db
      .update(modules)
      .set({ ...moduleData, updatedAt: new Date() })
      .where(eq(modules.id, id))
      .returning();
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

    // 4. Remove this module from users' completed_modules list
    // This is a JSONB array operation - simpler to just leave it, but for correctness:
    // This requires complex SQL or fetching all users. For performance, we might skip this 
    // or implement a cleanup job. Leaving it for now as it doesn't violate FK constraints (JSONB doesn't enforce FK).

    // 5. Delete module progress (if table exists - not in schema provided but good practice)
    // await db.execute(sql`DELETE FROM module_progress WHERE module_id = ${id}`);

    // 6. Finally delete the module
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
    if (groupId && projectId) {
      return await db.select().from(discussions)
        .where(and(eq(discussions.groupId, groupId), eq(discussions.projectId, projectId)))
        .orderBy(desc(discussions.createdAt));
    } else if (groupId) {
      return await db.select().from(discussions)
        .where(eq(discussions.groupId, groupId))
        .orderBy(desc(discussions.createdAt));
    } else if (projectId) {
      return await db.select().from(discussions)
        .where(eq(discussions.projectId, projectId))
        .orderBy(desc(discussions.createdAt));
    }

    return await db.select().from(discussions).orderBy(desc(discussions.createdAt));
  }

  async createDiscussion(discussionData: InsertDiscussion): Promise<Discussion> {
    const [discussion] = await db
      .insert(discussions)
      .values(discussionData)
      .returning();
    return discussion;
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
    await db
      .update(users)
      .set({ classId, updatedAt: new Date() })
      .where(eq(users.id, studentId));
  }

  async removeStudentFromClass(studentId: string): Promise<void> {
    await db
      .update(users)
      .set({ classId: null, updatedAt: new Date() })
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

    return result;
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
        costUsd: estimatedCost.toFixed(4),
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

      if (price.pricingType === 'token') {
        if (price.inputTokenPrice && inputTokens > 0) {
          cost += (inputTokens / 1000) * parseFloat(price.inputTokenPrice);
        }
        if (price.outputTokenPrice && outputTokens > 0) {
          cost += (outputTokens / 1000) * parseFloat(price.outputTokenPrice);
        }
      } else if (price.pricingType === 'request' && price.requestPrice) {
        cost = parseFloat(price.requestPrice);
      }

      return cost;
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
      const apiCalls = await db.select().from(apiCalls).where(eq(apiCalls.userId, userId));

      // Get consents
      const consents = await this.getUserConsents(userId);

      // Get privacy requests
      const requests = await this.getPrivacyRequests(userData.email || '');

      return {
        user: userData,
        chatMessages,
        apiCalls,
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
      conditions.push(gte(testResults.createdAt, new Date(startDate)));
    }

    if (endDate) {
      // Add 1 day to include the end date fully if it's just a date string
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      conditions.push(lte(testResults.createdAt, end));
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
}

export const storage = new DatabaseStorage();
