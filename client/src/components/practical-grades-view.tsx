import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Wrench, CheckCircle } from "lucide-react";
import type { User, Class, Subject, Module, PracticalGrade } from "@shared/schema";

interface Props {
  teacherClasses: Class[];
  students: User[];
  subjects: Subject[];
  modules: Module[];
}

export function PracticalGradesView({ teacherClasses, students, subjects, modules }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  
  const [gradeValue, setGradeValue] = useState<string>("");
  const [gradeComment, setGradeComment] = useState<string>("");

  // Only show practical subjects and modules
  const practicalSubjects = subjects.filter(s => s.type === 'practical');
  const practicalModules = modules.filter(m => practicalSubjects.some(s => s.id === m.subjectId));

  // Fetch grades for the selected student
  const { data: studentGrades, isLoading: gradesLoading } = useQuery<PracticalGrade[]>({
    queryKey: ["/api/practical-grades/student", selectedStudentId],
    enabled: selectedStudentId !== "all" && !!selectedStudentId,
  });

  const saveGradeMutation = useMutation({
    mutationFn: async (data: { studentId: string, moduleId: number, grade: number, comment: string }) => {
      const res = await fetch('/api/practical-grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save grade");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sikeres mentés", description: "A gyakorlati érdemjegy rögzítve." });
      queryClient.invalidateQueries({ queryKey: ["/api/practical-grades/student", selectedStudentId] });
      setGradeValue("");
      setGradeComment("");
      setSelectedModuleId("");
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült menteni az érdemjegyet.", variant: "destructive" });
    }
  });

  const handleSaveGrade = () => {
    if (selectedStudentId === "all" || !selectedModuleId || !gradeValue) {
      toast({ title: "Figyelem", description: "Kérjük, válasszon ki minden kötelező mezőt és adjon meg érdemjegyet!", variant: "destructive" });
      return;
    }

    saveGradeMutation.mutate({
      studentId: selectedStudentId,
      moduleId: parseInt(selectedModuleId),
      grade: parseInt(gradeValue),
      comment: gradeComment,
    });
  };

  const filteredStudents = students.filter(s => 
    selectedClassId === "all" ? true : s.classId === parseInt(selectedClassId)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-blue-600" />
          <CardTitle>Gyakorlati Értékelés</CardTitle>
        </div>
        <CardDescription>
          Fizikai és műhelyszintű gyakorlati feladatok manuális osztályozása.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div>
            <Label className="mb-2 block">1. Válasszon osztályt</Label>
            <Select value={selectedClassId} onValueChange={(val) => {
              setSelectedClassId(val);
              setSelectedStudentId("all");
            }}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Minden osztály" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Minden osztály</SelectItem>
                {teacherClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">2. Válasszon diákot</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={selectedClassId === "all"}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Válasszon diákot..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Válasszon diákot...</SelectItem>
                {filteredStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.lastName} {student.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedStudentId !== "all" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Col: Grade Input */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Új Értékelés Rögzítése</h3>
              
              <div>
                <Label className="mb-2 block">Gyakorlati Feladat / Modul</Label>
                <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassza ki az értékelt feladatot..." />
                  </SelectTrigger>
                  <SelectContent>
                    {practicalModules.map((module) => (
                      <SelectItem key={module.id} value={module.id.toString()}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Érdemjegy (1-5)</Label>
                <Select value={gradeValue} onValueChange={setGradeValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon érdemjegyet..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 - Jeles</SelectItem>
                    <SelectItem value="4">4 - Jó</SelectItem>
                    <SelectItem value="3">3 - Közepes</SelectItem>
                    <SelectItem value="2">2 - Elégséges</SelectItem>
                    <SelectItem value="1">1 - Elégtelen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Szöveges értékelés / Megjegyzés (opcionális)</Label>
                <Textarea 
                  placeholder="Részletes szakmai vélemény a munkadarabról vagy a munkafolyamatról..."
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <Button 
                onClick={handleSaveGrade} 
                disabled={saveGradeMutation.isPending || !selectedModuleId || !gradeValue}
                className="w-full"
              >
                {saveGradeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mentés...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Érdemjegy Mentése</>
                )}
              </Button>
            </div>

            {/* Right Col: Grade History */}
            <div>
              <h3 className="font-semibold text-lg border-b pb-2 mb-4">Eddigi Értékelések</h3>
              {gradesLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : studentGrades && studentGrades.length > 0 ? (
                <div className="space-y-3">
                  {studentGrades.map(grade => {
                    const mod = practicalModules.find(m => m.id === grade.moduleId);
                    return (
                      <div key={grade.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-start gap-4">
                        <div className={\`flex items-center justify-center h-10 w-10 rounded-full font-bold text-lg \${
                          grade.grade === 5 ? 'bg-green-100 text-green-700' :
                          grade.grade === 4 ? 'bg-blue-100 text-blue-700' :
                          grade.grade === 3 ? 'bg-yellow-100 text-yellow-700' :
                          grade.grade === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }\`}>
                          {grade.grade}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">{mod?.title || 'Ismeretlen modul'}</h4>
                          <p className="text-xs text-gray-500 mb-1">
                            {new Date(grade.createdAt!).toLocaleDateString('hu-HU')}
                          </p>
                          {grade.comment && (
                            <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded border border-gray-100 italic">
                              "{grade.comment}"
                            </p>
                          )}
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <Wrench className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p>Még nincs regisztrált gyakorlati jegy.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
