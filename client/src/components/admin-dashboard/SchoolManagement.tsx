import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, School as SchoolIcon, UserPlus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { School, User, schoolAdminFormSchema } from "./types";

export function SchoolManagement() {
  const { toast } = useToast();
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = useState(false);
  const [isSchoolAdminDialogOpen, setIsSchoolAdminDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const { data: schools = [], isLoading: schoolsLoading } = useQuery<School[]>({
    queryKey: ["/api/admin/schools"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const schoolAdmins = users.filter(u => u.role === 'school_admin');

  const schoolAdminForm = useForm({
    resolver: zodResolver(schoolAdminFormSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      schoolName: "",
      email: "",
    }
  });

  const createSchoolMutation = useMutation({
    mutationFn: async (data: Partial<School>) => {
      const res = await apiRequest("POST", "/api/admin/schools", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schools"] });
      setIsSchoolDialogOpen(false);
      toast({ title: "Siker", description: "Iskola létrehozva" });
    }
  });

  const updateSchoolMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<School> }) => {
      const res = await apiRequest("PATCH", `/api/admin/schools/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schools"] });
      setIsSchoolDialogOpen(false);
      setEditingSchool(null);
      toast({ title: "Siker", description: "Iskola frissítve" });
    }
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/schools/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/schools"] });
      toast({ title: "Siker", description: "Iskola törölve" });
    }
  });

  const createSchoolAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/create-school-admin", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Iskolai admin létrehozva" });
      setIsSchoolAdminDialogOpen(false);
      schoolAdminForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Iskolák és Adminisztrátorok</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSchoolAdminDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Új Iskolai Admin
          </Button>
          <Button onClick={() => { setEditingSchool(null); setIsSchoolDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Új Iskola
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SchoolIcon className="h-5 w-5" /> Iskolák ({schools.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {schools.map(school => (
              <div key={school.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{school.name}</p>
                  <p className="text-xs text-muted-foreground">{school.address || "Nincs cím megadva"}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingSchool(school); setIsSchoolDialogOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if(confirm('Törli?')) deleteSchoolMutation.mutate(school.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Iskolai Adminisztrátorok ({schoolAdmins.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {schoolAdmins.map(admin => (
              <div key={admin.id} className="p-3 border rounded-lg">
                <p className="font-medium">{admin.lastName} {admin.firstName}</p>
                <p className="text-xs text-muted-foreground">{admin.email || admin.username}</p>
                {admin.schoolId && (
                  <Badge variant="outline" className="mt-2">
                    {schools.find(s => s.id === admin.schoolId)?.name}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* School Dialog */}
      <Dialog open={isSchoolDialogOpen} onOpenChange={setIsSchoolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSchool ? "Iskola szerkesztése" : "Új iskola"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Iskola neve</Label>
              <Input 
                defaultValue={editingSchool?.name || ""} 
                onChange={(e) => setEditingSchool(prev => ({ ...prev!, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cím</Label>
              <Input 
                defaultValue={editingSchool?.address || ""} 
                onChange={(e) => setEditingSchool(prev => ({ ...prev!, address: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => editingSchool?.id ? updateSchoolMutation.mutate({ id: editingSchool.id, data: editingSchool }) : createSchoolMutation.mutate(editingSchool!)}>
                Mentés
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* School Admin Dialog */}
      <Dialog open={isSchoolAdminDialogOpen} onOpenChange={setIsSchoolAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új Iskolai Adminisztrátor</DialogTitle>
          </DialogHeader>
          <Form {...schoolAdminForm}>
            <form onSubmit={schoolAdminForm.handleSubmit(data => createSchoolAdminMutation.mutate(data))} className="space-y-4">
              <FormField control={schoolAdminForm.control} name="username" render={({field}) => (
                <FormItem><FormLabel>Felhasználónév</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
              )}/>
              <FormField control={schoolAdminForm.control} name="password" render={({field}) => (
                <FormItem><FormLabel>Jelszó</FormLabel><FormControl><Input type="password" {...field}/></FormControl></FormItem>
              )}/>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={schoolAdminForm.control} name="lastName" render={({field}) => (
                  <FormItem><FormLabel>Vezetéknév</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
                )}/>
                <FormField control={schoolAdminForm.control} name="firstName" render={({field}) => (
                  <FormItem><FormLabel>Keresztnév</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
                )}/>
              </div>
              <FormField control={schoolAdminForm.control} name="schoolName" render={({field}) => (
                <FormItem><FormLabel>Iskola neve</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
              )}/>
              <FormField control={schoolAdminForm.control} name="email" render={({field}) => (
                <FormItem><FormLabel>Email cím</FormLabel><FormControl><Input type="email" {...field}/></FormControl></FormItem>
              )}/>
              <DialogFooter>
                <Button type="submit">Létrehozás</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
