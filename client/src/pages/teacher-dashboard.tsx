import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  BarChart3
} from "lucide-react";

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
}

interface Module {
  id: number;
  title: string;
  subjectId: number;
  subjectName?: string;
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

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/teacher/students"],
  });

  // Fetch modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ["/api/public/modules"],
  });

  // Fetch professions
  const { data: professions = [], isLoading: professionsLoading } = useQuery({
    queryKey: ["/api/public/professions"],
  });

  // Fetch teacher classes
  const { data: teacherClasses = [], isLoading: classesLoading } = useQuery<ClassData[]>({
    queryKey: ["/api/teacher/classes"],
  });

  // Fetch class grades for statistics
  const now = new Date();
  let startDateStr = "";
  if (timeFilter === "week") {
    const d = new Date(); d.setDate(d.getDate() - 7);
    startDateStr = d.toISOString();
  } else if (timeFilter === "month") {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    startDateStr = d.toISOString();
  }

  const gradesQueryKey = selectedClassId && selectedClassId !== "all"
    ? `/api/teacher/classes/${selectedClassId}/grades?startDate=${startDateStr}${selectedStudentId !== "all" ? `&studentId=${selectedStudentId}` : ""}`
    : null;

  const { data: classGrades = [], isLoading: gradesLoading } = useQuery<GradeResult[]>({
    queryKey: [gradesQueryKey],
    enabled: !!gradesQueryKey
  });

  const filteredStudents = students.filter((student: Student) => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    const username = student.username?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || username.includes(search);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Összes tanuló</p>
                  <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktív tanulók</p>
                  <p className="text-3xl font-bold text-gray-900">{activeStudents}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Átlagos haladás</p>
                  <p className="text-3xl font-bold text-gray-900">{averageProgress}%</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
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
                filteredStudents.map((student: Student) => {
                  const progress = getStudentProgress(student);
                  const completedCount = student.completedModules?.length || 0;
                  const recentModules = student.completedModules?.slice(-3) || [];

                  return (
                    <Card key={student.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.firstName} ${student.lastName}`} />
                              <AvatarFallback>
                                {(student.firstName?.[0] || '') + (student.lastName?.[0] || student.username?.[0] || 'T')}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {student.firstName && student.lastName
                                      ? `${student.firstName} ${student.lastName}`
                                      : student.username
                                    }
                                  </h3>
                                  <p className="text-sm text-gray-500">@{student.username}</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={progress > 50 ? "default" : "secondary"}>
                                    {progress}% kész
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-sm font-medium text-gray-600 mb-1">Szakma</p>
                                  <p className="text-sm text-gray-900">
                                    {getProfessionName(student.selectedProfessionId)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-600 mb-1">Teljesített modulok</p>
                                  <p className="text-sm text-gray-900">
                                    {completedCount} / {modules.length}
                                  </p>
                                </div>
                              </div>

                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium text-gray-600">Haladás</p>
                                  <p className="text-sm text-gray-500">{progress}%</p>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>

                              <div className="flex justify-between items-center mt-4">
                                <div className="flex flex-wrap gap-2">
                                  {recentModules.length > 0 && recentModules.map((moduleId: number) => (
                                    <Badge key={moduleId} variant="outline" className="text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {getModuleName(moduleId)}
                                    </Badge>
                                  ))}
                                </div>

                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <FileText className="h-4 w-4 mr-2" />
                                      Részletek
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {student.firstName && student.lastName
                                          ? `${student.firstName} ${student.lastName}`
                                          : student.username
                                        } tanulmányi eredményei
                                      </DialogTitle>
                                      <DialogDescription>
                                        Részletes áttekintés a modulok teljesítéséről és a teszt eredményekről.
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="mt-4">
                                      <h4 className="text-sm font-medium mb-3">Teszt eredmények</h4>
                                      {student.testResults && student.testResults.length > 0 ? (
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Modul</TableHead>
                                              <TableHead>Dátum</TableHead>
                                              <TableHead>Pontszám</TableHead>
                                              <TableHead>Osztályzat</TableHead>
                                              <TableHead>Eredmény</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {student.testResults.map((result) => {
                                              const grade = getGrade(result.score);
                                              return (
                                                <TableRow key={result.id}>
                                                  <TableCell className="font-medium">
                                                    {getModuleName(result.moduleId)}
                                                  </TableCell>
                                                  <TableCell>
                                                    {new Date(result.createdAt).toLocaleDateString()}
                                                  </TableCell>
                                                  <TableCell>
                                                    {result.score}%
                                                  </TableCell>
                                                  <TableCell>
                                                    <span className={getGradeColor(grade)}>
                                                      {grade}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell>
                                                    {result.passed ? (
                                                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                                        Sikeres
                                                      </Badge>
                                                    ) : (
                                                      <Badge variant="destructive">
                                                        Sikertelen
                                                      </Badge>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                          Nincsenek elérhető teszt eredmények.
                                        </p>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
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
                                {student.firstName && student.lastName
                                  ? `${student.firstName} ${student.lastName}`
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
        </Tabs>
      </div>
    </div>
  );
}