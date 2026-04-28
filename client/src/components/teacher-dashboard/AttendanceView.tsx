import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, Pencil, Save, X as XIcon, GraduationCap, ClipboardList } from "lucide-react";

interface Props {
  attendanceClassId: string;
  attendanceDate: string;
}

export function AttendanceView({ attendanceClassId, attendanceDate }: Props) {
  const queryClient = useQueryClient();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const { toast } = useToast();

  const { data: attData = [], isLoading: attLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${attendanceClassId}/attendance?date=${attendanceDate}`],
    enabled: attendanceClassId !== 'all',
    refetchInterval: 30_000,
  });

  const { data: notesData = [] } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${attendanceClassId}/notes?date=${attendanceDate}`],
    enabled: attendanceClassId !== 'all',
  });

  const notesByStudent = useMemo(() => {
    const map: Record<string, string> = {};
    notesData.forEach((n: any) => { map[n.student_id] = n.note; });
    return map;
  }, [notesData]);

  const byPeriod = useMemo(() => {
    const map: Record<number, any[]> = {};
    attData.forEach((row: any) => {
      if (!map[row.period_number]) map[row.period_number] = [];
      map[row.period_number].push(row);
    });
    return map;
  }, [attData]);

  const periods = Object.keys(byPeriod).map(Number).sort((a, b) => a - b);

  const statusColor = (s: string) => {
    if (s === 'present') return 'bg-green-100 text-green-800 border-green-300';
    if (s === 'late') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (s === 'excused') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const statusLabel = (s: string) => {
    if (s === 'present') return 'Jelen';
    if (s === 'late') return 'Késő';
    if (s === 'excused') return 'Igazolt';
    return 'Hiányzik';
  };

  const handleStatusChange = async (attendanceId: number, newStatus: string, studentData?: any) => {
    try {
      if (attendanceId === -1 && studentData) {
        await fetch(`/api/teacher/classes/${attendanceClassId}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            studentId: studentData.student_id,
            date: attendanceDate,
            periodNumber: studentData.period_number,
            status: newStatus,
          }),
        });
      } else {
        await fetch(`/api/teacher/attendance/${attendanceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus }),
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${attendanceClassId}/attendance?date=${attendanceDate}`] });
    } catch (error) {
      console.error("Attendance update error:", error);
      toast({
        variant: "destructive",
        title: "Hiba",
        description: "Nem sikerült módosítani a jelenléti állapotot."
      });
    }
  };

  const handleSaveNote = async (studentId: string) => {
    setSavingNote(true);
    try {
      await fetch(`/api/teacher/students/${studentId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          date: attendanceDate,
          note: noteText,
          classId: parseInt(attendanceClassId),
        }),
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${attendanceClassId}/notes?date=${attendanceDate}`] });
      setEditingNote(null);
      setNoteText("");
      toast({
        title: "Mentve",
        description: "A megjegyzést sikeresen elmentettük."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hiba",
        description: "Nem sikerült elmenteni a megjegyzést."
      });
    } finally {
      setSavingNote(false);
    }
  };

  if (attLoading) {
    return (
      <Card className="p-10 text-center">
        <GraduationCap className="h-10 w-10 mx-auto text-blue-400 animate-spin mb-3" />
        <p className="text-gray-500">Jelenléti adatok betöltése...</p>
      </Card>
    );
  }

  if (attData.length === 0) {
    return (
      <Card className="p-10 text-center border-dashed">
        <ClipboardList className="h-10 w-10 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Ezen a napon még nincs automatikusan rögzített jelenléti adat.</p>
        <p className="text-gray-400 text-sm mt-1">A diákok bejelentkezésekor automatikusan rögzítődik a jelenlétük.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['present', 'late', 'excused', 'absent'] as const).map(status => {
          const count = attData.filter((r: any) => r.status === status).length;
          return (
            <div key={status} className={`rounded-lg p-3 border text-center ${statusColor(status)}`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-medium">{statusLabel(status)}</p>
            </div>
          );
        })}
      </div>

      {periods.map(period => (
        <Card key={period}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              {period}. tanóra
              <Badge variant="secondary" className="ml-auto">
                {byPeriod[period].length} diák
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <div className="space-y-2">
              {byPeriod[period]
                .sort((a: any, b: any) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`, 'hu'))
                .map((row: any) => {
                  const studentId = row.student_id;
                  const isEditingThisNote = editingNote === studentId;
                  const existingNote = notesByStudent[studentId];

                  return (
                    <div key={`${studentId}-${period}`} className="flex flex-col gap-1 p-2 rounded-lg bg-gray-50 border">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm flex-1 min-w-0 truncate">
                          {row.last_name} {row.first_name || ''}
                          <span className="text-gray-400 font-normal ml-1 text-xs">@{row.username}</span>
                        </span>

                        {row.login_at && (
                          <span className="text-xs text-gray-400 hidden sm:inline">
                            {new Date(row.login_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}

                        <Select
                          value={row.status}
                          onValueChange={s => handleStatusChange(row.id, s, row)}
                        >
                          <SelectTrigger className={`h-8 w-28 text-xs border font-medium ${statusColor(row.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Jelen</SelectItem>
                            <SelectItem value="late">Késő</SelectItem>
                            <SelectItem value="excused">Igazolt</SelectItem>
                            <SelectItem value="absent">Hiányzik</SelectItem>
                          </SelectContent>
                        </Select>

                        <button
                          onClick={() => {
                            if (isEditingThisNote) {
                              setEditingNote(null);
                              setNoteText("");
                            } else {
                              setEditingNote(studentId);
                              setNoteText(existingNote || "");
                            }
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            existingNote
                              ? 'text-orange-500 hover:bg-orange-50'
                              : 'text-gray-400 hover:bg-gray-200'
                          }`}
                          title={existingNote ? 'Megjegyzés szerkesztése' : 'Megjegyzés hozzáadása'}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {existingNote && !isEditingThisNote && (
                        <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1 ml-2 border border-orange-200">
                          📝 {existingNote}
                        </p>
                      )}

                      {isEditingThisNote && (
                        <div className="flex gap-2 ml-2 mt-1">
                          <Textarea
                            className="text-sm h-16 resize-none flex-1"
                            placeholder="Napi megjegyzés..."
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleSaveNote(studentId)}
                              disabled={savingNote}
                              className="p-1.5 rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setEditingNote(null); setNoteText(""); }}
                              className="p-1.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                            >
                              <XIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
