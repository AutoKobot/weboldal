import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Import, Download, Loader2, GraduationCap, Wrench, BookOpen, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function IKKManager() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState<string | null>(null);

  const { data: ikkProfessions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/ikk/professions"],
  });

  const { data: localProfessions = [] } = useQuery<any[]>({
    queryKey: ["/api/public/professions"],
  });

  const { data: importStatus } = useQuery<any>({
    queryKey: ["/api/admin/ikk/status"],
    refetchInterval: 2000,
  });

  const importMutation = useMutation({
    mutationFn: async ({ profession, importType }: { profession: any, importType: string }) => {
      setIsImporting(profession.id);
      const res = await apiRequest("POST", "/api/admin/ikk/import", { profession, importType });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Elindítva", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      setIsImporting(null);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ikk/cancel");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Leállítás", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ikk/status"] });
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
    }
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/ikk/reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ikk/status"] });
    }
  });

  // Track previous status to detect transitions
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  useEffect(() => {
    // If status transitioned from processing to completed/error
    if (lastStatus === 'processing' && importStatus?.status !== 'processing') {
      if (importStatus?.status === 'completed') {
        toast({ title: "Siker", description: importStatus.message || "Az importálás sikeresen befejeződött!" });
        // Invalidate all related queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/professions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/ikk/professions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/public/subjects"] });
        queryClient.invalidateQueries({ queryKey: ["/api/public/modules"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/modules"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/ikk/status"] });
      } else if (importStatus?.status === 'error') {
        toast({ title: "Hiba", description: importStatus.error || "Hiba történt az importálás során", variant: "destructive" });
      }
      setIsImporting(null);
    }
    
    if (importStatus?.status) {
      setLastStatus(importStatus.status);
    }
  }, [importStatus?.status, lastStatus]);

  const filteredProfessions = ikkProfessions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedProfessions = filteredProfessions.slice(0, 24);

  return (
    <div className="space-y-6">
      {importStatus?.status && importStatus.status !== 'idle' && (
        <Card className={`border-2 ${
          importStatus.status === 'processing' ? 'border-blue-200 bg-blue-50/50' : 
          importStatus.status === 'completed' ? 'border-green-200 bg-green-50/50' : 
          'border-red-200 bg-red-50/50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className={`h-5 w-5 text-blue-600 animate-spin ${importStatus.status === 'processing' ? '' : 'hidden'}`} />
                <Badge className={`bg-green-600 ${importStatus.status === 'completed' ? '' : 'hidden'}`}>KÉSZ</Badge>
                <AlertCircle className={`h-5 w-5 text-red-600 ${importStatus.status === 'error' ? '' : 'hidden'}`} />
                
                <div>
                  <p className={`font-semibold ${
                    importStatus.status === 'processing' ? 'text-blue-900' : 
                    importStatus.status === 'completed' ? 'text-green-900' : 
                    'text-red-900'
                  }`}>
                    {importStatus.status === 'processing' ? 'Importálás folyamatban...' : 
                     importStatus.status === 'completed' ? 'Importálás sikeres!' : 
                     'Importálás megszakítva/Hiba'}
                  </p>
                  <p className="text-sm opacity-80">{importStatus.professionName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={
                  importStatus.status === 'processing' ? 'bg-blue-600' : 
                  importStatus.status === 'completed' ? 'bg-green-600' : 
                  'bg-red-600'
                }>{importStatus.progress}%</Badge>
                
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] uppercase font-bold ${importStatus.status === 'processing' ? '' : 'hidden'}`}
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                  >
                    <Loader2 className={`h-3 w-3 mr-1 ${cancelMutation.isPending ? 'animate-spin' : 'hidden'}`} />
                    {cancelMutation.isPending ? "Várj..." : "Stop"}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`h-7 px-2 text-[10px] uppercase font-bold ${importStatus.status !== 'processing' ? '' : 'hidden'}`}
                    onClick={() => resetMutation.mutate()}
                  >
                    Bezárás
                  </Button>
                </div>
              </div>
            </div>
            <div className="w-full bg-black/5 rounded-full h-2.5 mb-2">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  importStatus.status === 'processing' ? 'bg-blue-600' : 
                  importStatus.status === 'completed' ? 'bg-green-600' : 
                  'bg-red-600'
                }`} 
                style={{ width: `${importStatus.progress}%` }}
              ></div>
            </div>
            <p className={`text-xs font-medium ${
              importStatus.status === 'processing' ? 'text-blue-600 animate-pulse' : 
              importStatus.status === 'completed' ? 'text-green-600' : 
              'text-red-600'
            }`}>{importStatus.message}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">IKK Tananyag Import</h2>
          <p className="text-sm text-muted-foreground">Hivatalos szakmai programok és modulok importálása az IKK adatbázisából</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés szakma vagy azonosító alapján..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))
        ) : displayedProfessions.length > 0 ? (
          displayedProfessions.map(prof => {
            const localProf = localProfessions.find(lp => lp.name === prof.name);
            const isImported = !!localProf;
            
            return (
              <Card key={prof.id} className={`flex flex-col ${isImported ? 'border-green-200 bg-green-50/20' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">{prof.id}</Badge>
                    <div className="flex flex-col items-end gap-1">
                      {prof.sector && <Badge variant="secondary" className="text-[10px]">{prof.sector.name || prof.sector}</Badge>}
                      {isImported && (
                        <Badge className="bg-green-600 text-[9px] h-4">MÁR IMPORTÁLVA</Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2 line-clamp-2 min-h-[3rem]">{prof.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{prof.subjectsCount || 0} tantárgy</span>
                      </div>
                      {isImported && localProf.updatedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          Frissítve: {new Date(localProf.updatedAt).toLocaleDateString('hu-HU')}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm"
                        variant="outline"
                        className={`text-[10px] h-9 ${isImported ? 'border-blue-200 bg-blue-50/30' : ''}`} 
                        onClick={() => importMutation.mutate({ profession: prof, importType: 'theory' })}
                        disabled={isImporting !== null}
                      >
                        <GraduationCap className={`h-3 w-3 mr-1 ${isImporting === prof.id ? 'animate-spin' : ''}`} />
                        Elmélet
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        className={`text-[10px] h-9 ${isImported ? 'border-orange-200 bg-orange-50/30' : ''}`} 
                        onClick={() => importMutation.mutate({ profession: prof, importType: 'practical' })}
                        disabled={isImporting !== null}
                      >
                        <Wrench className={`h-3 w-3 mr-1 ${isImporting === prof.id ? 'animate-spin' : ''}`} />
                        Gyakorlat
                      </Button>
                      <Button 
                        size="sm"
                        className={`col-span-2 h-9 ${isImported ? 'bg-green-600 hover:bg-green-700' : ''}`} 
                        onClick={() => importMutation.mutate({ profession: prof, importType: 'both' })}
                        disabled={isImporting !== null}
                      >
                        <Download className={`h-3.5 w-3.5 mr-2 ${isImporting === prof.id ? 'animate-spin' : ''}`} />
                        {isImporting === prof.id ? 'Feldolgozás...' : 'Teljes Import'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nem található a keresésnek megfelelő szakma.</p>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-bold mb-1">Fontos tudnivaló az importálásról:</p>
          <p>
            Az importálás során a rendszer lekéri a hivatalos képzési programot, és az AI segítségével automatikusan legenerálja a modulok alapvető tartalmát. 
            Ez a folyamat több percet is igénybe vehet a tantárgyak és modulok számától függően. Kérjük, ne zárja be az oldalt!
          </p>
        </div>
      </div>
    </div>
  );
}
