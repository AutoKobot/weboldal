import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

interface Props {
  studentId: string;
  date: string;
  classId: string;
  onClose: () => void;
}

export function DayAttendanceEditor({ studentId, date, classId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dayData = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${classId}/attendance?date=${date}`],
    enabled: !!classId && !!date,
  });

  const studentHours = useMemo(() => {
    return dayData.filter((d: any) => d.student_id === studentId).sort((a, b) => a.period_number - b.period_number);
  }, [dayData, studentId]);

  const handleUpdate = async (attendanceId: number, status: string, periodNumber: number) => {
    try {
      if (attendanceId === -1) {
        await fetch(`/api/teacher/classes/${classId}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, date, periodNumber, status }),
        });
      } else {
        await fetch(`/api/teacher/attendance/${attendanceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/attendance?date=${date}`] });
      
      const monthStr = date.substring(0, 7);
      const startDate = `${monthStr}-01`;
      const endOfMonth = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0);
      const endDate = endOfMonth.toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/attendance?startDate=${startDate}&endDate=${endDate}`] });
    } catch (e) {
      toast({ variant: "destructive", title: "Hiba", description: "Sikertelen mentés" });
    }
  };

  const justifyAll = async () => {
    try {
      const periods = [1, 2, 3, 4, 5, 6, 7, 8];
      for (const p of periods) {
        const h = studentHours.find((sh: any) => sh.period_number === p);
        if (!h || h.status === 'absent') {
          await handleUpdate(h?.id || -1, 'excused', p);
        }
      }
      toast({ title: "Sikeres igazolás", description: "A nap összes óráját leigazoltuk." });
      onClose();
    } catch (e) {
      toast({ variant: "destructive", title: "Hiba", description: "Hiba történt az igazolás közben." });
    }
  };

  if (isLoading) return <div className="text-center p-4">Betöltés...</div>;

  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="space-y-3">
      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
        {periods.map((p) => {
          const h = studentHours.find((sh: any) => sh.period_number === p);
          const currentStatus = h?.status || 'absent';
          
          return (
            <div key={p} className="flex items-center justify-between p-2 rounded-md bg-gray-50 border">
              <span className="text-sm font-medium">{p}. óra</span>
              <Select value={currentStatus} onValueChange={(s) => handleUpdate(h?.id || -1, s, p)}>
                <SelectTrigger className={`w-32 h-8 text-xs font-semibold ${
                  currentStatus === 'present' ? 'bg-green-50 border-green-200 text-green-700' :
                  currentStatus === 'late' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                  currentStatus === 'excused' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Jelen</SelectItem>
                  <SelectItem value="excused">Igazolt</SelectItem>
                  <SelectItem value="absent">Hiányzik</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      <div className="pt-4 flex flex-col gap-2">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700" 
          onClick={justifyAll}
          disabled={!periods.some(p => {
            const h = studentHours.find((sh: any) => sh.period_number === p);
            return !h || h.status === 'absent';
          })}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Összes hiányzás igazolása (Napi)
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Bezárás</Button>
      </div>
    </div>
  );
}
