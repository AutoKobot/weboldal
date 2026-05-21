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
  createUser(userData: { id?: string; username: string; firstName: string; lastName: string; schoolName?: string; schoolId?: number | null; email?: string | null; role: string; password: string; schoolAdminId?: string; phone?: string | null }): Promise<User>;
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
  initializeDefaultPrompts(): Promise<void>;

  // AI settings operations
  getAISettings(): Promise<AISetting | undefined>;
  updateAISettings(data: any, updatedBy: string): Promise<AISetting>;

  // Private messages operations
  createPrivateMessage(message: InsertPrivateMessage): Promise<PrivateMessage>;
  getPrivateMessages(userId: string): Promise<PrivateMessage[]>;
  getUnreadPrivateMessageCount(userId: string): Promise<number>;
  markPrivateMessagesRead(userId: string, senderId: string): Promise<void>;
  getConversationPartners(userId: string): Promise<User[]>;

  // Practical grades operations
  getPracticalGradesByStudent(studentId: string): Promise<PracticalGrade[]>;
  getPracticalGradesByModule(moduleId: number): Promise<PracticalGrade[]>;
  getPracticalGradesByTeacher(teacherId: string): Promise<PracticalGrade[]>;
  getPracticalGradeForModule(studentId: string, moduleId: number): Promise<PracticalGrade | undefined>;
  createPracticalGrade(grade: InsertPracticalGrade): Promise<PracticalGrade>;
  updatePracticalGrade(id: number, data: Partial<InsertPracticalGrade>): Promise<PracticalGrade>;
  deletePracticalGrade(id: number): Promise<void>;
  reorganizeSubjects(professionId: number): Promise<void>;
  recordLoginAttendance(studentId: string): Promise<void>;
  getLatestBackgroundJob(type: string): Promise<any>;
  getBackgroundJobs(): Promise<any[]>;
  createBackgroundJob(type: string, message: string, data?: any): Promise<any>;
  updateBackgroundJob(id: number, updateData: { status?: string; progress?: number; message?: string; error?: string }): Promise<void>;
}

export class DatabaseStorage implements IStorage {

