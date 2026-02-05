import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, Plus, Eye, Wand2 } from "lucide-react";
import { 
  insertModuleSchema,
  type Module,
  type Subject
} from "@shared/schema";
import { z } from "zod";

const moduleFormSchema = insertModuleSchema.extend({
  subjectId: z.number().min(1, "Tantárgy kiválasztása kötelező"),
  conciseContent: z.string().optional(),
  detailedContent: z.string().optional(),
});

type ModuleFormData = z.infer<typeof moduleFormSchema>;

export default function AdminDashboardSimple() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // Fetch modules
  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ['/api/modules'],
    queryFn: async () => {
      const response = await fetch('/api/modules');
      if (!response.ok) throw new Error('Failed to fetch modules');
      return response.json();
    },
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
    queryFn: async () => {
      const response = await fetch('/api/subjects');
      if (!response.ok) throw new Error('Failed to fetch subjects');
      return response.json();
    },
  });

  // Form setup
  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: {
      title: "",
      content: "",
      conciseContent: "",
      detailedContent: "",
      moduleNumber: 1,
      subjectId: 0,
      videoUrl: "",
      audioUrl: "",
      imageUrl: "",
      youtubeUrl: "",
      podcastUrl: "",
      isPublished: false,
    },
  });

  // Load module data when editing
  useEffect(() => {
    if (editingModule && isDialogOpen) {
      form.setValue("title", editingModule.title);
      form.setValue("content", editingModule.content);
      form.setValue("conciseContent", editingModule.conciseContent || "");
      form.setValue("detailedContent", editingModule.detailedContent || "");
      form.setValue("moduleNumber", editingModule.moduleNumber);
      form.setValue("subjectId", editingModule.subjectId);
      form.setValue("videoUrl", editingModule.videoUrl || "");
      form.setValue("audioUrl", editingModule.audioUrl || "");
      form.setValue("imageUrl", editingModule.imageUrl || "");
      form.setValue("youtubeUrl", editingModule.youtubeUrl || "");
      form.setValue("podcastUrl", editingModule.podcastUrl || "");
      form.setValue("isPublished", editingModule.isPublished || false);
      form.trigger();
    }
  }, [editingModule, isDialogOpen, form]);

  // Create/Update module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      const method = editingModule ? "PATCH" : "POST";
      const url = editingModule ? `/api/modules/${editingModule.id}` : "/api/modules";
      const res = await apiRequest(method, url, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      setIsDialogOpen(false);
      setEditingModule(null);
      form.reset();
      toast({
        title: "Siker",
        description: editingModule ? "Modul frissítve" : "Modul létrehozva",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/modules/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      toast({
        title: "Siker",
        description: "Modul törölve",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // AI regeneration mutation
  const regenerateModuleMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const res = await apiRequest("POST", `/api/admin/modules/${moduleId}/regenerate-ai`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      toast({
        title: "Siker",
        description: "AI tartalom regenerálás elindítva",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hiba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingModule(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const onSubmit = (data: ModuleFormData) => {
    createModuleMutation.mutate(data);
  };

  if (!user || user.role !== 'admin') {
    return <div>Hozzáférés megtagadva</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Új modul
        </Button>
      </div>

      <div className="grid gap-6">
        {modules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tantárgy: {subjects.find(s => s.id === module.subjectId)?.name || 'N/A'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={module.isPublished ? "default" : "secondary"}>
                      {module.isPublished ? "Publikált" : "Vázlat"}
                    </Badge>
                    <Badge variant="outline">Modul {module.moduleNumber}</Badge>
                    {(module.conciseContent || module.detailedContent) && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        AI Enhanced
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(module)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => regenerateModuleMutation.mutate(module.id)}
                    disabled={regenerateModuleMutation.isPending}
                  >
                    <Wand2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => deleteModuleMutation.mutate(module.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {module.content.substring(0, 200)}...
              </p>
              {(module.conciseContent || module.detailedContent) && (
                <div className="mt-3 p-3 bg-purple-50 rounded">
                  <p className="text-xs font-medium text-purple-700">AI-generált tartalom</p>
                  {module.conciseContent && (
                    <p className="text-xs text-purple-600">Tömör: {module.conciseContent.length} karakter</p>
                  )}
                  {module.detailedContent && (
                    <p className="text-xs text-purple-600">Részletes: {module.detailedContent.length} karakter</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModule ? "Modul szerkesztése" : "Új modul létrehozása"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Cím</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Modul címe"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subjectId">Tantárgy</Label>
                <Select
                  value={form.watch("subjectId")?.toString() || ""}
                  onValueChange={(value) => form.setValue("subjectId", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz tantárgyat" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="moduleNumber">Modul száma</Label>
                <Input
                  id="moduleNumber"
                  type="number"
                  {...form.register("moduleNumber", { valueAsNumber: true })}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="isPublished"
                  checked={form.watch("isPublished")}
                  onCheckedChange={(checked) => form.setValue("isPublished", checked)}
                />
                <Label htmlFor="isPublished">Publikált</Label>
              </div>
            </div>

            <Tabs defaultValue="content" className="w-full">
              <TabsList>
                <TabsTrigger value="content">Alapvető tartalom</TabsTrigger>
                <TabsTrigger value="ai-content">AI-generált tartalom</TabsTrigger>
                <TabsTrigger value="media">Média</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Tartalom</Label>
                  <Textarea
                    id="content"
                    {...form.register("content")}
                    placeholder="Modul tartalma (Markdown formátumban)"
                    rows={10}
                    className="min-h-[200px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="ai-content" className="space-y-4">
                {editingModule && (editingModule.conciseContent || editingModule.detailedContent) ? (
                  <>
                    {editingModule.conciseContent && (
                      <div className="space-y-2">
                        <Label htmlFor="conciseContent">Tömör verzió (tanulók által látott)</Label>
                        <Textarea
                          id="conciseContent"
                          value={form.watch("conciseContent") || ""}
                          onChange={(e) => form.setValue("conciseContent", e.target.value)}
                          placeholder="AI-generált tömör tartalom"
                          rows={8}
                          className="min-h-[200px] bg-purple-50"
                        />
                      </div>
                    )}

                    {editingModule.detailedContent && (
                      <div className="space-y-2">
                        <Label htmlFor="detailedContent">Részletes verzió (tanulók által látott)</Label>
                        <Textarea
                          id="detailedContent"
                          value={form.watch("detailedContent") || ""}
                          onChange={(e) => form.setValue("detailedContent", e.target.value)}
                          placeholder="AI-generált részletes tartalom"
                          rows={12}
                          className="min-h-[300px] bg-purple-50"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nincs AI-generált tartalom</p>
                    <p className="text-sm">Használd az AI regenerálás gombot tartalom generálásához</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Videó URL</Label>
                    <Input
                      id="videoUrl"
                      {...form.register("videoUrl")}
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl">YouTube URL</Label>
                    <Input
                      id="youtubeUrl"
                      {...form.register("youtubeUrl")}
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="audioUrl">Hang URL</Label>
                    <Input
                      id="audioUrl"
                      {...form.register("audioUrl")}
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Kép URL</Label>
                    <Input
                      id="imageUrl"
                      {...form.register("imageUrl")}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Mégse
              </Button>
              <Button type="submit" disabled={createModuleMutation.isPending}>
                {createModuleMutation.isPending ? "Mentés..." : "Mentés"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}