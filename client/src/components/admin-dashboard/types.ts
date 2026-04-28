import { User, Profession, Subject, Module, School } from "@shared/schema";

export interface DashboardStats {
  totalUsers: number;
  adminUsers: number;
  schoolAdminUsers: number;
  teacherUsers: number;
  studentUsers: number;
  totalProfessions: number;
  totalSubjects: number;
  totalModules: number;
  publishedModules: number;
}

export interface ApiStatus {
  openai: boolean;
  gemini: boolean;
  dataForSeo: boolean;
  youtube: boolean;
  elevenLabs: boolean;
}

export interface AISettings {
  imageProvider: string;
  imageModel: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export { type User, type Profession, type Subject, type Module, type School };
