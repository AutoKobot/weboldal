import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Clock, ArrowRight, Save, CheckCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  studentId: string;
  date: string;
  classId: string;
  onClose: () => void;
}

export function DayAttendanceEditor({ studentId, date, classId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dailyData = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/teacher/classes/${classId}/daily-attendance?date=${date}`],
    enabled: !!classId && !!date,
  });

  const studentRecord = useMemo(() => {
    return dailyData?.find(d => d.student_id === studentId);
  }, [dailyData, studentId]);

  // If the record doesn't exist yet, we'll use defaults based on the class's shift
  const { data: classList = [] } = useQuery<any[]>({
    queryKey: ["/api/teacher/classes"],
  });

  const currentClass = useMemo(() => {
    return classList.find(c => c.id.toString() === classId);
  }, [classList, classId]);

  const defaultTimes = useMemo(() => {
    const isMorning = currentClass?.scheduleGroup !== 'afternoon';
    return {
      start: isMorning ? "08:00" : "15:00",
      end: isMorning ? "15:00" : "22:00"
    };
  }, [currentClass]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", `/api/teacher/classes/${classId}/daily-attendance`, {
        records: [{
          studentId,
          date,
          ...data
        }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${classId}/daily-attendance`] });
      toast({ title: "Sikeres mentés" });
      onClose();
    }
  });

  const [formData, setFormData] = useState({
    status: studentRecord?.status || 'present',
    actualStart: studentRecord?.actual_start || defaultTimes.start,
    actualEnd: studentRecord?.actual_end || defaultTimes.end
  });

  // Sync with loaded data
  useEffect(() => {
    if (studentRecord) {
      setFormData({
        status: studentRecord.status,
        actualStart: studentRecord.actual_start || defaultTimes.start,
        actualEnd: studentRecord.actual_end || defaultTimes.end
      });
    }
  }, [studentRecord, defaultTimes]);

  if (isLoading) return <div className="text-center p-10"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></div>;

  const isAbsent = formData.status === 'absent' || formData.status === 'excused';

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">Jelenlét Státusza</label>
          <Select
            value={formData.status}
            onValueChange={(s) => setFormData(prev => ({
              ...prev,
              status: s,
              actualStart: s === 'absent' || s === 'excused' ? null : (prev.actualStart || defaultTimes.start),
              actualEnd: s === 'absent' || s === 'excused' ? null : (prev.actualEnd || defaultTimes.end)
            }))}
          >
            <SelectTrigger className="w-full font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Jelen</SelectItem>
              <SelectItem value="late">Késő</SelectItem>
              <SelectItem value="excused">Igazolt hiányzás</SelectItem>
              <SelectItem value="absent">Hiányzik (Igazolatlan)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1">
              <Clock className="h-3 w-3" /> Érkezés
            </label>
            <Input
              type="time"
              value={formData.actualStart || ""}
              disabled={isAbsent}
              onChange={(e) => setFormData(prev => ({ ...prev, actualStart: e.target.value }))}
              className="font-mono text-center"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> Távozás
            </label>
            <Input
              type="time"
              value={formData.actualEnd || ""}
              disabled={isAbsent}
              onChange={(e) => setFormData(prev => ({ ...prev, actualEnd: e.target.value }))}
              className="font-mono text-center"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-2">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={() => updateMutation.mutate(formData)}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Változtatások Mentése
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Mégse</Button>
      </div>
    </div>
  );
}
