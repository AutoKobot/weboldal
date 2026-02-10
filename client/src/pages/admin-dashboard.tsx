import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, BookOpen, GraduationCap, BarChart3, Edit, LogOut, Settings, MessageSquare, Eye, EyeOff, Key, Wrench, HardHat, Cpu, Hammer, Zap, Car, Briefcase, Heart, Utensils, Building, Upload, Wand2, Brain, Youtube, Globe, Search, Clock, Sparkles, Target, CheckCircle, ExternalLink } from "lucide-react";
import FileUpload, { UrlInput } from "@/components/file-upload";
import { EnhancedModuleForm } from "@/components/enhanced-module-form";
import { LinkEditor } from "@/components/link-editor";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  insertModuleSchema,
  insertProfessionSchema,
  insertSubjectSchema,
  type Module,
  type Profession,
  type Subject,
  type User,
  type KeyConceptsData
} from "@shared/schema";

const moduleFormSchema = insertModuleSchema.extend({
  subjectId: z.number().min(1, "Tantárgy kiválasztása kötelező"),
  conciseContent: z.string().optional(),
  detailedContent: z.string().optional(),
});

const professionFormSchema = insertProfessionSchema;
const subjectFormSchema = insertSubjectSchema.extend({
  professionId: z.number().min(1, "Szakma kiválasztása kötelező"),
});

const schoolAdminFormSchema = z.object({
  username: z.string().min(3, "A felhasználónév legalább 3 karakter legyen"),
  password: z.string().min(6, "A jelszó legalább 6 karakter legyen"),
  firstName: z.string().min(1, "A keresztnév kötelező"),
  lastName: z.string().min(1, "A vezetéknév kötelező"),
  schoolName: z.string().min(1, "Az iskola neve kötelező"),
  email: z.string().email("Érvényes email cím szükséges").optional(),
});

const monthlyCostFormSchema = z.object({
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
  developmentCosts: z.string().optional(),
  infrastructureCosts: z.string().optional(),
  otherCosts: z.string().optional(),
  notes: z.string().optional(),
});

