import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import CookieBanner from "@/components/cookie-banner";

// Lazy-loaded pages – minden oldal külön chunk lesz a bundle-ban
const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing-futuristic-fixed"));
const StudentDashboard = lazy(() => import("@/pages/student-dashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin-dashboard"));
const ModuleViewer = lazy(() => import("@/pages/module-viewer"));
const ProfessionSelection = lazy(() => import("@/pages/profession-selection"));
const PlatformInfo = lazy(() => import("@/pages/platform-info"));
const Learning = lazy(() => import("@/pages/learning"));
const ProgressPage = lazy(() => import("@/pages/progress"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const StudentAuth = lazy(() => import("@/pages/student-auth"));
const TeacherAuth = lazy(() => import("@/pages/teacher-auth"));
const TeacherDashboard = lazy(() => import("@/pages/teacher-dashboard"));
const SchoolAdminAuth = lazy(() => import("@/pages/school-admin-auth"));
const SchoolAdminDashboard = lazy(() => import("@/pages/school-admin-dashboard"));
const ModulesPage = lazy(() => import("@/pages/modules"));
const SubjectsPage = lazy(() => import("@/pages/subjects"));
const HomePage = lazy(() => import("@/pages/home"));
const TananyagokPage = lazy(() => import("@/pages/tananyagok"));
const CommunityLearning = lazy(() => import("@/pages/community-learning"));
const MermaidTest = lazy(() => import("@/pages/mermaid-test"));
const ChatPage = lazy(() => import("@/pages/chat"));
const PrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const PrivacyRequests = lazy(() => import("@/pages/privacy-requests"));

// Betöltési fallback – azonos stílusú spinner
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-neutral-600">Betöltés...</p>
      </div>
    </div>
  );
}

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
              <Route path="/teacher/content" component={AdminDashboard} />
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="global-learning-system-theme">
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<PageLoader />}>
            <Router />
          </Suspense>
          <CookieBanner />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
