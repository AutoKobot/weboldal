import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, Brain, Key, Eye, EyeOff, 
  Database, CheckCircle, XCircle, AlertTriangle 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardStats, ApiStatus, AISettings } from "./types";

interface SettingsManagerProps {
  stats: DashboardStats;
  apiStatus: ApiStatus;
  aiSettings: AISettings;
  currentAiProvider: string;
}

export function SettingsManager({ stats, apiStatus, aiSettings, currentAiProvider }: SettingsManagerProps) {
  const { toast } = useToast();
  const [aiProvider, setAiProvider] = useState(currentAiProvider);
  
  // API Keys state
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [togetherKey, setTogetherKey] = useState("");
  const [deepinfraKey, setDeepinfraKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [dataForSeoLogin, setDataForSeoLogin] = useState("");
  const [dataForSeoPassword, setDataForSeoPassword] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  
  // Visibility state
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showTogetherKey, setShowTogetherKey] = useState(false);
  const [showDeepinfraKey, setShowDeepinfraKey] = useState(false);
  const [showElevenLabsKey, setShowElevenLabsKey] = useState(false);
  const [showDataForSeoLogin, setShowDataForSeoLogin] = useState(false);
  const [showDataForSeoPassword, setShowDataForSeoPassword] = useState(false);
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);

  useEffect(() => {
    if (aiSettings?.supabaseUrl) setSupabaseUrl(aiSettings.supabaseUrl);
    if (aiSettings?.supabaseAnonKey) setSupabaseAnonKey(aiSettings.supabaseAnonKey);
  }, [aiSettings]);

  const updateAIProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      await apiRequest("POST", "/api/admin/ai-provider", { provider });
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "AI szolgáltató frissítve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
    }
  });

  const updateAISettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AISettings>) => {
      await apiRequest("PATCH", "/api/admin/ai-settings", settings);
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Beállítások mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
    }
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ provider, key }: { provider: string, key: string }) => {
      await apiRequest("POST", `/api/admin/api-keys/${provider}`, { key });
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "API kulcs mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-status"] });
    }
  });

  const checkSupabaseStatus = async () => {
    setCheckingSupabase(true);
    try {
      const res = await apiRequest("POST", "/api/admin/test-supabase", {
        supabaseUrl: supabaseUrl.trim(),
        supabaseAnonKey: supabaseAnonKey.trim()
      });
      const data = await res.json();
      setSupabaseStatus(data);
    } catch (err: any) {
      setSupabaseStatus({ status: 'error', message: err.message });
    } finally {
      setCheckingSupabase(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Rendszer beállítások</h2>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stats Cards */}
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
                <p className="text-2xl font-bold">{stats.totalProfessions}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Összes tantárgy</p>
                <p className="text-2xl font-bold">{stats.totalSubjects}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Összes modul</p>
                <p className="text-2xl font-bold">{stats.totalModules}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Publikált modulok</p>
                <p className="text-2xl font-bold">{stats.publishedModules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Képgenerálás Beállítások
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Képgeneráló Szolgáltató</Label>
              <Select
                value={aiSettings?.imageProvider || 'openai'}
                onValueChange={(val) => {
                  const defaultModel = val === 'openai' ? 'dall-e-3' : (val === 'together' ? 'flux-pro' : 'flux-dev');
                  updateAISettingsMutation.mutate({ imageProvider: val, imageModel: defaultModel });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz szolgáltatót" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (DALL-E 3)</SelectItem>
                  <SelectItem value="together">Together AI (Flux Pro/Dev)</SelectItem>
                  <SelectItem value="deepinfra">DeepInfra (Flux Dev/Schnell)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Képgeneráló Modell</Label>
              <Select
                value={aiSettings?.imageModel || 'dall-e-3'}
                onValueChange={(val) => updateAISettingsMutation.mutate({ imageModel: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz modellt" />
                </SelectTrigger>
                <SelectContent>
                  {aiSettings?.imageProvider === 'openai' ? (
                    <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="flux-pro">Flux.1 Pro</SelectItem>
                      <SelectItem value="flux-dev">Flux.1 Dev</SelectItem>
                      <SelectItem value="flux-schnell">Flux.1 Schnell</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Manager */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" />
              Globális API Kulcsok Kezelése
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* OpenAI */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">OpenAI</Label>
                  <Badge variant={apiStatus.openai ? "outline" : "destructive"}>
                    {apiStatus.openai ? "Csatlakoztatva" : "Hiányzik"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type={showOpenaiKey ? "text" : "password"} 
                    value={openaiKey} 
                    onChange={(e) => setOpenaiKey(e.target.value)} 
                    placeholder="sk-..."
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowOpenaiKey(!showOpenaiKey)}>
                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => updateApiKeyMutation.mutate({ provider: 'openai', key: openaiKey.trim() })} disabled={!openaiKey}>Mentés</Button>
                </div>
              </div>

              {/* Gemini */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Google Gemini</Label>
                  <Badge variant={apiStatus.gemini ? "outline" : "destructive"}>
                    {apiStatus.gemini ? "Csatlakoztatva" : "Hiányzik"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type={showGeminiKey ? "text" : "password"} 
                    value={geminiKey} 
                    onChange={(e) => setGeminiKey(e.target.value)} 
                    placeholder="AIza..."
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowGeminiKey(!showGeminiKey)}>
                    {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => updateApiKeyMutation.mutate({ provider: 'gemini', key: geminiKey.trim() })} disabled={!geminiKey}>Mentés</Button>
                </div>
              </div>

              {/* Together AI */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Together AI</Label>
                  <Badge variant="outline">Konfigurálva</Badge>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type={showTogetherKey ? "text" : "password"} 
                    value={togetherKey} 
                    onChange={(e) => setTogetherKey(e.target.value)} 
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowTogetherKey(!showTogetherKey)}>
                    {showTogetherKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => updateApiKeyMutation.mutate({ provider: 'together', key: togetherKey.trim() })} disabled={!togetherKey}>Mentés</Button>
                </div>
              </div>

              {/* DeepInfra */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">DeepInfra</Label>
                  <Badge variant="outline">Aktív</Badge>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type={showDeepinfraKey ? "text" : "password"} 
                    value={deepinfraKey} 
                    onChange={(e) => setDeepinfraKey(e.target.value)} 
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowDeepinfraKey(!showDeepinfraKey)}>
                    {showDeepinfraKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => updateApiKeyMutation.mutate({ provider: 'deepinfra', key: deepinfraKey.trim() })} disabled={!deepinfraKey}>Mentés</Button>
                </div>
              </div>
              
              {/* ElevenLabs */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">ElevenLabs</Label>
                  <Badge variant={apiStatus.elevenLabs ? "outline" : "destructive"}>
                    {apiStatus.elevenLabs ? "Aktív" : "Hiányzik"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input 
                    type={showElevenLabsKey ? "text" : "password"} 
                    value={elevenLabsKey} 
                    onChange={(e) => setElevenLabsKey(e.target.value)} 
                    placeholder="sk_..."
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}>
                    {showElevenLabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => updateApiKeyMutation.mutate({ provider: 'elevenlabs', key: elevenLabsKey.trim() })} disabled={!elevenLabsKey}>Mentés</Button>
                </div>
              </div>

              {/* DataForSEO */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">DataForSEO</Label>
                  <Badge variant={apiStatus.dataForSeo ? "outline" : "destructive"}>
                    {apiStatus.dataForSeo ? "Aktív" : "Hiányzik"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input type={showDataForSeoLogin ? "text" : "password"} value={dataForSeoLogin} onChange={(e) => setDataForSeoLogin(e.target.value)} placeholder="Login" />
                    <Button size="icon" variant="outline" onClick={() => setShowDataForSeoLogin(!showDataForSeoLogin)}>
                      {showDataForSeoLogin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input type={showDataForSeoPassword ? "text" : "password"} value={dataForSeoPassword} onChange={(e) => setDataForSeoPassword(e.target.value)} placeholder="Password" />
                    <Button size="icon" variant="outline" onClick={() => setShowDataForSeoPassword(!showDataForSeoPassword)}>
                      {showDataForSeoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" onClick={() => {
                      updateApiKeyMutation.mutate({ provider: 'dataforseo-login', key: dataForSeoLogin.trim() });
                      updateApiKeyMutation.mutate({ provider: 'dataforseo-password', key: dataForSeoPassword.trim() });
                    }}>Mentés</Button>
                  </div>
                </div>
              </div>

              {/* YouTube */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">YouTube API</Label>
                  <Badge variant={apiStatus.youtube ? "outline" : "destructive"}>
                    {apiStatus.youtube ? "Aktív" : "Hiányzik"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input type={showYoutubeKey ? "text" : "password"} value={youtubeApiKey} onChange={(e) => setYoutubeApiKey(e.target.value)} />
                  <Button size="icon" variant="outline" onClick={() => setShowYoutubeKey(!showYoutubeKey)}>
                    {showYoutubeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => updateApiKeyMutation.mutate({ provider: 'youtube', key: youtubeApiKey.trim() })} disabled={!youtubeApiKey}>Mentés</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supabase */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" />
              Supabase Tárolás
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Projekt URL</Label>
                <Input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Anon Key</Label>
                <Input type="password" value={supabaseAnonKey} onChange={(e) => setSupabaseAnonKey(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={checkSupabaseStatus} disabled={checkingSupabase}>
                {checkingSupabase ? "Ellenőrzés..." : "Kapcsolat tesztelése"}
              </Button>
              <Button onClick={() => updateAISettingsMutation.mutate({ supabaseUrl: supabaseUrl.trim(), supabaseAnonKey: supabaseAnonKey.trim() })}>
                Mentés
              </Button>
            </div>
            {supabaseStatus && (
              <div className={`p-3 rounded border ${supabaseStatus.status === 'success' ? "bg-green-50" : "bg-red-50"}`}>
                <p className="text-sm font-medium">{supabaseStatus.status === 'success' ? "Sikeres kapcsolat" : "Hiba: " + supabaseStatus.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Provider */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Aktív AI Szolgáltató</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button variant={aiProvider === "openai" ? "default" : "outline"} onClick={() => { setAiProvider("openai"); updateAIProviderMutation.mutate("openai"); }} className="flex-1">OpenAI</Button>
                <Button variant={aiProvider === "gemini" ? "default" : "outline"} onClick={() => { setAiProvider("gemini"); updateAIProviderMutation.mutate("gemini"); }} className="flex-1">Gemini</Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(apiStatus).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs">
                    <div className={`w-2 h-2 rounded-full ${val ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="capitalize">{key}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