// Cost Tracking Component
function CostTrackingComponent() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isAddCostDialogOpen, setIsAddCostDialogOpen] = useState(false);
  const [isEditCostDialogOpen, setIsEditCostDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<any>(null);
  const [isApiPricingDialogOpen, setIsApiPricingDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<any>(null);

  const { data: costData, isLoading: costLoading } = useQuery({
    queryKey: ['/api/admin/costs/stats', selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await fetch(`/api/admin/costs/stats?year=${selectedYear}&month=${selectedMonth}`);
      if (!response.ok) throw new Error('Failed to fetch cost data');
      return response.json();
    },
  });

  const { data: apiPricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['/api/admin/api-pricing'],
    queryFn: async () => {
      const response = await fetch('/api/admin/api-pricing');
      if (!response.ok) throw new Error('Failed to fetch API pricing');
      return response.json();
    },
  });

  const costForm = useForm({
    resolver: zodResolver(monthlyCostFormSchema),
    defaultValues: {
      year: selectedYear,
      month: selectedMonth,
      developmentCosts: "0.00",
      infrastructureCosts: "0.00",
      otherCosts: "0.00",
      notes: "",
    },
  });

  const editCostForm = useForm({
    defaultValues: {
      developmentCosts: "0.00",
      infrastructureCosts: "0.00",
      otherCosts: "0.00",
      notes: "",
    },
  });

  const addCostMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/costs/monthly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add cost data');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Havi költség sikeresen frissítve" });
      setIsAddCostDialogOpen(false);
      costForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/costs/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült frissíteni a havi költséget",
        variant: "destructive"
      });
    },
  });

  const onCostSubmit = (data: any) => {
    addCostMutation.mutate(data);
  };

  const editCostMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/costs/monthly/${editingCost.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update cost data');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Havi költség sikeresen frissítve" });
      setIsEditCostDialogOpen(false);
      setEditingCost(null);
      editCostForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/costs/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült frissíteni a havi költséget",
        variant: "destructive"
      });
    },
  });

  const onEditCostSubmit = (data: any) => {
    editCostMutation.mutate(data);
  };

  const addApiPricingMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/api-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update API pricing');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "API árazás sikeresen frissítve" });
      setIsApiPricingDialogOpen(false);
      setEditingPricing(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/api-pricing'] });
    },
    onError: (error: any) => {
      toast({
        title: "Hiba",
        description: error.message || "Nem sikerült frissíteni az API árazást",
        variant: "destructive"
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const months = [
    'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Költségkövetés</h2>
        <Dialog open={isAddCostDialogOpen} onOpenChange={setIsAddCostDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Havi költség hozzáadása
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Havi költség hozzáadása/frissítése</DialogTitle>
              <DialogDescription>
                Adja meg a havi költségeket. Az API költségek automatikusan kiszámítódnak.
              </DialogDescription>
            </DialogHeader>
            <Form {...costForm}>
              <form onSubmit={costForm.handleSubmit(onCostSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={costForm.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Év</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="2020"
                            max="2030"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={costForm.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hónap</FormLabel>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((month, index) => (
                              <SelectItem key={index + 1} value={(index + 1).toString()}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={costForm.control}
                  name="developmentCosts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fejlesztési költségek (USD)</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="infrastructureCosts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Infrastruktúra költségek (USD)</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="otherCosts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Egyéb költségek (USD)</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Megjegyzések</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Opcionális megjegyzések..." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddCostDialogOpen(false)}>
                    Mégse
                  </Button>
                  <Button type="submit" disabled={addCostMutation.isPending}>
                    {addCostMutation.isPending ? "Mentés..." : "Mentés"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Szűrők</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Év</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hónap</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {costLoading ? (
        <div className="text-center py-8">Betöltés...</div>
      ) : (
        <div className="space-y-6">
          {/* API Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>API Használati Statisztikák</CardTitle>
            </CardHeader>
            <CardContent>
              {costData?.apiStats?.length > 0 ? (
                <div className="space-y-4">
                  {costData.apiStats.map((stat: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{stat.provider} - {stat.service}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stat.totalCalls} hívás • {stat.totalTokens} token
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(stat.totalCost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nincs API használat ebben az időszakban.</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly Costs */}
          <Card>
            <CardHeader>
              <CardTitle>Havi Költségek</CardTitle>
            </CardHeader>
            <CardContent>
              {costData?.monthlyCosts?.length > 0 ? (
                <div className="space-y-4">
                  {costData.monthlyCosts.map((cost: any) => (
                    <div key={`${cost.year}-${cost.month}-${cost.id}`} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">
                          {months[cost.month - 1]} {cost.year}
                        </h4>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{formatCurrency(cost.totalCosts)}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCost(cost);
                              editCostForm.reset({
                                developmentCosts: cost.developmentCosts || "0.00",
                                infrastructureCosts: cost.infrastructureCosts || "0.00",
                                otherCosts: cost.otherCosts || "0.00",
                                notes: cost.notes || "",
                              });
                              setIsEditCostDialogOpen(true);
                            }}
                          >
                            Szerkesztés
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">API költségek (automatikus)</p>
                          <p className="font-medium">{formatCurrency(cost.apiCosts)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fejlesztés</p>
                          <p className="font-medium">{formatCurrency(cost.developmentCosts)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Infrastruktúra</p>
                          <p className="font-medium">{formatCurrency(cost.infrastructureCosts)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Egyéb</p>
                          <p className="font-medium">{formatCurrency(cost.otherCosts)}</p>
                        </div>
                      </div>
                      {cost.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{cost.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nincsenek rögzített havi költségek.</p>
              )}
            </CardContent>
          </Card>

          {/* API Pricing Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                API Árazás Kezelése
                <Button onClick={() => setIsApiPricingDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Új árazás
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pricingLoading ? (
                <div className="text-center py-4">Betöltés...</div>
              ) : apiPricingData?.pricing?.length > 0 ? (
                <div className="space-y-4">
                  {apiPricingData.pricing.map((pricing: any) => (
                    <div key={pricing.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {pricing.provider} - {pricing.service}
                          {pricing.model && ` (${pricing.model})`}
                        </h4>
                        <div className="text-sm text-muted-foreground mt-1">
                          Token ár: ${pricing.pricePerToken} • Kérés ár: ${pricing.pricePerRequest}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPricing(pricing);
                            setIsApiPricingDialogOpen(true);
                          }}
                        >
                          Szerkesztés
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Nincsenek beállított API árazások.</p>
              )}

              {/* Show discovered APIs that don't have pricing */}
              {apiPricingData?.uniqueProviders?.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-3">Felismert API-k (árazás nélkül)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {apiPricingData.uniqueProviders
                      .filter((provider: any) =>
                        !apiPricingData.pricing.some((p: any) =>
                          p.provider === provider.provider &&
                          p.service === provider.service &&
                          p.model === provider.model
                        )
                      )
                      .map((provider: any, index: number) => (
                        <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                          {provider.provider} - {provider.service}
                          {provider.model && ` (${provider.model})`}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Pricing Dialog */}
      <Dialog open={isApiPricingDialogOpen} onOpenChange={(open) => {
        setIsApiPricingDialogOpen(open);
        if (!open) setEditingPricing(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPricing ? "API árazás szerkesztése" : "Új API árazás"}
            </DialogTitle>
            <DialogDescription>
              Állítsa be az API szolgáltatás token és kérés alapú árazását.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Szolgáltató</Label>
                <Input
                  placeholder="pl. openai"
                  defaultValue={editingPricing?.provider || ''}
                  onChange={(e) => setEditingPricing({ ...editingPricing, provider: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Szolgáltatás</Label>
                <Input
                  placeholder="pl. chat-completion"
                  defaultValue={editingPricing?.service || ''}
                  onChange={(e) => setEditingPricing({ ...editingPricing, service: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Model (opcionális)</Label>
              <Input
                placeholder="pl. gpt-4-turbo"
                defaultValue={editingPricing?.model || ''}
                onChange={(e) => setEditingPricing({ ...editingPricing, model: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Token ár (USD)</Label>
                <Input
                  placeholder="0.00003000"
                  type="number"
                  step="0.00000001"
                  defaultValue={editingPricing?.pricePerToken || '0.00000000'}
                  onChange={(e) => setEditingPricing({ ...editingPricing, pricePerToken: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kérés ár (USD)</Label>
                <Input
                  placeholder="0.000000"
                  type="number"
                  step="0.000001"
                  defaultValue={editingPricing?.pricePerRequest || '0.000000'}
                  onChange={(e) => setEditingPricing({ ...editingPricing, pricePerRequest: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsApiPricingDialogOpen(false)}>
              Mégse
            </Button>
            <Button
              onClick={() => {
                if (editingPricing?.provider && editingPricing?.service) {
                  addApiPricingMutation.mutate(editingPricing);
                }
              }}
              disabled={addApiPricingMutation.isPending}
            >
              {addApiPricingMutation.isPending ? "Mentés..." : "Mentés"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cost Dialog */}
      <Dialog open={isEditCostDialogOpen} onOpenChange={setIsEditCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Havi költség szerkesztése</DialogTitle>
            <DialogDescription>
              {editingCost && `${months[editingCost.month - 1]} ${editingCost.year} havi költségeinek szerkesztése. Az API költségek automatikusan frissülnek.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...editCostForm}>
            <form onSubmit={editCostForm.handleSubmit(onEditCostSubmit)} className="space-y-4">
              <FormField
                control={editCostForm.control}
                name="developmentCosts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fejlesztési költségek (USD)</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editCostForm.control}
                name="infrastructureCosts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Infrastruktúra költségek (USD)</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editCostForm.control}
                name="otherCosts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Egyéb költségek (USD)</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={editCostForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Megjegyzések</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Opcionális megjegyzések..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditCostDialogOpen(false);
                  setEditingCost(null);
                }}>
                  Mégse
                </Button>
                <Button type="submit" disabled={editCostMutation.isPending}>
                  {editCostMutation.isPending ? "Mentés..." : "Mentés"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ModuleFormData = z.infer<typeof moduleFormSchema>;
type ProfessionFormData = z.infer<typeof professionFormSchema>;
type SubjectFormData = z.infer<typeof subjectFormSchema>;
type SchoolAdminFormData = z.infer<typeof schoolAdminFormSchema>;

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProfessionDialogOpen, setIsProfessionDialogOpen] = useState(false);
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [selectedProfessionForFilter, setSelectedProfessionForFilter] = useState<number | null>(null);
  const [selectedSubjectForFilter, setSelectedSubjectForFilter] = useState<number | null>(null);
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [dataForSeoLogin, setDataForSeoLogin] = useState("");
  const [dataForSeoPassword, setDataForSeoPassword] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [aiProvider, setAiProvider] = useState("openai");
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showDataForSeoLogin, setShowDataForSeoLogin] = useState(false);
  const [showDataForSeoPassword, setShowDataForSeoPassword] = useState(false);
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [systemMessage, setSystemMessage] = useState("");
  const [moduleUpdateMessage, setModuleUpdateMessage] = useState("");
  const [youtubePrompt, setYoutubePrompt] = useState("");
  const [wikipediaPrompt, setWikipediaPrompt] = useState("");
  const [internetContentPrompt, setInternetContentPrompt] = useState("");
  const [conciseContentPrompt, setConciseContentPrompt] = useState("");
  const [audioExplanationPrompt, setAudioExplanationPrompt] = useState("");
  const [textExplanationPrompt, setTextExplanationPrompt] = useState("");
  const [regeneratingModules, setRegeneratingModules] = useState<Set<number>>(new Set());
  const [isSchoolAdminDialogOpen, setIsSchoolAdminDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");

  // Queries
  const { data: apiStatus } = useQuery<{
    openai: boolean;
    gemini: boolean;
    dataForSeo: boolean;
    youtube: boolean;
    elevenLabs: boolean;
  }>({
    queryKey: ["/api/admin/api-status"],
  });

  const { data: professions = [], isLoading: professionsLoading } = useQuery<Profession[]>({
    queryKey: ["/api/public/professions"],
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/public/subjects"],
  });

  // Szűrt tantárgyak a kiválasztott szakma alapján
  const filteredSubjects = selectedProfessionForFilter
    ? subjects.filter(subject => subject.professionId === selectedProfessionForFilter)
    : subjects;

  const { data: modules = [], isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ["/api/public/modules"],
  });

  // Szűrt modulok a kiválasztott tantárgy alapján
  const filteredModules = selectedSubjectForFilter
    ? modules.filter(module => module.subjectId === selectedSubjectForFilter)
    : modules;

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // System message and module update message queries
  const { data: systemMessageData } = useQuery<{ message: string }>({
    queryKey: ["/api/admin/settings/system-message"],
  });

  const { data: moduleUpdateMessageData } = useQuery<{ message: string }>({
    queryKey: ["/api/admin/settings/module-update-message"],
  });

  const { data: youtubePromptData } = useQuery<{ message: string }>({
    queryKey: ["/api/admin/settings/youtube-prompt"],
  });

  const { data: wikipediaPromptData } = useQuery<{ message: string }>({
    queryKey: ["/api/admin/settings/wikipedia-prompt"],
  });

  const { data: internetContentPromptData } = useQuery<{ message: string }>({
    queryKey: ["/api/admin/settings/internet-content-prompt"],
  });

  const { data: conciseContentPromptData } = useQuery<{ message: string }>({
    queryKey: ["/api/admin/settings/concise-content-prompt"],
  });

  const { data: audioExplanationPromptData } = useQuery<{ message: string }>({
    queryKey: ["/api/admin/settings/audio-explanation-prompt"],
  });

  const { data: textExplanationPromptData } = useQuery<{ message: string }>({
    queryKey: ["/api/admin/settings/text-explanation-prompt"],
  });

  // Update state when data changes
  useEffect(() => {
    if (systemMessageData?.message && !systemMessage) {
      setSystemMessage(systemMessageData.message);
    }
  }, [systemMessageData?.message, systemMessage]);

  useEffect(() => {
    if (moduleUpdateMessageData?.message && !moduleUpdateMessage) {
      setModuleUpdateMessage(moduleUpdateMessageData.message);
    }
  }, [moduleUpdateMessageData?.message, moduleUpdateMessage]);

  useEffect(() => {
    if (youtubePromptData?.message && !youtubePrompt) {
      setYoutubePrompt(youtubePromptData.message);
    }
  }, [youtubePromptData?.message, youtubePrompt]);

  useEffect(() => {
    if (wikipediaPromptData?.message && !wikipediaPrompt) {
      setWikipediaPrompt(wikipediaPromptData.message);
    }
  }, [wikipediaPromptData?.message, wikipediaPrompt]);

  useEffect(() => {
    if (internetContentPromptData?.message && !internetContentPrompt) {
      setInternetContentPrompt(internetContentPromptData.message);
    }
  }, [internetContentPromptData?.message, internetContentPrompt]);

  useEffect(() => {
    if (conciseContentPromptData?.message && !conciseContentPrompt) {
      setConciseContentPrompt(conciseContentPromptData.message);
    }
  }, [conciseContentPromptData?.message, conciseContentPrompt]);

  useEffect(() => {
    if (audioExplanationPromptData?.message && !audioExplanationPrompt) {
      setAudioExplanationPrompt(audioExplanationPromptData.message);
    }
  }, [audioExplanationPromptData?.message, audioExplanationPrompt]);

  useEffect(() => {
    if (textExplanationPromptData?.message && !textExplanationPrompt) {
      setTextExplanationPrompt(textExplanationPromptData.message);
    }
  }, [textExplanationPromptData?.message, textExplanationPrompt]);

  // Forms
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

  const professionForm = useForm<ProfessionFormData>({
    resolver: zodResolver(professionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      iconName: "",
      iconUrl: "",
    },
  });

  // Icon options for profession selection
  const iconOptions = [
    { value: "wrench", label: "Kulcs (Hegesztő, Szerelő)", icon: Wrench },
    { value: "hard-hat", label: "Sisak (Építőipar)", icon: HardHat },
    { value: "cpu", label: "Processzor (IT, Számítástechnika)", icon: Cpu },
    { value: "hammer", label: "Kalapács (Kézműves)", icon: Hammer },
    { value: "zap", label: "Villám (Elektromos)", icon: Zap },
    { value: "car", label: "Autó (Gépjármű)", icon: Car },
    { value: "briefcase", label: "Táska (Üzleti)", icon: Briefcase },
    { value: "heart", label: "Szív (Egészségügy)", icon: Heart },
    { value: "utensils", label: "Evőeszköz (Vendéglátás)", icon: Utensils },
    { value: "building", label: "Épület (Építészet)", icon: Building },
    { value: "graduation-cap", label: "Diplomasapka (Oktatás)", icon: GraduationCap },
  ];

  const subjectForm = useForm<SubjectFormData>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      professionId: 0,
    },
  });

  const schoolAdminForm = useForm<SchoolAdminFormData>({
    resolver: zodResolver(schoolAdminFormSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      schoolName: "",
      email: "",
    },
  });

  // Form értékek betöltése az editingModule változáskor
  useEffect(() => {
    if (editingModule && isDialogOpen) {
      console.log('Loading module data into form:', editingModule.title);

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
      console.log('Form content loaded:', form.getValues("content"));
    }
  }, [editingModule, isDialogOpen, form]);

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      const res = await apiRequest("POST", "/api/modules", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      setIsDialogOpen(false);
      toast({ title: "Siker", description: "Modul létrehozva" });
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      const res = await apiRequest("PATCH", `/api/modules/${editingModule!.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all module-related queries to ensure both admin and student views update
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/modules", editingModule!.id] });
      queryClient.clear(); // Clear all cache to ensure immediate update

      setIsDialogOpen(false);
      setEditingModule(null);
      toast({ title: "Siker", description: "Modul frissítve - változások minden felületen láthatók" });
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: number; isPublished: boolean }) => {
      const res = await apiRequest("PATCH", `/api/modules/${id}`, { isPublished });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      toast({ title: "Siker", description: "Modul állapota frissítve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await apiRequest("POST", "/api/admin/update-api-key", { openaiApiKey: apiKey });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "OpenAI API kulcs frissítve" });
      setOpenaiKey("");
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
      toast({ title: "Siker", description: "Modul törölve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const regenerateModuleMutation = useMutation({
    mutationFn: async ({ moduleId, title, content }: { moduleId: number, title: string, content: string }) => {
      setRegeneratingModules(prev => new Set(prev).add(moduleId));
      const response = await apiRequest('POST', `/api/admin/modules/${moduleId}/regenerate-ai`, {
        title,
        content
      });
      return response.json();
    },
    onSuccess: async (_, variables) => {
      // Clear cache and force refetch
      queryClient.clear();
      await queryClient.refetchQueries({ queryKey: ["/api/modules"] });

      setRegeneratingModules(prev => {
        const next = new Set(prev);
        next.delete(variables.moduleId);
        return next;
      });
      toast({
        title: "AI Újragenerálás sikeres!",
        description: "A modul tartalmát sikeresen frissítette az AI - webes keresési eredményekkel és videókkal bővítve.",
      });
    },
    onError: (error: Error, variables) => {
      setRegeneratingModules(prev => {
        const next = new Set(prev);
        next.delete(variables.moduleId);
        return next;
      });
      toast({
        title: "Újragenerálás sikertelen",
        description: "Az AI nem tudta frissíteni a modul tartalmát.",
        variant: "destructive",
      });
    },
  });

  const createProfessionMutation = useMutation({
    mutationFn: async (data: ProfessionFormData) => {
      const res = await apiRequest("POST", "/api/professions", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professions"] });
      setIsProfessionDialogOpen(false);
      toast({ title: "Siker", description: "Szakma létrehozva" });
      professionForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateProfessionMutation = useMutation({
    mutationFn: async (data: { id: number; profession: ProfessionFormData }) => {
      const res = await apiRequest("PUT", `/api/professions/${data.id}`, data.profession);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professions"] });
      setIsProfessionDialogOpen(false);
      setEditingProfession(null);
      toast({ title: "Siker", description: "Szakma frissítve" });
      professionForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const deleteProfessionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/professions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professions"] });
      toast({ title: "Siker", description: "Szakma törölve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const createSubjectMutation = useMutation({
    mutationFn: async (data: SubjectFormData) => {
      const res = await apiRequest("POST", "/api/subjects", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      setIsSubjectDialogOpen(false);
      toast({ title: "Siker", description: "Tantárgy létrehozva" });
      subjectForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async (data: { id: number; subject: SubjectFormData }) => {
      const res = await apiRequest("PUT", `/api/subjects/${data.id}`, data.subject);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      setIsSubjectDialogOpen(false);
      setEditingSubject(null);
      toast({ title: "Siker", description: "Tantárgy frissítve" });
      subjectForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      toast({ title: "Siker", description: "Tantárgy törölve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // Event handlers
  const handleProfessionClick = (professionId: number) => {
    setSelectedProfessionForFilter(professionId);
    setActiveTab("subjects");
  };

  const handleShowAllSubjects = () => {
    setSelectedProfessionForFilter(null);
  };

  const handleSubjectClick = (subjectId: number) => {
    setSelectedSubjectForFilter(subjectId);
    setActiveTab("modules");
  };

  const handleShowAllModules = () => {
    setSelectedSubjectForFilter(null);
  };

  const handleNewModule = () => {
    setEditingModule(null);
    form.reset({
      title: "",
      content: "",
      moduleNumber: 1,
      subjectId: 0,
      isPublished: false,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (module: Module) => {
    console.log('Editing module:', module.title, 'Content length:', module.content?.length);
    setEditingModule(module);
    setIsDialogOpen(true);
  };

  const onSubmit = (data: ModuleFormData) => {
    if (editingModule) {
      updateModuleMutation.mutate(data);
    } else {
      createModuleMutation.mutate(data);
    }
  };

  const handleProfessionEdit = (profession: Profession) => {
    setEditingProfession(profession);
    professionForm.reset({
      name: profession.name,
      description: profession.description,
    });
    setIsProfessionDialogOpen(true);
  };

  const handleSubjectEdit = (subject: Subject) => {
    setEditingSubject(subject);
    subjectForm.reset({
      name: subject.name,
      description: subject.description,
      professionId: subject.professionId,
    });
    setIsSubjectDialogOpen(true);
  };

  const onProfessionSubmit = (data: ProfessionFormData) => {
    if (editingProfession) {
      updateProfessionMutation.mutate({ id: editingProfession.id, profession: data });
    } else {
      createProfessionMutation.mutate(data);
    }
  };

  const onSubjectSubmit = (data: SubjectFormData) => {
    if (editingSubject) {
      updateSubjectMutation.mutate({ id: editingSubject.id, subject: data });
    } else {
      createSubjectMutation.mutate(data);
    }
  };

  const onSchoolAdminSubmit = (data: SchoolAdminFormData) => {
    createSchoolAdminMutation.mutate(data);
  };

  // API kulcsok és AI beállítások mutációi
  const updateOpenAIKeyMutation = useMutation({
    mutationFn: async (openaiApiKey: string) => {
      const res = await apiRequest("POST", "/api/admin/update-openai-key", { openaiApiKey });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "OpenAI API kulcs mentve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateGeminiKeyMutation = useMutation({
    mutationFn: async (geminiApiKey: string) => {
      const res = await apiRequest("POST", "/api/admin/update-gemini-key", { geminiApiKey });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Gemini API kulcs mentve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateAIProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await apiRequest("POST", "/api/admin/update-ai-provider", { provider });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "AI szolgáltató frissítve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateDataForSeoLoginMutation = useMutation({
    mutationFn: async (dataForSeoLogin: string) => {
      const res = await apiRequest("POST", "/api/admin/update-dataforseo-login", { dataForSeoLogin });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "DataForSEO felhasználónév mentve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateDataForSeoPasswordMutation = useMutation({
    mutationFn: async (dataForSeoPassword: string) => {
      const res = await apiRequest("POST", "/api/admin/update-dataforseo-password", { dataForSeoPassword });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "DataForSEO jelszó mentve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateYoutubeApiKeyMutation = useMutation({
    mutationFn: async (youtubeApiKey: string) => {
      const res = await apiRequest("POST", "/api/admin/update-youtube-key", { youtubeApiKey });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "YouTube API kulcs mentve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const updateElevenLabsKeyMutation = useMutation({
    mutationFn: async (elevenLabsKey: string) => {
      const res = await apiRequest("POST", "/api/admin/update-elevenlabs-key", { elevenLabsKey });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "ElevenLabs API kulcs mentve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // Iskolai admin regisztrálás mutáció
  const createSchoolAdminMutation = useMutation({
    mutationFn: async (data: SchoolAdminFormData) => {
      const res = await apiRequest("POST", "/api/admin/create-school-admin", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Iskolai admin sikeresen létrehozva" });
      setIsSchoolAdminDialogOpen(false);
      schoolAdminForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // Jelszó visszaállítási mutáció
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/admin/reset-password", { userId, newPassword });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Jelszó sikeresen visszaállítva" });
      setIsPasswordResetDialogOpen(false);
      setNewPassword("");
      setResetPasswordUserId("");
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });



  const updateSystemMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      await apiRequest("POST", "/api/admin/settings/system-message", { message });
    },
    onSuccess: () => {
      toast({
        title: "Sikeres mentés",
        description: "Az AI rendszer üzenet frissítve lett.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings/system-message'] });
    },
    onError: () => {
      toast({
        title: "Hiba történt",
        description: "Nem sikerült menteni a beállításokat.",
        variant: "destructive",
      });
    }
  });

  const updateAiChatEnabledMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/admin/settings/ai-chat-enabled", { enabled });
      setAiChatEnabled(enabled); // Optimistic update
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables ? "AI Chat Engedélyezve" : "AI Chat Letiltva",
        description: variables ? "Az AI chat funkció mostantól elérhető a felhasználók számára." : "Az AI chat funkció mostantól nem elérhető (kivéve adminoknak).",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/ai-chat-enabled'] });
    },
    onError: () => {
      toast({
        title: "Hiba történt",
        description: "Nem sikerült módosítani a beállítást.",
        variant: "destructive",
      });
      // Revert state on error
      if (aiChatEnabledData) {
        setAiChatEnabled(aiChatEnabledData.enabled);
      }
    }
  });

  const resetSystemMessage = () => {
    if (systemMessageData) {
      setSystemMessage(systemMessageData.message);
    }
  };

  // Modul frissítési üzenet kezelő mutáció
  const updateModuleUpdateMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/admin/settings/module-update-message", { message });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Modul frissítési üzenet mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/module-update-message"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // YouTube prompt mutation
  const updateYoutubePromptMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/admin/settings/youtube-prompt", { message });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "YouTube keresési prompt mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/youtube-prompt"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // Wikipedia prompt mutation
  const updateWikipediaPromptMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/admin/settings/wikipedia-prompt", { message });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Wikipedia keresési prompt mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/wikipedia-prompt"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // Internet content prompt mutation
  const updateInternetContentPromptMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/admin/settings/internet-content-prompt", { message });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Internet tartalom prompt mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/internet-content-prompt"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // Concise content prompt mutation
  const updateConciseContentPromptMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/admin/settings/concise-content-prompt", { message });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Tömör tartalom prompt mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/concise-content-prompt"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // Audio explanation prompt mutation
  const updateAudioExplanationPromptMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/admin/settings/audio-explanation-prompt", { message });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Hangos magyarázat prompt mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/audio-explanation-prompt"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // Text explanation prompt mutation
  const updateTextExplanationPromptMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/admin/settings/text-explanation-prompt", { message });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Szöveges magyarázat prompt mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/text-explanation-prompt"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  // User management mutations
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Siker", description: "Felhasználó szerepkör frissítve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });



  const unlockAllModulesMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/unlock-all-modules`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Minden modul feloldva",
        description: `${data.unlockedCount} modul sikeresen feloldva a felhasználó számára`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Siker", description: "Felhasználó törölve" });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    },
  });



  // Stats
  const publishedModules = modules?.filter((m: Module) => m.isPublished).length || 0;
  const adminUsers = users?.filter((u: User) => u.role === 'admin').length || 0;
  const teacherUsers = users?.filter((u: User) => u.role === 'teacher').length || 0;
  const studentUsers = users?.filter((u: User) => u.role === 'student').length || 0;

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Kijelentkezési hiba",
        description: "Nem sikerült kijelentkezni a rendszerből.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Rendszer kezelés és tartalom adminisztráció</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Kijelentkezés
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview">Áttekintés</TabsTrigger>
            <TabsTrigger value="professions">Szakmák</TabsTrigger>
            <TabsTrigger value="subjects">Tantárgyak</TabsTrigger>
            <TabsTrigger value="modules">Modulok</TabsTrigger>
            <TabsTrigger value="ai-modules" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <Wand2 className="h-4 w-4 mr-1" />
              AI Modulok
            </TabsTrigger>
            <TabsTrigger value="users">Felhasználók</TabsTrigger>
            <TabsTrigger value="school-admins">Iskolai Adminok</TabsTrigger>
            <TabsTrigger value="costs" className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <BarChart3 className="h-4 w-4 mr-1" />
              Költségek
            </TabsTrigger>
            <TabsTrigger value="settings">Beállítások</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Összes szakma</CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{professions.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Összes tantárgy</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subjects.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Publikált modulok</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{publishedModules}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Felhasználók</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {adminUsers} admin, {teacherUsers} tanár, {studentUsers} hallgató
                  </p>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          <TabsContent value="professions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Szakmák kezelése</h2>
              <Dialog open={isProfessionDialogOpen} onOpenChange={setIsProfessionDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Új szakma
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingProfession ? "Szakma szerkesztése" : "Új szakma létrehozása"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...professionForm}>
                    <form onSubmit={professionForm.handleSubmit(onProfessionSubmit)} className="space-y-4">
                      <FormField
                        control={professionForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Szakma neve</FormLabel>
                            <FormControl>
                              <Input placeholder="pl. Hegesztő" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={professionForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leírás</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Szakma leírása..." {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={professionForm.control}
                        name="iconName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ikon kiválasztása</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Válasszon ikont a szakmához" />
                                </SelectTrigger>
                                <SelectContent>
                                  {iconOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        <option.icon size={16} />
                                        {option.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={professionForm.control}
                        name="iconUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Egyedi ikon URL (opcionális)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/icon.png" {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => {
                          setIsProfessionDialogOpen(false);
                          setEditingProfession(null);
                          professionForm.reset();
                        }}>
                          Mégse
                        </Button>
                        <Button type="submit" disabled={createProfessionMutation.isPending || updateProfessionMutation.isPending}>
                          {editingProfession ? "Frissítés" : "Létrehozás"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {professionsLoading ? (
              <div>Szakmák betöltése...</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {professions.map((profession: Profession) => (
                  <Card
                    key={profession.id}
                    className="relative cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleProfessionClick(profession.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium truncate">{profession.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {profession.description}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProfessionEdit(profession);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteProfessionMutation.mutate(profession.id);
                            }}
                            disabled={deleteProfessionMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Tantárgyak kezelése</h2>
                {selectedProfessionForFilter && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">
                      Szűrve: {professions.find(p => p.id === selectedProfessionForFilter)?.name}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowAllSubjects}
                      className="h-6 px-2 text-xs"
                    >
                      Összes megjelenítése
                    </Button>
                  </div>
                )}
              </div>
              <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Új tantárgy
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSubject ? "Tantárgy szerkesztése" : "Új tantárgy létrehozása"}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...subjectForm}>
                    <form onSubmit={subjectForm.handleSubmit(onSubjectSubmit)} className="space-y-4">
                      <FormField
                        control={subjectForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tantárgy neve</FormLabel>
                            <FormControl>
                              <Input placeholder="pl. Anyagismeret" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={subjectForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leírás</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Tantárgy leírása..." {...field} value={field.value || ""} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={subjectForm.control}
                        name="professionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Szakma</FormLabel>
                            <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Válassz szakmát" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {professions.map((profession: Profession) => (
                                  <SelectItem key={profession.id} value={profession.id.toString()}>
                                    {profession.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => {
                          setIsSubjectDialogOpen(false);
                          setEditingSubject(null);
                          subjectForm.reset();
                        }}>
                          Mégse
                        </Button>
                        <Button type="submit" disabled={createSubjectMutation.isPending || updateSubjectMutation.isPending}>
                          {editingSubject ? "Frissítés" : "Létrehozás"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {subjectsLoading ? (
              <div>Tantárgyak betöltése...</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredSubjects.map((subject: Subject) => (
                  <Card
                    key={subject.id}
                    className="relative cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSubjectClick(subject.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium truncate">{subject.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {professions.find((p: Profession) => p.id === subject.professionId)?.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {subject.description}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubjectEdit(subject);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSubjectMutation.mutate(subject.id);
                            }}
                            disabled={deleteSubjectMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="modules" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Modulok kezelése</h2>
                {selectedSubjectForFilter && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">
                      Szűrve: {subjects.find(s => s.id === selectedSubjectForFilter)?.name}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowAllModules}
                      className="h-6 px-2 text-xs"
                    >
                      Összes megjelenítése
                    </Button>
                  </div>
                )}
              </div>
              <Button onClick={handleNewModule}>
                <Plus className="h-4 w-4 mr-2" />
                Új modul
              </Button>
            </div>

            {modulesLoading ? (
              <div>Modulok betöltése...</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredModules && filteredModules.length > 0 ? (
                  filteredModules.map((module: Module) => (
                    <Card key={module.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base font-medium truncate">{module.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Modul {module.moduleNumber}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${module.isPublished
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {module.isPublished ? 'Publikált' : 'Tervezet'}
                              </span>
                              {(module.keyConceptsData || module.conciseContent || module.detailedContent) && (
                                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                  AI Enhanced
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {subjects.find(s => s.id === module.subjectId)?.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Utolsó frissítés: {module.updatedAt ? new Date(module.updatedAt as string).toLocaleString('hu-HU', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Ismeretlen'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 ${module.isPublished
                                ? 'text-muted-foreground hover:text-orange-600'
                                : 'text-muted-foreground hover:text-green-600'
                                }`}
                              onClick={() => {
                                togglePublishMutation.mutate({
                                  id: module.id,
                                  isPublished: !module.isPublished
                                });
                              }}
                              disabled={togglePublishMutation.isPending}
                              title={module.isPublished ? 'Visszavonás' : 'Publikálás'}
                            >
                              {module.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-purple-600"
                              onClick={() => regenerateModuleMutation.mutate({
                                moduleId: module.id,
                                title: module.title,
                                content: module.content
                              })}
                              disabled={regeneratingModules.has(module.id)}
                              title="AI Újragenerálás"
                            >
                              {regeneratingModules.has(module.id) ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                              ) : (
                                <Wand2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600"
                              onClick={() => handleEdit(module)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteModuleMutation.mutate(module.id)}
                              disabled={deleteModuleMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Nincsenek modulok
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-modules" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Továbbfejlesztett AI Modul Készítés</h2>
                <p className="text-muted-foreground">
                  Intelligens modul generálás többszintű AI integrációval, Wikipedia linkekkel és YouTube videókkal
                </p>
              </div>
            </div>

            {/* AI Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Dupla verzió</h3>
                    <p className="text-xs text-muted-foreground">Tömör + Részletes</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <Youtube className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">YouTube integráció</h3>
                    <p className="text-xs text-muted-foreground">Automatikus videó keresés</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">Wikipedia linkek</h3>
                    <p className="text-xs text-muted-foreground">Automatikus referenciák</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">DataForSEO keresés</h3>
                    <p className="text-xs text-muted-foreground">Friss szakmai tartalom</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* AI Processing Queue Status */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  AI Feldolgozási Sor Állapota
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">3 modul párhuzamosan feldolgozva</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Becsült feldolgozási idő:</p>
                    <p className="font-medium">~45 másodperc/modul</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  <strong>Perzisztens queue:</strong> A feldolgozás az alkalmazás bezárása után is folytatódik
                </div>
              </CardContent>
            </Card>

            {/* Enhanced AI Features */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Továbbfejlesztett AI Funkciók
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Intelligens Tartalom Bővítés
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Kulcsszavak automatikus kiemelése</li>
                      <li>• Wikipedia linkek beágyazása</li>
                      <li>• Szakmai kifejezések magyarázata</li>
                      <li>• Strukturált információ rendszerezés</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Multi-API Integráció
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• DataForSEO: Friss szakmai információk</li>
                      <li>• YouTube API: Releváns oktatóvideók</li>
                      <li>• OpenAI/Gemini: Tartalom optimalizálás</li>
                      <li>• ElevenLabs: Hang szintézis készenlétben</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Automatikus Workflow
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Az AI automatikusan elemzi a modult → Keres releváns információkat → Létrehozza a tömör és részletes verziókat →
                      Megkeresi a megfelelő YouTube videókat → Beépíti a Wikipedia hivatkozásokat → Optimalizálja a szerkezetet
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <EnhancedModuleForm
              onModuleCreated={(module) => {
                queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
                toast({
                  title: "Továbbfejlesztett modul létrehozva",
                  description: `${module.title} - Teljes AI optimalizálás és multi-API integráció befejezve`
                });
              }}
              subjects={subjects}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Felhasználók kezelése</CardTitle>
                <div className="flex gap-4">
                  <span className="text-sm text-muted-foreground">
                    Összes: {users.length} | Admin: {adminUsers} | Tanár: {teacherUsers} | Hallgató: {studentUsers}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">
                    <p>Felhasználók betöltése...</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <p>Nincsenek felhasználók az adatbázisban.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user: User) => (
                      <div key={user.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {user.profileImageUrl && (
                            <img
                              src={user.profileImageUrl}
                              alt="Profil kép"
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.email || user.username || user.id}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {user.email || "Nincs email"} • {user.username || "Nincs felhasználónév"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {user.id} • Regisztráció: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('hu-HU') : "Ismeretlen"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Select
                            value={user.role}
                            onValueChange={(newRole) => {
                              updateUserRoleMutation.mutate({ userId: user.id, role: newRole });
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Hallgató</SelectItem>
                              <SelectItem value="teacher">Tanár</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>

                          {user.role === 'student' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Settings className="h-4 w-4 mr-1" />
                                  Szakmák ({user.assignedProfessionIds?.length || 0})
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Szakmák hozzárendelése - {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || user.username}</DialogTitle>
                                </DialogHeader>
                                <ProfessionAssignmentForm userId={user.id} currentProfessions={user.assignedProfessionIds || []} />
                              </DialogContent>
                            </Dialog>
                          )}
                          <div className="flex gap-2">
                            {user.role === 'student' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Minden modul feloldása ${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || user.username} felhasználó számára?`)) {
                                    unlockAllModulesMutation.mutate(user.id);
                                  }
                                }}
                                title="Minden modul feloldása"
                                disabled={unlockAllModulesMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Minden modul feloldása
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResetPasswordUserId(user.id);
                                setIsPasswordResetDialogOpen(true);
                              }}
                              title="Jelszó visszaállítása"
                            >
                              🔑
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Biztosan törölni szeretnéd ${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || user.username} felhasználót?`)) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              title="Felhasználó törlése"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs" className="space-y-6">
            <CostTrackingComponent />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-xl font-semibold">Rendszer beállítások</h2>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Rendszer statisztikák
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Összes szakma</p>
                      <p className="text-2xl font-bold">{professions.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Összes tantárgy</p>
                      <p className="text-2xl font-bold">{subjects.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Összes modul</p>
                      <p className="text-2xl font-bold">{modules.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Publikált modulok</p>
                      <p className="text-2xl font-bold">{publishedModules}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Felhasználó statisztikák
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Összes felhasználó</p>
                      <p className="text-2xl font-bold">{users.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Adminisztrátorok</p>
                      <p className="text-2xl font-bold">{adminUsers}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hallgatók</p>
                      <p className="text-2xl font-bold">{studentUsers}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Aktív felhasználók</p>
                      <p className="text-2xl font-bold">{users.filter(u => u.email).length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    AI Szolgáltató kiválasztása
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label>Aktív AI Szolgáltató</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={aiProvider === "openai" ? "default" : "outline"}
                        onClick={() => {
                          setAiProvider("openai");
                          updateAIProviderMutation.mutate("openai");
                        }}
                        disabled={updateAIProviderMutation.isPending}
                        className="flex-1"
                      >
                        OpenAI GPT-4o
                      </Button>
                      <Button
                        variant={aiProvider === "gemini" ? "default" : "outline"}
                        onClick={() => {
                          setAiProvider("gemini");
                          updateAIProviderMutation.mutate("gemini");
                        }}
                        disabled={updateAIProviderMutation.isPending}
                        className="flex-1"
                      >
                        Gemini 2.5 Pro
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Válaszd ki, melyik AI szolgáltatót használja a rendszer
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    OpenAI API Kulcs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="openai-key">OpenAI API Kulcs</Label>
                    <div className="flex gap-2">
                      <Input
                        id="openai-key"
                        type={showOpenaiKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      >
                        {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (openaiKey.trim()) {
                            updateOpenAIKeyMutation.mutate(openaiKey.trim());
                          }
                        }}
                        disabled={updateOpenAIKeyMutation.isPending}
                      >
                        Mentés
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      OpenAI platformról szerezhető API kulcs
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Gemini API Kulcs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="gemini-key">Gemini API Kulcs</Label>
                    <div className="flex gap-2">
                      <Input
                        id="gemini-key"
                        type={showGeminiKey ? "text" : "password"}
                        placeholder="AIza..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                      >
                        {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (geminiKey.trim()) {
                            updateGeminiKeyMutation.mutate(geminiKey.trim());
                          }
                        }}
                        disabled={updateGeminiKeyMutation.isPending}
                      >
                        Mentés
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Google AI Studio-ból szerezhető API kulcs
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    SerpAPI - Internet Keresés
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="dataforseo-login">DataForSEO Felhasználónév</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dataforseo-login"
                        type={showDataForSeoLogin ? "text" : "password"}
                        placeholder="login..."
                        value={dataForSeoLogin}
                        onChange={(e) => setDataForSeoLogin(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDataForSeoLogin(!showDataForSeoLogin)}
                      >
                        {showDataForSeoLogin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (dataForSeoLogin.trim()) {
                            updateDataForSeoLoginMutation.mutate(dataForSeoLogin.trim());
                          }
                        }}
                        disabled={updateDataForSeoLoginMutation.isPending}
                      >
                        Mentés
                      </Button>
                    </div>

                    <Label htmlFor="dataforseo-password">DataForSEO Jelszó</Label>
                    <div className="flex gap-2">
                      <Input
                        id="dataforseo-password"
                        type={showDataForSeoPassword ? "text" : "password"}
                        placeholder="password..."
                        value={dataForSeoPassword}
                        onChange={(e) => setDataForSeoPassword(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDataForSeoPassword(!showDataForSeoPassword)}
                      >
                        {showDataForSeoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (dataForSeoPassword.trim()) {
                            updateDataForSeoPasswordMutation.mutate(dataForSeoPassword.trim());
                          }
                        }}
                        disabled={updateDataForSeoPasswordMutation.isPending}
                      >
                        Mentés
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Google keresési eredmények lekérdezéséhez
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    YouTube Data API
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="youtube-key">YouTube API Kulcs</Label>
                    <div className="flex gap-2">
                      <Input
                        id="youtube-key"
                        type={showYoutubeKey ? "text" : "password"}
                        placeholder="AIza..."
                        value={youtubeApiKey}
                        onChange={(e) => setYoutubeApiKey(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                      >
                        {showYoutubeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (youtubeApiKey.trim()) {
                            updateYoutubeApiKeyMutation.mutate(youtubeApiKey.trim());
                          }
                        }}
                        disabled={updateYoutubeApiKeyMutation.isPending}
                      >
                        Mentés
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      YouTube videók keresése és adatok lekérdezése
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    ElevenLabs - Szöveg → Beszéd
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="elevenlabs-key">ElevenLabs API Kulcs</Label>
                    <div className="flex gap-2">
                      <Input
                        id="elevenlabs-key"
                        type={showElevenLabsKey ? "text" : "password"}
                        placeholder="sk_..."
                        value={elevenLabsKey}
                        onChange={(e) => setElevenLabsKey(e.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}
                      >
                        {showElevenLabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (elevenLabsKey.trim()) {
                            updateElevenLabsKeyMutation.mutate(elevenLabsKey.trim());
                          }
                        }}
                        disabled={updateElevenLabsKeyMutation.isPending}
                      >
                        Mentés
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Magas minőségű hang szintézis
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    AI Szolgáltató és Multi-API Státusz
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Fő AI Szolgáltató</Label>
                    <Select
                      value={aiProvider}
                      onValueChange={(value) => {
                        setAiProvider(value);
                        updateAIProviderMutation.mutate(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz AI szolgáltatót" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4 Turbo)</SelectItem>
                        <SelectItem value="gemini">Google Gemini 2.5 Pro</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      A fő AI szolgáltató a tartalom generáláshoz. A specializált API-k automatikusan használatba kerülnek.
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Specializált API Szolgáltatások</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <div className={`w-3 h-3 rounded-full ${apiStatus?.openai ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="text-sm">
                          <div className="font-medium">OpenAI</div>
                          <div className="text-xs text-muted-foreground">Tartalom generálás</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <div className={`w-3 h-3 rounded-full ${apiStatus?.gemini ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="text-sm">
                          <div className="font-medium">Gemini</div>
                          <div className="text-xs text-muted-foreground">Alternatív AI</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <div className={`w-3 h-3 rounded-full ${apiStatus?.dataForSeo ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="text-sm">
                          <div className="font-medium">DataForSEO</div>
                          <div className="text-xs text-muted-foreground">Internet keresés</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <div className={`w-3 h-3 rounded-full ${apiStatus?.youtube ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="text-sm">
                          <div className="font-medium">YouTube</div>
                          <div className="text-xs text-muted-foreground">Videó keresés</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <div className={`w-3 h-3 rounded-full ${apiStatus?.elevenLabs ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div className="text-sm">
                          <div className="font-medium">ElevenLabs</div>
                          <div className="text-xs text-muted-foreground">Beszéd szintézis</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Intelligens feladat átirányítás:</strong> A rendszer automatikusan a legmegfelelőbb API-t használja minden feladathoz - internet keresés, videó keresés, beszéd generálás és tartalom készítés.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Rendszerüzenet beállítása
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="system-message">Rendszerüzenet az AI számára</Label>
                    <Textarea
                      id="system-message"
                      placeholder="Adj meg egy rendszerüzenetet, amely meghatározza az AI viselkedését és válaszait..."
                      value={systemMessage}
                      onChange={(e) => setSystemMessage(e.target.value)}
                      rows={6}
                      className="min-h-[150px]"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Ez az üzenet minden AI beszélgetés elején elküldésre kerül, meghatározva az AI viselkedését.
                        <strong>FONTOS:</strong> Adja meg a YouTube keresési stratégiát is a túl sok keresés elkerülése érdekében.
                      </p>
                      <Button
                        onClick={() => {
                          if (systemMessage.trim()) {
                            updateSystemMessageMutation.mutate(systemMessage.trim());
                          }
                        }}
                        disabled={updateSystemMessageMutation.isPending}
                      >
                        {updateSystemMessageMutation.isPending ? "Mentés..." : "Mentés"}
                      </Button>
                    </div>
                  </div>

                  {systemMessageData?.message && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">Jelenlegi rendszerüzenet:</p>
                      <p className="text-sm text-muted-foreground">
                        {systemMessageData.message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    AI Tartalomgenerálás - Szekvenciális Prompt Beállítások
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">1. lépés: Internet-alapú tartalom kiegészítés</h4>
                    <div className="space-y-3">
                      <Label htmlFor="internet-content-prompt">Internet tartalom generálási prompt</Label>
                      <Textarea
                        id="internet-content-prompt"
                        placeholder="Generálj frissített, részletes tartalmat az internet segítségével..."
                        value={internetContentPrompt}
                        onChange={(e) => setInternetContentPrompt(e.target.value)}
                        rows={4}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          1. lépés: Eredeti tartalom kiegészítése internet-alapú információkkal
                        </p>
                        <Button
                          onClick={() => {
                            if (internetContentPrompt.trim()) {
                              updateInternetContentPromptMutation.mutate(internetContentPrompt.trim());
                            }
                          }}
                          disabled={updateInternetContentPromptMutation.isPending}
                          size="sm"
                        >
                          {updateInternetContentPromptMutation.isPending ? "Mentés..." : "Mentés"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-sm">1B. lépés: Tömör tartalom generálás</h4>
                    <div className="space-y-3">
                      <Label htmlFor="concise-content-prompt">Tömör tartalom generálási prompt</Label>
                      <Textarea
                        id="concise-content-prompt"
                        placeholder="Készíts tömör, lényegre törő tananyagot..."
                        value={conciseContentPrompt}
                        onChange={(e) => setConciseContentPrompt(e.target.value)}
                        rows={4}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          1B. lépés: Tömör verzió készítése a részletes tartalomból
                        </p>
                        <Button
                          onClick={() => {
                            if (conciseContentPrompt.trim()) {
                              updateConciseContentPromptMutation.mutate(conciseContentPrompt.trim());
                            }
                          }}
                          disabled={updateConciseContentPromptMutation.isPending}
                          size="sm"
                        >
                          {updateConciseContentPromptMutation.isPending ? "Mentés..." : "Mentés"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-sm">2. lépés: Wikipedia kulcsszavak azonosítása</h4>
                    <div className="space-y-3">
                      <Label htmlFor="wikipedia-prompt">Wikipedia kulcsszó keresési prompt</Label>
                      <Textarea
                        id="wikipedia-prompt"
                        placeholder="Azonosítsd a modul legfontosabb szakmai kifejezéseit..."
                        value={wikipediaPrompt}
                        onChange={(e) => setWikipediaPrompt(e.target.value)}
                        rows={4}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          2. lépés: Wikipedia kulcsszavak azonosítása az internet-kiegészített tartalomból
                        </p>
                        <Button
                          onClick={() => {
                            if (wikipediaPrompt.trim()) {
                              updateWikipediaPromptMutation.mutate(wikipediaPrompt.trim());
                            }
                          }}
                          disabled={updateWikipediaPromptMutation.isPending}
                          size="sm"
                        >
                          {updateWikipediaPromptMutation.isPending ? "Mentés..." : "Mentés"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-sm">3. lépés: YouTube videó keresés</h4>
                    <div className="space-y-3">
                      <Label htmlFor="youtube-prompt">YouTube keresési prompt</Label>
                      <Textarea
                        id="youtube-prompt"
                        placeholder="Generálj 1-2 konkrét YouTube keresési kifejezést..."
                        value={youtubePrompt}
                        onChange={(e) => setYoutubePrompt(e.target.value)}
                        rows={4}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          3. lépés: YouTube keresési kifejezések generálása a Wikipedia-linkelt tartalomból
                        </p>
                        <Button
                          onClick={() => {
                            if (youtubePrompt.trim()) {
                              updateYoutubePromptMutation.mutate(youtubePrompt.trim());
                            }
                          }}
                          disabled={updateYoutubePromptMutation.isPending}
                          size="sm"
                        >
                          {updateYoutubePromptMutation.isPending ? "Mentés..." : "Mentés"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-sm">4. lépés: Hangos magyarázat generálás</h4>
                    <div className="space-y-3">
                      <Label htmlFor="audio-explanation-prompt">Hangos magyarázat prompt</Label>
                      <Textarea
                        id="audio-explanation-prompt"
                        placeholder="Készíts rövid, érthető hangos magyarázatot..."
                        value={audioExplanationPrompt}
                        onChange={(e) => setAudioExplanationPrompt(e.target.value)}
                        rows={4}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          4. lépés: Hangos magyarázat prompt a tanulók kérdéseire
                        </p>
                        <Button
                          onClick={() => {
                            if (audioExplanationPrompt.trim()) {
                              updateAudioExplanationPromptMutation.mutate(audioExplanationPrompt.trim());
                            }
                          }}
                          disabled={updateAudioExplanationPromptMutation.isPending}
                          size="sm"
                        >
                          {updateAudioExplanationPromptMutation.isPending ? "Mentés..." : "Mentés"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-sm">5. lépés: Szöveges magyarázat generálás</h4>
                    <div className="space-y-3">
                      <Label htmlFor="text-explanation-prompt">Szöveges magyarázat prompt</Label>
                      <Textarea
                        id="text-explanation-prompt"
                        placeholder="Készíts részletes szöveges magyarázatot..."
                        value={textExplanationPrompt}
                        onChange={(e) => setTextExplanationPrompt(e.target.value)}
                        rows={4}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          5. lépés: Szöveges magyarázat prompt a tanulók kérdéseire
                        </p>
                        <Button
                          onClick={() => {
                            if (textExplanationPrompt.trim()) {
                              updateTextExplanationPromptMutation.mutate(textExplanationPrompt.trim());
                            }
                          }}
                          disabled={updateTextExplanationPromptMutation.isPending}
                          size="sm"
                        >
                          {updateTextExplanationPromptMutation.isPending ? "Mentés..." : "Mentés"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h5 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">Szekvenciális feldolgozás</h5>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Az AI generálás öt egymásra épülő lépésben történik: tartalomkiegészítés, tömör verzió, Wikipedia linkek, YouTube videók,
                      majd hangos és szöveges magyarázatok a tanulói kérdésekre.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rendszer információk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform:</span>
                      <span>Global Learning System</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verzió:</span>
                      <span>v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adatbázis:</span>
                      <span className="text-green-600">Kapcsolódva</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI szolgáltatás:</span>
                      <span className="text-green-600">Aktív</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gyors műveletek</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("professions")}
                      className="justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Új szakma hozzáadása
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("subjects")}
                      className="justify-start"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Tantárgy kezelése
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("modules")}
                      className="justify-start"
                    >
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Modul szerkesztése
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("users")}
                      className="justify-start"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Felhasználók megtekintése
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI Funkciók Kezelése</CardTitle>
                  <CardDescription>
                    Globális beállítások az AI funkciók elérhetőségéhez
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                      <Label htmlFor="ai-chat-enable">AI Tanár Chat Engedélyezése</Label>
                      <span className="text-sm text-muted-foreground">
                        Ha ki van kapcsolva, a diákok és tanárok nem érik el az AI chat funkciót. (Adminoknak továbbra is elérhető)
                      </span>
                    </div>
                    <Switch
                      id="ai-chat-enable"
                      checked={aiChatEnabled}
                      onCheckedChange={(checked) => updateAiChatEnabledMutation.mutate(checked)}
                      disabled={updateAiChatEnabledMutation.isPending}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Veszélyes műveletek</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <h4 className="font-medium text-red-800">Rendszer újraindítása</h4>
                      <p className="text-sm text-red-600">Ez ideiglenesen megszakítja a szolgáltatást</p>
                    </div>
                    <Button variant="destructive" disabled>
                      Újraindítás
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="school-admins" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Iskolai adminisztrátorok kezelése</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Iskolai adminisztrátorok létrehozása és kezelése
                  </p>
                </div>
                <Dialog open={isSchoolAdminDialogOpen} onOpenChange={setIsSchoolAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Új iskolai admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Új iskolai admin regisztrálása</DialogTitle>
                    </DialogHeader>
                    <Form {...schoolAdminForm}>
                      <form onSubmit={schoolAdminForm.handleSubmit(onSchoolAdminSubmit)} className="space-y-4">
                        <FormField
                          control={schoolAdminForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Keresztnév</FormLabel>
                              <FormControl>
                                <Input placeholder="pl. János" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolAdminForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vezetéknév</FormLabel>
                              <FormControl>
                                <Input placeholder="pl. Nagy" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolAdminForm.control}
                          name="schoolName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Iskola neve</FormLabel>
                              <FormControl>
                                <Input placeholder="pl. Váci Szakképzési Centrum" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolAdminForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Felhasználónév</FormLabel>
                              <FormControl>
                                <Input placeholder="Bejelentkezési felhasználónév" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolAdminForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Jelszó</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Minimum 6 karakter" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={schoolAdminForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (opcionális)</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="pl. admin@iskola.hu" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsSchoolAdminDialogOpen(false)}
                          >
                            Mégse
                          </Button>
                          <Button
                            type="submit"
                            disabled={createSchoolAdminMutation.isPending}
                          >
                            {createSchoolAdminMutation.isPending ? "Létrehozás..." : "Létrehozás"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Az iskolai adminisztrátorok külön bejelentkezéssel rendelkeznek és kezelhetik a diák-tanár hozzárendeléseket.
                  </div>

                  {users?.filter((u: User) => u.role === 'school_admin').length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-medium">Regisztrált iskolai adminok:</h4>
                      {users?.filter((u: User) => u.role === 'school_admin').map((admin: User) => (
                        <div key={admin.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {admin.firstName && admin.lastName
                                ? `${admin.firstName} ${admin.lastName}`
                                : admin.username}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Felhasználónév: {admin.username}
                              {admin.email && ` • ${admin.email}`}
                            </p>
                            {admin.schoolName && (
                              <p className="text-sm text-blue-600 font-medium">
                                Iskola: {admin.schoolName}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResetPasswordUserId(admin.id);
                                setIsPasswordResetDialogOpen(true);
                              }}
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Jelszó visszaállítás
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteUserMutation.mutate(admin.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Még nincsenek regisztrált iskolai adminisztrátorok.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Module Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingModule ? "Modul szerkesztése" : "Új modul létrehozása"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cím</FormLabel>
                      <FormControl>
                        <Input placeholder="Modul címe" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label htmlFor="content-field">Alapvető tartalom</Label>
                  <Textarea
                    id="content-field"
                    placeholder="Modul alapvető tartalma..."
                    rows={8}
                    value={form.watch("content") || ""}
                    onChange={(e) => {
                      form.setValue("content", e.target.value);
                      form.trigger("content");
                    }}
                    className="min-h-[200px] resize-y"
                  />
                  <p className="text-xs text-gray-500">
                    Karakter szám: {(form.watch("content") || "").length}
                  </p>
                </div>

                {/* AI Enhanced Content Editing */}
                {editingModule && (editingModule.conciseContent || editingModule.detailedContent) && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium text-sm text-purple-700">AI-generált tartalom szerkesztése</h4>

                    {editingModule.conciseContent && (
                      <div className="space-y-2">
                        <Label htmlFor="concise-content-field">Tömör verzió (tanulók által látott)</Label>
                        <Textarea
                          id="concise-content-field"
                          placeholder="AI-generált tömör tartalom..."
                          rows={6}
                          value={form.watch("conciseContent") || editingModule.conciseContent || ""}
                          onChange={(e) => {
                            form.setValue("conciseContent", e.target.value);
                            form.trigger("conciseContent");
                          }}
                          className="min-h-[150px] resize-y bg-purple-50"
                        />
                        <p className="text-xs text-purple-600">
                          Karakter szám: {(form.watch("conciseContent") || editingModule.conciseContent || "").length}
                        </p>
                      </div>
                    )}

                    {editingModule.detailedContent && (
                      <div className="space-y-2">
                        <Label htmlFor="detailed-content-field">Részletes verzió (tanulók által látott)</Label>
                        <Textarea
                          id="detailed-content-field"
                          placeholder="AI-generált részletes tartalom..."
                          rows={8}
                          value={form.watch("detailedContent") || editingModule.detailedContent || ""}
                          onChange={(e) => {
                            form.setValue("detailedContent", e.target.value);
                            form.trigger("detailedContent");
                          }}
                          className="min-h-[200px] resize-y bg-purple-50"
                        />
                        <p className="text-xs text-purple-600">
                          Karakter szám: {(form.watch("detailedContent") || editingModule.detailedContent || "").length}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 italic">
                      Ez a tartalom jelenik meg a tanulók számára. Az újragenerálás gombbal lehet AI-vel frissíteni.
                    </p>
                  </div>
                )}

                {/* YouTube és Wikipedia linkek szerkesztése */}
                {editingModule && editingModule.keyConceptsData && Array.isArray(editingModule.keyConceptsData) && (
                  <LinkEditor
                    keyConceptsData={editingModule.keyConceptsData as KeyConceptsData}
                    onUpdate={(updatedData: KeyConceptsData) => {
                      form.setValue("keyConceptsData", updatedData);
                      form.trigger("keyConceptsData");
                    }}
                  />
                )}

                {/* Multimédiás tartalom */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium text-sm text-gray-700">Multimédiás tartalom</h4>

                  {/* YouTube URL */}
                  <FormField
                    control={form.control}
                    name="youtubeUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>YouTube videó URL</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="https://www.youtube.com/watch?v=..." />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Videó feltöltés vagy URL */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Videó</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600 mb-2 block">Fájl feltöltése</label>
                        <FileUpload
                          acceptedTypes="video/*"
                          maxSize={100 * 1024 * 1024} // 100MB
                          onFileUploaded={(file) => {
                            const url = `/uploads/${file.filename}`;
                            form.setValue('videoUrl', url);
                            form.trigger('videoUrl'); // Trigger validation to show the value
                          }}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="videoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vagy videó URL</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="https://example.com/video.mp4" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Hang feltöltés vagy URL */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Hang/Podcast</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600 mb-2 block">Fájl feltöltése</label>
                        <FileUpload
                          acceptedTypes="audio/*"
                          maxSize={50 * 1024 * 1024} // 50MB
                          onFileUploaded={(file) => {
                            const url = `/uploads/${file.filename}`;
                            form.setValue('audioUrl', url);
                            form.trigger('audioUrl');
                          }}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="audioUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vagy hang URL</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="https://example.com/audio.mp3" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Kép feltöltés vagy URL */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium">Kép</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-600 mb-2 block">Fájl feltöltése</label>
                        <FileUpload
                          acceptedTypes="image/*"
                          maxSize={20 * 1024 * 1024} // 20MB
                          onFileUploaded={(file) => {
                            const url = `/uploads/${file.filename}`;
                            form.setValue('imageUrl', url);
                            form.trigger('imageUrl');
                          }}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vagy kép URL</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="https://example.com/image.jpg" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="podcastUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Külső podcast URL</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="https://podcasts.example.com/episode" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="moduleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modul száma</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tantárgy</FormLabel>
                      <Select value={field.value.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Válassz tantárgyat" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {subjects.map((subject: Subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingModule(null);
                      form.reset();
                    }}
                  >
                    Mégse
                  </Button>
                  <Button
                    type="submit"
                    disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
                  >
                    {editingModule ? "Frissítés" : "Létrehozás"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Jelszó visszaállítási dialog */}
        <PasswordResetDialog
          isOpen={isPasswordResetDialogOpen}
          onClose={() => setIsPasswordResetDialogOpen(false)}
          onReset={(password) => {
            resetPasswordMutation.mutate({
              userId: resetPasswordUserId,
              newPassword: password
            });
          }}
          isPending={resetPasswordMutation.isPending}
        />
      </main >
    </div >
  );
}

// Szakma hozzárendelés komponens
function ProfessionAssignmentForm({ userId, currentProfessions }: { userId: string, currentProfessions: number[] }) {
  const { toast } = useToast();
  const [selectedProfessions, setSelectedProfessions] = useState<number[]>(currentProfessions);

  const { data: professions = [] } = useQuery<Profession[]>({
    queryKey: ['/api/public/professions'],
  });

  const updateProfessionsMutation = useMutation({
    mutationFn: async ({ userId, professionIds }: { userId: string, professionIds: number[] }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/assigned-professions`, {
        professionIds
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Sikeres frissítés",
        description: "A szakma hozzárendelések frissítve lettek.",
      });
    },
    onError: (error: Error) => {
      console.error('Profession assignment error:', error);
      toast({
        title: "Hiba",
        description: "Nem sikerült frissíteni a szakma hozzárendeléseket.",
        variant: "destructive",
      });
    },
  });

  const handleToggleProfession = (professionId: number) => {
    setSelectedProfessions(prev =>
      prev.includes(professionId)
        ? prev.filter(id => id !== professionId)
        : [...prev, professionId]
    );
  };

  const handleSave = () => {
    updateProfessionsMutation.mutate({ userId, professionIds: selectedProfessions });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Válassza ki, melyik szakmákhoz férjen hozzá ez a tanuló:
      </p>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {professions.map((profession: Profession) => (
          <label key={profession.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-muted">
            <input
              type="checkbox"
              checked={selectedProfessions.includes(profession.id)}
              onChange={() => handleToggleProfession(profession.id)}
              className="rounded border-gray-300"
            />
            <span className="flex-1">{profession.name}</span>
            {profession.description && (
              <span className="text-xs text-muted-foreground">
                {profession.description.substring(0, 50)}...
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={updateProfessionsMutation.isPending}
          className="bg-primary hover:bg-primary/90"
        >
          {updateProfessionsMutation.isPending ? "Mentés..." : "Mentés"}
        </Button>
      </div>
    </div>
  );
}

// Jelszó visszaállítási dialog komponens
function PasswordResetDialog({
  isOpen,
  onClose,
  onReset,
  isPending
}: {
  isOpen: boolean;
  onClose: () => void;
  onReset: (password: string) => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Hiba",
        description: "A jelszónak legalább 6 karakter hosszúnak kell lennie.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Hiba",
        description: "A két jelszó nem egyezik meg.",
        variant: "destructive",
      });
      return;
    }

    onReset(password);
  };

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jelszó visszaállítása</DialogTitle>
          <DialogDescription>
            Adjon meg egy új jelszót a felhasználó számára.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Új jelszó (min. 6 karakter)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Adja meg az új jelszót"
              required
              minLength={6}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Jelszó megerősítése</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Erősítse meg az új jelszót"
              required
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Mégse
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Visszaállítás..." : "Jelszó visszaállítása"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}