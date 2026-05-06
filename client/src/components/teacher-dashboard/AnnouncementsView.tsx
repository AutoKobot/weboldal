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
import { Bell, Plus, MessageSquare, Trash2, Info, AlertTriangle, Users, ChevronDown, ChevronUp, Check, Clock } from "lucide-react";
import type { User, Class, ClassAnnouncement } from "@shared/schema";

interface Props {
  teacherClasses: Class[];
  students: User[];
}

function AnnouncementStats({ announcementId }: { announcementId: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: stats = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/announcements/${announcementId}/stats`],
    enabled: isOpen,
  });

  const total = stats.length;
  const acknowledgedCount = stats.filter(s => s.response !== null).length;

  return (
    <div className="mt-4 border-t pt-3">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between hover:bg-slate-50 text-gray-500 flex items-center h-8 px-2 rounded"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2 font-semibold text-[11px] tracking-wide uppercase text-slate-500">
          <Users className="h-4 w-4 text-slate-400" />
          Visszajelzések ({acknowledgedCount} / {total} elolvasta)
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </Button>

      {isOpen && (
        <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pl-1 pr-1">
          {isLoading ? (
            <div className="text-xs text-gray-400 text-center py-2">Betöltés...</div>
          ) : stats.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-2">Nincsenek tanulók ebben az osztályban.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pb-1">
              {stats.map((s, idx) => {
                const name = `${s.lastName || ""} ${s.firstName || ""}`.trim() || s.username;
                const isAcked = s.response !== null;
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100 text-xs">
                    <span className="font-medium text-slate-600 truncate max-w-[150px]">{name}</span>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {isAcked ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] py-0 px-1.5 leading-none h-4">
                            {s.response}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-100 text-[10px] py-0 px-1.5 leading-none h-4">
                            Olvasatlan
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AnnouncementsView({ teacherClasses, students }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "error">("info");
  const [annClassId, setAnnClassId] = useState<string>("all");
  const [isNewAnnDialogOpen, setIsNewAnnDialogOpen] = useState(false);
  const [annOptions, setAnnOptions] = useState<string[]>(["Értettem"]);
  const [customOptionText, setCustomOptionText] = useState("");

  const { data: announcements = [], isLoading } = useQuery<ClassAnnouncement[]>({
    queryKey: ["/api/announcements/teacher"],
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
      setAnnOptions(["Értettem"]);
      setCustomOptionText("");
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/teacher"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/teacher"] });
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
              <div className="grid gap-2 border-t pt-3 mt-1">
                <Label className="text-sm font-semibold text-slate-700">Visszajelzési gombok (Diák oldali gombok)</Label>
                <span className="text-[11px] text-slate-500 leading-normal">
                  Válasszon egy kész sablont vagy készítsen egyedi gombokat, amikkel a tanulók válaszolni tudnak.
                </span>

                {/* Preset selectors */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-[10px] h-7 px-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-medium"
                    onClick={() => setAnnOptions(["Értettem"])}
                  >
                    Csak visszaigazolás ("Értettem")
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-[10px] h-7 px-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-medium"
                    onClick={() => setAnnOptions(["Ott leszek", "Nem érek rá"])}
                  >
                    Jelenlét ("Ott leszek", "Nem érek rá")
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-[10px] h-7 px-2 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-medium"
                    onClick={() => setAnnOptions(["Megértettem", "Kérdésem van"])}
                  >
                    Megértés ("Megértettem", "Kérdésem van")
                  </Button>
                </div>

                {/* Current options chips */}
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50/50 border border-slate-100 rounded-xl min-h-[44px] items-center mt-2">
                  {annOptions.map((opt, i) => (
                    <Badge key={i} className="bg-white text-slate-700 border border-slate-200 shadow-sm pr-1.5 py-1 rounded-lg flex items-center gap-1 font-medium text-xs">
                      <span>{opt}</span>
                      <button
                        type="button"
                        onClick={() => setAnnOptions(annOptions.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500 shrink-0 w-3.5 h-3.5 flex items-center justify-center font-bold text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {annOptions.length === 0 && (
                    <span className="text-xs text-slate-400 pl-1">Adj meg legalább egy gombot!</span>
                  )}
                </div>

                {/* Custom option adder */}
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Egyedi gomb felirat (pl. Holnap pótolom)..."
                    value={customOptionText}
                    onChange={(e) => setCustomOptionText(e.target.value)}
                    className="h-8 text-xs rounded-lg flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customOptionText.trim()) {
                        e.preventDefault();
                        if (!annOptions.includes(customOptionText.trim())) {
                          setAnnOptions([...annOptions, customOptionText.trim()]);
                        }
                        setCustomOptionText("");
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-3 shrink-0"
                    onClick={() => {
                      if (customOptionText.trim()) {
                        if (!annOptions.includes(customOptionText.trim())) {
                          setAnnOptions([...annOptions, customOptionText.trim()]);
                        }
                        setCustomOptionText("");
                      }
                    }}
                  >
                    + Hozzáad
                  </Button>
                </div>
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
                  if (annOptions.length === 0) {
                    toast({ variant: "destructive", title: "Hiba", description: "Kérjük, adjon meg legalább egy visszajelzési gombot!" });
                    return;
                  }
                  
                  createAnnouncementMutation.mutate({
                    classId: parseInt(annClassId),
                    title: annTitle,
                    content: annContent,
                    type: annType,
                    options: annOptions,
                    isActive: true
                  });
                }}
                disabled={createAnnouncementMutation.isPending || !annTitle || !annContent || annOptions.length === 0}
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
                  <AnnouncementStats announcementId={ann.id} />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
