import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Edit, Trash2, BookOpen, Globe, Calendar, Download, Loader2, Clock,
  Wrench, HardHat, Cpu, Hammer, Zap, Car, Briefcase, Heart, Utensils, Building, GraduationCap, Wand2, MonitorPlay
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Profession, insertProfessionSchema } from "./types";
import { IKKManager } from "./IKKManager";

const iconOptions = [
  { value: "wrench", label: "Kulcs (Hegesztő, Szerelő)", icon: Wrench },
  { value: "hard-hat", label: "Sisak (Építőipar)", icon: HardHat },
  { value: "cpu", label: "Processzor (IT)", icon: Cpu },
  { value: "hammer", label: "Kalapács (Kézműves)", icon: Hammer },
  { value: "zap", label: "Villám (Elektromos)", icon: Zap },
  { value: "car", label: "Autó (Gépjármű)", icon: Car },
  { value: "briefcase", label: "Táska (Üzleti)", icon: Briefcase },
  { value: "heart", label: "Szív (Egészségügy)", icon: Heart },
  { value: "utensils", label: "Evőeszköz (Vendéglátás)", icon: Utensils },
  { value: "building", label: "Épület (Építészet)", icon: Building },
  { value: "graduation-cap", label: "Sisak (Oktatás)", icon: GraduationCap },
];

