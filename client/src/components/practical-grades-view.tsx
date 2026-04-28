import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Wrench, CheckCircle } from "lucide-react";
import type { User, Class, Subject, Module, PracticalGrade } from "@shared/schema";

interface Props {
  teacherClasses: Class[];
  students: User[];
  subjects: Subject[];
  modules: Module[];
}

interface StudentWithGrade extends User {
  grade?: PracticalGrade;
}

export function PracticalGradesView({ teacherClasses, students, subjects, modules }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);
  
  // State for bulk/quick editing in the roster
  const [editingGrades, setEditingGrades] = useState<Record<string, { grade: string, comment: string }>>({});

  // 1. Determine profession of the selected class to fix filtering
  const selectedClass = teacherClasses.find(c => c.id.toString() === selectedClassId);
  const classProfessionId = selectedClass?.professionId;

  // 2. Only show practical subjects and modules FOR THIS PROFESSION
  // CRITICAL: Filter by professionId to avoid showing modules from other professions (e.g. welding vs tailoring)
  const practicalSubjects = subjects.filter(s => 
    s.type === 'practical' && 
    (classProfessionId ? s.professionId === classProfessionId : false)
  );
  const practicalModules = modules.filter(m => practicalSubjects.some(s => s.id === m.subjectId));

  // 3. Fetch ALL practical grades for this module to show in the roster
  const { data: moduleGrades = [], isLoading: gradesLoading } = useQuery<PracticalGrade[]>({
    queryKey: ["/api/practical-grades/module", expandedModuleId],
    enabled: !!expandedModuleId,
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
    onSuccess: (_, variables) => {
      toast({ title: "Sikeres mentés", description: "A gyakorlati érdemjegy rögzítve." });
      queryClient.invalidateQueries({ queryKey: ["/api/practical-grades/module", expandedModuleId] });
      // Clear local edit state for this student
      setEditingGrades(prev => {
        const next = { ...prev };
        delete next[variables.studentId];
        return next;
      });
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült menteni az érdemjegyet.", variant: "destructive" });
    }
  });

  const handleSaveStudentGrade = (studentId: string, moduleId: number) => {
    const edit = editingGrades[studentId];
    if (!edit || !edit.grade) return;

    saveGradeMutation.mutate({
      studentId,
      moduleId,
      grade: parseInt(edit.grade),
      comment: edit.comment || "",
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
        <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <Label className="mb-2 block font-medium text-blue-900">Válasszon osztályt a gyakorlati naplóhoz</Label>
            <Select value={selectedClassId} onValueChange={(val) => {
              setSelectedClassId(val);
              setExpandedModuleId(null);
            }}>
              <SelectTrigger className="bg-white border-blue-200">
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
          <div className="hidden md:block text-blue-400">
            <Loader2 className={`h-6 w-6 ${gradesLoading ? 'animate-spin' : 'opacity-0'}`} />
          </div>
        </div>

        {selectedClassId !== "all" && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Gyakorlati Feladatok (Modulok)
            </h3>
            
            <div className="space-y-2">
              {practicalModules
                .sort((a, b) => a.moduleNumber - b.moduleNumber)
                .map((module) => {
                  const isExpanded = expandedModuleId === module.id;
                  const moduleGradesCount = moduleGrades.filter(g => g.moduleId === module.id).length;
                  const totalStudents = filteredStudents.length;
                  
                  return (
                    <div key={module.id} className={`border rounded-lg transition-all duration-200 ${isExpanded ? 'ring-1 ring-blue-400 shadow-md bg-white' : 'hover:bg-gray-50 bg-white'}`}>
                      <div 
                        className="p-3 flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedModuleId(isExpanded ? null : module.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-lg flex flex-col items-center justify-center border ${isExpanded ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                            <span className="text-[10px] uppercase font-bold leading-none mb-0.5">Feladat</span>
                            <span className="text-lg font-black leading-none">{module.moduleNumber}</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-tight">{module.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 h-4 font-normal">
                                {moduleGradesCount} / {totalStudents} értékelt
                              </Badge>
                              <span className="text-[10px] text-gray-400">|</span>
                              <span className="text-[10px] text-gray-500 font-medium">{module.sectionCode || 'Gyakorlat'}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className={`h-8 gap-1.5 ${isExpanded ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}>
                          {isExpanded ? 'Bezárás' : 'Osztályozás'}
                          <Wrench className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-12' : ''}`} />
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="p-0 bg-gray-50/50 border-t rounded-b-lg animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                              <thead className="bg-gray-100/80 text-gray-600 uppercase text-[10px] font-bold">
                                <tr>
                                  <th className="px-4 py-2 border-b">Tanuló Neve</th>
                                  <th className="px-4 py-2 border-b text-center w-24">Jelenlegi</th>
                                  <th className="px-4 py-2 border-b w-32">Osztályzat</th>
                                  <th className="px-4 py-2 border-b">Megjegyzés / Értékelés</th>
                                  <th className="px-4 py-2 border-b text-right w-32">Állapot</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {filteredStudents
                                  .sort((a, b) => (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName))
                                  .map(student => {
                                    const currentGrade = moduleGrades.find(g => g.studentId === student.id && g.moduleId === module.id);
                                    const edit = editingGrades[student.id] || { grade: "", comment: "" };
                                    
                                    return (
                                      <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-4 py-2.5 font-semibold text-gray-900">
                                          {student.lastName} {student.firstName}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                          {currentGrade ? (
                                            <Badge 
                                              className={`h-7 w-7 rounded-md flex items-center justify-center font-bold text-white p-0 mx-auto
                                                ${currentGrade.grade === 5 ? 'bg-green-600 shadow-green-100' : 
                                                  currentGrade.grade === 4 ? 'bg-blue-600 shadow-blue-100' : 
                                                  currentGrade.grade === 3 ? 'bg-amber-500 shadow-amber-100' : 
                                                  currentGrade.grade === 2 ? 'bg-orange-500 shadow-orange-100' : 'bg-red-600 shadow-red-100'}`}
                                            >
                                              {currentGrade.grade}
                                            </Badge>
                                          ) : (
                                            <span className="text-gray-300 text-xs">-</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <Select 
                                            value={edit.grade || (currentGrade?.grade?.toString() || "")} 
                                            onValueChange={(val) => {
                                              setEditingGrades(prev => ({
                                                ...prev,
                                                [student.id]: { ...edit, grade: val }
                                              }));
                                              // Auto-save on grade change
                                              saveGradeMutation.mutate({
                                                studentId: student.id,
                                                moduleId: module.id,
                                                grade: parseInt(val),
                                                comment: edit.comment || currentGrade?.comment || "",
                                              });
                                            }}
                                          >
                                            <SelectTrigger className="w-24 h-8 bg-white border-gray-200 text-xs">
                                              <SelectValue placeholder="Jegy" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="5">5 - Jeles</SelectItem>
                                              <SelectItem value="4">4 - Jó</SelectItem>
                                              <SelectItem value="3">3 - Közepes</SelectItem>
                                              <SelectItem value="2">2 - Elégséges</SelectItem>
                                              <SelectItem value="1">1 - Elégtelen</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <Input 
                                            placeholder="Gyakorlati tapasztalatok..."
                                            value={edit.comment !== undefined ? edit.comment : (currentGrade?.comment || "")}
                                            onChange={(e) => setEditingGrades(prev => ({
                                              ...prev,
                                              [student.id]: { ...edit, comment: e.target.value }
                                            }))}
                                            onBlur={() => {
                                              const gradeToSave = edit.grade || currentGrade?.grade?.toString();
                                              if (gradeToSave) {
                                                saveGradeMutation.mutate({
                                                  studentId: student.id,
                                                  moduleId: module.id,
                                                  grade: parseInt(gradeToSave),
                                                  comment: edit.comment || "",
                                                });
                                              }
                                            }}
                                            className="h-8 bg-white text-xs border-gray-200 group-hover:border-blue-200 focus:border-blue-400"
                                          />
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          <div className="flex items-center justify-end gap-2 text-[10px]">
                                            {saveGradeMutation.isPending && saveGradeMutation.variables?.studentId === student.id ? (
                                              <span className="text-blue-500 animate-pulse font-medium flex items-center gap-1">
                                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Mentés...
                                              </span>
                                            ) : currentGrade ? (
                                              <span className="text-green-600 font-bold flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <CheckCircle className="h-3 w-3" /> RÖGZÍTVE
                                              </span>
                                            ) : (
                                              <span className="text-gray-300">Vár értékelésre</span>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
