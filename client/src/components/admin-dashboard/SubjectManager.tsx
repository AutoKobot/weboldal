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
import { Plus, Edit, Trash2, ArrowLeft, GraduationCap, Wrench, Wand2, Clock, MonitorPlay } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { compareSectionCodes } from "@/lib/utils";
import { Subject, insertSubjectSchema, Profession } from "./types";

export function SubjectManager({ subjects, professions, modules = [], selectedProfessionId, onBack, onSelect, selectedType, setSelectedType }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const selectedProfession = professions.find((p: Profession) => p.id === selectedProfessionId);
  const filteredSubjects = subjects.filter((s: Subject) => 
    s.professionId === selectedProfessionId && 
    (!selectedType || s.type === selectedType)
  );

  const calculateSubjectModuleHours = (subjectId: number) => {
    const subject = subjects.find((s: any) => s.id === subjectId);
    return parseFloat(String(subject?.totalSuggestedHours || 0)) || 0;
  };

  const calculateTypeTotalHours = (type: string) => {
    return subjects
      .filter((s: any) => s.professionId === selectedProfessionId && (type === 'theory' ? (s.type === 'theory' || !s.type) : s.type === type))
      .reduce((sum: number, s: any) => {
        const sHours = typeof s.hours === 'number' ? s.hours : (parseFloat(String(s.hours)) || null);
        const hours = sHours !== null ? sHours : (parseFloat(String(s.totalSuggestedHours)) || 0);
        return sum + (Number(hours) || 0);
      }, 0);
  };

  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      onBack();
    }
  };

  const form = useForm({
    resolver: zodResolver(insertSubjectSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "theory",
      professionId: selectedProfessionId,
      code: "",
      hours: null as number | null,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/subjects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] }); // Refresh counts
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Siker", description: "Tantárgy létrehozva" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await apiRequest("PATCH", `/api/subjects/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] }); // Refresh counts
      setIsDialogOpen(false);
      setEditingSubject(null);
      form.reset();
      toast({ title: "Siker", description: "Tantárgy frissítve" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] }); // Refresh counts
      toast({ title: "Siker", description: "Tantárgy törölve" });
    }
  });
  
  const reorganizeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/ikk/reorganize/${selectedProfessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      toast({ title: "Siker", description: "Szakma átrendezve" });
    }
  });

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    form.reset({
      name: subject.name,
      description: subject.description || "",
      type: subject.type || "theory",
      professionId: subject.professionId,
      code: subject.code || "",
      hours: subject.hours || null,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h2 className="text-xl font-bold">{selectedProfession?.name} {selectedType === 'theory' ? '- Elmélet' : selectedType === 'practical' ? '- Gyakorlat' : '- Tantárgyak'}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedType ? `${filteredSubjects.length} tantárgy ebben a kategóriában` : `${subjects.filter((s: any) => s.professionId === selectedProfessionId).length} tantárgy összesen`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { if(confirm('Ez szétválogatja az elméleti és gyakorlati modulokat külön tantárgyakba. Folytatja?')) reorganizeMutation.mutate(); }} disabled={reorganizeMutation.isPending}>
            <Wand2 className={`h-4 w-4 mr-2 ${reorganizeMutation.isPending ? 'animate-spin' : ''}`} /> Átrendezés
          </Button>
          <Button size="sm" onClick={() => { setEditingSubject(null); form.reset({ professionId: selectedProfessionId, type: selectedType || 'theory' }); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Új Tantárgy
          </Button>
        </div>
      </div>

      {!selectedType ? (
        <div className="grid md:grid-cols-2 gap-6 pt-4">
          <Card 
            className="group cursor-pointer hover:border-primary transition-all duration-300 overflow-hidden relative"
            onClick={() => setSelectedType("theory")}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-all"></div>
            <CardHeader className="flex flex-col items-center text-center py-10">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Elméleti Képzés</CardTitle>
              <p className="text-sm text-muted-foreground mt-2 max-w-[250px]">
                Elméleti tananyagok, fogalmak és szakmai ismeretek kezelése.
              </p>
              <Badge variant="secondary" className="mt-4 bg-blue-50 text-blue-700 border-blue-100 font-bold flex gap-2">
                <span>{subjects.filter((s: any) => s.professionId === selectedProfessionId && (s.type === 'theory' || !s.type)).length} tantárgy</span>
                <span className="opacity-40">|</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {calculateTypeTotalHours('theory')} óra</span>
              </Badge>
            </CardHeader>
          </Card>
 
          <Card 
            className="group cursor-pointer hover:border-orange-500 transition-all duration-300 overflow-hidden relative"
            onClick={() => setSelectedType("practical")}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all"></div>
            <CardHeader className="flex flex-col items-center text-center py-10">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wrench className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Gyakorlati Képzés</CardTitle>
              <p className="text-sm text-muted-foreground mt-2 max-w-[250px]">
                Műhelymunka, gyakorlati feladatok és értékelések kezelése.
              </p>
              <Badge variant="secondary" className="mt-4 bg-orange-50 text-orange-700 border-orange-100 font-bold flex gap-2">
                <span>{subjects.filter((s: any) => s.professionId === selectedProfessionId && s.type === 'practical').length} tantárgy</span>
                <span className="opacity-40">|</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {calculateTypeTotalHours('practical')} óra</span>
              </Badge>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...filteredSubjects]
            .sort((a, b) => compareSectionCodes(a.code, b.code))
            .map((subject: Subject) => (
            <Card key={subject.id} className="group hover:border-primary transition-colors cursor-pointer flex flex-col" onClick={() => onSelect(subject.id)}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {subject.code && (
                      <Badge variant="secondary" className="font-mono text-[10px] bg-slate-100 text-slate-600 border-slate-200 h-4">
                        {subject.code}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {subject.moduleCount || 0} modul
                    </span>
                    {subject.hours ? (
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 h-4 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {subject.hours} óra
                      </Badge>
                    ) : calculateSubjectModuleHours(subject.id) > 0 ? (
                      <Badge variant="outline" className="text-[10px] bg-blue-50/50 text-blue-600 border-blue-100 h-4 flex items-center gap-1 italic">
                        <Clock className="h-2.5 w-2.5" /> ~{Math.round(calculateSubjectModuleHours(subject.id))} óra (jav.)
                      </Badge>
                    ) : null}
                    {(subject as any).developedCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-100 h-4 flex items-center gap-1 font-bold">
                        <Wand2 className="h-2.5 w-2.5" /> {(subject as any).developedCount}/{(subject as any).moduleCount} AI
                      </Badge>
                    )}
                    {(subject as any).interactiveCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-slate-900 text-blue-400 border-blue-600 h-4 flex items-center gap-1 font-bold">
                        <MonitorPlay className="h-2.5 w-2.5" /> {(subject as any).interactiveCount} HTML
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-bold leading-tight line-clamp-2">
                    {subject.name}
                  </CardTitle>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEdit(subject); }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); if(confirm('Törli a tantárgyat?')) deleteMutation.mutate(subject.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 h-8">{subject.description}</p>
                
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {(!subject.type || subject.type === 'theory' || subject.type === 'both') && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-1 font-bold">
                      <GraduationCap className="h-2.5 w-2.5" /> ELMÉLET
                    </Badge>
                  )}
                  {(subject.type === 'practical' || subject.type === 'both') && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-orange-50 border-orange-200 text-orange-700 flex items-center gap-1 font-bold">
                      <Wrench className="h-2.5 w-2.5" /> GYAKORLAT
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredSubjects.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground">Ebben a kategóriában még nincsenek tantárgyak.</p>
              <Button variant="link" onClick={() => { setEditingSubject(null); form.reset({ professionId: selectedProfessionId, type: selectedType }); setIsDialogOpen(true); }}>
                Hozzon létre egyet most!
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubject ? "Tantárgy szerkesztése" : "Új tantárgy"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => editingSubject ? updateMutation.mutate({ id: editingSubject.id, data }) : createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kód (pl. 3.4.1)</FormLabel>
                      <FormControl><Input {...field} placeholder="3.x.x" /></FormControl>
                    </FormItem>
                  )}
                />
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
              </div>
                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-between items-center">
                        <span>Összes óraszám</span>
                        {editingSubject && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-[10px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              const moduleTotal = calculateSubjectModuleHours(editingSubject.id);
                              field.onChange(Math.round(moduleTotal));
                              toast({ title: "Óraszám frissítve", description: `Modulok alapján: ${moduleTotal} óra` });
                            }}
                          >
                            <Wand2 className="h-3 w-3" /> Modulok alapján ({calculateSubjectModuleHours(editingSubject.id)})
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                          value={field.value || ""}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Típus</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Válassz típust" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="theory">Elmélet</SelectItem>
                        <SelectItem value="practical">Gyakorlat</SelectItem>
                        <SelectItem value="both">Mindkettő</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leírás</FormLabel>
                    <FormControl><Textarea {...field} className="h-24" /></FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSubject ? "Frissítés" : "Létrehozás"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


