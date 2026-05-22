import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Database, CheckCircle, XCircle, AlertTriangle, Bot, RefreshCw
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

  // Global feature toggles
  const { data: aiChatEnabledData } = useQuery({
    queryKey: ['/api/settings/ai-chat-enabled'],
  });
  const aiChatEnabled = (aiChatEnabledData as any)?.enabled !== false;

  const toggleAiChatMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/settings/ai-chat-enabled", { enabled });
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "AI Tanár állapota frissítve" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ai-chat-enabled"] });
    }
  });

  // Database status query
  const { data: dbStatusData, refetch: refetchDbStatus, isFetching: isFetchingDbStatus } = useQuery({
    queryKey: ['/api/admin/db-status'],
  });
  const dbStatus = dbStatusData as any;

  const switchDbMutation = useMutation({
    mutationFn: async (source: 'primary' | 'backup') => {
      const res = await apiRequest("POST", "/api/admin/db-switch", { source });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Siker", description: data.message || "Adatbázis sikeresen átváltva." });
      refetchDbStatus();
    },
    onError: (err: any) => {
      toast({ title: "Hiba az átváltás során", description: err.message, variant: "destructive" });
    }
  });

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

  // Backup DB URL state
  const [backupDbUrl, setBackupDbUrl] = useState("");

  const { data: backupDbUrlData } = useQuery({
    queryKey: ['/api/db-backup-url'],
    enabled: false, // we'll refetch manually
  });

  useEffect(() => {
    // Load backup DB URL on mount
    fetch('/api/db-backup-url', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data?.url) setBackupDbUrl(data.url);
      })
      .catch(() => { });
  }, []);

  const saveBackupDbUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/db-backup-url", { url });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Siker", description: data.message || "Másodlagos adatbázis URL mentve." });
      refetchDbStatus();
    },
    onError: (err: any) => {
      toast({ title: "Hiba", description: err.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (aiSettings?.supabaseUrl) setSupabaseUrl(aiSettings.supabaseUrl);
    if (aiSettings?.supabaseAnonKey) setSupabaseAnonKey(aiSettings.supabaseAnonKey);
  }, [aiSettings]);

  const updateAIProviderMutation = useMutation({
    mutationFn: async (provider: string) => {
      await apiRequest("POST", "/api/settings/ai-provider", { provider });
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "AI szolgáltató frissítve" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ai"] });
    }
  });

  const updateAISettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AISettings>) => {
      await apiRequest("PATCH", "/api/settings/ai", settings);
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "Beállítások mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ai"] });
    }
  });

  const updateApiKeyMutation = useMutation({
    mutationFn: async ({ provider, key }: { provider: string, key: string }) => {
      await apiRequest("POST", `/api/settings/api-keys/${provider}`, { key });
    },
    onSuccess: () => {
      toast({ title: "Siker", description: "API kulcs mentve" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-status"] });
    }
  });

  const checkSupabaseStatus = async () => {
    setCheckingSupabase(true);
    try {
      const res = await apiRequest("POST", "/api/settings/test-supabase", {
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
        {/* Feature Toggles */}
        <Card className="border-orange-200 bg-orange-50/20 md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Bot className="h-5 w-5" />
              Kiemelt Funkciók Kezelése
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white border border-orange-100 shadow-sm">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold flex items-center gap-2">
                  AI Tanár Chat Funkció
                  <Badge variant={aiChatEnabled ? "default" : "secondary"} className={aiChatEnabled ? "bg-green-600" : ""}>
                    {aiChatEnabled ? "AKTÍV" : "KIKAPCSOLVA"}
                  </Badge>
                </Label>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Engedélyezi a diákok számára az AI Tanárral való beszélgetést és a hangos magyarázatokat a modulok mellett. Kikapcsolás esetén ez a fül nem jelenik meg a diákoknak.
                </p>
              </div>
              <Switch
                checked={aiChatEnabled}
                onCheckedChange={(checked) => toggleAiChatMutation.mutate(checked)}
                className="data-[state=checked]:bg-orange-600"
              />
            </div>
          </CardContent>
        </Card>

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
                    placeholder={apiStatus.openai ? "•••••••••••••••• (Mentve)" : "sk-..."}
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowOpenaiKey(!showOpenaiKey)}>
                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => {
                    updateApiKeyMutation.mutate({ provider: 'openai', key: openaiKey.trim() });
                    setOpenaiKey("");
                  }} disabled={!openaiKey}>Mentés</Button>
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
                    placeholder={apiStatus.gemini ? "•••••••••••••••• (Mentve)" : "AIza..."}
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowGeminiKey(!showGeminiKey)}>
                    {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => {
                    updateApiKeyMutation.mutate({ provider: 'gemini', key: geminiKey.trim() });
                    setGeminiKey("");
                  }} disabled={!geminiKey}>Mentés</Button>
                </div>
              </div>

              {/* Together AI */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">Together AI</Label>
                  <Badge variant={apiStatus.together ? "outline" : "destructive"}>
                    {apiStatus.together ? "Csatlakoztatva" : "Hiányzik"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showTogetherKey ? "text" : "password"}
                    value={togetherKey}
                    onChange={(e) => setTogetherKey(e.target.value)}
                    placeholder={apiStatus.together ? "•••••••••••••••• (Mentve)" : "key_..."}
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowTogetherKey(!showTogetherKey)}>
                    {showTogetherKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => {
                    updateApiKeyMutation.mutate({ provider: 'together', key: togetherKey.trim() });
                    setTogetherKey("");
                  }} disabled={!togetherKey}>Mentés</Button>
                </div>
              </div>

              {/* DeepInfra */}
              <div className="space-y-3 p-4 border rounded-lg bg-background/50">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold">DeepInfra</Label>
                  <Badge variant={apiStatus.deepinfra ? "outline" : "destructive"}>
                    {apiStatus.deepinfra ? "Csatlakoztatva" : "Hiányzik"}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showDeepinfraKey ? "text" : "password"}
                    value={deepinfraKey}
                    onChange={(e) => setDeepinfraKey(e.target.value)}
                    placeholder={apiStatus.deepinfra ? "•••••••••••••••• (Mentve)" : "hVE1..."}
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowDeepinfraKey(!showDeepinfraKey)}>
                    {showDeepinfraKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => {
                    updateApiKeyMutation.mutate({ provider: 'deepinfra', key: deepinfraKey.trim() });
                    setDeepinfraKey("");
                  }} disabled={!deepinfraKey}>Mentés</Button>
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
                    placeholder={apiStatus.elevenLabs ? "•••••••••••••••• (Mentve)" : "sk_..."}
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowElevenLabsKey(!showElevenLabsKey)}>
                    {showElevenLabsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => {
                    updateApiKeyMutation.mutate({ provider: 'elevenlabs', key: elevenLabsKey.trim() });
                    setElevenLabsKey("");
                  }} disabled={!elevenLabsKey}>Mentés</Button>
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
                    <Input
                      type={showDataForSeoLogin ? "text" : "password"}
                      value={dataForSeoLogin}
                      onChange={(e) => setDataForSeoLogin(e.target.value)}
                      placeholder={apiStatus.dataForSeo ? "•••••••••••••••• (Mentve)" : "Login"}
                    />
                    <Button size="icon" variant="outline" onClick={() => setShowDataForSeoLogin(!showDataForSeoLogin)}>
                      {showDataForSeoLogin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type={showDataForSeoPassword ? "text" : "password"}
                      value={dataForSeoPassword}
                      onChange={(e) => setDataForSeoPassword(e.target.value)}
                      placeholder={apiStatus.dataForSeo ? "•••••••••••••••• (Mentve)" : "Password"}
                    />
                    <Button size="icon" variant="outline" onClick={() => setShowDataForSeoPassword(!showDataForSeoPassword)}>
                      {showDataForSeoPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" onClick={() => {
                      if (dataForSeoLogin) updateApiKeyMutation.mutate({ provider: 'dataforseo-login', key: dataForSeoLogin.trim() });
                      if (dataForSeoPassword) updateApiKeyMutation.mutate({ provider: 'dataforseo-password', key: dataForSeoPassword.trim() });
                      setDataForSeoLogin("");
                      setDataForSeoPassword("");
                    }} disabled={!dataForSeoLogin && !dataForSeoPassword}>Mentés</Button>
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
                  <Input
                    type={showYoutubeKey ? "text" : "password"}
                    value={youtubeApiKey}
                    onChange={(e) => setYoutubeApiKey(e.target.value)}
                    placeholder={apiStatus.youtube ? "•••••••••••••••• (Mentve)" : "AIza..."}
                  />
                  <Button size="icon" variant="outline" onClick={() => setShowYoutubeKey(!showYoutubeKey)}>
                    {showYoutubeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" onClick={() => {
                    updateApiKeyMutation.mutate({ provider: 'youtube', key: youtubeApiKey.trim() });
                    setYoutubeApiKey("");
                  }} disabled={!youtubeApiKey}>Mentés</Button>
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

        {/* Database Redundancy & Failover System */}
        <Card className="md:col-span-2 border-indigo-200 bg-indigo-50/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-indigo-700">
                <Database className="h-5 w-5" />
                Adatbázis Redundancia és Failover Rendszer
              </span>
              <Badge variant={dbStatus?.backupConfigured ? "default" : "secondary"} className={dbStatus?.backupConfigured ? "bg-indigo-600 hover:bg-indigo-600" : ""}>
                {dbStatus?.backupConfigured ? "DUPLA ADATBÁZIS AKTÍV" : "EGYEDÜLI ADATBÁZIS MÓD"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              A rendszer automatikus failover és valós idejű dual-write szinkronizációval védi az adatokat. Ha az elsődleges adatbázis kiesik, a rendszer automatikusan és észrevétlenül átvált a másodlagos adatbázisra.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Database Status */}
              <div className={`p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between ${dbStatus?.activeSource === 'primary' ? 'border-green-500 ring-1 ring-green-500/20' : 'border-slate-200'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Elsődleges Adatbázis</span>
                    {dbStatus?.activeSource === 'primary' && (
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 animate-pulse font-normal">AKTÍV FORRÁS</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[250px]">
                    DATABASE_URL
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {dbStatus?.primaryOnline ? (
                    <Badge className="bg-green-600 hover:bg-green-600 flex items-center gap-1 font-normal">
                      <CheckCircle className="h-3 w-3" /> Online
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1 font-normal">
                      <XCircle className="h-3 w-3" /> Offline
                    </Badge>
                  )}
                </div>
              </div>

              {/* Backup Database Status */}
              <div className={`p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between ${dbStatus?.activeSource === 'backup' ? 'border-green-500 ring-1 ring-green-500/20' : 'border-slate-200'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Másodlagos Adatbázis</span>
                    {dbStatus?.activeSource === 'backup' && (
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 animate-pulse font-normal">AKTÍV FORRÁS</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate max-w-[250px]">
                    {dbStatus?.backupConfigured ? "DATABASE_URL_BACKUP" : "Nincs beállítva"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!dbStatus?.backupConfigured ? (
                    <Badge variant="secondary" className="flex items-center gap-1 font-normal">
                      <AlertTriangle className="h-3 w-3 text-amber-500" /> Nincs konfigurálva
                    </Badge>
                  ) : dbStatus?.backupOnline ? (
                    <Badge className="bg-green-600 hover:bg-green-600 flex items-center gap-1 font-normal">
                      <CheckCircle className="h-3 w-3" /> Online
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1 font-normal">
                      <XCircle className="h-3 w-3" /> Offline
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {dbStatus?.backupConfigured && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-semibold">Figyelem:</span> Az írási műveletek valós időben replikálódnak mindkét adatbázisba. Manuális váltás esetén az aktív lekérdezések a kiválasztott adatbázisból fognak olvasni. Kérjük, győződj meg arról, hogy mindkét adatbázis online és szerkezetileg megegyezik.
                </div>
              </div>
            )}

            {/* Másodlagos Adatbázis URL beállítás */}
            <div className="p-4 border border-indigo-100 rounded-lg bg-white/50">
              <Label className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-indigo-500" />
                Másodlagos Adatbázis Kapcsolati URL (DATABASE_URL_BACKUP)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={backupDbUrl}
                  onChange={(e) => setBackupDbUrl(e.target.value)}
                  placeholder={dbStatus?.backupConfigured ? "•••••••••••••••• (Mentve)" : "postgresql://..."}
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => saveBackupDbUrlMutation.mutate(backupDbUrl.trim())}
                  disabled={saveBackupDbUrlMutation.isPending || !backupDbUrl}
                >
                  Mentés
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 italic">
                A változtatás mentésre kerül, de élesítéshez indítsd újra a szervert, hogy a FailoverPool betöltse az új URL-t.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchDbStatus()}
                disabled={isFetchingDbStatus}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingDbStatus ? 'animate-spin' : ''}`} />
                Kapcsolatok frissítése
              </Button>

              {dbStatus?.backupConfigured && (
                <Button
                  variant="default"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    const target = dbStatus.activeSource === 'primary' ? 'backup' : 'primary';
                    switchDbMutation.mutate(target);
                  }}
                  disabled={switchDbMutation.isPending}
                >
                  Váltás {dbStatus.activeSource === 'primary' ? 'Másodlagosra' : 'Elsődlegesre'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Google Drive Backup */}
        <Card className="md:col-span-2 border-amber-200 bg-amber-50/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-600" />
              Google Drive Biztonsági Mentés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Drive Mappa ID</Label>
                <div className="flex gap-2">
                  <Input
                    value={aiSettings?.googleDriveFolderId || ""}
                    onChange={(e) => updateAISettingsMutation.mutate({ googleDriveFolderId: e.target.value })}
                    placeholder="1-4YLrha..."
                    className="font-mono text-xs"
                  />
                  <Button size="sm" onClick={() => toast({ title: "Automatikus mentés", description: "Változtatás mentve." })}>OK</Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Ide kerülnek a napi JSON mentések. Győződj meg róla, hogy a szervizfiók írási jogot kapott erre a mappára!
                </p>
              </div>

              <div className="space-y-3 border-l pl-6 border-amber-100">
                <Label>Manuális Mentés Indítása</Label>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={async () => {
                      try {
                        const res = await apiRequest("POST", "/api/admin/backup");
                        const data = await res.json();
                        const status = data.details?.status;
                        let desc = `A mentés sikeresen elkészült. Hash: ${data.details?.hash?.substring(0, 8) || "N/A"}`;

                        if (status === 'drive') {
                          desc = `A mentési fájl feltöltve a Google Drive-ra. Hash: ${data.details?.hash?.substring(0, 8) || "N/A"}`;
                        } else if (status === 'local_only') {
                          desc = `Google Drive kulcs hiányzik. A mentés biztonságban elmentve helyben a szerverre. Hash: ${data.details?.hash?.substring(0, 8) || "N/A"}`;
                        } else if (status === 'local_fallback') {
                          desc = `Google Drive feltöltési hiba, de a mentés sikeresen elmentve helyben a szerverre. Hash: ${data.details?.hash?.substring(0, 8) || "N/A"}`;
                        }

                        toast({
                          title: "Mentés sikeres",
                          description: desc
                        });
                      } catch (err: any) {
                        toast({
                          title: "Mentési hiba",
                          description: err.message,
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Azonnali Mentés (Okos Mentés)
                  </Button>
                  <p className="text-[10px] text-muted-foreground">
                    A rendszer csak akkor készít új fájlt, ha változott az adatbázis tartalma az előző mentés óta.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
