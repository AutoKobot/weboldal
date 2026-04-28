import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Plus } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

const monthlyCostFormSchema = z.object({
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12),
  developmentCosts: z.string().optional(),
  infrastructureCosts: z.string().optional(),
  otherCosts: z.string().optional(),
  notes: z.string().optional(),
});

export function CostsManager() {
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
                  type="number"
                  step="0.00000001"
                  placeholder="0.00000000"
                  defaultValue={editingPricing?.pricePerToken || ''}
                  onChange={(e) => setEditingPricing({ ...editingPricing, pricePerToken: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kérés ár (USD)</Label>
                <Input
                  type="number"
                  step="0.000001"
                  placeholder="0.000000"
                  defaultValue={editingPricing?.pricePerRequest || ''}
                  onChange={(e) => setEditingPricing({ ...editingPricing, pricePerRequest: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsApiPricingDialogOpen(false)}>
                Mégse
              </Button>
              <Button 
                onClick={() => addApiPricingMutation.mutate(editingPricing)}
                disabled={addApiPricingMutation.isPending}
              >
                {addApiPricingMutation.isPending ? "Mentés..." : "Mentés"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
