import { useState } from "react";
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
import { Search, Import, Download, Loader2, GraduationCap, BookOpen, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function IKKManager() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState<string | null>(null);

  const { data: ikkProfessions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/ikk/professions"],
  });

  const { data: importStatus, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/admin/ikk/status"],
    refetchInterval: (data) => (data?.status === 'processing' ? 2000 : false),
  });

  const importMutation = useMutation({
    mutationFn: async (profession: any) => {
      setIsImporting(profession.id);
      const res = await apiRequest("POST", "/api/admin/ikk/import", { profession });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Elindítva", description: data.message });
      refetchStatus();
    },
    onError: (error: Error) => {
      toast({ title: "Hiba", description: error.message, variant: "destructive" });
      setIsImporting(null);
    }
  });

  // Handle completion/error from polled status
  useState(() => {
    if (importStatus?.status === 'completed' && isImporting) {
      toast({ title: "Siker", description: importStatus.message });
      queryClient.invalidateQueries({ queryKey: ["/api/public/professions"] });
      setIsImporting(null);
    } else if (importStatus?.status === 'error' && isImporting) {
      toast({ title: "Hiba", description: importStatus.error, variant: "destructive" });
      setIsImporting(null);
    }
  });

  const filteredProfessions = ikkProfessions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Limit display to 24 items to prevent browser freeze
  const displayedProfessions = filteredProfessions.slice(0, 24);

  return (
    <div className="space-y-6">
      {importStatus?.status === 'processing' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <div>
                  <p className="font-semibold text-blue-900">Importálás folyamatban...</p>
                  <p className="text-sm text-blue-700">{importStatus.professionName}</p>
                </div>
              </div>
              <Badge className="bg-blue-600">{importStatus.progress}%</Badge>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${importStatus.progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-blue-600 font-medium animate-pulse">{importStatus.message}</p>
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
          {searchTerm && (
            <p className="absolute -bottom-6 left-0 text-[10px] text-muted-foreground">
              {filteredProfessions.length} találat {filteredProfessions.length > 24 && "(első 24 megjelenítve)"}
            </p>
          )}
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
          displayedProfessions.map(prof => (
            <Card key={prof.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{prof.id}</Badge>
                  {prof.sector && <Badge variant="secondary" className="text-[10px]">{prof.sector.name || prof.sector}</Badge>}
                </div>
                <CardTitle className="text-base mt-2 line-clamp-2 min-h-[3rem]">{prof.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-4">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    <span>{prof.subjectsCount || 0} tantárgy</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <GraduationCap className="h-3 w-3" />
                    <span>{prof.modulesCount || 0} modul</span>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => importMutation.mutate(prof)}
                  disabled={isImporting !== null}
                >
                  {isImporting === prof.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importálás...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Szakma Importálása
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))
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
