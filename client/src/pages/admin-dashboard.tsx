import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  LogOut, Wand2, BarChart3, ArrowLeft, Loader2,
  Settings as SettingsIcon, BookOpen, GraduationCap, Users, School, Sparkles, MessageSquare, Globe 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Module, type Profession, type Subject, type User } from "@shared/schema";

// Modular Components
import { DashboardOverview } from "@/components/admin-dashboard/DashboardOverview";
import { ProfessionManager } from "@/components/admin-dashboard/ProfessionManager";
import { SubjectManager } from "@/components/admin-dashboard/SubjectManager";
import { ModuleManager } from "@/components/admin-dashboard/ModuleManager";
import { UserManagement } from "@/components/admin-dashboard/UserManagement";
import { SchoolManagement } from "@/components/admin-dashboard/SchoolManagement";
import { CostsManager } from "@/components/admin-dashboard/CostsManager";
import { SettingsManager } from "@/components/admin-dashboard/SettingsManager";
import { PromptSettings } from "@/components/admin-dashboard/PromptSettings";
import { IKKManager } from "@/components/admin-dashboard/IKKManager";
import { EnhancedModuleForm } from "@/components/enhanced-module-form";
import { ErrorBoundary } from "@/components/ErrorBoundary";


export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProfessionId, setSelectedProfessionId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedSubjectType, setSelectedSubjectType] = useState<"theory" | "practical" | null>(null);

  // Core Data Queries
  const { data: professions = [] } = useQuery<Profession[]>({
    queryKey: ["/api/public/professions"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/public/subjects"],
  });

  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ["/api/public/modules"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: apiStatus } = useQuery<any>({
    queryKey: ["/api/admin/api-status"],
    enabled: isAdmin,
  });

  const { data: aiSettings } = useQuery<any>({
    queryKey: ["/api/admin/settings/ai"],
    enabled: isAdmin,
  });

  const { data: queueStatus } = useQuery<any>({
    queryKey: ["/api/admin/queue-status"],
    enabled: isAdmin,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      return (data?.queueSize > 0 || data?.processing > 0) ? 3000 : 10000;
    },

  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      window.location.href = "/";
    } catch (error) {
      toast({ title: "Kijelentkezési hiba", variant: "destructive" });
    }
  };

  const stats = {
    totalProfessions: (professions || []).length,
    totalSubjects: (subjects || []).length,
    totalModules: (modules || []).length,
    publishedModules: (modules || []).filter(m => m.isPublished).length,
    totalUsers: (users || []).length,
    adminUsers: (users || []).filter(u => u.role === 'admin').length,
    schoolAdminUsers: (users || []).filter(u => u.role === 'school_admin').length,
    teacherUsers: (users || []).filter(u => u.role === 'teacher').length,
    studentUsers: (users || []).filter(u => u.role === 'student').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 mb-8 sticky top-0 z-10">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isAdmin ? "Admin Dashboard" : "Tartalomkezelő"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rendszer felügyelet és tananyag adminisztráció</p>
          </div>
          <div className="flex items-center gap-3">
            {queueStatus && (queueStatus.processingItems?.length > 0 || queueStatus.queuedItems?.length > 0) && (
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 animate-pulse flex items-center gap-2 py-1.5 px-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-bold">AI FEJLESZTÉS:</span> 
                <span>{queueStatus.processingItems?.length + queueStatus.queuedItems?.length} folyamatban</span>
              </Badge>
            )}
            <Button variant="outline" onClick={() => window.location.href = "/"} className="h-9 gap-2">
              <ArrowLeft size={16} /> Vissza
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="h-9 gap-2 text-destructive">
              <LogOut className="h-4 w-4" /> Kijelentkezés
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto bg-transparent border-b rounded-none p-0 gap-6">
            <TabTrigger value="overview" label="Áttekintés" icon={<BarChart3 className="h-4 w-4" />} />
            <TabTrigger value="professions" label="Szakmák" icon={<GraduationCap className="h-4 w-4" />} />
            <TabTrigger value="subjects" label="Tantárgyak" icon={<BookOpen className="h-4 w-4" />} />
            <TabTrigger value="modules" label="Modulok" icon={<SettingsIcon className="h-4 w-4" />} />
            <TabTrigger value="ai-modules" label="AI Modulok" icon={<Sparkles className="h-4 w-4" />} color="text-purple-600" />
            {isAdmin && <TabTrigger value="users" label="Felhasználók" icon={<Users className="h-4 w-4" />} />}
            {isAdmin && <TabTrigger value="schools" label="Iskolák" icon={<School className="h-4 w-4" />} />}
            {isAdmin && <TabTrigger value="costs" label="Költségek" icon={<BarChart3 className="h-4 w-4" />} color="text-green-600" />}
            {isAdmin && <TabTrigger value="settings" label="Beállítások" icon={<SettingsIcon className="h-4 w-4" />} />}
          </TabsList>

          <div className="mt-6">
            <ErrorBoundary>

            <TabsContent value="overview">
              <DashboardOverview stats={stats} queueStatus={queueStatus} />
            </TabsContent>

            <TabsContent value="professions">
              <ProfessionManager 
                professions={professions} 
                subjects={subjects}
                modules={modules}
                onSelect={(id: number) => { setSelectedProfessionId(id); setActiveTab("subjects"); }} 
              />
            </TabsContent>
 
            <TabsContent value="subjects">
              <SubjectManager 
                subjects={subjects} 
                professions={professions}
                modules={modules}
                selectedProfessionId={selectedProfessionId}
                selectedType={selectedSubjectType}
                setSelectedType={setSelectedSubjectType}
                onBack={() => setActiveTab("professions")}
                onSelect={(id: number) => { setSelectedSubjectId(id); setActiveTab("modules"); }}
              />
            </TabsContent>

            <TabsContent value="modules">
              <ModuleManager 
                modules={modules}
                subjects={subjects}
                selectedSubjectId={selectedSubjectId}
                onBack={() => setActiveTab("subjects")}
                isAdmin={isAdmin}
              />
            </TabsContent>

            <TabsContent value="ai-modules">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">AI Tartalomgenerálás</h2>
                </div>
                <EnhancedModuleForm 
                  subjects={subjects}
                  onModuleCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] })}
                />
              </div>
            </TabsContent>

            {isAdmin && (
              <>
                <TabsContent value="users">
                  <UserManagement users={users} professions={professions} isLoading={usersLoading} />
                </TabsContent>

                <TabsContent value="schools">
                  <SchoolManagement />
                </TabsContent>

                <TabsContent value="costs">
                  <CostsManager />
                </TabsContent>

                <TabsContent value="settings" className="space-y-8">
                  <SettingsManager 
                    stats={stats} 
                    apiStatus={apiStatus || {}} 
                    aiSettings={aiSettings || {}} 
                    currentAiProvider={aiSettings?.aiProvider || "openai"}
                  />
                  <div className="border-t pt-8">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" /> Prompt Finomhangolás
                    </h3>
                    <PromptSettings />
                  </div>
                </TabsContent>
              </>
            )}
            </ErrorBoundary>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

function TabTrigger({ value, label, icon, color = "" }: { value: string, label: string, icon: React.ReactNode, color?: string }) {
  return (
    <TabsTrigger 
      value={value} 
      className={`px-1 py-4 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-auto gap-2 ${color}`}
    >
      {icon}
      <span>{label}</span>
    </TabsTrigger>
  );
}