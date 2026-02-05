import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { School, Users, UserCheck, Search, LogOut, UserPlus, GraduationCap, Plus, Info, Edit, Save, X } from "lucide-react";
import { useLocation } from "wouter";

// CreateClassForm komponens az osztályok létrehozásához
function CreateClassForm({ professions, onSuccess }: { professions: Profession[], onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    professionId: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/school-admin/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          professionId: formData.professionId && formData.professionId !== "0" ? parseInt(formData.professionId) : null
        }),
      });

      if (response.ok) {
        onSuccess();
        setFormData({ name: "", description: "", professionId: "" });
      } else {
        const errorData = await response.json();
        toast({
          title: "Hiba",
          description: errorData.message || "Nem sikerült létrehozni az osztályt",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="class-name">Osztály neve</Label>
        <Input
          id="class-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="pl. 9.A, Hegesztő 2024"
          required
        />
      </div>
      <div>
        <Label htmlFor="class-description">Leírás (opcionális)</Label>
        <Input
          id="class-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Osztály leírása"
        />
      </div>
      <div>
        <Label htmlFor="class-profession">Szakma kiválasztása</Label>
        <Select value={formData.professionId} onValueChange={(value) => setFormData({ ...formData, professionId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Válasszon szakmát" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Nincs szakma</SelectItem>
            {professions.map((profession) => (
              <SelectItem key={profession.id} value={profession.id.toString()}>
                {profession.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Létrehozás..." : "Osztály létrehozása"}
        </Button>
      </div>
    </form>
  );
}

interface Student {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  assignedTeacherId?: string;
  classId?: number;
}

interface Teacher {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Class {
  id: number;
  name: string;
  description?: string;
  schoolAdminId: string;
  assignedTeacherId?: string;
  professionId?: number;
  createdAt: string;
  updatedAt: string;
}

interface Profession {
  id: number;
  name: string;
  description?: string;
}

export default function SchoolAdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<number | null>(null);
  const [managingStudents, setManagingStudents] = useState<number | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Regisztrációs state változók
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: ""
  });
  const [studentForm, setStudentForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsResponse, teachersResponse, classesResponse, professionsResponse] = await Promise.all([
        fetch("/api/school-admin/students", { credentials: 'include' }),
        fetch("/api/school-admin/teachers", { credentials: 'include' }),
        fetch("/api/school-admin/classes", { credentials: 'include' }),
        fetch("/api/professions", { credentials: 'include' })
      ]);

      if (studentsResponse.ok && teachersResponse.ok && classesResponse.ok && professionsResponse.ok) {
        const studentsData = await studentsResponse.json();
        const teachersData = await teachersResponse.json();
        const classesData = await classesResponse.json();
        const professionsData = await professionsResponse.json();
        
        setStudents(studentsData);
        setTeachers(teachersData);
        setClasses(classesData);
        setProfessions(professionsData);
      } else {
        toast({
          title: "Hiba",
          description: "Nem sikerült betölteni az adatokat",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const assignStudentToTeacher = async (studentId: string, teacherId: string) => {
    try {
      const response = await fetch("/api/school-admin/assign-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId, teacherId }),
      });

      if (response.ok) {
        toast({
          title: "Sikeres hozzárendelés",
          description: "A tanuló sikeresen hozzá lett rendelve a tanárhoz",
        });
        fetchData(); // Frissítjük az adatokat
      } else {
        const error = await response.json();
        toast({
          title: "Hiba",
          description: error.message || "Nem sikerült a hozzárendelés",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    }
  };

  const removeStudentFromTeacher = async (studentId: string) => {
    try {
      const response = await fetch("/api/school-admin/remove-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId }),
      });

      if (response.ok) {
        toast({
          title: "Sikeres eltávolítás",
          description: "A tanuló el lett távolítva a tanártól",
        });
        fetchData(); // Frissítjük az adatokat
      } else {
        const error = await response.json();
        toast({
          title: "Hiba",
          description: error.message || "Nem sikerült az eltávolítás",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    }
  };

  const getTeacherName = (teacherId?: string) => {
    if (!teacherId) return "Nincs hozzárendelve";
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return "Ismeretlen tanár";
    return teacher.firstName && teacher.lastName 
      ? `${teacher.firstName} ${teacher.lastName}` 
      : teacher.username;
  };

  const getProfessionName = (professionId?: number) => {
    if (!professionId) return "Nincs szakma";
    const profession = professions.find(p => p.id === professionId);
    return profession ? profession.name : "Ismeretlen szakma";
  };

  const assignProfessionToClass = async (classId: number, professionId: number) => {
    try {
      const response = await fetch(`/api/school-admin/classes/${classId}/assign-profession`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ professionId }),
      });

      if (response.ok) {
        toast({
          title: "Siker",
          description: "Szakma sikeresen hozzárendelve az osztályhoz és a diákokhoz",
        });
        fetchData();
      } else {
        const errorData = await response.json();
        toast({
          title: "Hiba",
          description: errorData.message || "Nem sikerült hozzárendelni a szakmát",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    }
  };

  const assignTeacherToClass = async (classId: number, teacherId: string) => {
    try {
      const response = await fetch(`/api/school-admin/classes/${classId}/assign-teacher`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ teacherId: teacherId || null }),
      });

      if (response.ok) {
        fetchData();
        toast({
          title: "Siker",
          description: "Tanár sikeresen hozzárendelve az osztályhoz",
        });
        setEditingClass(null);
      } else {
        const errorData = await response.json();
        toast({
          title: "Hiba",
          description: errorData.message || "Nem sikerült hozzárendelni a tanárt",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    }
  };

  const addStudentToClass = async (classId: number, studentId: string) => {
    try {
      const response = await fetch(`/api/school-admin/classes/${classId}/add-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ studentId }),
      });

      if (response.ok) {
        fetchData();
        toast({
          title: "Siker",
          description: "Diák sikeresen hozzáadva az osztályhoz",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Hiba",
          description: errorData.message || "Nem sikerült hozzáadni a diákot",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    }
  };

  const removeStudentFromClass = async (classId: number, studentId: string) => {
    try {
      const response = await fetch(`/api/school-admin/classes/${classId}/remove-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ studentId }),
      });

      if (response.ok) {
        fetchData();
        toast({
          title: "Siker",
          description: "Diák sikeresen eltávolítva az osztályból",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Hiba",
          description: errorData.message || "Nem sikerült eltávolítani a diákot",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/school-admin/logout", { 
        method: "GET",
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: "Sikeres kijelentkezés",
          description: "Sikeresen kijelentkeztél a rendszerből",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always navigate regardless of response status
      navigate("/school-admin-auth");
    }
  };

  // Tanár regisztrációs funkció
  const registerTeacher = async () => {
    try {
      const response = await fetch("/api/school-admin/register-teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teacherForm),
      });

      if (response.ok) {
        toast({
          title: "Sikeres regisztráció",
          description: "A tanár sikeresen regisztrálva lett",
        });
        setTeacherForm({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
          password: ""
        });
        setIsTeacherDialogOpen(false);
        fetchData(); // Frissítjük az adatokat
      } else {
        const error = await response.json();
        toast({
          title: "Hiba",
          description: error.message || "Nem sikerült a regisztráció",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    }
  };

  // Diák regisztrációs funkció
  const registerStudent = async () => {
    try {
      const response = await fetch("/api/school-admin/register-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentForm),
      });

      if (response.ok) {
        toast({
          title: "Sikeres regisztráció",
          description: "A diák sikeresen regisztrálva lett",
        });
        setStudentForm({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
          password: ""
        });
        setIsStudentDialogOpen(false);
        fetchData(); // Frissítjük az adatokat
      } else {
        const error = await response.json();
        toast({
          title: "Hiba",
          description: error.message || "Nem sikerült a regisztráció",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Hiba",
        description: "Hálózati hiba történt",
        variant: "destructive",
      });
    }
  };



  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${student.firstName || ""} ${student.lastName || ""}`.trim();
    
    const matchesSearch = searchTerm === "" || (
      student.username.toLowerCase().includes(searchLower) ||
      fullName.toLowerCase().includes(searchLower) ||
      (student.email && student.email.toLowerCase().includes(searchLower))
    );
    
    const matchesTeacher = selectedTeacher === "all" || selectedTeacher === "" || student.assignedTeacherId === selectedTeacher;
    
    return matchesSearch && matchesTeacher;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <School size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Iskolai Admin Panel</h1>
                <p className="text-gray-600">Tanulók és tanárok kezelése</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut size={16} />
              <span>Kijelentkezés</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statisztikák */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Összes tanuló</CardTitle>
              <Users size={16} className="text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Összes tanár</CardTitle>
              <UserCheck size={16} className="text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teachers.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hozzárendelt tanulók</CardTitle>
              <UserCheck size={16} className="text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {students.filter(s => s.assignedTeacherId).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab rendszer */}
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assignments">Hozzárendelések</TabsTrigger>
            <TabsTrigger value="register-teacher">Tanár regisztráció</TabsTrigger>
            <TabsTrigger value="register-student">Diák regisztráció</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            {/* Osztályok és hozzárendelések */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Osztályok kezelése</CardTitle>
                <CardDescription>
                  Hozzon létre osztályokat és rendeljen hozzájuk tanárokat és diákokat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="flex items-center space-x-2">
                        <Plus size={16} />
                        <span>Új osztály létrehozása</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Új osztály létrehozása</DialogTitle>
                        <DialogDescription>
                          Hozzon létre egy új osztályt a diákok szervezéséhez és szakma hozzárendeléséhez.
                        </DialogDescription>
                      </DialogHeader>
                      <CreateClassForm 
                        professions={professions}
                        onSuccess={() => {
                          fetchData();
                          toast({
                            title: "Siker",
                            description: "Osztály sikeresen létrehozva",
                          });
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Jelenleg csak a saját iskolájához tartozó diákok és tanárok láthatók.
                </div>
                
                {/* Osztályok listája */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Létrehozott osztályok ({classes.length})</h3>
                  {classes.length > 0 ? (
                    <div className="grid gap-4">
                      {classes.map((classItem) => (
                        <div key={classItem.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-lg">{classItem.name}</h4>
                              {classItem.description && (
                                <p className="text-sm text-gray-600 mt-1">{classItem.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-2">
                                {classItem.professionId ? (
                                  <Badge variant="default">
                                    Szakma: {getProfessionName(classItem.professionId)}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Nincs szakma</Badge>
                                )}
                                {classItem.assignedTeacherId && (
                                  <Badge variant="secondary">
                                    Tanár: {getTeacherName(classItem.assignedTeacherId)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              {editingClass === classItem.id ? (
                                <div className="flex space-x-2">
                                  <Select onValueChange={(professionId) => assignProfessionToClass(classItem.id, parseInt(professionId))}>
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Szakma módosítása" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">Nincs szakma</SelectItem>
                                      {professions.map((profession) => (
                                        <SelectItem key={profession.id} value={profession.id.toString()}>
                                          {profession.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select onValueChange={(teacherId) => assignTeacherToClass(classItem.id, teacherId)}>
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Tanár módosítása" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Nincs tanár</SelectItem>
                                      {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                          {teacher.firstName} {teacher.lastName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" onClick={() => setEditingClass(null)}>
                                    <Save size={16} />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex space-x-2">
                                  {!classItem.professionId && (
                                    <Select onValueChange={(professionId) => assignProfessionToClass(classItem.id, parseInt(professionId))}>
                                      <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Szakma hozzárendelése" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {professions.map((profession) => (
                                          <SelectItem key={profession.id} value={profession.id.toString()}>
                                            {profession.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  {!classItem.assignedTeacherId && (
                                    <Select onValueChange={(teacherId) => assignTeacherToClass(classItem.id, teacherId)}>
                                      <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Tanár hozzárendelése" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {teachers.map((teacher) => (
                                          <SelectItem key={teacher.id} value={teacher.id}>
                                            {teacher.firstName} {teacher.lastName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => setEditingClass(classItem.id)}
                                  >
                                    <Edit size={16} />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    onClick={() => setManagingStudents(classItem.id)}
                                  >
                                    <Users size={16} />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Még nincsenek osztályok létrehozva.
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Keresés név, felhasználónév vagy email alapján..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Szűrés tanár szerint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Összes tanár</SelectItem>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {getTeacherName(teacher.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

        {/* Tanulók listája */}
        <Card>
          <CardHeader>
            <CardTitle>Tanulók ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Info size={16} className="text-blue-600" />
                  <p className="text-sm text-blue-800">
                    Csak az Ön iskolájához tartozó diákok és tanárok láthatók. Az adatok elkülönítve vannak tárolva.
                  </p>
                </div>
              </div>
              
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {`${student.firstName || ""} ${student.lastName || ""}`.trim() || student.username}
                    </h3>
                    <p className="text-sm text-gray-500">@{student.username}</p>
                    {student.email && (
                      <p className="text-sm text-gray-500">{student.email}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Saját iskola
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {student.assignedTeacherId ? (
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {getTeacherName(student.assignedTeacherId)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeStudentFromTeacher(student.id)}
                        >
                          Eltávolítás
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Select
                          onValueChange={(teacherId) => assignStudentToTeacher(student.id, teacherId)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Tanár kiválasztása" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {getTeacherName(teacher.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm || selectedTeacher !== 'all' 
                    ? 'Nem található tanuló a keresési feltételeknek megfelelően' 
                    : 'Még nincsenek tanulók regisztrálva az Ön iskolájához'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Tanár regisztráció tab */}
          <TabsContent value="register-teacher">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GraduationCap size={20} />
                  <span>Új tanár regisztrálása</span>
                </CardTitle>
                <CardDescription>
                  Hozzon létre új tanár fiókot az iskolában
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teacher-firstName">Keresztnév</Label>
                    <Input
                      id="teacher-firstName"
                      value={teacherForm.firstName}
                      onChange={(e) => setTeacherForm({...teacherForm, firstName: e.target.value})}
                      placeholder="Keresztnév"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacher-lastName">Vezetéknév</Label>
                    <Input
                      id="teacher-lastName"
                      value={teacherForm.lastName}
                      onChange={(e) => setTeacherForm({...teacherForm, lastName: e.target.value})}
                      placeholder="Vezetéknév"
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacher-username">Felhasználónév</Label>
                    <Input
                      id="teacher-username"
                      value={teacherForm.username}
                      onChange={(e) => setTeacherForm({...teacherForm, username: e.target.value})}
                      placeholder="Felhasználónév"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="teacher-email">Email (opcionális)</Label>
                    <Input
                      id="teacher-email"
                      type="email"
                      value={teacherForm.email}
                      onChange={(e) => setTeacherForm({...teacherForm, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="teacher-password">Jelszó</Label>
                    <Input
                      id="teacher-password"
                      type="password"
                      value={teacherForm.password}
                      onChange={(e) => setTeacherForm({...teacherForm, password: e.target.value})}
                      placeholder="Minimum 6 karakter"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={registerTeacher}
                    disabled={!teacherForm.username || !teacherForm.password || teacherForm.password.length < 6}
                    className="flex items-center space-x-2"
                  >
                    <UserPlus size={16} />
                    <span>Tanár regisztrálása</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diák regisztráció tab */}
          <TabsContent value="register-student">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users size={20} />
                  <span>Új diák regisztrálása</span>
                </CardTitle>
                <CardDescription>
                  Hozzon létre új diák fiókot az iskolában
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="student-firstName">Keresztnév</Label>
                    <Input
                      id="student-firstName"
                      value={studentForm.firstName}
                      onChange={(e) => setStudentForm({...studentForm, firstName: e.target.value})}
                      placeholder="Keresztnév"
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-lastName">Vezetéknév</Label>
                    <Input
                      id="student-lastName"
                      value={studentForm.lastName}
                      onChange={(e) => setStudentForm({...studentForm, lastName: e.target.value})}
                      placeholder="Vezetéknév"
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-username">Felhasználónév</Label>
                    <Input
                      id="student-username"
                      value={studentForm.username}
                      onChange={(e) => setStudentForm({...studentForm, username: e.target.value})}
                      placeholder="Felhasználónév"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="student-email">Email (opcionális)</Label>
                    <Input
                      id="student-email"
                      type="email"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="student-password">Jelszó</Label>
                    <Input
                      id="student-password"
                      type="password"
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({...studentForm, password: e.target.value})}
                      placeholder="Minimum 6 karakter"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button 
                    onClick={registerStudent}
                    disabled={!studentForm.username || !studentForm.password || studentForm.password.length < 6}
                    className="flex items-center space-x-2"
                  >
                    <UserPlus size={16} />
                    <span>Diák regisztrálása</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Diák kezelés modal */}
      {managingStudents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Diákok kezelése - {classes.find(c => c.id === managingStudents)?.name}</h2>
              <Button 
                variant="outline" 
                onClick={() => setManagingStudents(null)}
              >
                Bezárás
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Osztályban lévő diákok */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Osztályban lévő diákok</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {students
                    .filter(student => student.classId === managingStudents)
                    .map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{student.firstName} {student.lastName}</p>
                          <p className="text-sm text-gray-600">{student.username}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeStudentFromClass(managingStudents, student.id)}
                        >
                          Eltávolítás
                        </Button>
                      </div>
                    ))}
                  {students.filter(student => student.classId === managingStudents).length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nincsenek diákok az osztályban</p>
                  )}
                </div>
              </div>

              {/* Elérhető diákok */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Elérhető diákok</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {students
                    .filter(student => !student.classId || student.classId !== managingStudents)
                    .map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{student.firstName} {student.lastName}</p>
                          <p className="text-sm text-gray-600">{student.username}</p>
                          {student.classId && (
                            <p className="text-xs text-orange-600">
                              Már másik osztályban: {classes.find(c => c.id === student.classId)?.name}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => addStudentToClass(managingStudents, student.id)}
                        >
                          Hozzáadás
                        </Button>
                      </div>
                    ))}
                  {students.filter(student => !student.classId || student.classId !== managingStudents).length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nincsenek elérhető diákok</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}