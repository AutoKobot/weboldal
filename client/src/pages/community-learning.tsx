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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, MessageCircle, BookOpen, Star, Calendar, User, ArrowLeft, Mail, Edit, Trash2, MoreVertical, Send, Trophy, Medal, Flame, ShieldCheck, BarChart3, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

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

interface LeaderboardEntry {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  totalXp: number;
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
  author?: {
    username: string;
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
  };
}

interface Profession {
  id: number;
  name: string;
  description: string;
}

export default function CommunityLearning() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
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

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/community-groups/leaderboard"],
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

  const CreateDiscussionDialog = () => {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
      title: "",
      content: "",
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title || !formData.content) return;

      createDiscussionMutation.mutate({
        title: formData.title,
        content: formData.content,
        groupId: selectedGroupId || undefined,
        projectId: selectedProjectId || undefined,
      });
      setOpen(false);
      setFormData({ title: "", content: "" });
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Új Bejegyzés
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új bejegyzés írása</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Cím (Opcionális / Téma)</Label>
              <Input
                id="title"
                placeholder="Miről szeretnél beszélni?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="content">Bejegyzés szövege</Label>
              <Textarea
                id="content"
                placeholder="Írd le a gondolataidat, kérdéseidet..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={5}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={createDiscussionMutation.isPending}>
              {createDiscussionMutation.isPending ? "Közzététel..." : "Közzététel"}
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
          <TabsList className={`grid w-full ${isTeacher ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
            {isTeacher && (
              <TabsTrigger value="moderation" className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Moderálás
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="groups" className="space-y-6">
            {/* Gamification Panel - Leaderboard */}
            <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 blur-xl pointer-events-none">
                <Trophy className="w-64 h-64 text-yellow-500" />
              </div>

              <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2 rounded-lg text-white shadow-md">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 to-orange-600">
                      Közösségi Ranglista
                    </h3>
                    <p className="text-sm text-muted-foreground">Ezen a héten melyik csoport szerzett a legtöbb XP-t?</p>
                  </div>
                </div>
                {isTeacher && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 hidden md:flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Tanári nézet
                  </Badge>
                )}
              </div>

              {/* Top 3 cards – always shown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                {leaderboardLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-white/50 animate-pulse rounded-lg border border-border/50"></div>
                  ))
                ) : leaderboard && leaderboard.length > 0 ? (
                  leaderboard.slice(0, 3).map((group, index) => (
                    <div key={group.id} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-border/50 shadow-sm flex items-center gap-4 group hover:-translate-y-1 transition-all">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-inner
                         ${index === 0 ? 'bg-yellow-100 text-yellow-600 border border-yellow-300' :
                          index === 1 ? 'bg-gray-100 text-gray-500 border border-gray-300' :
                            'bg-orange-100 text-orange-600 border border-orange-300'}`}>
                        {index === 0 ? <Medal className="w-6 h-6" /> : `#${index + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground line-clamp-1 truncate">{group.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1 text-orange-600 font-medium">
                            <Flame className="w-3 h-3" />
                            {group.totalXp} XP
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {group.memberCount} tag
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-sm col-span-3">Még nincsenek adatok a ranglistához.</div>
                )}
              </div>

              {/* Teacher-only: full leaderboard table */}
              {isTeacher && leaderboard && leaderboard.length > 3 && (
                <div className="mt-6 border-t border-orange-200/50 pt-4 relative z-10">
                  <h4 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Teljes Ranglista (Tanári nézet)
                  </h4>
                  <div className="bg-white/70 rounded-lg overflow-hidden border border-orange-100">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50">
                        <tr>
                          <th className="text-left p-3 font-semibold text-orange-700">#</th>
                          <th className="text-left p-3 font-semibold text-orange-700">Csoport neve</th>
                          <th className="text-right p-3 font-semibold text-orange-700">Tagok</th>
                          <th className="text-right p-3 font-semibold text-orange-700">Összes XP</th>
                          <th className="text-right p-3 font-semibold text-orange-700">Átlag XP/fő</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((group, index) => (
                          <tr key={group.id} className={`border-t border-orange-50 hover:bg-orange-50/50 transition-colors ${index < 3 ? 'font-medium' : ''}`}>
                            <td className="p-3 text-muted-foreground">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </td>
                            <td className="p-3 font-medium">{group.name}</td>
                            <td className="p-3 text-right text-muted-foreground">{group.memberCount}</td>
                            <td className="p-3 text-right text-orange-600 font-semibold">{group.totalXp} XP</td>
                            <td className="p-3 text-right text-muted-foreground">
                              {group.memberCount > 0 ? Math.round(group.totalXp / group.memberCount) : 0} XP
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-8">
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
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                  Közösségi Fórum
                </h2>
                <p className="text-muted-foreground mt-1">
                  Kérdezz a többiektől, oszd meg a tapasztalataidat!
                </p>
              </div>
              <CreateDiscussionDialog />
            </div>

            {discussionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-full"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : discussions?.length === 0 ? (
              <Card className="p-12 text-center bg-white/50 border-dashed">
                <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Még nincsenek bejegyzések</h3>
                <p className="text-muted-foreground">Légy te az első, aki elindít egy beszélgetést a csoportban!</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {discussions?.map((discussion) => (
                  <Card key={discussion.id} className="overflow-hidden border-border/50 hover:shadow-md transition-all">
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12 border-2 border-primary/10 shadow-sm shrink-0">
                            <AvatarImage src={discussion.author?.profileImageUrl || undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary font-bold">
                              {discussion.author?.firstName?.[0] || discussion.author?.username?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                              <div>
                                <span className="font-semibold text-foreground mr-2">
                                  {discussion.author?.firstName ? `${discussion.author.firstName} ${discussion.author.lastName}` : discussion.author?.username || 'Ismeretlen Felhasználó'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(discussion.createdAt).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <Badge variant="outline" className="w-fit bg-primary/5 border-primary/20 font-normal">
                                {discussion.title}
                              </Badge>
                            </div>

                            <div className="text-foreground leading-relaxed mt-3 whitespace-pre-wrap">
                              {discussion.content}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted/30 px-6 py-3 border-t flex items-center gap-4 text-sm text-muted-foreground">
                        <button className="flex items-center gap-2 hover:text-primary transition-colors font-medium">
                          <MessageCircle className="w-4 h-4" />
                          Válasz
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Teacher-only: Moderation tab */}
          {isTeacher && (
            <TabsContent value="moderation" className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg text-white shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Moderálás</h2>
                  <p className="text-sm text-muted-foreground">Kezeld a csoportokat és a fórum bejegyzéseket – tanári felület</p>
                </div>
              </div>

              {/* Group overview for teacher */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Összes csoport</p>
                      <p className="text-3xl font-bold text-blue-700">{groups?.length ?? 0}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Flame className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Összes XP (rendszer)</p>
                      <p className="text-3xl font-bold text-orange-600">{leaderboard?.reduce((s, g) => s + g.totalXp, 0) ?? 0}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Összes fórum bejegyzés</p>
                      <p className="text-3xl font-bold text-green-700">{discussions?.length ?? 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* All discussions with delete option for teacher */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Összes Fórum Bejegyzés
                </h3>
                {discussionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse bg-gray-100 rounded-lg" />)}
                  </div>
                ) : discussions && discussions.length > 0 ? (
                  <div className="space-y-3">
                    {discussions.map((discussion) => (
                      <Card key={discussion.id} className="border-border/50 hover:shadow-sm transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Avatar className="w-9 h-9 shrink-0">
                                <AvatarImage src={discussion.author?.profileImageUrl || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                                  {discussion.author?.firstName?.[0] || discussion.author?.username?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">
                                    {discussion.author?.firstName
                                      ? `${discussion.author.firstName} ${discussion.author.lastName}`
                                      : discussion.author?.username || 'Ismeretlen'}
                                  </span>
                                  <Badge variant="outline" className="text-xs">{discussion.title}</Badge>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    {new Date(discussion.createdAt).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{discussion.content}</p>
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Bejegyzés törlése?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Biztosan törölni szeretnéd ezt a bejegyzést? Ez a művelet nem vonható vissza.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={async () => {
                                      try {
                                        await apiRequest('DELETE', `/api/discussions/${discussion.id}`);
                                        queryClient.invalidateQueries({ queryKey: ['/api/discussions'] });
                                        toast({ title: 'Bejegyzés törölve' });
                                      } catch {
                                        toast({ title: 'Hiba', description: 'Nem sikerült törölni', variant: 'destructive' });
                                      }
                                    }}
                                  >
                                    Törlés
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-10 text-center border-dashed">
                    <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">Még nincsenek fórum bejegyzések.</p>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}