import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  Sparkles, Brain, CheckCircle, XCircle, Loader2, Wand2,
  LayoutGrid, List, MonitorPlay, FileText, X, Wrench, Clock, Network
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { compareSectionCodes } from "@/lib/utils";
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [regeneratingModules, setRegeneratingModules] = useState<Set<number>>(new Set());
  const [presentingModules, setPresentingModules] = useState<Set<number>>(new Set());
  const [mindMappingModules, setMindMappingModules] = useState<Set<number>>(new Set());
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Fetch modules for this specific subject to ensure data consistency
  const { data: subjectModules = [], isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ["/api/public/modules", { subjectId: selectedSubjectId }],
    queryFn: async () => {
      const res = await fetch(`/api/public/modules?subjectId=${selectedSubjectId}`);
      if (!res.ok) throw new Error("Failed to fetch modules");
      return res.json();
    },
    enabled: !!selectedSubjectId
  });

  // Global queue status to persist development state across navigation
  const { data: queueStatus } = useQuery<any>({
    queryKey: ["/api/ai/queue-status"],
    queryFn: async () => {
      const res = await fetch("/api/ai/queue-status");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds for active UI updates
    enabled: true
  });

  // Calculate which modules are currently being processed based on server + local state
  const isModuleRegenerating = (moduleId: number) => {
    if (regeneratingModules.has(moduleId)) return true;
    if (!queueStatus) return false;
    
    // Check both queued and currently processing items
    const inQueue = queueStatus.queuedItems?.some((item: any) => item.moduleId === moduleId && item.type === 'full');
    const inProcessing = queueStatus.processingItems?.some((item: any) => item.moduleId === moduleId && item.type === 'full');
    return inQueue || inProcessing;
  };

  const isModulePresenting = (moduleId: number) => {
    if (presentingModules.has(moduleId)) return true;
    if (!queueStatus) return false;
    
    const inQueue = queueStatus.queuedItems?.some((item: any) => item.moduleId === moduleId && item.type === 'presentation');
    const inProcessing = queueStatus.processingItems?.some((item: any) => item.moduleId === moduleId && item.type === 'presentation');
    return inQueue || inProcessing;
  };

  const isModuleMindMapping = (moduleId: number) => {
    if (mindMappingModules.has(moduleId)) return true;
    if (!queueStatus) return false;
    
    const inQueue = queueStatus.queuedItems?.some((item: any) => item.moduleId === moduleId && item.type === 'mindmap');
    const inProcessing = queueStatus.processingItems?.some((item: any) => item.moduleId === moduleId && item.type === 'mindmap');
    return inQueue || inProcessing;
  };

  const selectedSubject = subjects.find((s: Subject) => s.id === selectedSubjectId);
  
  // Natural sorting for section codes (e.g., 3.1.1, 3.1.2, 3.1.10, 3.1.1.a)
  const sortSectionCodes = (a: string | null, b: string | null) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    
    const aParts = a.split('.');
    const bParts = b.split('.');
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      if (aParts[i] === undefined) return -1;
      if (bParts[i] === undefined) return 1;
      
      const aPart = aParts[i];
      const bPart = bParts[i];
      
      const aNum = parseInt(aPart);
      const bNum = parseInt(bPart);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
      }
      
      // Fallback to string comparison for alpha parts (e.g., 'a', 'b') or mixed parts
      if (aPart !== bPart) return aPart.localeCompare(bPart, 'hu', { numeric: true });
    }
    return 0;
  };

  const sortedModules = [...subjectModules].sort((a, b) => {
    if (a.sectionCode || b.sectionCode) {
      return sortSectionCodes(a.sectionCode, b.sectionCode);
    }
    return a.moduleNumber - b.moduleNumber;
  });

  const filteredModules = sortedModules;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/modules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules", { subjectId: selectedSubjectId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/queue-status"] });
      setIsDialogOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules", { subjectId: selectedSubjectId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/queue-status"] });
      setIsDialogOpen(false);
      setEditingModule(null);
      toast({ title: "Siker", description: "Modul frissítve" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules", { subjectId: selectedSubjectId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/queue-status"] });
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
      await apiRequest("POST", `/api/ai/modules/${moduleId}/regenerate`, {
        title: mod.title,
        content: mod.content
      });
    },
    onSuccess: (_, moduleId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
      
      setRegeneratingModules(prev => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
      toast({ title: "AI Újragenerálás sikeres", description: "A tananyag és a teszt frissült." });
    }
  });

  const generatePresentationMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      setPresentingModules(prev => new Set(prev).add(moduleId));
      await apiRequest("POST", `/api/ai/modules/${moduleId}/generate-presentation`);
    },
    onSuccess: (_, moduleId) => {
      setPresentingModules(prev => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
      toast({ title: "Interaktív HTML generálás elindítva", description: "A folyamat a háttérben fut." });
    }
  });

  const generateMindMapMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      setMindMappingModules(prev => new Set(prev).add(moduleId));
      await apiRequest("POST", `/api/ai/modules/${moduleId}/generate-mindmap`);
    },
    onSuccess: (_, moduleId) => {
      setMindMappingModules(prev => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
      toast({ title: "Élő Elmetérkép generálás elindítva", description: "A folyamat a háttérben fut." });
    }
  });

  const handleEdit = (module: Module) => {
    setEditingModule(module);
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
          <div className="flex border rounded-md p-1 bg-muted/30 mr-2">
            <Button 
              variant={viewMode === 'grid' ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            if(confirm('Minden modul tartalmát fejlesszük az AI segítségével?')) {
              filteredModules.forEach((m: any) => regenerateMutation.mutate(m.id));
            }
          }}>
            <Wand2 className="h-4 w-4 mr-2" /> Bulk AI Fejlesztés
          </Button>
          <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => {
            if(confirm('Minden modulhoz generáljunk interaktív HTML tartalmat? Ez több percig is eltarthat.')) {
              filteredModules.forEach((m: any) => generatePresentationMutation.mutate(m.id));
            }
          }}>
            <MonitorPlay className="h-4 w-4 mr-2" /> Bulk Interaktív HTML
          </Button>
          <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => {
            if(confirm('Minden modulhoz generáljunk Élő Elmetérképet? Ez több percig is eltarthat.')) {
              filteredModules.forEach((m: any) => generateMindMapMutation.mutate(m.id));
            }
          }}>
            <Network className="h-4 w-4 mr-2" /> Bulk Élő Elmetérkép
          </Button>
          <Button onClick={() => { setEditingModule(null); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Új Modul
          </Button>
        </div>
      </div>

      <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
        {filteredModules.sort((a: any, b: any) => compareSectionCodes(a.sectionCode, b.sectionCode) || (a.moduleNumber || 0) - (b.moduleNumber || 0)).map((module: Module) => (
          <Card key={module.id} className={`group hover:border-primary transition-all duration-300 ${viewMode === 'grid' ? 'h-full flex flex-col shadow-sm hover:shadow-md' : ''}`}>
            <CardHeader className={`flex flex-row items-center justify-between ${viewMode === 'grid' ? 'pb-2' : 'py-3'}`}>
              <div className="flex items-center gap-3 overflow-hidden">
                <Badge variant="secondary" className="h-10 px-3 flex items-center justify-center rounded-lg font-mono text-xs bg-slate-100 text-slate-600 border-slate-200 shrink-0">
                  {module.sectionCode || `#${module.moduleNumber}`}
                </Badge>
                <div className="min-w-0">
                  <CardTitle className={`font-bold truncate ${viewMode === 'grid' ? 'text-base' : 'text-sm'}`}>
                    {module.title.replace(/^\s*[\d.]+[a-z]?\s*[-.]*\s*/i, '').trim()}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={module.isPublished ? "default" : "secondary"} className="text-[10px] h-4 py-0">
                      {module.isPublished ? "PUBLIKÁLVA" : "PISZKOZAT"}
                    </Badge>
                    {module.type === 'practical' ? (
                      <Badge variant="outline" className="text-[10px] h-4 bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1">
                        <Wrench className="h-2 w-2" /> GYAKORLAT
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                        <Brain className="h-2 w-2" /> ELMÉLET
                      </Badge>
                    )}
                    {module.suggestedHours && (
                      <Badge variant="outline" className="text-[10px] h-4 flex items-center gap-1 bg-slate-50 text-slate-600 border-slate-200">
                        <Clock className="h-2.5 w-2.5" /> {module.suggestedHours} óra
                      </Badge>
                    )}
                    {(isModuleRegenerating(module.id) || isModulePresenting(module.id) || isModuleMindMapping(module.id)) && (
                      <Badge variant="outline" className="text-[10px] h-4 flex items-center gap-1 bg-blue-50 text-blue-600 animate-pulse">
                        <Loader2 className="h-2 w-2 animate-spin" /> 
                        {isModuleRegenerating(module.id) ? "AI..." : isModulePresenting(module.id) ? "HTML..." : "TÉRKÉP..."}
                      </Badge>
                    )}
                    {(!!module.detailedContent || !!module.keyConceptsData || (Array.isArray(module.generatedQuizzes) && module.generatedQuizzes.length > 0)) && (
                      <Badge variant="outline" className="text-[10px] h-4 flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200 font-bold">
                        <Wand2 size={10} /> AI FEJLESZTETT
                      </Badge>
                    )}
                    {Boolean(module.presentationData) && (
                      <Badge variant="outline" className="text-[10px] h-4 flex items-center gap-1 bg-slate-900 text-blue-400 border-blue-600 font-bold animate-pulse">
                        <MonitorPlay size={10} /> INTERAKTÍV
                      </Badge>
                    )}
                    {Boolean(module.mindMapData) && (
                      <Badge variant="outline" className="text-[10px] h-4 flex items-center gap-1 bg-slate-900 text-emerald-400 border-emerald-600 font-bold">
                        <Network size={10} /> ELMETÉRKÉP
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {viewMode === 'list' && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => togglePublishMutation.mutate({ id: module.id, isPublished: !module.isPublished })}>
                    {module.isPublished ? "Visszavonás" : "Közzététel"}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => regenerateMutation.mutate(module.id)} title="AI fejlesztés + Teszt" disabled={isModuleRegenerating(module.id)}>
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => generatePresentationMutation.mutate(module.id)} title="Interaktív HTML generálás" disabled={isModulePresenting(module.id)}>
                    <MonitorPlay className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" onClick={() => generateMindMapMutation.mutate(module.id)} title="Élő Elmetérkép generálás" disabled={isModuleMindMapping(module.id)}>
                    <Network className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(module)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if(confirm('Törli?')) deleteMutation.mutate(module.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            {viewMode === 'grid' && (
              <CardContent className="flex-1 flex flex-col justify-between pt-2">
                <div className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {module.content ? module.content.substring(0, 100) + '...' : 'Nincs tartalom'}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => regenerateMutation.mutate(module.id)} disabled={isModuleRegenerating(module.id)}>
                    <Sparkles className="h-3 w-3 mr-2 text-purple-500" /> Tartalom+Teszt
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => generatePresentationMutation.mutate(module.id)} disabled={isModulePresenting(module.id)}>
                    <MonitorPlay className="h-3 w-3 mr-2 text-blue-500" /> Interaktív HTML
                  </Button>
                  <Button variant="outline" size="sm" className="w-full col-span-2 justify-start text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/30 font-semibold" onClick={() => generateMindMapMutation.mutate(module.id)} disabled={isModuleMindMapping(module.id)}>
                    <Network className="h-3 w-3 mr-2" /> Élő Elmetérkép generálása
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => handleEdit(module)}>
                    <Edit className="h-3 w-3 mr-2" /> Szerkesztés
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8 text-destructive hover:text-destructive" onClick={() => { if(confirm('Törli?')) deleteMutation.mutate(module.id); }}>
                    <Trash2 className="h-3 w-3 mr-2" /> Törlés
                  </Button>
                  <Button 
                    variant={module.isPublished ? "outline" : "default"} 
                    size="sm" 
                    className={`w-full col-span-2 mt-2 h-10 font-bold transition-all ${!module.isPublished ? "bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg text-white border-none" : ""}`} 
                    onClick={() => togglePublishMutation.mutate({ id: module.id, isPublished: !module.isPublished })}
                  >
                    {module.isPublished ? (
                      <><X className="w-4 h-4 mr-2" /> Visszavonás</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" /> Közzététel</>
                    )}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Modul szerkesztése" : "Új modul"}</DialogTitle>
          </DialogHeader>
          <ModuleEditor 
            key={editingModule ? editingModule.id : 'new'}
            module={editingModule || undefined}
            subjectId={selectedSubjectId}
            nextModuleNumber={filteredModules.length + 1}
            onSave={(data) => editingModule ? updateMutation.mutate({ id: editingModule.id, data }) : createMutation.mutate(data)}
            onCancel={() => setIsDialogOpen(false)}
            subjects={subjects}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
