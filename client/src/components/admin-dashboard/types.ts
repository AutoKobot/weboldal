import { 
  User, Profession, Subject, Module, School,
  insertProfessionSchema, insertSubjectSchema, insertModuleSchema,
  KeyConceptsData
} from "@shared/schema";
import { z } from "zod";

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

export const schoolAdminFormSchema = z.object({
  username: z.string().min(3, "Legalább 3 karakter"),
  password: z.string().min(6, "Legalább 6 karakter"),
  firstName: z.string().min(1, "Kötelező"),
  lastName: z.string().min(1, "Kötelező"),
  schoolName: z.string().min(1, "Kötelező"),
  email: z.string().email("Érvénytelen email"),
});

export { 
  type User, type Profession, type Subject, type Module, type School,
  type KeyConceptsData,
  insertProfessionSchema, insertSubjectSchema, insertModuleSchema
};
