import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Edit, Trash2, BookOpen, 
  Wrench, HardHat, Cpu, Hammer, Zap, Car, Briefcase, Heart, Utensils, Building, GraduationCap 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Profession, insertProfessionSchema } from "../types";

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

export function ProfessionManager({ professions, onSelect }: { professions: Profession[], onSelect: (id: number) => void }) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null);

  const form = useForm({
    resolver: zodResolver(insertProfessionSchema),
    defaultValues: {
      name: "",
      description: "",
      iconName: "wrench",
      iconUrl: "",
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/professions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Siker", description: "Szakma létrehozva" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await apiRequest("PUT", `/api/professions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] });
      setIsDialogOpen(false);
      setEditingProfession(null);
      form.reset();
      toast({ title: "Siker", description: "Szakma frissítve" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/professions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] });
      toast({ title: "Siker", description: "Szakma törölve" });
    }
  });

  const handleEdit = (prof: Profession) => {
    setEditingProfession(prof);
    form.reset({
      name: prof.name,
      description: prof.description || "",
      iconName: prof.iconName || "wrench",
      iconUrl: prof.iconUrl || "",
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
        <Button onClick={() => { setEditingProfession(null); form.reset(); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Új Szakma
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {professions.map(prof => {
          const IconComp = iconOptions.find(o => o.value === prof.iconName)?.icon || BookOpen;
          return (
            <Card key={prof.id} className="group hover:border-primary transition-colors cursor-pointer" onClick={() => onSelect(prof.id)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-bold">{prof.name}</CardTitle>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(prof); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); if(confirm('Törli?')) deleteMutation.mutate(prof.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2">{prof.description}</p>
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
    </div>
  );
}
