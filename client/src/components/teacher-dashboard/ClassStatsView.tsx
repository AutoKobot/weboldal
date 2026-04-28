import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Award, FileText, Users } from "lucide-react";
import { Student as User, ClassData as Class, GradeResult } from "./types";

interface Props {
  teacherClasses: Class[];
  students: User[];
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  timeFilter: string;
  setTimeFilter: (val: string) => void;
}

export function ClassStatsView({
  teacherClasses,
  students,
  selectedClassId,
  setSelectedClassId,
  selectedStudentId,
  setSelectedStudentId,
  timeFilter,
  setTimeFilter
}: Props) {

  // Logic for startDate string moved here or passed via props
  let startDateStr = "";
  if (timeFilter === "week") {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 7);
    startDateStr = d.toISOString();
  } else if (timeFilter === "month") {
    const d = new Date(); d.setHours(0,0,0,0); d.setMonth(d.getMonth() - 1);
    startDateStr = d.toISOString();
  }

  let gradesQueryKey: string | null = null;
  if (selectedClassId && selectedClassId !== "all") {
    const params = new URLSearchParams();
    if (startDateStr) params.append('startDate', startDateStr);
    if (selectedStudentId !== "all") params.append('studentId', selectedStudentId);
    gradesQueryKey = `/api/teacher/classes/${selectedClassId}/grades${params.toString() ? `?${params.toString()}` : ''}`;
  }

  const { data: classGrades = [], isLoading: gradesLoading } = useQuery<GradeResult[]>({
    queryKey: [gradesQueryKey],
    enabled: !!gradesQueryKey
  });

  const averageClassGrade = classGrades.length > 0
    ? (classGrades.reduce((acc, curr) => acc + curr.grade, 0) / classGrades.length).toFixed(1)
    : "0.0";

  return (
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
              setSelectedStudentId("all");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Válasszon osztályt..." />
              </SelectTrigger>
              <SelectContent>
                {teacherClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
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
                        {student.lastName && student.firstName ? `${student.lastName} ${student.firstName}` : student.username}
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

            {gradesLoading ? (
               <div className="text-center py-8">Betöltés...</div>
            ) : classGrades.length > 0 ? (
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
              <p className="text-center text-gray-500 py-8">Ebben az időszakban nem születtek eredmények.</p>
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
  );
}
