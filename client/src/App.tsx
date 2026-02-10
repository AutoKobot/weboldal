import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { VoiceNavigation } from "@/components/voice-navigation";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing-futuristic-fixed";
import StudentDashboard from "@/pages/student-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import ModuleViewer from "@/pages/module-viewer";
import ProfessionSelection from "@/pages/profession-selection";
import PlatformInfo from "@/pages/platform-info";
import Learning from "@/pages/learning";
import ProgressPage from "@/pages/progress";

import SettingsPage from "@/pages/settings";
import AdminLogin from "@/pages/admin-login";
import StudentAuth from "@/pages/student-auth";
import TeacherAuth from "@/pages/teacher-auth";
import TeacherDashboard from "@/pages/teacher-dashboard";
import SchoolAdminAuth from "@/pages/school-admin-auth";
import SchoolAdminDashboard from "@/pages/school-admin-dashboard";
import ModulesPage from "@/pages/modules";
import SubjectsPage from "@/pages/subjects";
import HomePage from "@/pages/home";
import TananyagokPage from "@/pages/tananyagok";
import CommunityLearning from "@/pages/community-learning";
import MermaidTest from "@/pages/mermaid-test";
import ChatPage from "@/pages/chat";
import PrivacyPolicy from "@/pages/privacy-policy";
import PrivacyRequests from "@/pages/privacy-requests";
import CookieBanner from "@/components/cookie-banner";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, navigate] = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Always accessible routes */}
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/student-auth" component={StudentAuth} />
      <Route path="/teacher-auth" component={TeacherAuth} />
      <Route path="/school-admin-auth" component={SchoolAdminAuth} />
      <Route path="/school-admin-dashboard" component={SchoolAdminDashboard} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/privacy-requests" component={PrivacyRequests} />

      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/:rest*" component={() => <Redirect to="/" />} />
        </>
      ) : (
        <>
          {/* Student routes */}
          {user?.role === 'student' && (
            <>
              <Route path="/" component={HomePage} />
              <Route path="/home" component={HomePage} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/platform-info" component={PlatformInfo} />
              <Route path="/profession-selection" component={ProfessionSelection} />
              <Route path="/tananyagok" component={TananyagokPage} />
              <Route path="/subjects" component={SubjectsPage} />
              <Route path="/subjects/:subjectId/modules" component={ModulesPage} />
              <Route path="/learning" component={Learning} />
              <Route path="/modules" component={ModulesPage} />
              <Route path="/module/:id" component={ModuleViewer} />
              <Route path="/modules/:id" component={ModuleViewer} />
              <Route path="/modules/:subjectId" component={ModulesPage} />
              <Route path="/progress" component={ProgressPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/community" component={CommunityLearning} />
              <Route path="/community-learning" component={CommunityLearning} />
              <Route path="/mermaid-test" component={MermaidTest} />
            </>
          )}

          {/* Teacher routes */}
          {user?.role === 'teacher' && (
            <>
              <Route path="/" component={HomePage} />
              <Route path="/teacher" component={TeacherDashboard} />
              <Route path="/home" component={HomePage} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/platform-info" component={PlatformInfo} />
              <Route path="/profession-selection" component={ProfessionSelection} />
              <Route path="/tananyagok" component={TananyagokPage} />
              <Route path="/subjects" component={SubjectsPage} />
              <Route path="/subjects/:subjectId/modules" component={ModulesPage} />
              <Route path="/learning" component={Learning} />
              <Route path="/modules" component={ModulesPage} />
              <Route path="/module/:id" component={ModuleViewer} />
              <Route path="/modules/:id" component={ModuleViewer} />
              <Route path="/modules/:subjectId" component={ModulesPage} />
              <Route path="/tanulóim" component={TeacherDashboard} />
              <Route path="/teacher-dashboard" component={TeacherDashboard} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/community" component={CommunityLearning} />
              <Route path="/community-learning" component={CommunityLearning} />
              <Route path="/mermaid-test" component={MermaidTest} />
            </>
          )}

          {/* Admin routes */}
          {user?.role === 'admin' && (
            <>
              <Route path="/" component={AdminDashboard} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin-dashboard" component={AdminDashboard} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/mermaid-test" component={MermaidTest} />
              <Route path="/module/:id" component={ModuleViewer} />
              <Route path="/modules/:id" component={ModuleViewer} />
              <Route path="/tananyagok" component={TananyagokPage} />
              <Route path="/subjects" component={SubjectsPage} />
              <Route path="/subjects/:subjectId/modules" component={ModulesPage} />
              <Route path="/modules" component={ModulesPage} />
              <Route path="/modules/:subjectId" component={ModulesPage} />
            </>
          )}

          {/* School Admin routes */}
          {user?.role === 'school_admin' && (
            <>
              <Route path="/" component={SchoolAdminDashboard} />
              <Route path="/home" component={SchoolAdminDashboard} />
              <Route path="/school-admin-dashboard" component={SchoolAdminDashboard} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/chat" component={ChatPage} />
            </>
          )}
        </>
      )}

      {/* Fallback routes */}
      <Route path="/:rest*" component={NotFound} />
    </Switch>
  );
}

function AppWithVoiceNavigation() {
  const [location, navigate] = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <>
      <Router />
      <VoiceNavigation onNavigationCommand={handleNavigation} />
      <CookieBanner />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="global-learning-system-theme">
        <TooltipProvider>
          <Toaster />
          <AppWithVoiceNavigation />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
