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
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Award, 
  Search,
  GraduationCap,
  Clock,
  CheckCircle,
  ArrowLeft
} from "lucide-react";

interface Student {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  selectedProfessionId?: number;
  completedModules: number[];
  createdAt: string;
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

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["/api/teacher/students"],
  });

  // Fetch modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/public/modules"],
  });

  // Fetch professions
  const { data: professions = [], isLoading: professionsLoading } = useQuery({
    queryKey: ["/api/public/professions"],
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

  const totalStudents = students.length;
  const activeStudents = students.filter((s: Student) => s.completedModules?.length > 0).length;
  const averageProgress = students.length > 0 
    ? Math.round(students.reduce((sum: number, s: Student) => sum + getStudentProgress(s), 0) / students.length)
    : 0;

  if (studentsLoading || modulesLoading || professionsLoading) {
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

        {/* Stats Cards */}
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

                          {recentModules.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-600 mb-2">
                                Legutóbb teljesített modulok
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {recentModules.map((moduleId: number) => (
                                  <Badge key={moduleId} variant="outline" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {getModuleName(moduleId)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}