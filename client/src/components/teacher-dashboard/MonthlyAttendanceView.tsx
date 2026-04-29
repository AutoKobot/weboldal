import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Users } from "lucide-react";
import { DayAttendanceEditor } from "./DayAttendanceEditor";
import { Student } from "./types";

interface Props {
  classId: string;
  month: string;
}

export function MonthlyAttendanceView({ classId, month }: Props) {
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
                  <TableHead className="sticky left-0 bg-gray-50 z-40 min-w-[220px] w-[220px] border-r shadow-[2px_0_5_rgba(0,0,0,0.05)] font-bold text-gray-700 px-4">Tanuló</TableHead>
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
}
