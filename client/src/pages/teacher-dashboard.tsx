import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  BookOpen,
  TrendingUp,
  Award,
  Search,
  GraduationCap,
  Clock,
  CheckCircle,
  ArrowLeft,
  XCircle,
  FileText,
  Calendar,
  BarChart3,
  Printer,
  ChevronDown,
  ChevronUp,
  Download,
  ClipboardList,
  Pencil,
  Save,
  X as XIcon,
  Bell,
  Plus,
  Trash2,
  Eye,
  Info,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";


interface TestResult {
  id: number;
  moduleId: number;
  score: number;
  maxScore: number;
  passed: boolean;
  createdAt: string;
  grade?: number;
}

interface Student {
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

interface Module {
  id: number;
  title: string;
  subjectId: number;
  subjectName?: string;
  moduleNumber: number;
}

interface Profession {
  id: number;
  name: string;
  description: string;
}

interface ClassData {
  id: number;
  name: string;
  description: string;
}

interface GradeResult extends TestResult {
  studentName: string;
  moduleTitle: string;
  grade: number;
}

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("students");

  // Class Stats State
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState("week"); // week, month, all

  // Roster state
  const [rosterClassId, setRosterClassId] = useState<string>("all");
  const [rosterPeriod, setRosterPeriod] = useState<"week" | "month" | "4weeks" | "custom">("week");
  const [rosterCustomStart, setRosterCustomStart] = useState("");
  const [rosterCustomEnd, setRosterCustomEnd] = useState("");
  const [rosterExpandedStudents, setRosterExpandedStudents] = useState<Set<string>>(new Set());
  const [rosterPrintDetails, setRosterPrintDetails] = useState(false);