  // ── User operations ───────────────────────────────────────────────────────
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.lastName));
  }

  async getAllStudents(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'student')).orderBy(asc(users.lastName));
  }

  async getAllTeachers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'teacher')).orderBy(asc(users.lastName));
  }

  async getStudentsByTeacher(teacherId: string): Promise<User[]> {
    return await db.select().from(users).where(and(eq(users.role, 'student'), eq(users.assignedTeacherId, teacherId))).orderBy(asc(users.lastName));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: { ...userData, updatedAt: new Date() },
    }).returning();
    return user;
  }

  async createLocalUser(userData: Omit<UpsertUser, 'id'> & { id: string }): Promise<User> {
    const [user] = await db.insert(users).values({ ...userData, authType: 'local' }).returning();
    return user;
  }

  async createUser(userData: { id?: string; username: string; firstName: string; lastName: string; schoolName?: string; schoolId?: number | null; email?: string | null; role: string; password: string; schoolAdminId?: string; phone?: string | null }): Promise<User> {
    const id = userData.id || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const [user] = await db.insert(users).values({ ...userData, id, authType: 'local' } as any).returning();
    return user;
  }

  async setUserPassword(userId: string, password: string): Promise<void> {
    await db.update(users).set({ password, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async updateUserProfession(id: string, professionId: number): Promise<void> {
    await db.update(users).set({ selectedProfessionId: professionId, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async updateUserAssignedProfessions(id: string, professionIds: number[]): Promise<void> {
    await db.update(users).set({ assignedProfessionIds: professionIds, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async updateUserCompletedModules(id: string, moduleIds: number[]): Promise<void> {
    await db.update(users).set({ completedModules: moduleIds, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db.update(users).set({ password, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async updateUserSchoolAdmin(id: string, schoolAdminId: string | null): Promise<void> {
    await db.update(users).set({ schoolAdminId, updatedAt: new Date() }).where(eq(users.id, id));
  }

  async assignStudentToTeacher(studentId: string, teacherId: string): Promise<void> {
    await db.update(users).set({ assignedTeacherId: teacherId, updatedAt: new Date() }).where(eq(users.id, studentId));
  }

  async removeStudentFromTeacher(studentId: string): Promise<void> {
    await db.update(users).set({ assignedTeacherId: null, updatedAt: new Date() }).where(eq(users.id, studentId));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async updateSchoolAdmin(id: string, data: Partial<User>): Promise<User> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() } as any).where(eq(users.id, id)).returning();
    return updated;
  }

  // ── Class operations ──────────────────────────────────────────────────────
  async getClassesBySchoolAdmin(schoolAdminId: string): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.schoolAdminId, schoolAdminId));
  }

  async getClassById(classId: number): Promise<Class | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, classId));
    return cls || undefined;
  }

  async getStudentsByClass(classId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.classId, classId)).orderBy(asc(users.lastName));
  }

  async getStudentsBySchoolAdmin(schoolAdminId: string): Promise<User[]> {
    return await db.select().from(users).where(and(eq(users.role, 'student'), eq(users.schoolAdminId, schoolAdminId))).orderBy(asc(users.lastName));
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const [cls] = await db.insert(classes).values(classData).returning();
    return cls;
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class> {
    const [cls] = await db.update(classes).set({ ...classData, updatedAt: new Date() }).where(eq(classes.id, id)).returning();
    return cls;
  }

  async deleteClass(id: number): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  async assignStudentToClass(studentId: string, classId: number): Promise<void> {
    await db.update(users).set({ classId, updatedAt: new Date() }).where(eq(users.id, studentId));
  }

  async addStudentToClass(studentId: string, classId: number): Promise<void> {
    await db.update(users).set({ classId, updatedAt: new Date() }).where(eq(users.id, studentId));
  }

  async removeStudentFromClass(studentId: string): Promise<void> {
    await db.update(users).set({ classId: null, updatedAt: new Date() }).where(eq(users.id, studentId));
  }

  async assignTeacherToClass(teacherId: string, classId: number): Promise<void> {
    await db.update(classes).set({ assignedTeacherId: teacherId, updatedAt: new Date() }).where(eq(classes.id, classId));
  }

  async assignProfessionToClass(classId: number, professionId: number): Promise<void> {
    await db.update(classes).set({ professionId, updatedAt: new Date() }).where(eq(classes.id, classId));
  }

  async assignTeacherToClassById(classId: number, teacherId: string): Promise<void> {
    await db.update(classes).set({ assignedTeacherId: teacherId, updatedAt: new Date() }).where(eq(classes.id, classId));
  }

  async getClassWithProfession(classId: number): Promise<Class & { profession?: any } | undefined> {
    const [cls] = await db.select().from(classes).where(eq(classes.id, classId));
    if (!cls) return undefined;
    if (cls.professionId) {
      const [profession] = await db.select().from(professions).where(eq(professions.id, cls.professionId));
      return { ...cls, profession };
    }
    return cls;
  }

  // ── Cost tracking operations ───────────────────────────────────────────────
  async logApiCall(callData: InsertApiCall): Promise<ApiCall> {
    const [call] = await db.insert(apiCalls).values(callData).returning();
    return call;
  }

  async getApiCallStats(year?: number, month?: number): Promise<any> {
    let query = db.select({
      provider: apiCalls.provider,
      service: apiCalls.service,
      model: apiCalls.model,
      totalCost: sql<number>`sum(${apiCalls.costUsd})`,
      totalCalls: sql<number>`count(*)`,
      totalTokens: sql<number>`sum(${apiCalls.tokenCount})`
    }).from(apiCalls);
    return await query;
  }

  async getMonthlyCosts(year?: number): Promise<MonthlyCost[]> {
    if (year) {
      return await db.select().from(monthlyCosts).where(eq(monthlyCosts.year, year)).orderBy(monthlyCosts.month);
    }
    return await db.select().from(monthlyCosts).orderBy(desc(monthlyCosts.year), monthlyCosts.month);
  }

  async upsertMonthlyCost(costData: InsertMonthlyCost): Promise<MonthlyCost> {
    const [cost] = await db.insert(monthlyCosts).values(costData).onConflictDoUpdate({
      target: [monthlyCosts.year, monthlyCosts.month],
      set: { ...costData, updatedAt: new Date() },
    }).returning();
    return cost;
  }

  async calculateMonthlyApiCosts(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const [result] = await db.select({ total: sql<number>`sum(${apiCalls.costUsd})` }).from(apiCalls)
      .where(and(gte(apiCalls.createdAt, startDate), lte(apiCalls.createdAt, endDate)));
    return Number(result?.total) || 0;
  }

  // ── API pricing operations ─────────────────────────────────────────────────
  async getApiPricing(): Promise<ApiPricing[]> {
    return await db.select().from(apiPricing);
  }

  async upsertApiPricing(pricingData: InsertApiPricing): Promise<ApiPricing> {
    const [pricing] = await db.insert(apiPricing).values(pricingData).returning();
    return pricing;
  }

  async deleteApiPricing(id: number): Promise<void> {
    await db.delete(apiPricing).where(eq(apiPricing.id, id));
  }

  async getUniqueApiProviders(): Promise<{ provider: string, service: string, model?: string }[]> {
    const rows = await db.selectDistinct({ provider: apiCalls.provider, service: apiCalls.service, model: apiCalls.model }).from(apiCalls);
    return rows as any;
  }

  async getTeachersBySchoolAdmin(schoolAdminId: string): Promise<User[]> {
    return await db.select().from(users).where(and(eq(users.role, 'teacher'), eq(users.schoolAdminId, schoolAdminId))).orderBy(asc(users.lastName));
  }

  // ── School operations ──────────────────────────────────────────────────────
  async getSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school || undefined;
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values(school).returning();
    return newSchool;
  }

  async updateSchool(id: number, data: Partial<School>): Promise<School> {
    const [updated] = await db.update(schools).set({ ...data, updatedAt: new Date() }).where(eq(schools.id, id)).returning();
    return updated;
  }

  async deleteSchool(id: number): Promise<void> {
    await db.delete(schools).where(eq(schools.id, id));
  }

  async assignUserToSchool(userId: string, schoolId: number | null): Promise<void> {
    await db.update(users).set({ schoolId, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async assignClassToSchool(classId: number, schoolId: number): Promise<void> {
    await db.update(classes).set({ schoolId, updatedAt: new Date() }).where(eq(classes.id, classId));
  }

  async getSchoolAdminBySchool(schoolId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.role, 'school_admin'), eq(users.schoolId, schoolId)));
    return user || undefined;
  }

  // ── Profession operations ──────────────────────────────────────────────────
  async getProfessions(schoolAdminId?: string | null): Promise<Profession[]> {
    if (schoolAdminId) {
      return await db.select().from(professions).where(eq(professions.schoolAdminId, schoolAdminId)).orderBy(asc(professions.name));
    }
    return await db.select().from(professions).orderBy(asc(professions.name));
  }

  async getProfession(id: number): Promise<Profession | undefined> {
    const [profession] = await db.select().from(professions).where(eq(professions.id, id));
    return profession || undefined;
  }

  async createProfession(profession: InsertProfession): Promise<Profession> {
    const [newProfession] = await db.insert(professions).values(profession).returning();
    return newProfession;
  }

  async updateProfession(id: number, profession: Partial<InsertProfession>): Promise<Profession> {
    const [updated] = await db.update(professions).set({ ...profession, updatedAt: new Date() }).where(eq(professions.id, id)).returning();
    return updated;
  }

  async deleteProfession(id: number): Promise<void> {
    await db.delete(professions).where(eq(professions.id, id));
  }

  async redistributeProfessionHours(professionId: number, totalHours: number): Promise<void> {
    const subjectsList = await db.select().from(subjects).where(eq(subjects.professionId, professionId));
    if (subjectsList.length === 0) return;
    const hoursPerSubject = Math.floor(totalHours / subjectsList.length);
    for (const subject of subjectsList) {
      await db.update(subjects).set({ hours: hoursPerSubject, updatedAt: new Date() }).where(eq(subjects.id, subject.id));
    }
  }

  // ── Subject operations ─────────────────────────────────────────────────────
  async getSubjects(professionId?: number, schoolAdminId?: string | null): Promise<Subject[]> {
    const conditions: any[] = [];
    if (professionId) conditions.push(eq(subjects.professionId, professionId));
    if (schoolAdminId) conditions.push(eq(subjects.schoolAdminId, schoolAdminId));
    if (conditions.length > 0) {
      return await db.select().from(subjects).where(and(...conditions)).orderBy(asc(subjects.orderIndex));
    }
    return await db.select().from(subjects).orderBy(asc(subjects.orderIndex));
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject || undefined;
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [newSubject] = await db.insert(subjects).values(subject).returning();
    return newSubject;
  }

  async updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject> {
    const [updated] = await db.update(subjects).set({ ...subject, updatedAt: new Date() }).where(eq(subjects.id, id)).returning();
    return updated;
  }

  async deleteSubject(id: number): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  // ── Module operations ──────────────────────────────────────────────────────
  async getModules(subjectId?: number, schoolAdminId?: string | null): Promise<Module[]> {
    const conditions: any[] = [];
    if (subjectId) conditions.push(eq(modules.subjectId, subjectId));
    if (schoolAdminId) conditions.push(eq(modules.schoolAdminId, schoolAdminId));
    if (conditions.length > 0) {
      return await db.select().from(modules).where(and(...conditions)).orderBy(asc(modules.moduleNumber));
    }
    return await db.select().from(modules).orderBy(asc(modules.moduleNumber));
  }

  async getPublishedModules(subjectId?: number, schoolAdminId?: string | null): Promise<Module[]> {
    const conditions: any[] = [eq(modules.isPublished, true)];
    if (subjectId) conditions.push(eq(modules.subjectId, subjectId));
    if (schoolAdminId) conditions.push(eq(modules.schoolAdminId, schoolAdminId));
    return await db.select().from(modules).where(and(...conditions)).orderBy(asc(modules.moduleNumber));
  }

  async getModule(id: number): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module || undefined;
  }

  async createModule(module: InsertModule): Promise<Module> {
    const [newModule] = await db.insert(modules).values(module as any).returning();
    return newModule;
  }

  async bulkCreateModules(modulesList: InsertModule[]): Promise<Module[]> {
    const newModules = await db.insert(modules).values(modulesList as any).returning();
    return newModules;
  }

  async updateModule(id: number, module: Partial<InsertModule>): Promise<Module> {
    const [updated] = await db.update(modules).set({ ...module, updatedAt: new Date() } as any).where(eq(modules.id, id)).returning();
    return updated;
  }

  async deleteModule(id: number): Promise<void> {
    await db.delete(modules).where(eq(modules.id, id));
  }

  // ── Flashcard operations ───────────────────────────────────────────────────
  async getFlashcards(moduleId: number): Promise<Flashcard[]> {
    return await db.select().from(flashcards).where(eq(flashcards.moduleId, moduleId));
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [newFlashcard] = await db.insert(flashcards).values(flashcard).returning();
    return newFlashcard;
  }

  async deleteFlashcardsByModule(moduleId: number): Promise<void> {
    await db.delete(flashcards).where(eq(flashcards.moduleId, moduleId));
  }

  async bulkCreateFlashcards(flashcardsList: InsertFlashcard[]): Promise<Flashcard[]> {
    return await db.insert(flashcards).values(flashcardsList).returning();
  }

  // ── Chat operations ────────────────────────────────────────────────────────
  async getChatMessages(userId: string, moduleId?: number): Promise<ChatMessage[]> {
    if (moduleId) {
      return await db.select().from(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.relatedModuleId, moduleId))).orderBy(asc(chatMessages.timestamp));
    }
    return await db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(asc(chatMessages.timestamp));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async deleteChatMessages(userId: string, moduleId?: number): Promise<void> {
    if (moduleId) {
      await db.delete(chatMessages).where(and(eq(chatMessages.userId, userId), eq(chatMessages.relatedModuleId, moduleId)));
    } else {
      await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
    }
  }

  // ── Admin messages ─────────────────────────────────────────────────────────
  async getAdminMessages(): Promise<AdminMessage[]> {
    return await db.select().from(adminMessages).orderBy(desc(adminMessages.createdAt));
  }

  async createAdminMessage(message: InsertAdminMessage): Promise<AdminMessage> {
    const [newMessage] = await db.insert(adminMessages).values(message).returning();
    return newMessage;
  }

  async respondToAdminMessage(id: number, response: string): Promise<AdminMessage> {
    const [updated] = await db.update(adminMessages).set({ response, isResolved: true, respondedAt: new Date() }).where(eq(adminMessages.id, id)).returning();
    return updated;
  }

  // ── Test results ───────────────────────────────────────────────────────────
  async getTestResults(userId: string): Promise<TestResult[]> {
    return await db.select().from(testResults).where(eq(testResults.userId, userId)).orderBy(desc(testResults.createdAt));
  }

  async createTestResult(result: InsertTestResult): Promise<TestResult> {
    const [newResult] = await db.insert(testResults).values(result).returning();
    return newResult;
  }

  async getTestResultsByModule(moduleId: number): Promise<TestResult[]> {
    return await db.select().from(testResults).where(eq(testResults.moduleId, moduleId));
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  // ── Community groups ───────────────────────────────────────────────────────
  async getCommunityGroups(): Promise<CommunityGroup[]> {
    return await db.select().from(communityGroups).orderBy(desc(communityGroups.createdAt));
  }

  async getCommunityGroup(id: number): Promise<CommunityGroup | undefined> {
    const [group] = await db.select().from(communityGroups).where(eq(communityGroups.id, id));
    return group || undefined;
  }

  async createCommunityGroup(group: InsertCommunityGroup): Promise<CommunityGroup> {
    const [newGroup] = await db.insert(communityGroups).values(group).returning();
    return newGroup;
  }

  async updateCommunityGroup(id: number, data: Partial<InsertCommunityGroup>): Promise<CommunityGroup> {
    const [updated] = await db.update(communityGroups).set({ ...data, updatedAt: new Date() }).where(eq(communityGroups.id, id)).returning();
    return updated;
  }

  async deleteCommunityGroup(id: number): Promise<void> {
    await db.delete(communityGroups).where(eq(communityGroups.id, id));
  }

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    return await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  }

  async addGroupMember(groupId: number, userId: string, role?: string): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values({ groupId, userId, role: role || 'member' }).returning();
    return member;
  }

  async removeGroupMember(groupId: number, userId: string): Promise<void> {
    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
  }

  // ── Community projects ─────────────────────────────────────────────────────
  async getCommunityProjects(groupId?: number): Promise<CommunityProject[]> {
    if (groupId) {
      return await db.select().from(communityProjects).where(eq(communityProjects.groupId, groupId)).orderBy(desc(communityProjects.createdAt));
    }
    return await db.select().from(communityProjects).orderBy(desc(communityProjects.createdAt));
  }

  async getCommunityProject(id: number): Promise<CommunityProject | undefined> {
    const [project] = await db.select().from(communityProjects).where(eq(communityProjects.id, id));
    return project || undefined;
  }

  async createCommunityProject(project: InsertCommunityProject): Promise<CommunityProject> {
    const [newProject] = await db.insert(communityProjects).values(project).returning();
    return newProject;
  }

  async updateCommunityProject(id: number, data: Partial<InsertCommunityProject>): Promise<CommunityProject> {
    const [updated] = await db.update(communityProjects).set({ ...data, updatedAt: new Date() }).where(eq(communityProjects.id, id)).returning();
    return updated;
  }

  async deleteCommunityProject(id: number): Promise<void> {
    await db.delete(communityProjects).where(eq(communityProjects.id, id));
  }

  // ── Discussions ────────────────────────────────────────────────────────────
  async getDiscussions(groupId?: number, projectId?: number): Promise<Discussion[]> {
    const conditions: any[] = [];
    if (groupId) conditions.push(eq(discussions.groupId, groupId));
    if (projectId) conditions.push(eq(discussions.projectId, projectId));
    if (conditions.length > 0) {
      return await db.select().from(discussions).where(and(...conditions)).orderBy(desc(discussions.createdAt));
    }
    return await db.select().from(discussions).orderBy(desc(discussions.createdAt));
  }

  async createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
    const [newDiscussion] = await db.insert(discussions).values(discussion).returning();
    return newDiscussion;
  }

  async updateDiscussion(id: number, data: Partial<InsertDiscussion>): Promise<Discussion> {
    const [updated] = await db.update(discussions).set({ ...data, updatedAt: new Date() }).where(eq(discussions.id, id)).returning();
    return updated;
  }

  async deleteDiscussion(id: number): Promise<void> {
    await db.delete(discussions).where(eq(discussions.id, id));
  }

  // ── Peer reviews ───────────────────────────────────────────────────────────
  async getPeerReviews(projectId: number): Promise<PeerReview[]> {
    return await db.select().from(peerReviews).where(eq(peerReviews.projectId, projectId));
  }

  async createPeerReview(review: InsertPeerReview): Promise<PeerReview> {
    const [newReview] = await db.insert(peerReviews).values(review).returning();
    return newReview;
  }

  // ── Attendance ─────────────────────────────────────────────────────────────
  async getAttendance(classId: number, date?: string): Promise<Attendance[]> {
    if (date) {
      return await db.select().from(attendance).where(and(eq(attendance.classId, classId), eq(attendance.date, date)));
    }
    return await db.select().from(attendance).where(eq(attendance.classId, classId));
  }

  async upsertAttendance(data: InsertAttendance): Promise<Attendance> {
    const [record] = await db.insert(attendance).values(data).onConflictDoUpdate({
      target: [attendance.studentId, attendance.classId, attendance.date, attendance.periodNumber],
      set: { ...data, updatedAt: new Date() },
    }).returning();
    return record;
  }

  async getDailyAttendance(classId: number, date?: string): Promise<DailyAttendance[]> {
    if (date) {
      return await db.select().from(dailyAttendance).where(and(eq(dailyAttendance.classId, classId), eq(dailyAttendance.date, date)));
    }
    return await db.select().from(dailyAttendance).where(eq(dailyAttendance.classId, classId));
  }

  async upsertDailyAttendance(data: InsertDailyAttendance): Promise<DailyAttendance> {
    const [record] = await db.insert(dailyAttendance).values(data).onConflictDoUpdate({
      target: [dailyAttendance.studentId, dailyAttendance.date],
      set: { ...data, updatedAt: new Date() },
    }).returning();
    return record;
  }

  // ── Lesson schedules ───────────────────────────────────────────────────────
  async getLessonSchedules(schoolId?: number, classId?: number): Promise<LessonSchedule[]> {
    const conditions: any[] = [];
    if (schoolId) conditions.push(eq(lessonSchedules.schoolId, schoolId));
    if (classId) conditions.push(eq(lessonSchedules.classId, classId));
    if (conditions.length > 0) {
      return await db.select().from(lessonSchedules).where(and(...conditions)).orderBy(asc(lessonSchedules.periodNumber));
    }
    return await db.select().from(lessonSchedules).orderBy(asc(lessonSchedules.periodNumber));
  }

  async upsertLessonSchedule(data: InsertLessonSchedule): Promise<LessonSchedule> {
    const [schedule] = await db.insert(lessonSchedules).values(data).onConflictDoUpdate({
      target: [lessonSchedules.schoolId, lessonSchedules.periodNumber, lessonSchedules.scheduleGroup, lessonSchedules.classId],
      set: { ...data, updatedAt: new Date() },
    }).returning();
    return schedule;
  }

  async deleteLessonSchedule(id: number): Promise<void> {
    await db.delete(lessonSchedules).where(eq(lessonSchedules.id, id));
  }

  // ── Student avatars ────────────────────────────────────────────────────────
  async getStudentAvatar(userId: string): Promise<StudentAvatar | undefined> {
    const [avatar] = await db.select().from(studentAvatars).where(eq(studentAvatars.userId, userId));
    return avatar || undefined;
  }

  async upsertStudentAvatar(data: InsertStudentAvatar): Promise<StudentAvatar> {
    const [avatar] = await db.insert(studentAvatars).values(data).onConflictDoUpdate({
      target: studentAvatars.userId,
      set: { ...data, updatedAt: new Date() },
    }).returning();
    return avatar;
  }

  async selectStudentAvatar(userId: string, avatarType: string): Promise<StudentAvatar> {
    const existing = await this.getStudentAvatar(userId);
    if (existing) {
      const [updated] = await db.update(studentAvatars).set({ avatarType, updatedAt: new Date() }).where(eq(studentAvatars.userId, userId)).returning();
      return updated;
    }
    const [avatar] = await db.insert(studentAvatars).values({ userId, avatarType }).returning();
    return avatar;
  }

  // ── Class announcements ────────────────────────────────────────────────────
  async getClassAnnouncements(classId: number): Promise<ClassAnnouncement[]> {
    return await db.select().from(classAnnouncements).where(eq(classAnnouncements.classId, classId)).orderBy(desc(classAnnouncements.createdAt));
  }

  async createClassAnnouncement(data: InsertClassAnnouncement): Promise<ClassAnnouncement> {
    const [announcement] = await db.insert(classAnnouncements).values(data).returning();
    return announcement;
  }

  async updateClassAnnouncement(id: number, data: Partial<InsertClassAnnouncement>): Promise<ClassAnnouncement> {
    const [updated] = await db.update(classAnnouncements).set(data as any).where(eq(classAnnouncements.id, id)).returning();
    return updated;
  }

  async deleteClassAnnouncement(id: number): Promise<void> {
    await db.delete(classAnnouncements).where(eq(classAnnouncements.id, id));
  }

  async acknowledgeAnnouncement(announcementId: number, studentId: string, response?: string): Promise<AnnouncementAcknowledgement> {
    const [ack] = await db.insert(announcementAcknowledgements).values({ announcementId, studentId, response }).onConflictDoUpdate({
      target: [announcementAcknowledgements.announcementId, announcementAcknowledgements.studentId],
      set: { response, acknowledgedAt: new Date() },
    }).returning();
    return ack;
  }

  async getAnnouncementAcknowledgements(announcementId: number): Promise<AnnouncementAcknowledgement[]> {
    return await db.select().from(announcementAcknowledgements).where(eq(announcementAcknowledgements.announcementId, announcementId));
  }

  // ── Student daily notes ────────────────────────────────────────────────────
  async getStudentDailyNotes(studentId: string, date?: string): Promise<StudentDailyNote[]> {
    if (date) {
      return await db.select().from(studentDailyNotes).where(and(eq(studentDailyNotes.studentId, studentId), eq(studentDailyNotes.date, date))).orderBy(desc(studentDailyNotes.createdAt));
    }
    return await db.select().from(studentDailyNotes).where(eq(studentDailyNotes.studentId, studentId)).orderBy(desc(studentDailyNotes.createdAt));
  }

  async upsertStudentDailyNote(data: InsertStudentDailyNote): Promise<StudentDailyNote> {
    const [note] = await db.insert(studentDailyNotes).values(data).returning();
    return note;
  }

  // ── Privacy / GDPR ─────────────────────────────────────────────────────────
  async getUserConsents(userId: string): Promise<UserConsent[]> {
    return await db.select().from(userConsents).where(eq(userConsents.userId, userId));
  }

  async upsertUserConsent(data: InsertUserConsent): Promise<UserConsent> {
    const [consent] = await db.insert(userConsents).values(data).returning();
    return consent;
  }

  async getPrivacyRequests(userId?: string): Promise<PrivacyRequest[]> {
    if (userId) {
      return await db.select().from(privacyRequests).where(eq(privacyRequests.userId, userId)).orderBy(desc(privacyRequests.createdAt));
    }
    return await db.select().from(privacyRequests).orderBy(desc(privacyRequests.createdAt));
  }

  async createPrivacyRequest(data: InsertPrivacyRequest): Promise<PrivacyRequest> {
    const [request] = await db.insert(privacyRequests).values(data).returning();
    return request;
  }

  async getDataProcessingActivities(): Promise<DataProcessingActivity[]> {
    return await db.select().from(dataProcessingActivities);
  }

  async createDataProcessingActivity(data: InsertDataProcessingActivity): Promise<DataProcessingActivity> {
    const [activity] = await db.insert(dataProcessingActivities).values(data).returning();
    return activity;
  }

  async recordSimpleApiCall(provider: string, service: string, estimatedCost: number): Promise<void> {
    try {
      await db.insert(apiCalls).values({
        provider,
        service,
        costUsd: String(estimatedCost),
        tokenCount: 0,
      } as any);
    } catch (e) {
      console.warn('[recordSimpleApiCall] Failed to log API call:', e);
    }
  }

  // ── System settings operations ─────────────────────────────────────────────
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

  public async initializeDefaultPrompts(): Promise<void> {
    console.log("🔍 Alapértelmezett AI promptok ellenőrzése és inicializálása...");
    const defaultPrompts: { [key: string]: string } = {
      ai_system_message: "You are a helpful AI assistant providing clear and concise information related to educational topics.",
      ai_module_update_message: "As an AI assistant, your task is to update or generate content for a specific educational module based on the provided instructions. Focus on delivering accurate, comprehensive, and engaging material. Ensure the content is well-structured, easy to understand, and adheres to the specified tone and format. Pay close attention to any constraints or specific requirements given, such as length, keywords, or target audience. If asked to generate a mind map, provide it in Mermaid.js flowchart syntax.",
      ai_youtube_prompt: "Keresd meg a legrelevánsabb és legnépszerűbb YouTube videót a következő témában, különös tekintettel a magyar nyelvű videókra. Add meg a videó címét és URL-jét:",
      ai_flux_schnell_prompt: "Clean, precise technical illustration, engineering drawing style, blueprint or clear vector-style educational diagram, NO TEXT: {prompt}. Completely text-free, white or clean background, precise lines, technical aesthetic.",
      ai_internet_content_prompt: "Keress releváns tartalmat az interneten a következő témával kapcsolatban. Adjon meg 3-5 rövid összefoglalót a forrás megjelölésével (cím, URL):",
      "concise-content-prompt": "Fogalmazd meg tömören a következő tartalmat, maximum 100 szóban. A válasz csak az összefoglalást tartalmazza:",
      "audio-explanation-prompt": "Készíts egy rövid, érthető hangos magyarázatot a következő szöveghez. Koncentrálj a legfontosabb információkra és a könnyen emészthető formátumra:",
      "text-explanation-prompt": "Adj részletes, könnyen érthető magyarázatot a következő fogalomról/szövegről:",
      "ai_quiz_prompt": "Generálj egy kvízt a következő témában, amely 5 feleletválasztós kérdést tartalmaz. Minden kérdéshez 4 válaszlehetőséget adj meg, és jelöld a helyes választ. A válasz JSON formátumban legyen, a következő struktúrával: { \"quizTitle\": \"[Kvíz címe]\", \"questions\": [ { \"question\": \"[Kérdés szövege]\", \"options\": [\"[Válasz 1]\", \"[Válasz 2]\", \"[Válasz 3]\", \"[Válasz 4]\"], \"correctAnswer\": \"[Helyes válasz]\" } ] }"
    };

    for (const key in defaultPrompts) {
      if (defaultPrompts.hasOwnProperty(key)) {
        const existingSetting = await this.getSystemSetting(key);
        if (!existingSetting || existingSetting.value === null || existingSetting.value === ">") {
          // Only set if not already present or is an empty placeholder
          await this.setSystemSetting(key, defaultPrompts[key], "system_initializer");
          console.log(`  ✅ Inicializált prompt: ${key}`);
        } else {
          console.log(`  ➡️ Prompt már létezik: ${key}`);
        }
      }
    }
    console.log("✅ AI prompt inicializálás kész.");

    // Sync environment variables to DB settings on startup so they show up as "Csatlakoztatva" in Admin Settings UI
    const envKeysToSync: { [key: string]: string | undefined } = {
      openai_api_key: process.env.OPENAI_API_KEY,
      gemini_api_key: process.env.GEMINI_API_KEY,
      youtube_api_key: process.env.YOUTUBE_API_KEY,
      together_api_key: process.env.TOGETHER_API_KEY,
      deepinfra_api_key: process.env.DEEPINFRA_API_KEY,
      elevenlabs_api_key: process.env.ELEVENLABS_API_KEY,
      dataforseo_login: process.env.DATAFORSEO_LOGIN,
      dataforseo_password: process.env.DATAFORSEO_PASSWORD,
    };

    console.log("🔍 Környezeti változókból származó API kulcsok szinkronizálása az adatbázisba...");
    for (const key in envKeysToSync) {
      if (envKeysToSync.hasOwnProperty(key)) {
        const val = envKeysToSync[key];
        if (val) {
          const existingSetting = await this.getSystemSetting(key);
          if (!existingSetting || !existingSetting.value || existingSetting.value === ">") {
            await this.setSystemSetting(key, val, "system_env_sync");
            console.log(`  🔑 Szinkronizált API kulcs a környezeti változókból: ${key}`);
          }
        }
      }
    }
    console.log("✅ API kulcsok szinkronizálása kész.");
  }



  // AI settings operations
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
        googleDriveFolderId: (await this.getSystemSetting("GOOGLE_DRIVE_FOLDER_ID"))?.value || dbSettings?.googleDriveFolderId,
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
    if (merged.googleDriveFolderId) await this.setSystemSetting("GOOGLE_DRIVE_FOLDER_ID", merged.googleDriveFolderId, updatedBy);


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

          // Calculate proportional hours if subject.hours exists, otherwise fall back to module counts
          let theoryHours = theoryModules.length;
          let practicalHours = practicalModules.length;

          if (subject.hours) {
            const totalModules = theoryModules.length + practicalModules.length;
            const theoryRatio = theoryModules.length / totalModules;
            theoryHours = Math.round(subject.hours * theoryRatio);
            practicalHours = subject.hours - theoryHours;
          }

          // 1. Original becomes Theory
          await db.update(subjects)
            .set({ type: 'theory', hours: theoryHours, updatedAt: new Date() })
            .where(eq(subjects.id, subject.id));

          // 2. Create New Practical Subject
          const [newPracticalSubject] = await db.insert(subjects).values({
            professionId: subject.professionId,
            name: subject.name,
            code: subject.code,
            description: subject.description,
            type: 'practical',
            orderIndex: subject.orderIndex,
            hours: practicalHours,
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

  async recordLoginAttendance(studentId: string): Promise<void> {
    const student = await this.getUser(studentId);
    if (!student) {
      console.warn(`[Attendance Auto] Student not found: ${studentId}`);
      return;
    }
    if (student.role !== 'student') {
      return;
    }
    if (!student.classId) {
      console.warn(`[Attendance Auto] Student ${studentId} has no assigned classId, skipping daily attendance recording.`);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', hour12: false });

    await this.upsertDailyAttendance({
      studentId,
      classId: student.classId,
      date: todayStr,
      status: 'present',
      actualStart: formattedTime,
      recordedBy: 'auto'
    });
  }

  async getLatestBackgroundJob(type: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT * FROM background_jobs 
      WHERE type = ${type} 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as any;
    
    let parsedData = row.data;
    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch (e) {
        // ignore
      }
    }
    
    return {
      ...row,
      data: parsedData,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async getBackgroundJobs(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM background_jobs 
      ORDER BY created_at DESC
    `);
    return result.rows.map((row: any) => {
      let parsedData = row.data;
      if (typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
        } catch (e) {
          // ignore
        }
      }
      return {
        ...row,
        data: parsedData,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
  }

  async createBackgroundJob(type: string, message: string, data?: any): Promise<any> {
    const dataParam = data ? JSON.stringify(data) : null;
    const now = new Date();
    const result = await db.execute(sql`
      INSERT INTO background_jobs (type, message, data, status, progress, created_at, updated_at)
      VALUES (${type}, ${message}, ${dataParam}, 'processing', 0, ${now}, ${now})
      RETURNING *
    `);
    if (result.rows.length === 0) {
      throw new Error("Failed to create background job");
    }
    const row = result.rows[0] as any;
    let parsedData = row.data;
    if (typeof parsedData === 'string') {
      try {
        parsedData = JSON.parse(parsedData);
      } catch (e) {
        // ignore
      }
    }
    return {
      ...row,
      data: parsedData,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async updateBackgroundJob(id: number, updateData: { status?: string; progress?: number; message?: string; error?: string }): Promise<void> {
    const now = new Date();
    const statusVal = updateData.status !== undefined ? updateData.status : null;
    const progressVal = updateData.progress !== undefined ? updateData.progress : null;
    const messageVal = updateData.message !== undefined ? updateData.message : null;
    const errorVal = updateData.error !== undefined ? updateData.error : null;

    await db.execute(sql`
      UPDATE background_jobs
      SET
        status = COALESCE(${statusVal}, status),
        progress = COALESCE(${progressVal}, progress),
        message = COALESCE(${messageVal}, message),
        error = COALESCE(${errorVal}, error),
        updated_at = ${now}
      WHERE id = ${id}
    `);
  }
}

export const storage = new DatabaseStorage();