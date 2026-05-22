import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Settings, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ClassData } from "./types";

interface Props {
  selectedClassId: string;
  teacherClasses: ClassData[];
}

export function GradeThresholdEditor({ selectedClassId, teacherClasses }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const selectedClass = teacherClasses.find(c => c.id.toString() === selectedClassId);

  const [thresholds, setThresholds] = useState({
    grade5: 90, grade4: 65, grade3: 55, grade2: 45
  });

  const { data: serverThresholds, isLoading } = useQuery<any>({
    queryKey: [`/api/teacher/classes/${selectedClassId}/grade-thresholds`],
    enabled: !!selectedClassId && selectedClassId !== "all",
  });

  useEffect(() => {
    if (serverThresholds) {
      setThresholds(serverThresholds);
    }
  }, [serverThresholds]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/teacher/classes/${selectedClassId}/grade-thresholds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Hiba a mentéskor");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sikeres mentés", description: "Az osztályzat határok frissítve." });
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/classes/${selectedClassId}/grades`] });
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült menteni a határokat.", variant: "destructive" });
    }
  });

  if (!selectedClass || selectedClassId === "all") return null;

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4 text-blue-600" />
          Osztályzat határok beállítása – <span className="font-bold">{selectedClass.name}</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Állítsa be, hogy hány százalék felett kapjon a diák egy-egy osztályzatot a tesztekben.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-bold flex items-center gap-1">
                  5 - Jeles <Percent className="h-3 w-3" />
                </Label>
                <Input
                  type="number" min={1} max={100}
                  value={thresholds.grade5}
                  onChange={(e) => setThresholds(prev => ({ ...prev, grade5: parseInt(e.target.value) || 0 }))}
                  className="h-8 text-center font-bold text-green-700 border-green-200 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-bold flex items-center gap-1">
                  4 - Jó <Percent className="h-3 w-3" />
                </Label>
                <Input
                  type="number" min={1} max={100}
                  value={thresholds.grade4}
                  onChange={(e) => setThresholds(prev => ({ ...prev, grade4: parseInt(e.target.value) || 0 }))}
                  className="h-8 text-center font-bold text-blue-700 border-blue-200 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-bold flex items-center gap-1">
                  3 - Közepes <Percent className="h-3 w-3" />
                </Label>
                <Input
                  type="number" min={1} max={100}
                  value={thresholds.grade3}
                  onChange={(e) => setThresholds(prev => ({ ...prev, grade3: parseInt(e.target.value) || 0 }))}
                  className="h-8 text-center font-bold text-yellow-700 border-yellow-200 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-bold flex items-center gap-1">
                  2 - Elégséges <Percent className="h-3 w-3" />
                </Label>
                <Input
                  type="number" min={1} max={100}
                  value={thresholds.grade2}
                  onChange={(e) => setThresholds(prev => ({ ...prev, grade2: parseInt(e.target.value) || 0 }))}
                  className="h-8 text-center font-bold text-orange-700 border-orange-200 bg-white"
                />
              </div>
            </div>
            <Button
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
              size="sm"
              onClick={() => saveMutation.mutate(thresholds)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Határok mentése
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}