  // Attendance state
  const [attendanceClassId, setAttendanceClassId] = useState<string>("all");
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingNote, setEditingNote] = useState<string | null>(null); // studentId being edited
  const [noteText, setNoteText] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [attendanceViewMode, setAttendanceViewMode] = useState<"daily" | "monthly">("daily");
  const [attendanceMonth, setAttendanceMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM

  // Collapsible class groups in student list
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set());
  const toggleClassCollapse = (classId: string) => {
    setCollapsedClasses(prev => {
      const next = new Set(prev);
      next.has(classId) ? next.delete(classId) : next.add(classId);
      return next;
    });
  };

  // Fetch students with auto-refresh to see online status live
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/teacher/students"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Fetch modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ["/api/public/modules"],
  });

  // Fetch professions
  const { data: professions = [], isLoading: professionsLoading } = useQuery<Profession[]>({
    queryKey: ["/api/public/professions"],
  });

  // Fetch teacher classes
  const { data: teacherClasses = [], isLoading: classesLoading } = useQuery<ClassData[]>({
    queryKey: ["/api/teacher/classes"],
  });


  // Fetch class grades for statistics
  let startDateStr = "";
  if (timeFilter === "week") {
    const d = new Date();
    d.setHours(0, 0, 0, 0); // Biztosítja, hogy nem változik a string milliszekundumonként (végtelen ciklus megállítása)
    d.setDate(d.getDate() - 7);
    startDateStr = d.toISOString();
  } else if (timeFilter === "month") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - 1);
    startDateStr = d.toISOString();
  }

  // Roster query
  const rosterQueryKey = useMemo(() => {
    if (rosterClassId === 'all') return null;
    const params = new URLSearchParams();
    if (rosterPeriod === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0);
      params.set('startDate', d.toISOString());
    } else if (rosterPeriod === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1); d.setHours(0, 0, 0, 0);
      params.set('startDate', d.toISOString());
    } else if (rosterPeriod === '4weeks') {
      const d = new Date(); d.setDate(d.getDate() - 28); d.setHours(0, 0, 0, 0);
      params.set('startDate', d.toISOString());
    } else if (rosterPeriod === 'custom' && rosterCustomStart) {
      params.set('startDate', new Date(rosterCustomStart).toISOString());
      if (rosterCustomEnd) params.set('endDate', new Date(rosterCustomEnd + 'T23:59:59').toISOString());
    }
    const qs = params.toString();
    return `/api/teacher/classes/${rosterClassId}/roster${qs ? '?' + qs : ''}`;
  }, [rosterClassId, rosterPeriod, rosterCustomStart, rosterCustomEnd]);

  const { data: rosterData, isLoading: rosterLoading, refetch: rosterRefetch } = useQuery<any>({
    queryKey: [rosterQueryKey],
    enabled: !!rosterQueryKey,
    staleTime: 60_000,
  });


  let gradesQueryKey: string | null = null;
  if (selectedClassId && selectedClassId !== "all") {
    const params = new URLSearchParams();
    if (startDateStr) params.append('startDate', startDateStr);
    if (selectedStudentId !== "all") params.append('studentId', selectedStudentId);
    const queryString = params.toString();
    gradesQueryKey = `/api/teacher/classes/${selectedClassId}/grades${queryString ? `?${queryString}` : ''}`;
  }

  const { data: classGrades = [], isLoading: gradesLoading } = useQuery<GradeResult[]>({
    queryKey: [gradesQueryKey],
    enabled: !!gradesQueryKey
  });


  const filteredStudents = students.filter((student: Student) => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    const username = student.username?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || username.includes(search);
  }).sort((a: Student, b: Student) => {
    const nameA = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase().trim() || a.username?.toLowerCase() || '';
    const nameB = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase().trim() || b.username?.toLowerCase() || '';
    return nameA.localeCompare(nameB, 'hu');
  });

  const getStudentProgress = (student: Student) => {
    const totalModules = modules.length;
    const completedCount = student.completedModules?.length || 0;
    return totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
  };

  const getProfessionName = (professionId?: number) => {
    if (!professionId) return "Nincs kiválasztva";
    const profession = professions.find((p: Profession) => p.id === professionId);
    return profession?.name || "Ismeretlen";
  };

  const getModuleName = (moduleId: number) => {
    const module = modules.find((m: Module) => m.id === moduleId);
    return module?.title || `Modul ${moduleId}`;
  };

  const getGrade = (score: number) => {
    if (score >= 95) return 5;
    if (score >= 80) return 4;
    if (score >= 70) return 3;
    if (score >= 60) return 2;
    return 1;
  };

  const getGradeColor = (grade: number) => {
    if (grade === 5) return "text-green-700 font-bold";
    if (grade === 4) return "text-green-600 font-bold";
    if (grade === 3) return "text-yellow-600 font-bold";
    if (grade === 2) return "text-orange-500 font-bold";
    return "text-red-600 font-bold";
  };

  const totalStudents = students.length;
  const activeStudents = students.filter((s: Student) => s.completedModules?.length > 0).length;
  const onlineStudentsCount = students.filter((s: Student) => s.isOnline).length;
  const averageProgress = students.length > 0
    ? Math.round(students.reduce((sum: number, s: Student) => sum + getStudentProgress(s), 0) / students.length)
    : 0;

  // Calculate Average Grade from fetched stats
  const averageClassGrade = classGrades.length > 0
    ? (classGrades.reduce((sum, g) => sum + g.grade, 0) / classGrades.length).toFixed(2)
    : "N/A";



  if (studentsLoading || modulesLoading || professionsLoading || classesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Adatok betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Vissza
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <GraduationCap className="h-8 w-8 text-blue-600 mr-3" />
                  Tanulóim
                </h1>
                <p className="text-gray-600 mt-2">
                  Tanulók haladásának és eredményeinek követése
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-sm border-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Összes tanuló</p>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                    {onlineStudentsCount > 0 && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse"></span>
                        {onlineStudentsCount} online
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Aktív tanulók</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{activeStudents}</p>
                </div>
                <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Átlagos haladás</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{averageProgress}%</p>
                </div>
                <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Award className="h-5 w-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tanulók listája
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Osztály Statisztika
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Jelenlét
            </TabsTrigger>
            <TabsTrigger value="roster" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Névsor &amp; Nyomtatás
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Üzenetek
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Keresés név vagy felhasználónév alapján..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Students List */}
            <div className="grid gap-6">
              {filteredStudents.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? "Nincs találat" : "Nincsenek tanulók"}
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm
                        ? "Próbáljon meg más keresési feltételekkel."
                        : "Még nincsenek regisztrált tanulók a rendszerben."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-8">
                  {(() => {
                    const studentsByClass = filteredStudents.reduce((acc: Record<string, Student[]>, student) => {
                      const classId = student.classId ? student.classId.toString() : 'unassigned';
                      if (!acc[classId]) acc[classId] = [];
                      acc[classId].push(student);
                      return acc;
                    }, {});

                    const sortedClassIds = Object.keys(studentsByClass).sort((a, b) => {
                      if (a === 'unassigned') return 1;
                      if (b === 'unassigned') return -1;
                      const classA = teacherClasses.find(c => c.id.toString() === a);
                      const classB = teacherClasses.find(c => c.id.toString() === b);
                      const nameA = classA?.name || '';
                      const nameB = classB?.name || '';
                      return nameA.localeCompare(nameB, 'hu');
                    });

                    return sortedClassIds.map(classId => {
                      const classInfo = classId === 'unassigned'
                        ? { name: 'Osztály nélküliek' }
                        : teacherClasses.find(c => c.id.toString() === classId) || { name: `Osztály #${classId}` };

                      const classStudents = studentsByClass[classId].sort((a: Student, b: Student) => {
                        const nameA = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase().trim() || a.username?.toLowerCase() || '';
                        const nameB = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase().trim() || b.username?.toLowerCase() || '';
                        return nameA.localeCompare(nameB, 'hu');
                      });

                      return (
                        <div key={classId} className="space-y-4">
                          {/* Clickable class header – toggles collapse */}
                          <button
                            onClick={() => toggleClassCollapse(classId)}
                            className="w-full flex items-center justify-between text-left group border-b pb-2 hover:border-blue-400 transition-colors"
                          >
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                              <Users className="h-5 w-5 mr-2 text-blue-600" />
                              {classInfo.name}
                              <Badge variant="secondary" className="ml-3">{classStudents.length} tanuló</Badge>
                            </h3>
                            <span className="text-gray-400 group-hover:text-blue-500 transition-colors">
                              {collapsedClasses.has(classId)
                                ? <ChevronDown className="h-5 w-5" />
                                : <ChevronUp className="h-5 w-5" />
                              }
                            </span>
                          </button>

                          {/* Student cards – hidden when collapsed */}
                          {!collapsedClasses.has(classId) && (
                            <div className="grid gap-4">
                              {classStudents.map((student: Student) => {
                                const progress = getStudentProgress(student);
                                const completedCount = student.completedModules?.length || 0;
                                return (
                                  <Card key={student.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                      <div className="flex items-start gap-4">
                                        <Avatar className="h-10 w-10 shrink-0">
                                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.firstName} ${student.lastName}`} />
                                          <AvatarFallback>
                                            {(student.firstName?.[0] || '') + (student.lastName?.[0] || student.username?.[0] || 'T')}
                                          </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="min-w-0">
                                              <h3 className="text-base font-semibold text-gray-900 flex items-center truncate">
                                                {student.lastName && student.firstName
                                                  ? `${student.lastName} ${student.firstName}`
                                                  : student.username
                                                }
                                                {student.isOnline && (
                                                  <span title="Jelenleg bejelentkezve" className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></span>
                                                )}
                                              </h3>
                                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span>@{student.username}</span>
                                                {student.lastActiveDate && (
                                                  <>
                                                    <span>•</span>
                                                    <span>Aktivitás: {new Date(student.lastActiveDate).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <Badge variant={progress > 50 ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                                                {progress}% kész
                                              </Badge>
                                              
                                              <Dialog>
                                                <DialogTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600">
                                                    <FileText className="h-4 w-4" />
                                                  </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                                  <DialogHeader>
                                                    <DialogTitle>
                                                      {student.lastName && student.firstName
                                                        ? `${student.lastName} ${student.firstName}`
                                                        : student.username
                                                      } - Részletes adatok
                                                    </DialogTitle>
                                                  </DialogHeader>
                                                  <StudentDetailView student={student} />
                                                </DialogContent>
                                              </Dialog>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                            <div>
                                              <p className="text-[10px] font-medium text-gray-400 uppercase">Szakma</p>
                                              <p className="text-xs text-gray-700 truncate">
                                                {getProfessionName(student.selectedProfessionId)}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-medium text-gray-400 uppercase">Modulok</p>
                                              <p className="text-xs text-gray-700">
                                                {completedCount} / {modules.length}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-[10px] font-medium text-gray-400 uppercase">Tanulási idő</p>
                                              <p className="text-xs text-gray-700">
                                                ~{Math.floor(completedCount * 2.5)} óra
                                              </p>
                                            </div>
                                            {(student.currentStreak ?? 0) > 0 && (
                                              <div>
                                                <p className="text-[10px] font-medium text-gray-400 uppercase">Sorozat</p>
                                                <p className="text-xs text-orange-600 font-bold">
                                                  🔥 {student.currentStreak} nap
                                                </p>
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-3">
                                            <Progress value={progress} className="h-1.5 flex-1" />
                                            <span className="text-[10px] font-bold text-gray-400 min-w-[25px]">{progress}%</span>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementsView teacherClasses={teacherClasses} students={students} />
          </TabsContent>

          <TabsContent value="stats">
            <Card>
              <CardHeader>
                <CardTitle>Osztály Statisztikák</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Válasszon osztályt</label>
                    <Select value={selectedClassId} onValueChange={(val) => {
                      setSelectedClassId(val);
                      setSelectedStudentId("all"); // Reset student selection when changing class
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon osztályt..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherClasses.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedClassId !== "all" && (
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Tanuló szűrése</label>
                      <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Minden tanuló" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Minden tanuló</SelectItem>
                          {students
                            .filter(s => s.classId === parseInt(selectedClassId))
                            .map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.lastName && student.firstName
                                  ? `${student.lastName} ${student.firstName}`
                                  : student.username
                                }
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Időszak</label>
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon időszakot..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Elmúlt 7 nap (Heti)</SelectItem>
                        <SelectItem value="month">Elmúlt 30 nap (Havi)</SelectItem>
                        <SelectItem value="all">Mindenkori</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedClassId && selectedClassId !== "all" ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Átlagos Osztályzat</p>
                          <p className="text-2xl font-bold text-blue-700">{averageClassGrade}</p>
                        </div>
                        <Award className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Kitöltött tesztek száma</p>
                          <p className="text-2xl font-bold text-green-700">{classGrades.length}</p>
                        </div>
                        <FileText className="h-8 w-8 text-green-500" />
                      </div>
                    </div>

                    <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Részletes Eredmények
                    </h4>

                    {classGrades.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tanuló</TableHead>
                            <TableHead>Modul</TableHead>
                            <TableHead>Dátum</TableHead>
                            <TableHead>Pontszám</TableHead>
                            <TableHead>Jegy</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {classGrades.map((grade) => (
                            <TableRow key={grade.id}>
                              <TableCell className="font-medium">{grade.studentName}</TableCell>
                              <TableCell>{grade.moduleTitle}</TableCell>
                              <TableCell>{new Date(grade.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell>{grade.score}%</TableCell>
                              <TableCell>
                                <Badge variant={grade.grade >= 2 ? "default" : "destructive"} className={grade.grade >= 4 ? "bg-green-600" : ""}>
                                  {grade.grade}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        Ebben az időszakban nem születtek eredmények.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Kérem válasszon osztályt a statisztikák megtekintéséhez.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Roster & Print Tab ───────────────────────────────────────── */}
          <TabsContent value="roster" className="space-y-6">
            <style>{`@media print{.no-print{display:none!important}.print-only{display:block!important}body{background:white}}`}</style>

            <Card className="no-print">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-blue-600" />
                  Osztálynévsor – Nyomtatható nézet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  {/* Class selector */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Osztály</label>
                    <Select value={rosterClassId} onValueChange={setRosterClassId}>
                      <SelectTrigger><SelectValue placeholder="Válasszon osztályt..." /></SelectTrigger>
                      <SelectContent>
                        {teacherClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Period selector */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Időszak</label>
                    <Select value={rosterPeriod} onValueChange={(v: any) => setRosterPeriod(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Elmúlt 7 nap (heti)</SelectItem>
                        <SelectItem value="4weeks">Elmúlt 4 hét</SelectItem>
                        <SelectItem value="month">Elmúlt hónap</SelectItem>
                        <SelectItem value="custom">Egyéni dátumtartomány</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Detailed toggle */}
                  <div className="flex items-center space-x-2 h-10 pb-2">
                    <Checkbox 
                      id="print-details" 
                      checked={rosterPrintDetails} 
                      onCheckedChange={(checked) => setRosterPrintDetails(!!checked)}
                    />
                    <Label htmlFor="print-details" className="text-sm font-medium cursor-pointer">
                      Részletes eredmények a nyomtatásban
                    </Label>
                  </div>

                  {/* Print button */}
                  <div className="flex items-end">
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.print()}
                      disabled={!rosterData}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Nyomtatás / PDF mentés
                    </Button>
                  </div>
                </div>

                {/* Custom date range */}
                {rosterPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Kezdő dátum</label>
                      <Input type="date" value={rosterCustomStart} onChange={e => setRosterCustomStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Záró dátum</label>
                      <Input type="date" value={rosterCustomEnd} onChange={e => setRosterCustomEnd(e.target.value)} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Printable Roster ─────────────────────────────────────── */}
            {rosterLoading ? (
              <Card className="p-10 text-center no-print">
                <GraduationCap className="h-10 w-10 mx-auto text-blue-400 animate-spin mb-3" />
                <p className="text-gray-500">Adatok betöltése...</p>
              </Card>
            ) : rosterData ? (
              <div id="printable-roster">
                {/* Print header */}
                <div className="mb-6 border-b pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{rosterData.className} – Osztálynévsor</h2>
                      <p className="text-gray-500 mt-1">Időszak: <strong>{rosterData.period}</strong></p>
                      <p className="text-gray-400 text-sm">
                        Generálva: {new Date(rosterData.generatedAt).toLocaleString('hu-HU')}
                      </p>
                    </div>
                    <div className="no-print">
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {rosterData.students?.length ?? 0} tanuló
                      </Badge>
                    </div>
                  </div>
                </div>

                {rosterData.students?.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 border-dashed border-2 rounded-lg">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Ebben az időszakban nem volt rögzített eredmény.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-8 font-bold text-gray-700">#</TableHead>
                          <TableHead className="font-bold text-gray-700">Tanuló neve</TableHead>
                          <TableHead className="font-bold text-gray-700">Felhasználónév</TableHead>
                          <TableHead className="text-center font-bold text-gray-700">Tesztek száma</TableHead>
                          <TableHead className="text-center font-bold text-gray-700">Átlagjegy</TableHead>
                          <TableHead className="text-center font-bold text-gray-700 no-print">Részletek</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rosterData.students.map((student: any, idx: number) => {
                          const isExpanded = rosterExpandedStudents.has(student.username);
                          const gradeColor = (g: number) => {
                            if (g >= 4.5) return 'bg-green-100 text-green-800';
                            if (g >= 3.5) return 'bg-blue-100 text-blue-800';
                            if (g >= 2.5) return 'bg-yellow-100 text-yellow-800';
                            if (g >= 1.5) return 'bg-orange-100 text-orange-800';
                            return 'bg-red-100 text-red-800';
                          };
                          return (
                            <>
                              <TableRow key={student.username} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                <TableCell className="text-gray-400 font-mono text-sm">{idx + 1}</TableCell>
                                <TableCell className="font-semibold">{student.studentName}</TableCell>
                                <TableCell className="text-gray-500">@{student.username}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline">{student.testCount} db</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {student.avgGrade !== null ? (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${gradeColor(student.avgGrade)}`}>
                                      {student.avgGrade.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">–</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center no-print">
                                  <button
                                    onClick={() => setRosterExpandedStudents(prev => {
                                      const next = new Set(prev);
                                      next.has(student.username) ? next.delete(student.username) : next.add(student.username);
                                      return next;
                                    })}
                                    className="text-blue-500 hover:text-blue-700 transition-colors"
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                </TableCell>
                              </TableRow>

                              {/* Expanded detail rows */}
                              {(isExpanded || rosterPrintDetails) && student.grades?.map((g: any, gi: number) => (
                                <TableRow 
                                  key={`${student.username}-${gi}`} 
                                  className={`bg-blue-50/40 text-sm ${!isExpanded ? 'hidden print:table-row' : ''} ${rosterPrintDetails ? '' : 'no-print'}`}
                                >
                                  <TableCell></TableCell>
                                  <TableCell colSpan={2} className="text-gray-600 pl-8">
                                    ↳ {g.moduleTitle}
                                  </TableCell>
                                  <TableCell className="text-center text-gray-500">
                                    {new Date(g.createdAt).toLocaleDateString('hu-HU')}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="text-gray-600">{g.score}%</span>
                                    <span className={`ml-2 font-bold ${g.grade >= 4 ? 'text-green-600' : g.grade >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
                                      ({g.grade})
                                    </span>
                                  </TableCell>
                                  <TableCell className="no-print"></TableCell>
                                </TableRow>
                              ))}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Class average summary */}
                    {(() => {
                      const withGrades = rosterData.students.filter((s: any) => s.avgGrade !== null);
                      const classAvg = withGrades.length > 0
                        ? (withGrades.reduce((sum: number, s: any) => sum + s.avgGrade, 0) / withGrades.length).toFixed(2)
                        : null;
                      return classAvg ? (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                          <span className="font-semibold text-gray-700">Osztály átlagjegy ({rosterData.period}):</span>
                          <span className="text-2xl font-bold text-blue-700">{classAvg}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            ) : rosterClassId !== 'all' ? (
              <Card className="p-10 text-center no-print">
                <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400">Válasszon osztályt és időszakot a névsor betöltéséhez.</p>
              </Card>
            ) : (
              <Card className="p-10 text-center border-dashed no-print">
                <Users className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400">Válasszon osztályt a névsor megtekintéséhez.</p>
              </Card>
            )}
          </TabsContent>

          {/* ── Jelenlét Tab ─────────────────────────────────────────── */}
          <TabsContent value="attendance" className="space-y-4">
            {/* Controls */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Osztály</label>
                    <Select value={attendanceClassId} onValueChange={setAttendanceClassId}>
                      <SelectTrigger id="attendance-class-select">
                        <SelectValue placeholder="Válasszon osztályt..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Nézet</label>
                    <div className="flex bg-gray-100 p-1 rounded-md h-10">
                      <button 
                        onClick={() => setAttendanceViewMode("daily")}
                        className={`flex-1 text-xs font-medium rounded transition-colors ${attendanceViewMode === "daily" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Napi
                      </button>
                      <button 
                        onClick={() => setAttendanceViewMode("monthly")}
                        className={`flex-1 text-xs font-medium rounded transition-colors ${attendanceViewMode === "monthly" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Havi
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">
                      {attendanceViewMode === "daily" ? "Dátum" : "Hónap"}
                    </label>
                    {attendanceViewMode === "daily" ? (
                      <Input
                        id="attendance-date-picker"
                        type="date"
                        value={attendanceDate}
                        onChange={e => setAttendanceDate(e.target.value)}
                      />
                    ) : (
                      <Input
                        id="attendance-month-picker"
                        type="month"
                        value={attendanceMonth}
                        onChange={e => setAttendanceMonth(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    {attendanceViewMode === "daily" && (
                      <Button
                        variant="outline"
                        id="attendance-today-btn"
                        onClick={() => setAttendanceDate(new Date().toISOString().split('T')[0])}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Ma
                      </Button>
                    )}
                    {attendanceClassId !== 'all' && (
                      <Button
                        id="attendance-csv-export-btn"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        onClick={() => {
                          // CSV export: last 30 days by default
                          const sd = new Date();
                          sd.setDate(sd.getDate() - 30);
                          const sdStr = sd.toISOString().split('T')[0];
                          const edStr = new Date().toISOString().split('T')[0];
                          window.open(
                            `/api/teacher/classes/${attendanceClassId}/attendance/export?format=csv&startDate=${sdStr}&endDate=${edStr}`,
                            '_blank'
                          );
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV export
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance grid */}
            {attendanceClassId === 'all' ? (
              <Card className="p-10 text-center border-dashed">
                <ClipboardList className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400">Válasszon osztályt a jelenléti ív megtekintéséhez.</p>
              </Card>
            ) : attendanceViewMode === "daily" ? (
              <AttendanceView 
                attendanceClassId={attendanceClassId} 
                attendanceDate={attendanceDate}
              />
            ) : (
              <MonthlyAttendanceView 
                classId={attendanceClassId} 
                month={attendanceMonth}
              />
            )}
          </TabsContent>

</Tabs>
      </div>
    </div>
  );
}

const AcknowledgementStats = ({ announcementId }: { announcementId: number }) => {
  const { data: stats = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/announcements/${announcementId}/stats`],
  });

  if (isLoading) return <div className="text-center p-4">Betöltés...</div>;

  const acknowledgedCount = stats.filter(s => s.acknowledgedAt).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium">Összes visszaigazolás:</span>
        <span className="font-bold text-blue-600">{acknowledgedCount} / {stats.length}</span>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Tanuló</TableHead>
              <TableHead>Állapot / Válasz</TableHead>
              <TableHead>Időpont</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((row) => (
              <TableRow key={row.studentId}>
                <TableCell className="font-medium">
                  {row.lastName} {row.firstName}
                  <div className="text-[10px] text-gray-400">@{row.username}</div>
                </TableCell>
                <TableCell>
                  {row.acknowledgedAt ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                      {row.response || "Visszaigazolva"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400">
                      Nem olvasta
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-gray-400">
                  {row.acknowledgedAt ? new Date(row.acknowledgedAt).toLocaleString() : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

interface AnnouncementsViewProps {
  teacherClasses: ClassData[];
  students: Student[];
}

const AnnouncementsView = ({ teacherClasses, students }: AnnouncementsViewProps) => {
  const [, setLocation] = useLocation();
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState<"info" | "action_required" | "event">("info");
  const [annClassId, setAnnClassId] = useState<string>("all");
  const [isCreatingAnn, setIsCreatingAnn] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading: annLoading } = useQuery<any[]>({
    queryKey: [`/api/classes/${annClassId}/announcements`],
    enabled: annClassId !== "all",
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create announcement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${annClassId}/announcements`] });
      setIsCreatingAnn(false);
      setAnnTitle("");
      setAnnContent("");
      toast({ 
        title: "Sikeresen küldve", 
        description: "Az üzenetet elküldtük az osztálynak." 
      });
    },
    onError: (error) => {
      console.error("Announcement error:", error);
      toast({ 
        variant: "destructive",
        title: "Hiba történt", 
        description: "Nem sikerült az üzenet küldése." 
      });
    }
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete announcement");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${annClassId}/announcements`] });
      toast({ 
        title: "Törölve", 
        description: "Az üzenetet sikeresen töröltük." 
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Hiba",
        description: "Nem sikerült törölni az üzenetet."
      });
    }
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Osztályüzenetek
          </TabsTrigger>
          <TabsTrigger value="private" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Privát üzenetek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Osztály Üzenetek</CardTitle>
            <CardDescription>Küldjön üzenetet az egész osztálynak és kövesse nyomon a visszaigazolásokat.</CardDescription>
          </div>
          <Button
            id="new-announcement-btn"
            onClick={() => setIsCreatingAnn(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Új üzenet
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label className="text-sm font-medium mb-1 block">Osztály kiválasztása</label>
            <Select value={annClassId} onValueChange={setAnnClassId}>
              <SelectTrigger id="ann-class-select" className="w-full sm:w-[300px]">
                <SelectValue placeholder="Válasszon osztályt..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Válasszon osztályt...</SelectItem>
                {teacherClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {annClassId === "all" ? (
            <div className="py-20 text-center border-dashed border-2 rounded-xl border-gray-100">
              <Bell className="h-12 w-12 mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400">Válasszon egy osztályt az üzenetek megtekintéséhez.</p>
            </div>
          ) : annLoading ? (
            <div className="py-20 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-20 text-center border-dashed border-2 rounded-xl border-gray-100">
              <Bell className="h-12 w-12 mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400">Ehhez az osztályhoz még nem küldött üzenetet.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {announcements.map((ann) => (
                <Card key={ann.id} className="overflow-hidden border-gray-100">
                  <div className="flex flex-col sm:flex-row">
                    <div className={`w-2 ${ann.type === 'event' ? 'bg-blue-500' : ann.type === 'action_required' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg text-gray-800">{ann.title}</h4>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {ann.type === 'event' ? 'Esemény' : ann.type === 'action_required' ? 'Művelet szükséges' : 'Információ'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAnnouncementMutation.mutate(ann.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{ann.content}</p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                        <span className="text-xs text-gray-400 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(ann.createdAt).toLocaleDateString()} {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Statisztika
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Visszaigazolások: {ann.title}</DialogTitle>
                              <DialogDescription>Lássa, ki olvasta el az üzenetet és mi volt a válaszuk.</DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 max-h-[400px] overflow-auto">
                              <AcknowledgementStats announcementId={ann.id} />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="private">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Privát Üzenetek</CardTitle>
            <CardDescription>Kezdeményezzen közvetlen beszélgetést bármelyik tanulójával.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                {teacherClasses.map(cls => (
                  <div key={cls.id} className="space-y-2">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      {cls.name}
                    </h4>
                    <div className="grid gap-2">
                      {students.filter(s => s.classId === cls.id).map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {student.firstName?.[0]}{student.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {student.lastName} {student.firstName}
                              </p>
                              <p className="text-xs text-gray-400">@{student.username}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setLocation(`/messages?partnerId=${student.id}`)}
                            className="h-8"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />
                            Üzenet küldése
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {students.filter(s => !s.classId).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-700">Besorolatlan tanulók</h4>
                    <div className="grid gap-2">
                      {students.filter(s => !s.classId).map(student => (
                        <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                                {student.firstName?.[0]}{student.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {student.lastName} {student.firstName}
                              </p>
                              <p className="text-xs text-gray-400">@{student.username}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setLocation(`/messages?partnerId=${student.id}`)}
                            className="h-8"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />
                            Üzenet küldése
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      {/* Create Announcement Dialog */}
      <Dialog open={isCreatingAnn} onOpenChange={setIsCreatingAnn}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Új osztályüzenet küldése</DialogTitle>
            <DialogDescription>
              Az üzenet meg fog jelenni az összes diáknál az osztályban.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Törzs</label>
              <Input
                placeholder="Üzenet címe (pl. Következő óra időpontja)"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Típus</label>
              <Select value={annType} onValueChange={(v: any) => setAnnType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Információ ℹ️</SelectItem>
                  <SelectItem value="event">Esemény 📅</SelectItem>
                  <SelectItem value="action_required">Művelet szükséges ⚠️</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Üzenet tartalma</label>
              <Textarea
                placeholder="Írja meg az üzenetet részletesen..."
                rows={4}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Válaszlehetőségek (JSON tömb, opcionális)</label>
              <Input
                placeholder='["Értettem", "Ott leszek", "Nem tudok jönni"]'
                defaultValue='["Értettem"]'
                id="ann-options"
              />
              <p className="text-[10px] text-gray-400">Hagyja üresen az alapértelmezett "Értettem" gombhoz.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreatingAnn(false)}>Mégse</Button>
            <Button
              disabled={!annTitle || !annContent || createAnnouncementMutation.isPending}
              onClick={() => {
                if (annClassId === "all") {
                  toast({
                    variant: "destructive",
                    title: "Hiba",
                    description: "Kérjük, válasszon osztályt az üzenet küldése előtt!"
                  });
                  return;
                }

                let options = ["Értettem"];
                try {
                  const optInput = document.getElementById("ann-options") as HTMLInputElement;
                  if (optInput && optInput.value) {
                    options = JSON.parse(optInput.value);
                  }
                } catch (e) {}
                
                createAnnouncementMutation.mutate({
                  classId: parseInt(annClassId),
                  title: annTitle,
                  content: annContent,
                  type: annType,
                  options,
                  isActive: true
                });
              }}
            >
              {createAnnouncementMutation.isPending ? "Küldés..." : "Üzenet küldése"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface AttendanceViewProps {
  attendanceClassId: string;
  attendanceDate: string;
}

const AttendanceView = ({ attendanceClassId, attendanceDate }: AttendanceViewProps) => {
  const queryClient = useQueryClient();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const { toast } = useToast();

  const { data: attData = [], isLoading: attLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${attendanceClassId}/attendance?date=${attendanceDate}`],
    enabled: attendanceClassId !== 'all',
    refetchInterval: 30_000,
  });

  const { data: notesData = [] } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${attendanceClassId}/notes?date=${attendanceDate}`],
    enabled: attendanceClassId !== 'all',
  });

  const notesByStudent = useMemo(() => {
    const map: Record<string, string> = {};
    notesData.forEach((n: any) => { map[n.student_id] = n.note; });
    return map;
  }, [notesData]);

  const byPeriod = useMemo(() => {
    const map: Record<number, any[]> = {};
    attData.forEach((row: any) => {
      if (!map[row.period_number]) map[row.period_number] = [];
      map[row.period_number].push(row);
    });
    return map;
  }, [attData]);

  const periods = Object.keys(byPeriod).map(Number).sort((a, b) => a - b);

  const statusColor = (s: string) => {
    if (s === 'present') return 'bg-green-100 text-green-800 border-green-300';
    if (s === 'late') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (s === 'excused') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const statusLabel = (s: string) => {
    if (s === 'present') return 'Jelen';
    if (s === 'late') return 'Késő';
    if (s === 'excused') return 'Igazolt';
    return 'Hiányzik';
  };
  const handleStatusChange = async (attendanceId: number, newStatus: string, studentData?: any) => {
    try {
      if (attendanceId === -1 && studentData) {
        await fetch(`/api/teacher/classes/${attendanceClassId}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            studentId: studentData.student_id,
            date: attendanceDate,
            periodNumber: studentData.period_number,
            status: newStatus,
          }),
        });
      } else {
        await fetch(`/api/teacher/attendance/${attendanceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus }),
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${attendanceClassId}/attendance?date=${attendanceDate}`] });
    } catch (error) {
      console.error("Attendance update error:", error);
      toast({
        variant: "destructive",
        title: "Hiba",
        description: "Nem sikerült módosítani a jelenléti állapotot."
      });
    }
  };

  const handleSaveNote = async (studentId: string) => {
    setSavingNote(true);
    try {
      await fetch(`/api/teacher/students/${studentId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: attendanceDate,
          note: noteText,
          classId: parseInt(attendanceClassId),
        }),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${attendanceClassId}/notes?date=${attendanceDate}`] });
      setEditingNote(null);
      setNoteText("");
      toast({
        title: "Mentve",
        description: "A megjegyzést sikeresen elmentettük."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hiba",
        description: "Nem sikerült elmenteni a megjegyzést."
      });
    } finally {
      setSavingNote(false);
    }
  };

  if (attLoading) {
    return (
      <Card className="p-10 text-center">
        <GraduationCap className="h-10 w-10 mx-auto text-blue-400 animate-spin mb-3" />
        <p className="text-gray-500">Jelenléti adatok betöltése...</p>
      </Card>
    );
  }

  if (attData.length === 0) {
    return (
      <Card className="p-10 text-center border-dashed">
        <ClipboardList className="h-10 w-10 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Ezen a napon még nincs automatikusan rögzített jelenléti adat.</p>
        <p className="text-gray-400 text-sm mt-1">A diákok bejelentkezésekor automatikusan rögzítődik a jelenlétük.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['present', 'late', 'excused', 'absent'] as const).map(status => {
          const count = attData.filter((r: any) => r.status === status).length;
          return (
            <div key={status} className={`rounded-lg p-3 border text-center ${statusColor(status)}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium">{statusLabel(status)}</p>
            </div>
          );
        })}
      </div>

      {periods.map(period => (
        <Card key={period}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              {period}. tanóra
              <Badge variant="secondary" className="ml-auto">
                {byPeriod[period].length} diák
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="space-y-2">
              {byPeriod[period]
                .sort((a: any, b: any) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`, 'hu'))
                .map((row: any) => {
                  const studentId = row.student_id;
                  const isEditingThisNote = editingNote === studentId;
                  const existingNote = notesByStudent[studentId];

                  return (
                    <div key={`${studentId}-${period}`} className="flex flex-col gap-1 p-2 rounded-lg bg-gray-50 border">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm flex-1 min-w-0 truncate">
                          {row.last_name} {row.first_name || ''}
                          <span className="text-gray-400 font-normal ml-1 text-xs">@{row.username}</span>
                        </span>

                        {row.login_at && (
                          <span className="text-xs text-gray-400 hidden sm:inline">
                            {new Date(row.login_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}

                        <Select
                          value={row.status}
                          onValueChange={s => handleStatusChange(row.id, s, row)}
                        >
                          <SelectTrigger className={`h-8 w-28 text-xs border font-medium ${statusColor(row.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Jelen</SelectItem>
                            <SelectItem value="late">Késő</SelectItem>
                            <SelectItem value="excused">Igazolt</SelectItem>
                            <SelectItem value="absent">Hiányzik</SelectItem>
                          </SelectContent>
                        </Select>

                        <button
                          id={`note-btn-${row.id}`}
                          onClick={() => {
                            if (isEditingThisNote) {
                              setEditingNote(null);
                              setNoteText("");
                            } else {
                              setEditingNote(studentId);
                              setNoteText(existingNote || "");
                            }
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            existingNote
                              ? 'text-orange-500 hover:bg-orange-50'
                              : 'text-gray-400 hover:bg-gray-200'
                          }`}
                          title={existingNote ? 'Megjegyzés szerkesztése' : 'Megjegyzés hozzáadása'}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {existingNote && !isEditingThisNote && (
                        <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1 ml-2 border border-orange-200">
                          📝 {existingNote}
                        </p>
                      )}

                      {isEditingThisNote && (
                        <div className="flex gap-2 ml-2 mt-1">
                          <Textarea
                            id={`note-textarea-${row.id}`}
                            className="text-sm h-16 resize-none flex-1"
                            placeholder="Napi megjegyzés..."
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              id={`note-save-${row.id}`}
                              onClick={() => handleSaveNote(studentId)}
                              disabled={savingNote}
                              className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`note-cancel-${row.id}`}
                              onClick={() => { setEditingNote(null); setNoteText(""); }}
                              className="p-1.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const DayAttendanceEditor = ({ studentId, date, classId, onClose }: { studentId: string, date: string, classId: string, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dayData = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${classId}/attendance?date=${date}`],
    enabled: !!classId && !!date,
  });

  const studentHours = useMemo(() => {
    return dayData.filter((d: any) => d.student_id === studentId).sort((a, b) => a.period_number - b.period_number);
  }, [dayData, studentId]);

  const handleUpdate = async (attendanceId: number, status: string, periodNumber: number) => {
    try {
      if (attendanceId === -1) {
        await fetch(`/api/teacher/classes/${classId}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, date, periodNumber, status }),
        });
      } else {
        await fetch(`/api/teacher/attendance/${attendanceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/attendance?date=${date}`] });
      // Also invalidate monthly query to keep it in sync
      const monthStr = date.substring(0, 7);
      const startDate = `${monthStr}-01`;
      const endOfMonth = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0);
      const endDate = endOfMonth.toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/attendance?startDate=${startDate}&endDate=${endDate}`] });
    } catch (e) {
      toast({ variant: "destructive", title: "Hiba", description: "Sikertelen mentés" });
    }
  };

  const justifyAll = async () => {
    try {
      const periods = [1, 2, 3, 4, 5, 6, 7, 8];
      for (const p of periods) {
        const h = studentHours.find((sh: any) => sh.period_number === p);
        // Ha nincs rekord vagy hiányzik, akkor igazoljuk
        if (!h || h.status === 'absent') {
          await handleUpdate(h?.id || -1, 'excused', p);
        }
      }
      toast({ title: "Sikeres igazolás", description: "A nap összes óráját leigazoltuk." });
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Hiba", description: "Hiba történt az igazolás közben." });
    }
  };

  if (isLoading) return <div className="text-center p-4">Betöltés...</div>;

  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-3">
      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
        {periods.map((p) => {
          const h = studentHours.find((sh: any) => sh.period_number === p);
          const currentStatus = h?.status || 'absent';
          
          return (
            <div key={p} className="flex items-center justify-between p-2 rounded-md bg-gray-50 border">
              <span className="text-sm font-medium">{p}. óra</span>
              <Select value={currentStatus} onValueChange={(s) => handleUpdate(h?.id || -1, s, p)}>
                <SelectTrigger className={`w-32 h-8 text-xs font-semibold ${
                  currentStatus === 'present' ? 'bg-green-50 border-green-200 text-green-700' :
                  currentStatus === 'late' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                  currentStatus === 'excused' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Jelen</SelectItem>
                  <SelectItem value="excused">Igazolt</SelectItem>
                  <SelectItem value="absent">Hiányzik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      <div className="pt-4 flex flex-col gap-2">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700" 
          onClick={justifyAll}
          disabled={!periods.some(p => {
            const h = studentHours.find((sh: any) => sh.period_number === p);
            return !h || h.status === 'absent';
          })}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Összes hiányzás igazolása (Napi)
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Bezárás</Button>
      </div>
    </div>
  );
};

const MonthlyAttendanceView = ({ classId, month }: { classId: string, month: string }) => {
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ studentId: string, studentName: string, date: string } | null>(null);

  const startDate = `${month}-01`;
  const endOfMonth = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0);
  const endDate = endOfMonth.toISOString().split('T')[0];
  const daysInMonth = endOfMonth.getDate();

  const { data: attendanceData = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${classId}/attendance?startDate=${startDate}&endDate=${endDate}`],
    enabled: !!classId && classId !== 'all',
  });

  const { data: studentsData = [] } = useQuery<Student[]>({
    queryKey: ["/api/teacher/students"],
  });

  const classStudents = useMemo(() => {
    return studentsData
      .filter(s => s.classId === parseInt(classId))
      .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'hu'));
  }, [studentsData, classId]);

  const attendanceMap = useMemo(() => {
    const map: Record<string, Record<string, Record<number, string>>> = {};
    attendanceData.forEach(row => {
      if (!map[row.student_id]) map[row.student_id] = {};
      if (!map[row.student_id][row.date]) map[row.student_id][row.date] = {};
      map[row.student_id][row.date][row.period_number] = row.status;
    });
    return map;
  }, [attendanceData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'late': return 'bg-yellow-500';
      case 'excused': return 'bg-blue-500';
      case 'absent': return 'bg-red-500';
      default: return 'bg-gray-200';
    }
  };

  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  if (isLoading) return (
    <div className="py-20 text-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-500">Havi adatok betöltése...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-blue-100">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[70vh]">
            <Table className="border-collapse table-fixed w-full">
              <TableHeader className="bg-gray-50 sticky top-0 z-30">
                <TableRow>
                  <TableHead className="sticky left-0 bg-gray-50 z-40 min-w-[220px] w-[220px] border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)] font-bold text-gray-700 px-4">Tanuló</TableHead>
                  <TableHead className="sticky left-[220px] bg-blue-50 z-40 min-w-[80px] w-[80px] border-r text-center text-[10px] font-bold text-gray-500 uppercase px-1 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Összesítő</TableHead>
                  {dayNumbers.map(d => {
                    const date = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <TableHead key={d} className={`text-center p-0.5 min-w-[28px] w-[28px] border-r text-[10px] font-bold ${isWeekend ? 'bg-red-50 text-red-400' : 'text-gray-600'}`}>
                        {d}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map(student => {
                  // Calculate month summary for this student
                  const studentData = attendanceMap[student.id] || {};
                  const stats = { present: 0, absent: 0, late: 0, excused: 0 };
                  Object.values(studentData).forEach(day => {
                    Object.values(day).forEach(status => {
                      if (status in stats) stats[status as keyof typeof stats]++;
                    });
                  });

                  return (
                    <TableRow key={student.id} className="hover:bg-blue-50/30 transition-colors">
                      <TableCell className="sticky left-0 bg-white z-20 font-semibold text-sm border-r py-3 shadow-[2px_0_5px_rgba(0,0,0,0.05)] px-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-600 font-bold">
                              {student.lastName?.[0]}{student.firstName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[150px]">{student.lastName} {student.firstName}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="sticky left-[220px] bg-blue-50/10 z-20 border-r p-1.5 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                         <div className="grid grid-cols-1 gap-y-0.5 text-[10px] font-bold">
                            <div className="flex justify-between gap-1"><span className="text-gray-400 font-normal">J:</span><span className="text-green-600">{stats.present}</span></div>
                            <div className="flex justify-between gap-1"><span className="text-gray-400 font-normal">H:</span><span className="text-red-600">{stats.absent}</span></div>
                            <div className="flex justify-between gap-1"><span className="text-gray-400 font-normal">I:</span><span className="text-blue-600">{stats.excused}</span></div>
                         </div>
                      </TableCell>

                      {dayNumbers.map(d => {
                        const dateStr = `${month}-${d.toString().padStart(2, '0')}`;
                        const dayPeriods = studentData[dateStr] || {};
                        const date = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), d);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                        // Aggregate counts for this day
                        const dayCounts = { present: 0, absent: 0, excused: 0 };
                        Object.values(dayPeriods).forEach(status => {
                          if (status === 'present') dayCounts.present++;
                          else if (status === 'absent') dayCounts.absent++;
                          else if (status === 'excused') dayCounts.excused++;
                        });
                        
                        return (
                          <TableCell 
                            key={d} 
                            className={`p-0.5 border-r text-center cursor-pointer group relative hover:bg-gray-100 ${isWeekend ? 'bg-red-50/30' : ''}`}
                            onClick={() => setSelectedDayInfo({ studentId: student.id, studentName: `${student.lastName} ${student.firstName}`, date: dateStr })}
                          >
                            <div className="flex flex-col gap-0 justify-center items-center min-h-[24px]">
                               {dayCounts.present > 0 && (
                                 <span className="text-[11px] font-bold text-green-600 leading-none" title="Jelen">{dayCounts.present}</span>
                               )}
                               {dayCounts.absent > 0 && (
                                 <span className="text-[11px] font-bold text-red-600 leading-none" title="Hiányzás">{dayCounts.absent}</span>
                               )}
                               {dayCounts.excused > 0 && (
                                 <span className="text-[11px] font-bold text-blue-600 leading-none" title="Igazolt">{dayCounts.excused}</span>
                               )}
                               {!Object.keys(dayPeriods).length && !isWeekend && (
                                 <span className="text-[8px] text-gray-200 opacity-0 group-hover:opacity-100">.</span>
                               )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-gray-500 bg-white p-3 rounded-lg border">
         <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Jelen</div>
         <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Hiányzik</div>
         <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Igazolt</div>
         <div className="ml-auto italic">* Kattintson egy cellára a módosításhoz vagy igazoláshoz.</div>
      </div>

      <Dialog open={!!selectedDayInfo} onOpenChange={() => setSelectedDayInfo(null)}>
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {selectedDayInfo?.studentName}
              </DialogTitle>
              <DialogDescription className="font-bold text-gray-900">
                {selectedDayInfo?.date?.replace(/-/g, '. ')}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
               {selectedDayInfo && (
                 <DayAttendanceEditor 
                    studentId={selectedDayInfo.studentId} 
                    date={selectedDayInfo.date} 
                    classId={classId}
                    onClose={() => setSelectedDayInfo(null)}
                 />
               )}
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
};

const StudentDetailView = ({ student }: { student: Student }) => {
  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ["/api/public/modules"],
  });

  const getModuleName = (id: number) => modules.find(m => m.id === id)?.title || `Modul #${id}`;

  const getGrade = (score: number) => {
    if (score >= 90) return 5;
    if (score >= 80) return 4;
    if (score >= 65) return 3;
    if (score >= 50) return 2;
    return 1;
  };

  const getGradeColor = (grade: number) => {
    switch (grade) {
      case 5: return "text-green-600 font-bold";
      case 4: return "text-blue-600 font-bold";
      case 3: return "text-yellow-600 font-bold";
      case 2: return "text-orange-600 font-bold";
      default: return "text-red-600 font-bold";
    }
  };

  return (
    <div className="space-y-6">
      <DialogDescription>
        Részletes áttekintés a modulok teljesítéséről és a teszt eredményekről.
      </DialogDescription>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
          Teljesített modulok
        </h4>
        {student.completedModules && student.completedModules.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {student.completedModules
              .map((id: number) => modules.find((m: Module) => m.id === id))
              .filter((m: Module | undefined): m is Module => !!m)
              .sort((a: Module, b: Module) => a.moduleNumber - b.moduleNumber)
              .map((module: Module) => (
                <Badge key={`completed-${module.id}`} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 py-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {module.title}
                </Badge>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md border border-gray-100">
            Még nincsenek teljesített modulok.
          </p>
        )}
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-3 flex items-center">
          <Award className="h-4 w-4 mr-2 text-purple-500" />
          Teszt eredmények
        </h4>
        {student.testResults && student.testResults.length > 0 ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-xs">Modul</TableHead>
                  <TableHead className="text-xs">Dátum</TableHead>
                  <TableHead className="text-xs">Pontszám</TableHead>
                  <TableHead className="text-xs">Osztályzat</TableHead>
                  <TableHead className="text-xs">Eredmény</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.testResults.map((result) => {
                  const grade = getGrade(result.score);
                  return (
                    <TableRow key={result.id}>
                      <TableCell className="text-xs font-medium">
                        {getModuleName(result.moduleId)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(result.createdAt).toLocaleDateString('hu-HU')}
                      </TableCell>
                      <TableCell className="text-xs">
                        {result.score}%
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className={getGradeColor(grade)}>
                          {grade}
                        </span >
                      </TableCell>
                      <TableCell className="text-xs">
                        {result.passed ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-[10px] py-0 px-1.5">
                            Sikeres
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                            Sikertelen
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md border border-gray-100">
            Nincsenek elérhető teszt eredmények.
          </p>
        )}
      </div>
    </div>
  );
};
