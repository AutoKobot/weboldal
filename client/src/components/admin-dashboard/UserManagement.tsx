import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Profession, School } from "./types";

interface UserManagementProps {
  users: User[];
  professions: Profession[];
  isLoading: boolean;
}

export function UserManagement({ users, professions, isLoading }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const { toast } = useToast();

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Szerepkör sikeresen frissítve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Felhasználó törölve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }
  });

  const unlockAllModulesMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/unlock-all-modules`);
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Minden modul feloldva a tanuló számára" });
    }
  });

  const restoreAllProgressMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/users/restore-all-progress");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Sikeres helyreállítás", 
        description: `Sikeresen javítva: ${data.totalStudentsUpdated} diák profilja (${data.totalStudentsChecked} ellenőrzött diákból).` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => {
      toast({ 
        title: "Hiba a visszaállításkor", 
        description: err.message || "Nem sikerült a folyamat végrehajtása", 
        variant: "destructive" 
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: any) => {
      await apiRequest("POST", `/api/admin/users/${userId}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Jelszó sikeresen visszaállítva" });
      setIsPasswordResetDialogOpen(false);
    }
  });

  const adminUsers = users.filter(u => u.role === 'admin').length;
  const schoolAdminUsers = users.filter(u => u.role === 'school_admin').length;
  const teacherUsers = users.filter(u => u.role === 'teacher').length;
  const studentUsers = users.filter(u => u.role === 'student').length;

  if (isLoading) return <div className="text-center py-12">Betöltés...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Felhasználók kezelése</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Összes: {users.length} &nbsp;|&nbsp;
            <span className="text-red-600">● Admin: {adminUsers}</span> &nbsp;|&nbsp;
            <span className="text-blue-600">● Iskola: {schoolAdminUsers}</span> &nbsp;|&nbsp;
            <span className="text-green-600">● Tanár: {teacherUsers}</span> &nbsp;|&nbsp;
            <span className="text-purple-600">● Diák: {studentUsers}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 text-xs text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400"
            onClick={() => {
              if (confirm("Biztosan visszaállítod az ÖSSZES diák modulhozzáférését a valós teljesítéseikre (tesztek + gyakorlatok alapján)? Ez visszazárja a véletlenül megnyitott modulokat.")) {
                restoreAllProgressMutation.mutate();
              }
            }}
            disabled={restoreAllProgressMutation.isPending}
          >
            🔄 Diák haladások javítása
          </Button>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés név, email vagy iskola alapján..."
              className="pl-9 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Render Lists by Role */}
      {['admin', 'school_admin', 'teacher', 'student'].map(role => {
        const roleUsers = filteredUsers.filter(u => u.role === role);
        if (roleUsers.length === 0) return null;

        const colors = {
          admin: 'bg-red-500 text-red-600',
          school_admin: 'bg-blue-500 text-blue-600',
          teacher: 'bg-green-500 text-green-600',
          student: 'bg-purple-500 text-purple-600'
        };

        const roleLabels = {
          admin: 'Rendszer adminisztrátorok',
          school_admin: 'Iskolai adminisztrátorok',
          teacher: 'Tanárok',
          student: 'Hallgatók'
        };

        return (
          <Card key={role}>
            <CardHeader className="pb-3">
              <CardTitle className={`text-base flex items-center gap-2 ${(colors as any)[role].split(' ')[1]}`}>
                <span className={`h-3 w-3 rounded-full ${(colors as any)[role].split(' ')[0]} inline-block`} />
                {(roleLabels as any)[role]} ({roleUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {roleUsers.map(user => (
                <UserRow 
                  key={user.id} 
                  user={user}
                  professions={professions}
                  onRoleChange={(r: string) => updateUserRoleMutation.mutate({ userId: user.id, role: r })}
                  onResetPassword={() => { setResetPasswordUserId(user.id); setIsPasswordResetDialogOpen(true); }}
                  onDelete={() => { if (confirm(`Töröljük: ${user.firstName || user.username}?`)) deleteUserMutation.mutate(user.id); }}
                  onUnlockModules={() => { if (confirm('Minden modul feloldása?')) unlockAllModulesMutation.mutate(user.id); }}
                  unlockPending={unlockAllModulesMutation.isPending}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      <PasswordResetDialog
        isOpen={isPasswordResetDialogOpen}
        onClose={() => setIsPasswordResetDialogOpen(false)}
        onReset={(password: string) => resetPasswordMutation.mutate({ userId: resetPasswordUserId!, newPassword: password })}
        isPending={resetPasswordMutation.isPending}
      />
    </div>
  );
}

function UserRow({ user, professions, onRoleChange, onResetPassword, onDelete, onUnlockModules, unlockPending }: any) {
  const { data: schools = [] } = useQuery<School[]>({ queryKey: ["/api/admin/schools"] });
  const { toast } = useToast();

  const updateUserSchoolMutation = useMutation({
    mutationFn: async ({ userId, schoolId }: { userId: string, schoolId: number | null }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/school`, { schoolId });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Iskola sikeresen hozzárendelve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }
  });

  const displayName = user.lastName && user.firstName
    ? `${user.lastName} ${user.firstName}`
    : user.email || user.username || user.id;

  const assignedSchool = schools.find(s => s.id === user.schoolId);

  return (
    <div className="border rounded-lg p-3 flex items-center justify-between gap-3 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 min-w-0">
        {user.profileImageUrl && (
          <img src={user.profileImageUrl} alt="Profil" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {user.email || user.username || "—"}
            {assignedSchool && <span className="ml-2 px-1 rounded bg-blue-50 text-blue-600 font-medium border border-blue-100">🏫 {assignedSchool.name}</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
        <Select value={user.role} onValueChange={onRoleChange}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Hallgató</SelectItem>
            <SelectItem value="teacher">Tanár</SelectItem>
            <SelectItem value="school_admin">Isk. Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        {(user.role === 'teacher' || user.role === 'student' || user.role === 'school_admin') && (
          <Select 
            value={user.schoolId?.toString() || "none"} 
            onValueChange={(val) => {
              const newValue = val === "none" ? null : parseInt(val);
              updateUserSchoolMutation.mutate({ userId: user.id, schoolId: newValue });
            }}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Nincs iskola" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Nincs iskola --</SelectItem>
              {schools.map(school => (
                <SelectItem key={school.id} value={school.id.toString()}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {user.role === 'student' && professions.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Szakmák ({(user.assignedProfessionIds as number[] | undefined)?.length || 0})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Szakmák – {displayName}</DialogTitle>
              </DialogHeader>
              <ProfessionAssignmentForm userId={user.id} currentProfessions={(user.assignedProfessionIds as number[] | undefined) || []} />
            </DialogContent>
          </Dialog>
        )}

        {user.role === 'student' && (
          <Button variant="outline" size="sm" className="h-8 text-xs"
            onClick={onUnlockModules} disabled={unlockPending}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Modulok
          </Button>
        )}

        <Button variant="outline" size="sm" className="h-8 px-2" onClick={onResetPassword}>
          🔑
        </Button>
        <Button variant="destructive" size="sm" className="h-8 px-2" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ProfessionAssignmentForm({ userId, currentProfessions }: any) {
  const { toast } = useToast();
  const [selectedProfessions, setSelectedProfessions] = useState<number[]>(currentProfessions);

  const { data: professions = [] } = useQuery<Profession[]>({
    queryKey: ['/api/public/professions'],
  });

  const updateProfessionsMutation = useMutation({
    mutationFn: async ({ userId, professionIds }: { userId: string, professionIds: number[] }) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/assigned-professions`, { professionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Sikeres frissítés", description: "A szakma hozzárendelések frissítve lettek." });
    }
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Válassza ki, melyik szakmákhoz férjen hozzá ez a tanuló:</p>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {professions.map((profession: Profession) => (
          <label key={profession.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-muted">
            <input
              type="checkbox"
              checked={selectedProfessions.includes(profession.id)}
              onChange={() => setSelectedProfessions(prev => prev.includes(profession.id) ? prev.filter(id => id !== profession.id) : [...prev, profession.id])}
              className="rounded border-gray-300"
            />
            <span className="flex-1">{profession.name}</span>
          </label>
        ))}
      </div>
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={() => updateProfessionsMutation.mutate({ userId, professionIds: selectedProfessions })} disabled={updateProfessionsMutation.isPending}>
          {updateProfessionsMutation.isPending ? "Mentés..." : "Mentés"}
        </Button>
      </div>
    </div>
  );
}

function PasswordResetDialog({ isOpen, onClose, onReset, isPending }: any) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast({ title: "Hiba", description: "Minimum 6 karakter", variant: "destructive" });
    if (password !== confirmPassword) return toast({ title: "Hiba", description: "Nem egyezik", variant: "destructive" });
    onReset(password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jelszó visszaállítása</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Új jelszó</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <Label>Megerősítés</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Mégse</Button>
            <Button type="submit" disabled={isPending}>Visszaállítás</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
