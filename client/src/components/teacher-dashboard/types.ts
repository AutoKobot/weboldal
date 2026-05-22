export interface TestResult {
  id: number;
  moduleId: number;
  score: number;
  maxScore: number;
  passed: boolean;
  createdAt: string;
  grade?: number;
}

export interface Student {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  selectedProfessionId?: number;
  completedModules: number[];
  createdAt: string;
  testResults?: TestResult[];
  classId?: number;
  isOnline?: boolean;
  lastActiveDate?: string | null;
  currentStreak?: number | null;
}

export interface Module {
  id: number;
  title: string;
  subjectId: number;
  subjectName?: string;
  moduleNumber: number;
}

export interface Subject {
  id: number;
  name: string;
  type?: string;
  professionId?: number;
}

export interface Profession {
  id: number;
  name: string;
  description: string;
}

export interface ClassData {
  id: number;
  name: string;
  description: string;
  professionId?: number;
  scheduleGroup?: string;
  schoolId?: string;
  schoolAdminId?: string;
  assignedTeacherId?: string;
}

export interface GradeResult extends TestResult {
  studentName: string;
  moduleTitle: string;
  grade: number;
}
