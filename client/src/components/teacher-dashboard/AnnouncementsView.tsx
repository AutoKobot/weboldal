import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, MessageSquare, Trash2, Info, AlertTriangle } from "lucide-react";
import type { User, Class, ClassAnnouncement } from "@shared/schema";

interface Props {
  teacherClasses: Class[];
  students: User[];
}

export function AnnouncementsView({ teacherClasses, students }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "error">("info");
  const [annClassId, setAnnClassId] = useState<string>("all");
  const [isNewAnnDialogOpen, setIsNewAnnDialogOpen] = useState(false);

  const { data: announcements = [], isLoading } = useQuery<ClassAnnouncement[]>({
    queryKey: ["/api/announcements/my"],
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create announcement");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Üzenet elküldve az osztálynak." });
      setIsNewAnnDialogOpen(false);
      setAnnTitle("");
      setAnnContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/my"] });
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült elküldeni az üzenetet.", variant: "destructive" });
    }
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Üzenet törölve." });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/my"] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Üzenetek és Bejelentések
          </h2>
          <p className="text-gray-500">Küldjön fontos információkat közvetlenül az osztályoknak.</p>
        </div>
        
        <Dialog open={isNewAnnDialogOpen} onOpenChange={setIsNewAnnDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Új üzenet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Új osztály üzenet küldése</DialogTitle>
              <DialogDescription>
                Az üzenet minden kiválasztott osztályba tartozó diáknak meg fog jelenni a kezdőlapján.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ann-class">Cél osztály</Label>
                <Select value={annClassId} onValueChange={setAnnClassId}>
                  <SelectTrigger id="ann-class">
                    <SelectValue placeholder="Válasszon osztályt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teacherClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ann-type">Üzenet típusa</Label>
                <Select value={annType} onValueChange={(v: any) => setAnnType(v)}>
                  <SelectTrigger id="ann-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Információ (Kék)</SelectItem>
                    <SelectItem value="warning">Figyelmeztetés (Sárga)</SelectItem>
                    <SelectItem value="error">Fontos / Hiba (Piros)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ann-title">Cím</Label>
                <Input id="ann-title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Üzenet rövid címe..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ann-content">Tartalom</Label>
                <Textarea id="ann-content" value={annContent} onChange={(e) => setAnnContent(e.target.value)} placeholder="Részletes tájékoztatás..." className="min-h-[100px]" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ann-options">Válaszlehetőségek (JSON formátum, opcionális)</Label>
                <Input id="ann-options" placeholder='["Értettem", "Rendben"]' defaultValue='["Értettem"]' />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsNewAnnDialogOpen(false)}
              >
                Mégse
              </Button>
              <Button 
                onClick={() => {
                  if (annClassId === "all") {
                    toast({ variant: "destructive", title: "Hiba", description: "Kérjük, válasszon osztályt!" });
                    return;
                  }
                  let options = ["Értettem"];
                  try {
                    const optInput = document.getElementById("ann-options") as HTMLInputElement;
                    if (optInput && optInput.value) options = JSON.parse(optInput.value);
                  } catch (e) {}
                  
                  createAnnouncementMutation.mutate({
                    classId: parseInt(annClassId),
                    title: annTitle,
                    content: annContent,
                    type: annType,
                    options,
                    isActive: true
                  });
                }}
                disabled={createAnnouncementMutation.isPending || !annTitle || !annContent}
              >
                {createAnnouncementMutation.isPending ? "Küldés..." : "Üzenet küldése"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Üzenetek betöltése...</div>
        ) : announcements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Még nem küldtél üzenetet.</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((ann) => {
            const className = teacherClasses.find(c => c.id === ann.classId)?.name || "Ismeretlen osztály";
            return (
              <Card key={ann.id} className="overflow-hidden border-l-4" style={{ 
                borderLeftColor: ann.type === 'error' ? '#ef4444' : ann.type === 'warning' ? '#f59e0b' : '#3b82f6' 
              }}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {ann.type === 'error' ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <Info className="h-5 w-5 text-blue-500" />}
                      <h3 className="font-bold text-gray-900">{ann.title}</h3>
                      <Badge variant="outline">{className}</Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => deleteAnnouncementMutation.mutate(ann.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-gray-700 text-sm mb-4 whitespace-pre-wrap">{ann.content}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Létrehozva: {new Date(ann.createdAt).toLocaleString('hu-HU')}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
