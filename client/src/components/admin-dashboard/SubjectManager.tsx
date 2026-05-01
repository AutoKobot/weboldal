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
import { Plus, Edit, Trash2, ArrowLeft, GraduationCap, Wrench } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Subject, insertSubjectSchema, Profession } from "./types";

export function SubjectManager({ subjects, professions, selectedProfessionId, onBack, onSelect }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const selectedProfession = professions.find((p: Profession) => p.id === selectedProfessionId);
  const filteredSubjects = subjects.filter((s: Subject) => s.professionId === selectedProfessionId);

  const form = useForm({
    resolver: zodResolver(insertSubjectSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "theory",
      professionId: selectedProfessionId,
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

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    form.reset({
      name: subject.name,
      description: subject.description || "",
      type: subject.type || "theory",
      professionId: subject.professionId,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h2 className="text-xl font-semibold">{selectedProfession?.name} - Tantárgyak</h2>
            <p className="text-sm text-muted-foreground">{filteredSubjects.length} tantárgy</p>
          </div>
        </div>
        <Button onClick={() => { setEditingSubject(null); form.reset({ professionId: selectedProfessionId, type: 'theory' }); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Új Tantárgy
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.map((subject: Subject) => (
          <Card key={subject.id} className="group hover:border-primary transition-colors cursor-pointer flex flex-col" onClick={() => onSelect(subject.id)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-bold">
                {subject.code && <span className="text-primary mr-2">{subject.code}</span>}
                {subject.name}
              </CardTitle>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(subject); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); if(confirm('Törli?')) deleteMutation.mutate(subject.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{subject.description}</p>
              
              <div className="flex gap-1.5 mt-auto">
                {(subject.type === 'theory' || subject.type === 'both' || !subject.type) && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-1">
                    <GraduationCap className="h-2.5 w-2.5" /> ELMÉLET
                  </Badge>
                )}
                {(subject.type === 'practical' || subject.type === 'both') && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-orange-50 border-orange-200 text-orange-700 flex items-center gap-1">
                    <Wrench className="h-2.5 w-2.5" /> GYAKORLAT
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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


