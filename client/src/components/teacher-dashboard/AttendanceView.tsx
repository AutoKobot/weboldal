import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Pencil, 
  Save, 
  X as XIcon, 
  Loader2, 
  CheckCircle2, 
  CalendarDays,
  UserCheck,
  Clock,
  ArrowRight
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  attendanceClassId: string;
  attendanceDate: string;
}

export function AttendanceView({ attendanceClassId, attendanceDate }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);

  // Queries
  const { data: dailyData = [], isLoading: dailyLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${attendanceClassId}/daily-attendance?date=${attendanceDate}`],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/classes/${attendanceClassId}/daily-attendance?date=${attendanceDate}`);
      if (!res.ok) throw new Error("Hiba a jelenléti adatok lekérésekor");
      return res.json();
    },
    enabled: attendanceClassId !== 'all',
  });

  const { data: classList = [] } = useQuery<any[]>({
    queryKey: ["/api/teacher/classes"],
    queryFn: async () => {
      const res = await fetch("/api/teacher/classes");
      if (!res.ok) throw new Error("Hiba az osztályok lekérésekor");
      return res.json();
    }
  });

  const currentClass = useMemo(() => {
    return classList.find(c => c.id.toString() === attendanceClassId);
  }, [classList, attendanceClassId]);

  const defaultTimes = useMemo(() => {
    const isMorning = currentClass?.scheduleGroup !== 'afternoon';
    return {
      start: isMorning ? "08:00" : "15:00",
      end: isMorning ? "15:00" : "22:00"
    };
  }, [currentClass]);

  // Mutations
  const updateDailyMutation = useMutation({
    mutationFn: async (record: any) => {
      await apiRequest("POST", `/api/teacher/classes/${attendanceClassId}/daily-attendance`, { 
        records: [record] 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${attendanceClassId}/daily-attendance?date=${attendanceDate}`] });
    }
  });

  const bulkPresentMutation = useMutation({
    mutationFn: async () => {
      const records = dailyData.map(d => ({
        studentId: d.student_id,
        date: attendanceDate,
        status: 'present',
        actualStart: defaultTimes.start,
        actualEnd: defaultTimes.end
      }));
      
      await apiRequest("POST", `/api/teacher/classes/${attendanceClassId}/daily-attendance`, { records });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${attendanceClassId}/daily-attendance?date=${attendanceDate}`] });
      toast({ title: "Sikeres frissítés", description: "Mindenki jelenlétét alaphelyzetbe állítottuk." });
    }
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'excused': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-50 text-gray-400 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return 'Jelen';
      case 'absent': return 'Hiányzik (Igazolatlan)';
      case 'late': return 'Késő';
      case 'excused': return 'Igazolt Hiányzás';
      default: return 'Nincs rögzítve';
    }
  };

  if (dailyLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500">Adatok betöltése...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900">
            {new Date(attendanceDate).toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          <Badge variant="outline" className="ml-2 uppercase text-[10px]">
            {currentClass?.scheduleGroup === 'afternoon' ? 'Délutános' : 'Délelőttös'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
            onClick={() => bulkPresentMutation.mutate()}
            disabled={bulkPresentMutation.isPending}
          >
            {bulkPresentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Mindenki Jelen (Alapértelmezett: {defaultTimes.start}-{defaultTimes.end})
          </Button>
        </div>
      </div>

      {/* Daily Attendance Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 text-left font-bold text-gray-700 min-w-[200px] border-r">Tanuló Neve</th>
              <th className="p-4 text-center min-w-[180px] border-r">Állapot</th>
              <th className="p-4 text-center min-w-[120px] border-r">Érkezés (Kezdés)</th>
              <th className="p-4 text-center min-w-[120px] border-r">Távozás</th>
              <th className="p-4 text-right">Megjegyzés</th>
            </tr>
          </thead>
          <tbody>
            {dailyData.map(row => {
              const status = row.status || 'absent';
              const isAbsent = status === 'absent' || status === 'excused';
              
              return (
                <tr key={row.student_id} className={`border-b hover:bg-gray-50/50 transition-colors ${isAbsent ? 'bg-gray-50/30' : ''}`}>
                  <td className="p-4 font-medium border-r">
                    <div className="flex flex-col">
                      <span>{row.last_name} {row.first_name}</span>
                      <span className="text-[10px] text-gray-400">@{row.username}</span>
                    </div>
                  </td>
                  
                  <td className="p-4 border-r text-center">
                    <Select 
                      value={status} 
                      onValueChange={(s) => updateDailyMutation.mutate({
                        studentId: row.student_id,
                        date: attendanceDate,
                        status: s,
                        actualStart: s === 'absent' || s === 'excused' ? null : (row.actual_start || defaultTimes.start),
                        actualEnd: s === 'absent' || s === 'excused' ? null : (row.actual_end || defaultTimes.end)
                      })}
                    >
                      <SelectTrigger className={`h-9 w-full font-medium border-2 ${getStatusStyle(status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Jelen</SelectItem>
                        <SelectItem value="late">Késő</SelectItem>
                        <SelectItem value="excused">Igazolt hiányzás</SelectItem>
                        <SelectItem value="absent">Hiányzik (Igazolatlan)</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="p-4 border-r text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className={`h-4 w-4 ${isAbsent ? 'text-gray-300' : 'text-blue-500'}`} />
                      <Input 
                        type="time" 
                        value={row.actual_start || (isAbsent ? "" : defaultTimes.start)}
                        disabled={isAbsent}
                        onChange={(e) => updateDailyMutation.mutate({
                          studentId: row.student_id,
                          date: attendanceDate,
                          status: status === 'absent' || status === 'excused' ? 'present' : status,
                          actualStart: e.target.value,
                          actualEnd: row.actual_end || defaultTimes.end
                        })}
                        className={`h-9 w-24 text-center font-mono ${isAbsent ? 'opacity-30' : ''}`}
                      />
                    </div>
                  </td>

                  <td className="p-4 border-r text-center">
                    <div className="flex items-center justify-center gap-2">
                      <ArrowRight className={`h-4 w-4 ${isAbsent ? 'text-gray-300' : 'text-orange-500'}`} />
                      <Input 
                        type="time" 
                        value={row.actual_end || (isAbsent ? "" : defaultTimes.end)}
                        disabled={isAbsent}
                        onChange={(e) => updateDailyMutation.mutate({
                          studentId: row.student_id,
                          date: attendanceDate,
                          status: status === 'absent' || status === 'excused' ? 'present' : status,
                          actualStart: row.actual_start || defaultTimes.start,
                          actualEnd: e.target.value
                        })}
                        className={`h-9 w-24 text-center font-mono ${isAbsent ? 'opacity-30' : ''}`}
                      />
                    </div>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {row.notes && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] max-w-[150px] truncate">
                          {row.notes}
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingNote(row.student_id);
                          setNoteText(row.notes || "");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend & Instructions */}
      <Card className="bg-blue-50/50 border-blue-100">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-700">
          <div className="flex gap-4">
            <p><strong>Javaslat:</strong> Használd a "Mindenki Jelen" gombot a gyors kezdéshez.</p>
            <p><strong>Késés:</strong> Állítsd a státuszt "Késő"-re, és módosítsd az Érkezés időpontját.</p>
          </div>
          <p className="italic">* A módosítások azonnal mentésre kerülnek.</p>
        </CardContent>
      </Card>

      {/* Note Edit Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold">Megjegyzés hozzáadása</h3>
              <Textarea 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Pl. igazolást hozott, orvosnál volt..."
                className="min-h-[120px]"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingNote(null)}>Mégse</Button>
                <Button 
                  onClick={async () => {
                    setSavingNote(true);
                    try {
                      const student = dailyData.find(d => d.student_id === editingNote);
                      await apiRequest("POST", `/api/teacher/classes/${attendanceClassId}/daily-attendance`, {
                        records: [{
                          studentId: editingNote,
                          date: attendanceDate,
                          status: student?.status || 'present',
                          actualStart: student?.actual_start || defaultTimes.start,
                          actualEnd: student?.actual_end || defaultTimes.end,
                          notes: noteText
                        }]
                      });
                      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${attendanceClassId}/daily-attendance?date=${attendanceDate}`] });
                      setEditingNote(null);
                      toast({ title: "Sikeres mentés" });
                    } finally {
                      setSavingNote(false);
                    }
                  }}
                  disabled={savingNote}
                >
                  {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mentés"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
