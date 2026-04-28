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
  const classProfessionId = students.find(s => s.classId === parseInt(selectedClassId))?.selectedProfessionId;

  // 2. Only show practical subjects and modules FOR THIS PROFESSION
  const practicalSubjects = subjects.filter(s => 
    s.type === 'practical' && 
    (!classProfessionId || s.professionId === classProfessionId)
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
            
            <div className="grid grid-cols-1 gap-3">
              {practicalModules.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                  Nincs elérhető gyakorlati modul ehhez a szakmához.
                </div>
              ) : practicalModules.map((module) => {
                const isExpanded = expandedModuleId === module.id;
                const moduleGradesCount = moduleGrades.filter(g => g.moduleId === module.id).length;
                
                return (
                  <div key={module.id} className={`border rounded-xl transition-all duration-200 ${isExpanded ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:bg-gray-50'}`}>
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedModuleId(isExpanded ? null : module.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${moduleGradesCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {moduleGradesCount}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{module.title}</p>
                          <p className="text-xs text-gray-500">{module.sectionCode || 'Gyakorlat'}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-600">
                        {isExpanded ? 'Bezárás' : 'Osztályzás megnyitása'}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-gray-50 border-t rounded-b-xl animate-in fade-in slide-in-from-top-2">
                        <div className="overflow-hidden bg-white rounded-lg border shadow-sm">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                              <tr>
                                <th className="px-4 py-3">Tanuló Neve</th>
                                <th className="px-4 py-3">Aktuális Jegy</th>
                                <th className="px-4 py-3">Új Osztályzat</th>
                                <th className="px-4 py-3">Megjegyzés</th>
                                <th className="px-4 py-3 text-right">Művelet</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {filteredStudents.map(student => {
                                const currentGrade = moduleGrades.find(g => g.studentId === student.id && g.moduleId === module.id);
                                const edit = editingGrades[student.id] || { grade: "", comment: "" };
                                
                                return (
                                  <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                      {student.lastName} {student.firstName}
                                    </td>
                                    <td className="px-4 py-3">
                                      {currentGrade ? (
                                        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-bold text-white shadow-sm
                                          ${currentGrade.grade === 5 ? 'bg-green-500' : 
                                            currentGrade.grade === 4 ? 'bg-blue-500' : 
                                            currentGrade.grade === 3 ? 'bg-yellow-500' : 
                                            currentGrade.grade === 2 ? 'bg-orange-500' : 'bg-red-500'}`}
                                        >
                                          {currentGrade.grade}
                                        </span>
                                      ) : (
                                        <span className="text-gray-300 text-xs">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <Select 
                                        value={edit.grade} 
                                        onValueChange={(val) => setEditingGrades(prev => ({
                                          ...prev,
                                          [student.id]: { ...edit, grade: val }
                                        }))}
                                      >
                                        <SelectTrigger className="w-24 h-9 bg-white">
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
                                    <td className="px-4 py-3">
                                      <Input 
                                        placeholder="Megjegyzés..."
                                        value={edit.comment}
                                        onChange={(e) => setEditingGrades(prev => ({
                                          ...prev,
                                          [student.id]: { ...edit, comment: e.target.value }
                                        }))}
                                        className="h-9 bg-white text-xs"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleSaveStudentGrade(student.id, module.id)}
                                        disabled={!edit.grade || saveGradeMutation.isPending}
                                        className="h-9 px-4"
                                      >
                                        {saveGradeMutation.isPending && saveGradeMutation.variables?.studentId === student.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <><Save className="h-3.5 w-3.5 mr-1" /> Mentés</>
                                        )}
                                      </Button>
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
