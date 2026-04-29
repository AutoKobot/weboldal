import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BarChart3, 
  ClipboardList, 
  Printer, 
  Bell, 
  Wrench,
  BookOpen,
  Calendar,
  GraduationCap,
  ArrowLeft,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Sub-components
import { StudentListView } from "@/components/teacher-dashboard/StudentListView";
import { AttendanceView } from "@/components/teacher-dashboard/AttendanceView";
import { MonthlyAttendanceView } from "@/components/teacher-dashboard/MonthlyAttendanceView";
import { AnnouncementsView } from "@/components/teacher-dashboard/AnnouncementsView";
import { PracticalGradesView } from "@/components/practical-grades-view";
import { ClassStatsView } from "@/components/teacher-dashboard/ClassStatsView";
import { RosterView } from "@/components/teacher-dashboard/RosterView";

import { Student, Module, Subject, Profession, ClassData } from "@/components/teacher-dashboard/types";

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("students");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Shared state for filters and selections
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState("week");

  // Roster specific state
  const [rosterClassId, setRosterClassId] = useState<string>("all");
  const [rosterPeriod, setRosterPeriod] = useState<"week" | "month" | "4weeks" | "custom">("week");
  const [rosterCustomStart, setRosterCustomStart] = useState("");
  const [rosterCustomEnd, setRosterCustomEnd] = useState("");
  const [rosterExpandedStudents, setRosterExpandedStudents] = useState<Set<string>>(new Set());
  const [rosterPrintDetails, setRosterPrintDetails] = useState(false);

  // Attendance specific state
  const [attendanceClassId, setAttendanceClassId] = useState<string>("all");
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceViewMode, setAttendanceViewMode] = useState<"daily" | "monthly">("daily");
  const [attendanceMonth, setAttendanceMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  // Global Data Queries
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/teacher/students"],
    refetchInterval: 15000,
  });

  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ["/api/public/modules"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/public/subjects"],
  });

  const { data: professions = [] } = useQuery<Profession[]>({
    queryKey: ["/api/public/professions"],
  });

  const { data: teacherClasses = [], isLoading: classesLoading } = useQuery<ClassData[]>({
    queryKey: ["/api/teacher/classes"],
  });

  // Roster Query logic
  const rosterQueryKey = useMemo(() => {
    if (rosterClassId === 'all') return null;
    const params = new URLSearchParams();
    if (rosterPeriod === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0);
      params.set('startDate', d.toISOString());
    } else if (rosterPeriod === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1); d.setHours(0,0,0,0);
      params.set('startDate', d.toISOString());
    } else if (rosterPeriod === '4weeks') {
      const d = new Date(); d.setDate(d.getDate() - 28); d.setHours(0,0,0,0);
      params.set('startDate', d.toISOString());
    } else if (rosterPeriod === 'custom' && rosterCustomStart) {
      params.set('startDate', new Date(rosterCustomStart).toISOString());
      if (rosterCustomEnd) params.set('endDate', new Date(rosterCustomEnd + 'T23:59:59').toISOString());
    }
    return `/api/teacher/classes/${rosterClassId}/roster${params.toString() ? '?' + params.toString() : ''}`;
  }, [rosterClassId, rosterPeriod, rosterCustomStart, rosterCustomEnd]);

  const { data: rosterData } = useQuery<any>({
    queryKey: [rosterQueryKey],
    enabled: !!rosterQueryKey,
  });

  if (!user) return null;

  if (studentsLoading || classesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar user={user} />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        user={user}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b sticky top-0 z-40 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileNavOpen(true)}
                className="lg:hidden flex-shrink-0"
              >
                <Menu size={20} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Vissza
              </Button>
              <div className="bg-blue-600 p-2 rounded-lg hidden sm:block">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">Oktatói Portál</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.firstName || 'Szakmai'} {user?.lastName || 'Oktató'}</p>
                <p className="text-xs text-gray-500">Műhelyvezető</p>
              </div>
            </div>
          </div>
        </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border p-1 no-print overflow-x-auto flex-nowrap w-full justify-start md:justify-center">
            <TabsTrigger value="students" className="flex items-center gap-2 shrink-0">
              <Users className="h-4 w-4" /> Tanulók listája
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2 text-blue-700 bg-blue-50/50 shrink-0">
              <BookOpen className="h-4 w-4" /> Elméleti Statisztika
            </TabsTrigger>
            <TabsTrigger value="practical" className="flex items-center gap-2 text-orange-700 bg-orange-50/50 shrink-0">
              <Wrench className="h-4 w-4" /> Gyakorlati Értékelés
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2 shrink-0">
              <ClipboardList className="h-4 w-4" /> Jelenlét
            </TabsTrigger>
            <TabsTrigger value="roster" className="flex items-center gap-2 shrink-0">
              <Printer className="h-4 w-4" /> Névsor & Nyomtatás
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2 shrink-0">
              <Bell className="h-4 w-4" /> Üzenetek
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentListView 
              students={students} 
              teacherClasses={teacherClasses as any} 
              modules={modules} 
              professions={professions} 
              subjects={subjects}
            />
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Osztály kiválasztása</label>
                    <Select value={attendanceClassId} onValueChange={setAttendanceClassId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Válasszon osztályt..." /></SelectTrigger>
                      <SelectContent>
                        {teacherClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Nézet típusa</label>
                    <div className="flex p-1 bg-white border rounded-lg">
                      <button 
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${attendanceViewMode === 'daily' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setAttendanceViewMode('daily')}
                      >
                        <Calendar className="h-4 w-4" /> Napi
                      </button>
                      <button 
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${attendanceViewMode === 'monthly' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => setAttendanceViewMode('monthly')}
                      >
                        <BookOpen className="h-4 w-4" /> Havi
                      </button>
                    </div>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      {attendanceViewMode === 'daily' ? 'Dátum' : 'Hónap'}
                    </label>
                    <Input 
                      type={attendanceViewMode === 'daily' ? 'date' : 'month'} 
                      value={attendanceViewMode === 'daily' ? attendanceDate : attendanceMonth}
                      onChange={(e) => attendanceViewMode === 'daily' ? setAttendanceDate(e.target.value) : setAttendanceMonth(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>

                {attendanceClassId === "all" ? (
                  <div className="text-center py-20 bg-gray-50 border-2 border-dashed rounded-xl">
                    <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium text-lg">Kérjük, válasszon egy osztályt a jelenléti ív megtekintéséhez.</p>
                  </div>
                ) : attendanceViewMode === 'daily' ? (
                  <AttendanceView attendanceClassId={attendanceClassId} attendanceDate={attendanceDate} />
                ) : (
                  <MonthlyAttendanceView classId={attendanceClassId} month={attendanceMonth} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="mb-4">
              <Badge className="bg-blue-600 mb-2">ELMÉLETI NÉZET</Badge>
              <h3 className="text-lg font-semibold">Tesztek és Elméleti Haladás</h3>
            </div>
            <ClassStatsView 
              teacherClasses={teacherClasses as any} 
              students={students as any} 
              selectedClassId={selectedClassId} 
              setSelectedClassId={setSelectedClassId} 
              selectedStudentId={selectedStudentId} 
              setSelectedStudentId={setSelectedStudentId} 
              timeFilter={timeFilter} 
              setTimeFilter={setTimeFilter} 
            />
          </TabsContent>

          <TabsContent value="practical">
            <div className="mb-4">
              <Badge className="bg-orange-600 mb-2">GYAKORLATI NÉZET</Badge>
              <h3 className="text-lg font-semibold">Gyakorlati Értékelés és Jegyek</h3>
            </div>
            <PracticalGradesView 
              teacherClasses={teacherClasses as any} 
              students={students as any} 
              subjects={subjects as any} 
              modules={modules as any} 
            />
          </TabsContent>

          <TabsContent value="roster">
            <RosterView 
              teacherClasses={teacherClasses as any}
              rosterClassId={rosterClassId}
              setRosterClassId={setRosterClassId}
              rosterPeriod={rosterPeriod}
              setRosterPeriod={setRosterPeriod}
              rosterPrintDetails={rosterPrintDetails}
              setRosterPrintDetails={setRosterPrintDetails}
              rosterCustomStart={rosterCustomStart}
              setRosterCustomStart={setRosterCustomStart}
              rosterCustomEnd={rosterCustomEnd}
              setRosterCustomEnd={setRosterCustomEnd}
              rosterData={rosterData}
              rosterExpandedStudents={rosterExpandedStudents}
              setRosterExpandedStudents={setRosterExpandedStudents}
            />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementsView 
              teacherClasses={teacherClasses as any} 
              students={students as any} 
            />
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </div>
  );
}