export function ProfessionManager({ professions, subjects = [], modules = [], onSelect }: { professions: any[], subjects?: any[], modules?: any[], onSelect: (id: number) => void }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isIKKDialogOpen, setIsIKKDialogOpen] = useState(false);
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null);

  const calculateProfessionHours = (professionId: number) => {
    return subjects
      .filter((s: any) => s.professionId === professionId)
      .reduce((sum: number, s: any) => {
        const sHours = typeof s.hours === 'number' ? s.hours : (parseFloat(String(s.hours)) || null);
        const h = sHours !== null ? sHours : (parseFloat(String(s.totalSuggestedHours)) || 0);
        return sum + (Number(h) || 0);
      }, 0);
  };

  const form = useForm({
    resolver: zodResolver(insertProfessionSchema),
    defaultValues: {
      name: "",
      description: "",
      iconName: "wrench",
      iconUrl: "",
      totalHours: null as number | null,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/professions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/professions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ikk/professions"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Siker", description: "Szakma létrehozva" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await apiRequest("PUT", `/api/admin/professions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/professions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ikk/professions"] });
      setIsDialogOpen(false);
      setEditingProfession(null);
      form.reset();
      toast({ title: "Siker", description: "Szakma frissítve" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/professions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/professions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ikk/professions"] });
      toast({ title: "Siker", description: "Szakma törölve" });
    }
  });

  const [isImporting, setIsImporting] = useState<number | null>(null);
  const importMutation = useMutation({
    mutationFn: async ({ profession, importType }: { profession: any, importType: string }) => {
      setIsImporting(profession.id);
      const ikkProf = {
        id: profession.externalId || profession.id,
        name: profession.name,
        code: profession.code
      };
      const res = await apiRequest("POST", "/api/admin/ikk/import", { profession: ikkProf, importType });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Elindítva", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      setIsImporting(null);
    }
  });

  const handleEdit = (prof: any) => {
    setEditingProfession(prof);
    form.reset({
      name: prof.name,
      description: prof.description || "",
      iconName: prof.iconName || "wrench",
      iconUrl: prof.iconUrl || "",
      totalHours: prof.totalHours || null,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Szakmák kezelése</h2>
          <p className="text-sm text-muted-foreground">Válassz szakmát a tantárgyak és modulok megtekintéséhez</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsIKKDialogOpen(true)}>
            <Globe className="h-4 w-4 mr-2" /> IKK Import
          </Button>
          <Button onClick={() => { setEditingProfession(null); form.reset({ name: "", description: "", iconName: "wrench", iconUrl: "", totalHours: null }); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Új Szakma
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {professions.map(prof => {
          const IconComp = iconOptions.find(o => o.value === prof.iconName)?.icon || BookOpen;
          return (
            <Card key={prof.id} className="group hover:border-primary transition-colors cursor-pointer flex flex-col" onClick={() => onSelect(prof.id)}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {prof.code && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {prof.code}
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] h-5 flex items-center gap-1 cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all ${prof.totalHours ? 'border-blue-100 bg-blue-50/30 text-blue-700' : 'border-blue-100 bg-blue-50/10 text-blue-600 italic'}`}
                      onClick={(e) => { e.stopPropagation(); handleEdit(prof); }}
                      title="Szerkesztés"
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {prof.totalHours || calculateProfessionHours(prof.id).toFixed(0)} óra {prof.totalHours ? '' : '(jav.)'}
                    </Badge>
                    {(prof.totalHours || calculateProfessionHours(prof.id)) > 0 && prof.moduleCount > 0 && (
                      <Badge variant="outline" className="text-[10px] h-5 border-slate-200 text-slate-500 bg-slate-50/50">
                        ~{Math.round(((prof.totalHours || calculateProfessionHours(prof.id)) / prof.moduleCount) * 10) / 10} óra / modul
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      ID: {prof.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-base font-bold">{prof.name}</CardTitle>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-100" 
                    onClick={(e) => { e.stopPropagation(); handleEdit(prof); }}
                    title="Szerkesztés"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={(e) => { e.stopPropagation(); if(confirm('Törli a szakmát minden adatával?')) deleteMutation.mutate(prof.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">{prof.description}</p>
                
                <div className="space-y-3 mt-auto">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      <span>{prof.subjectCount || 0} tantárgy</span>
                      <span className="text-slate-300">•</span>
                      <span>{prof.moduleCount || 0} modul</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{(prof.updatedAt || prof.createdAt) ? new Date((prof.updatedAt || prof.createdAt)!).toLocaleDateString('hu-HU') : 'Ismeretlen'}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50/50 border-blue-200 text-blue-700 flex items-center gap-1">
                        <GraduationCap className="h-2.5 w-2.5" /> {prof.theoryCount || 0} ELMÉLET
                        <span className="opacity-40 ml-1">|</span>
                        <span className="ml-1 font-bold">
                          {subjects
                            .filter((s: any) => s.professionId === prof.id && (s.type === 'theory' || !s.type))
                            .reduce((sum, s) => {
                              const sHours = typeof s.hours === 'number' ? s.hours : (parseFloat(String(s.hours)) || null);
                              const h = sHours !== null ? sHours : (parseFloat(String(s.totalSuggestedHours)) || 0);
                              return sum + (Number(h) || 0);
                            }, 0).toFixed(0)} óra
                        </span>
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-orange-50/50 border-orange-200 text-orange-700 flex items-center gap-1">
                        <Wrench className="h-2.5 w-2.5" /> {prof.practicalCount || 0} GYAKORLAT
                        <span className="opacity-40 ml-1">|</span>
                        <span className="ml-1 font-bold">
                          {subjects
                            .filter((s: any) => s.professionId === prof.id && s.type === 'practical')
                            .reduce((sum, s) => {
                              const sHours = typeof s.hours === 'number' ? s.hours : (parseFloat(String(s.hours)) || null);
                              const h = sHours !== null ? sHours : (parseFloat(String(s.totalSuggestedHours)) || 0);
                              return sum + (Number(h) || 0);
                            }, 0).toFixed(0)} óra
                        </span>
                      </Badge>
                    </div>
                    {prof.interactiveCount > 0 && (
                      <Badge variant="outline" className="text-[10px] w-full bg-slate-900 text-blue-400 border-blue-600 h-6 flex items-center justify-center gap-2 font-bold animate-pulse">
                        <MonitorPlay className="h-3 w-3" /> {prof.interactiveCount} INTERAKTÍV MODUL KÉSZ
                      </Badge>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="text-[9px] h-7 bg-blue-50/30 hover:bg-blue-50 text-blue-700 border border-blue-100" 
                        onClick={(e) => { e.stopPropagation(); importMutation.mutate({ profession: prof, importType: 'theory' }); }}
                        disabled={isImporting !== null}
                      >
                        {isImporting === prof.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <GraduationCap className="h-3 w-3 mr-1" />}
                        Elmélet Frissítés
                      </Button>
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="text-[9px] h-7 bg-orange-50/30 hover:bg-orange-50 text-orange-700 border border-orange-100" 
                        onClick={(e) => { e.stopPropagation(); importMutation.mutate({ profession: prof, importType: 'practical' }); }}
                        disabled={isImporting !== null}
                      >
                        {isImporting === prof.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
                        Gyakorlat Frissítés
                      </Button>
                      <Button 
                        size="sm"
                        variant="secondary"
                        className="col-span-2 text-[9px] h-7 font-bold" 
                        onClick={(e) => { e.stopPropagation(); importMutation.mutate({ profession: prof, importType: 'both' }); }}
                        disabled={isImporting !== null}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Teljes IKK Szinkronizálás
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfession ? "Szakma szerkesztése" : "Új szakma"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => editingProfession ? updateMutation.mutate({ id: editingProfession.id, data }) : createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Megnevezés</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leírás</FormLabel>
                    <FormControl><Textarea {...field} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="totalHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex justify-between items-center">
                      <span>Összesített óraszám</span>
                      {editingProfession && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[10px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            const subjectTotal = calculateProfessionHours(editingProfession.id);
                            field.onChange(subjectTotal);
                            toast({ title: "Óraszám frissítve", description: `Tantárgyak alapján: ${subjectTotal} óra` });
                          }}
                        >
                          <Wand2 className="h-3 w-3" /> Tantárgyak alapján ({calculateProfessionHours(editingProfession.id)})
                        </Button>
                      )}
                    </FormLabel>
                    <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} value={field.value || ""} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iconName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ikon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingProfession ? "Frissítés" : "Létrehozás"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isIKKDialogOpen} onOpenChange={setIsIKKDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>IKK Szakma Importálás</DialogTitle>
            <DialogDescription>
              Válassz szakmát az IKK hivatalos adatbázisából a teljes tananyag automatikus generálásához.
            </DialogDescription>
          </DialogHeader>
          <IKKManager />
        </DialogContent>
      </Dialog>
    </div>
  );
}
