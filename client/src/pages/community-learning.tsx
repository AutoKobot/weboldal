import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, MessageCircle, BookOpen, Star, Calendar, User, ArrowLeft, Mail, Edit, Trash2, MoreVertical } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface CommunityGroup {
  id: number;
  name: string;
  description: string;
  professionId: number | null;
  createdBy: string;
  isActive: boolean;
  memberLimit: number;
  createdAt: string;
  updatedAt: string;
}

interface CommunityProject {
  id: number;
  title: string;
  description: string;
  groupId: number;
  moduleId: number | null;
  createdBy: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Discussion {
  id: number;
  title: string;
  content: string;
  authorId: string;
  groupId: number | null;
  projectId: number | null;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Profession {
  id: number;
  name: string;
  description: string;
}

export default function CommunityLearning() {
  const [activeTab, setActiveTab] = useState("groups");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showAdminMessage, setShowAdminMessage] = useState(false);
  const [adminMessageData, setAdminMessageData] = useState({
    subject: "",
    message: ""
  });

  // Admin message mutation
  const adminMessageMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Nem sikerült elküldeni az üzenetet');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Üzenet elküldve",
        description: "Az üzenetedet sikeresen elküldtük az adminisztrátornak.",
      });
      setShowAdminMessage(false);
      setAdminMessageData({ subject: "", message: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült elküldeni az üzenetet.",
        variant: "destructive",
      });
    },
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch data
  const { data: groups, isLoading: groupsLoading } = useQuery<CommunityGroup[]>({
    queryKey: ["/api/community-groups"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<CommunityProject[]>({
    queryKey: ["/api/community-projects", selectedGroupId],
    staleTime: 5 * 60 * 1000,
  });

  const { data: discussions, isLoading: discussionsLoading } = useQuery<Discussion[]>({
    queryKey: ["/api/discussions", selectedGroupId, selectedProjectId],
    staleTime: 30 * 1000,
  });

  const { data: professions } = useQuery<Profession[]>({
    queryKey: ["/api/public/professions"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: currentUser } = useQuery<{ id: string; username?: string }>({
    queryKey: ["/api/auth/user"],
    staleTime: 10 * 60 * 1000,
  });

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; description: string; professionId?: number }) => {
      const response = await apiRequest("POST", "/api/community-groups", groupData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-groups"] });
      toast({ title: "Közösség sikeresen létrehozva!" });
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült létrehozni a közösséget", variant: "destructive" });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await apiRequest("POST", `/api/community-groups/${groupId}/join`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-groups"] });
      toast({ title: "Sikeresen csatlakoztál a közösséghez!" });
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült csatlakozni", variant: "destructive" });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { title: string; description: string; groupId: number; moduleId?: number }) => {
      const response = await apiRequest("POST", "/api/community-projects", projectData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-projects"] });
      toast({ title: "Projekt sikeresen létrehozva!" });
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült létrehozni a projektet", variant: "destructive" });
    },
  });

  const createDiscussionMutation = useMutation({
    mutationFn: async (discussionData: { title: string; content: string; groupId?: number; projectId?: number }) => {
      const response = await apiRequest("POST", "/api/discussions", discussionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions"] });
      toast({ title: "Beszélgetés elindítva!" });
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült elindítani a beszélgetést", variant: "destructive" });
    },
  });

  const sendAdminMessageMutation = useMutation({
    mutationFn: async (messageData: { subject: string; message: string }) => {
      const response = await apiRequest("POST", "/api/admin/messages", messageData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Üzenet elküldve!", description: "Az admin hamarosan válaszol." });
      setShowAdminMessage(false);
      setAdminMessageData({ subject: "", message: "" });
    },
    onError: () => {
      toast({ title: "Hiba", description: "Nem sikerült elküldeni az üzenetet", variant: "destructive" });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, groupData }: { id: number; groupData: { name: string; description: string; professionId?: number } }) => {
      const response = await apiRequest("PUT", `/api/community-groups/${id}`, groupData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-groups"] });
      toast({ title: "Csoport sikeresen frissítve!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Hiba", 
        description: error?.message || "Nem sikerült frissíteni a csoportot", 
        variant: "destructive" 
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await apiRequest("DELETE", `/api/community-groups/${groupId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community-groups"] });
      toast({ title: "Csoport sikeresen törölve!" });
      setSelectedGroupId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Hiba", 
        description: error?.message || "Nem sikerült törölni a csoportot", 
        variant: "destructive" 
      });
    },
  });

  // Component for creating new group
  const CreateGroupDialog = () => {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
      name: "",
      description: "",
      professionId: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const data = {
        name: formData.name,
        description: formData.description,
        professionId: formData.professionId ? parseInt(formData.professionId) : undefined,
      };
      createGroupMutation.mutate(data);
      setOpen(false);
      setFormData({ name: "", description: "", professionId: "" });
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4">
            <Plus className="w-4 h-4 mr-2" />
            Új Közösség
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új Közösség Létrehozása</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Név</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Leírás</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="profession">Szakmacsoport (opcionális)</Label>
              <Select value={formData.professionId} onValueChange={(value) => setFormData({ ...formData, professionId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz szakmacsoportot" />
                </SelectTrigger>
                <SelectContent>
                  {professions?.map((profession) => (
                    <SelectItem key={profession.id} value={profession.id.toString()}>
                      {profession.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? "Létrehozás..." : "Létrehozás"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Component for editing group - moved to a separate function
  const EditGroupDialog = ({ group }: { group: CommunityGroup }) => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <Edit className="w-4 h-4 mr-2" />
            Szerkesztés
          </DropdownMenuItem>
        </DialogTrigger>
        <EditGroupDialogContent group={group} />
      </Dialog>
    );
  };

  const EditGroupDialogContent = ({ group }: { group: CommunityGroup }) => {
    const [formData, setFormData] = useState({
      name: group.name,
      description: group.description,
      professionId: group.professionId?.toString() || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const data = {
        name: formData.name,
        description: formData.description,
        professionId: formData.professionId ? parseInt(formData.professionId) : undefined,
      };
      updateGroupMutation.mutate({ id: group.id, groupData: data });
    };

    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Csoport Szerkesztése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Név</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-description">Leírás</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="edit-profession">Szakmacsoport (opcionális)</Label>
            <Select value={formData.professionId} onValueChange={(value) => setFormData({ ...formData, professionId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz szakmacsoportot" />
              </SelectTrigger>
              <SelectContent>
                {professions?.map((profession) => (
                  <SelectItem key={profession.id} value={profession.id.toString()}>
                    {profession.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateGroupMutation.isPending}>
              {updateGroupMutation.isPending ? "Mentés..." : "Mentés"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  };

  // Component for creating new project
  const CreateProjectDialog = () => {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
      title: "",
      description: "",
      groupId: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.groupId) return;
      
      const data = {
        title: formData.title,
        description: formData.description,
        groupId: parseInt(formData.groupId),
      };
      createProjectMutation.mutate(data);
      setOpen(false);
      setFormData({ title: "", description: "", groupId: "" });
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4">
            <Plus className="w-4 h-4 mr-2" />
            Új Projekt
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új Projekt Létrehozása</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="groupSelect">Közösség</Label>
              <Select value={formData.groupId} onValueChange={(value) => setFormData({ ...formData, groupId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz közösséget" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Projekt Címe</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Leírás</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? "Létrehozás..." : "Létrehozás"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  // Admin message dialog component - simple version to prevent focus jumping
  const AdminMessageDialog = () => {
    const handleSubmit = (e: any) => {
      e.preventDefault();
      if (!adminMessageData.subject.trim() || !adminMessageData.message.trim()) {
        toast({
          title: "Hiba",
          description: "Kérjük töltsd ki az összes mezőt.",
          variant: "destructive",
        });
        return;
      }
      sendAdminMessageMutation.mutate(adminMessageData);
    };

    return (
      <Dialog open={showAdminMessage} onOpenChange={setShowAdminMessage}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Üzenet az Adminnak</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="msg-subject">Tárgy</Label>
              <Input
                id="msg-subject"
                value={adminMessageData.subject}
                onChange={(e) => setAdminMessageData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Miben segíthetünk?"
                required
              />
            </div>
            <div>
              <Label htmlFor="msg-content">Üzenet</Label>
              <Textarea
                id="msg-content"
                value={adminMessageData.message}
                onChange={(e) => setAdminMessageData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Írja le részletesen az igényét vagy kérdését..."
                rows={4}
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAdminMessage(false);
                  setAdminMessageData({ subject: "", message: "" });
                }}
                className="flex-1"
              >
                Mégse
              </Button>
              <Button 
                type="submit" 
                disabled={sendAdminMessageMutation.isPending}
                className="flex-1"
              >
                {sendAdminMessageMutation.isPending ? "Küldés..." : "Küldés"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-student-warm">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/home')}
              className="text-white/90 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Vissza
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white drop-shadow-lg">Közösségi Tanulás</h1>
              <p className="text-white/90 drop-shadow-md">
                Csatlakozz szakmai közösségekhez, dolgozz együtt projekteken és tanulj társaiddal.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAdminMessage(true)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Mail className="w-4 h-4 mr-2" />
            Üzenet az Adminnak
          </Button>
        </div>

        <AdminMessageDialog />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Közösségek
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Projektek
          </TabsTrigger>
          <TabsTrigger value="discussions" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Beszélgetések
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Szakmai Közösségek</h2>
            <CreateGroupDialog />
          </div>
          
          {groupsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups?.map((group) => (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{group.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Users className="w-3 h-3 mr-1" />
                          {group.memberLimit}
                        </Badge>
                        {currentUser && currentUser.id === group.createdBy && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <EditGroupDialog group={group} />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Törlés
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Biztos vagy benne?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Ez a művelet nem vonható vissza. Ez véglegesen törli a csoportot és az összes kapcsolódó adatot.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteGroupMutation.mutate(group.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Törlés
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {group.description || "Nincs leírás elérhető"}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Létrehozva: {new Date(group.createdAt).toLocaleDateString('hu-HU')}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          joinGroupMutation.mutate(group.id);
                          setSelectedGroupId(group.id);
                        }}
                        disabled={joinGroupMutation.isPending}
                      >
                        Csatlakozás
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Közösségi Projektek</h2>
            <CreateProjectDialog />
          </div>

          {projectsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {projects?.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{project.title}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status === 'active' ? 'Aktív' : project.status}
                        </Badge>
                        {project.dueDate && (
                          <Badge variant="outline">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(project.dueDate).toLocaleDateString('hu-HU')}
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {project.description || "Nincs leírás elérhető"}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Létrehozva: {new Date(project.createdAt).toLocaleDateString('hu-HU')}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        Megtekintés
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="discussions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Beszélgetések</h2>
            <Button onClick={() => {
              const title = prompt("Beszélgetés címe:");
              const content = prompt("Kezdő üzenet:");
              if (title && content) {
                createDiscussionMutation.mutate({
                  title,
                  content,
                  groupId: selectedGroupId || undefined,
                  projectId: selectedProjectId || undefined,
                });
              }
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Új Beszélgetés
            </Button>
          </div>

          {discussionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {discussions?.map((discussion) => (
                <Card key={discussion.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      {discussion.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{discussion.content}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {discussion.authorId}
                      </div>
                      <span>{new Date(discussion.createdAt).toLocaleDateString('hu-HU')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}