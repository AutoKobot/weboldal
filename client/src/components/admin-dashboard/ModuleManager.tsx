import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { 
  Plus, Edit, Trash2, ArrowLeft, 
  Sparkles, Brain, CheckCircle, XCircle, Loader2, Wand2 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Module, insertModuleSchema, Subject } from "./types";
import { ModuleEditor } from "./ModuleEditor";

export function ModuleManager({ 
  modules, 
  subjects, 
  selectedSubjectId, 
  onBack,
  isAdmin
}: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [regeneratingModules, setRegeneratingModules] = useState<Set<number>>(new Set());

  const selectedSubject = subjects.find((s: Subject) => s.id === selectedSubjectId);
  const filteredModules = modules.filter((m: Module) => m.subjectId === selectedSubjectId);

  const form = useForm({
    resolver: zodResolver(insertModuleSchema),
    defaultValues: {
      title: "",
      content: "",
      moduleNumber: filteredModules.length + 1,
      subjectId: selectedSubjectId,
      isPublished: false,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/modules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Siker", description: "Modul létrehozva" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await apiRequest("PATCH", `/api/modules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      setIsDialogOpen(false);
      setEditingModule(null);
      form.reset();
      toast({ title: "Siker", description: "Modul frissítve" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      toast({ title: "Siker", description: "Modul törölve" });
    }
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number; isPublished: boolean }) => {
      await apiRequest("PATCH", `/api/modules/${id}`, { isPublished });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      toast({ title: "Siker", description: "Állapot frissítve" });
    }
  });

  const regenerateMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      setRegeneratingModules(prev => new Set(prev).add(moduleId));
      const mod = modules.find((m: any) => m.id === moduleId);
      await apiRequest("POST", `/api/admin/modules/${moduleId}/regenerate-ai`, {
        title: mod.title,
        content: mod.content
      });
    },
    onSuccess: (_, moduleId) => {
      setRegeneratingModules(prev => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
      toast({ title: "AI Újragenerálás elindítva", description: "A folyamat a háttérben fut." });
    }
  });

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    form.reset({
      title: module.title,
      content: module.content,
      moduleNumber: module.moduleNumber,
      subjectId: module.subjectId,
      isPublished: module.isPublished || false,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h2 className="text-xl font-semibold">{selectedSubject?.name} - Modulok</h2>
            <p className="text-sm text-muted-foreground">{filteredModules.length} modul</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            if(confirm('Minden modul tartalmát fejlesszük az AI segítségével?')) {
              filteredModules.forEach((m: any) => regenerateMutation.mutate(m.id));
            }
          }}>
            <Wand2 className="h-4 w-4 mr-2" /> Bulk AI Fejlesztés
          </Button>
          <Button onClick={() => { setEditingModule(null); form.reset({ subjectId: selectedSubjectId, moduleNumber: filteredModules.length + 1 }); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Új Modul
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredModules.sort((a: any, b: any) => a.moduleNumber - b.moduleNumber).map((module: Module) => (
          <Card key={module.id} className="group hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0 rounded-full font-bold bg-muted">
                  {module.moduleNumber}
                </Badge>
                <div>
                  <CardTitle className="text-base font-bold">{module.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={module.isPublished ? "default" : "secondary"} className="text-[10px] h-4">
                      {module.isPublished ? "Publikálva" : "Piszkozat"}
                    </Badge>
                    {regeneratingModules.has(module.id) && (
                      <Badge variant="outline" className="text-[10px] h-4 flex items-center gap-1 bg-blue-50 text-blue-600 animate-pulse">
                        <Loader2 className="h-2 w-2 animate-spin" /> AI generálás...
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => togglePublishMutation.mutate({ id: module.id, isPublished: !module.isPublished })}>
                  {module.isPublished ? "Visszavonás" : "Közzététel"}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => regenerateMutation.mutate(module.id)} title="AI fejlesztés">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(module)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if(confirm('Törli?')) deleteMutation.mutate(module.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Modul szerkesztése" : "Új modul"}</DialogTitle>
          </DialogHeader>
          <ModuleEditor 
            module={editingModule || undefined}
            onSave={(data) => editingModule ? updateMutation.mutate({ id: editingModule.id, data }) : createMutation.mutate(data)}
            onCancel={() => setIsDialogOpen(false)}
            subjects={subjects}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
