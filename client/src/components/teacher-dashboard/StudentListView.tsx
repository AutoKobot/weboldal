import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Search, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  FileText 
} from "lucide-react";
import { StudentDetailView } from "./StudentDetailView";
import { Student, Module, Profession, ClassData as Class } from "./types";

interface Props {
  students: Student[];
  teacherClasses: Class[];
  modules: Module[];
  professions: Profession[];
}

export function StudentListView({ students, teacherClasses, modules, professions, subjects }: Props & { subjects: Subject[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set());

  const toggleClassCollapse = (classId: string) => {
    setCollapsedClasses(prev => {
      const next = new Set(prev);
      next.has(classId) ? next.delete(classId) : next.add(classId);
      return next;
    });
  };

  const getStudentProgress = (student: Student) => {
    if (!modules.length || !subjects.length) return 0;
    
    // 1. Identify which subjects belong to the student's profession
    const professionSubjectIds = subjects
      .filter(s => s.professionId === student.selectedProfessionId)
      .map(s => s.id);
    
    // 2. Filter modules to only include those in the student's profession
    const professionModules = modules.filter(m => professionSubjectIds.includes(m.subjectId));
    
    if (professionModules.length === 0) return 0;
    
    // 3. Count how many of THESE modules are completed
    const completedInProfessionCount = student.completedModules?.filter(id => 
      professionModules.some(m => m.id === id)
    ).length || 0;
    
    return Math.round((completedInProfessionCount / professionModules.length) * 100);
  };

  const getProfessionName = (id?: number) => {
    if (!id) return "Nincs megadva";
    return professions.find(p => p.id === id)?.name || "Ismeretlen";
  };

  const filteredStudents = students.filter((student: Student) => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.toLowerCase();
    const username = student.username?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || username.includes(search);
  });

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
    return (classA?.name || '').localeCompare(classB?.name || '', 'hu');
  });

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Keresés név vagy felhasználónév alapján..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {sortedClassIds.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "Nincs találat" : "Nincsenek tanulók"}
              </h3>
            </CardContent>
          </Card>
        ) : (
          sortedClassIds.map(classId => {
            const classInfo = classId === 'unassigned'
              ? { name: 'Osztály nélküliek' }
              : teacherClasses.find(c => c.id.toString() === classId) || { name: `Osztály #${classId}` };

            const classStudents = studentsByClass[classId].sort((a, b) => {
              const nameA = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase();
              const nameB = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase();
              return nameA.localeCompare(nameB, 'hu');
            });

            return (
              <div key={classId} className="space-y-4">
                <button
                  onClick={() => toggleClassCollapse(classId)}
                  className="w-full flex items-center justify-between text-left border-b pb-2 hover:border-blue-400 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    {classInfo.name}
                    <Badge variant="secondary" className="ml-3">{classStudents.length} tanuló</Badge>
                  </h3>
                  <span>
                    {collapsedClasses.has(classId) ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                  </span>
                </button>

                {!collapsedClasses.has(classId) && (
                  <div className="grid gap-4">
                    {classStudents.map((student) => (
                      <Card key={student.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.firstName} ${student.lastName}`} />
                              <AvatarFallback>{(student.firstName?.[0] || '') + (student.lastName?.[0] || '')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-base font-semibold text-gray-900 flex items-center truncate">
                                    {student.lastName} {student.firstName}
                                    {student.isOnline && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                                  </h3>
                                  <p className="text-xs text-gray-400">@{student.username}</p>
                                </div>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600">
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>{student.lastName} {student.firstName} - Részletes adatok</DialogTitle>
                                    </DialogHeader>
                                    <StudentDetailView student={student} />
                                  </DialogContent>
                                </Dialog>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                                <div><p className="text-gray-400 uppercase">Szakma</p><p>{getProfessionName(student.selectedProfessionId)}</p></div>
                                <div><p className="text-gray-400 uppercase">Haladás</p><p>{getStudentProgress(student)}%</p></div>
                                <div><p className="text-gray-400 uppercase">Sorozat</p><p className="text-orange-600 font-bold">🔥 {student.currentStreak || 0} nap</p></div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
