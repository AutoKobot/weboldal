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
import { Users, Clock, AlertCircle, Calendar } from "lucide-react";
import { DayAttendanceEditor } from "./DayAttendanceEditor";
import { Student } from "./types";
import { queryClient } from "@/lib/queryClient";


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

  const { data: dailyAttendance = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${classId}/daily-attendance?startDate=${startDate}&endDate=${endDate}`],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/classes/${classId}/daily-attendance?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Hiba a havi jelenléti adatok lekérésekor");
      return res.json();
    },
    enabled: !!classId && classId !== 'all',
  });

  const { data: studentsData = [] } = useQuery<Student[]>({
    queryKey: ["/api/teacher/students"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/students");
      if (!res.ok) throw new Error("Hiba a tanulók betöltésekor");
      return res.json();
    }
  });

  const classStudents = useMemo(() => {
    return studentsData
      .filter(s => s.classId === parseInt(classId))
      .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'hu'));
  }, [studentsData, classId]);

  const attendanceMap = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    dailyAttendance.forEach(row => {
      if (!row.date) return;
      if (!map[row.student_id]) map[row.student_id] = {};
      map[row.student_id][row.date] = row;
    });
    return map;
  }, [dailyAttendance]);

  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to calculate hours between two time strings
  const calculateHours = (start: string | null, end: string | null) => {
    if (!start || !end) return 0;
    try {
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);
      const diffMins = (eH * 60 + eM) - (sH * 60 + sM);
      return Math.max(0, diffMins / 60);
    } catch (e) {
      return 0;
    }
  };

  if (isLoading) return (
    <div className="py-20 text-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-500">Havi összesítés betöltése...</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-blue-100 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[75vh]">
            <Table className="border-collapse table-fixed w-full">
              <TableHeader className="bg-gray-50 sticky top-0 z-30">
                <TableRow>
                  <TableHead className="sticky left-0 bg-gray-50 z-40 min-w-[200px] w-[200px] border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)] font-bold text-gray-700 px-4">Tanuló</TableHead>
                  <TableHead className="sticky left-[200px] bg-blue-50 z-40 min-w-[100px] w-[100px] border-r text-center text-[10px] font-bold text-gray-500 uppercase px-1 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Havi Összesen</TableHead>
                  {dayNumbers.map(d => {
                    const date = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), d);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                      <TableHead key={d} className={`text-center p-0.5 min-w-[32px] w-[32px] border-r text-[10px] font-bold ${isWeekend ? 'bg-red-50 text-red-400' : 'text-gray-600'}`}>
                        {d}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {classStudents.map(student => {
                  const studentRecords = attendanceMap[student.id] || {};
                  
                  // Calculate Totals
                  let totalHours = 0;
                  let absentDays = 0;
                  let excusedDays = 0;
                  let lateCount = 0;

                  Object.values(studentRecords).forEach(rec => {
                    if (rec.status === 'present' || rec.status === 'late') {
                      totalHours += calculateHours(rec.actual_start, rec.actual_end);
                      if (rec.status === 'late') lateCount++;
                    } else if (rec.status === 'absent') {
                      absentDays++;
                    } else if (rec.status === 'excused') {
                      excusedDays++;
                    }
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
                          <span className="truncate max-w-[130px]">{student.lastName} {student.firstName}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="sticky left-[200px] bg-blue-50/10 z-20 border-r p-1.5 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                         <div className="flex flex-col gap-0.5 text-[10px] font-bold leading-tight">
                            <div className="flex justify-between gap-1 text-blue-700"><span>Óra:</span><span>{totalHours.toFixed(1)}h</span></div>
                            <div className="flex justify-between gap-1 text-red-600"><span>H:</span><span>{absentDays}n</span></div>
                            <div className="flex justify-between gap-1 text-green-600"><span>I:</span><span>{excusedDays}n</span></div>
                         </div>
                      </TableCell>

                      {dayNumbers.map(d => {
                        const dateStr = `${month}-${d.toString().padStart(2, '0')}`;
                        const record = studentRecords[dateStr];
                        const date = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), d);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        
                        let cellContent = null;
                        let cellColor = "";

                        if (record) {
                          if (record.status === 'present') {
                            cellContent = "✓";
                            cellColor = "text-green-600";
                          } else if (record.status === 'late') {
                            cellContent = "K";
                            cellColor = "text-yellow-600";
                          } else if (record.status === 'absent') {
                            cellContent = "H";
                            cellColor = "text-red-600";
                          } else if (record.status === 'excused') {
                            cellContent = "I";
                            cellColor = "text-blue-600";
                          }
                        }

                        return (
                          <TableCell 
                            key={d} 
                            className={`p-0.5 border-r text-center cursor-pointer group relative hover:bg-gray-100 ${isWeekend ? 'bg-red-50/20' : ''}`}
                            onClick={() => setSelectedDayInfo({ studentId: student.id, studentName: `${student.lastName} ${student.firstName}`, date: dateStr })}
                          >
                            <span className={`text-[11px] font-bold ${cellColor}`}>
                              {cellContent}
                            </span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-4 text-[10px] text-gray-500 bg-white p-3 rounded-lg border border-gray-100">
           <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-500"></div> Jelen (✓)</div>
           <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500"></div> Hiányzik (H)</div>
           <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-500"></div> Igazolt (I)</div>
           <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-yellow-500"></div> Késő (K)</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3">
          <Clock className="h-4 w-4 text-blue-600" />
          <p className="text-[10px] text-blue-800">
            <strong>Havi Összesen:</strong> Az összesített óraszám a napi érkezési és távozási időpontok különbsége alapján számítódik.
          </p>
        </div>
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
                    onClose={() => {
                      setSelectedDayInfo(null);
                      // Refresh the grid
                      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/daily-attendance?startDate=${startDate}&endDate=${endDate}`] });
                    }}
                 />
               )}
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
