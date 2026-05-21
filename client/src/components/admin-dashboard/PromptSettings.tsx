import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Settings, Sparkles, Wand2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function PromptSettings() {
  const { toast } = useToast();
  
  const [prompts, setPrompts] = useState({
    systemMessage: "",
    internetContentPrompt: "",
    conciseContentPrompt: "",
    fluxSchnellPrompt: "",
    youtubePrompt: "",
    audioExplanationPrompt: "",
    textExplanationPrompt: "",
  });

  const { data: systemMessageData } = useQuery<{ message: string }>({ queryKey: ["/api/admin/settings/prompts/ai_system_message"] });
  const { data: internetContentPromptData } = useQuery<{ message: string }>({ queryKey: ["/api/admin/settings/prompts/ai_internet_content_prompt"] });
  const { data: conciseContentPromptData } = useQuery<{ message: string }>({ queryKey: ["/api/admin/settings/prompts/concise-content-prompt"] });
  const { data: fluxSchnellPromptData } = useQuery<{ message: string }>({ queryKey: ["/api/admin/settings/prompts/ai_flux_schnell_prompt"] });
  const { data: youtubePromptData } = useQuery<{ message: string }>({ queryKey: ["/api/admin/settings/prompts/ai_youtube_prompt"] });
  const { data: audioExplanationPromptData } = useQuery<{ message: string }>({ queryKey: ["/api/admin/settings/prompts/audio-explanation-prompt"] });
  const { data: textExplanationPromptData } = useQuery<{ message: string }>({ queryKey: ["/api/admin/settings/prompts/text-explanation-prompt"] });

  useEffect(() => {
    if (systemMessageData) setPrompts(p => ({ ...p, systemMessage: systemMessageData.message }));
  }, [systemMessageData]);

  useEffect(() => {
    if (internetContentPromptData) setPrompts(p => ({ ...p, internetContentPrompt: internetContentPromptData.message }));
  }, [internetContentPromptData]);

  useEffect(() => {
    if (conciseContentPromptData) setPrompts(p => ({ ...p, conciseContentPrompt: conciseContentPromptData.message }));
  }, [conciseContentPromptData]);

  useEffect(() => {
    if (fluxSchnellPromptData) setPrompts(p => ({ ...p, fluxSchnellPrompt: fluxSchnellPromptData.message }));
  }, [fluxSchnellPromptData]);

  useEffect(() => {
    if (youtubePromptData) setPrompts(p => ({ ...p, youtubePrompt: youtubePromptData.message }));
  }, [youtubePromptData]);

  useEffect(() => {
    if (audioExplanationPromptData) setPrompts(p => ({ ...p, audioExplanationPrompt: audioExplanationPromptData.message }));
  }, [audioExplanationPromptData]);

  useEffect(() => {
    if (textExplanationPromptData) setPrompts(p => ({ ...p, textExplanationPrompt: textExplanationPromptData.message }));
  }, [textExplanationPromptData]);

  const updatePromptMutation = useMutation({
    mutationFn: async ({ key, message }: { key: string, message: string }) => {
      // Map to backend keys
      let backendKey = key;
      if (['system-message', 'internet-content-prompt', 'flux-schnell-prompt', 'youtube-prompt'].includes(key)) {
        backendKey = `ai_${key.replace(/-/g, '_')}`;
      }
      await apiRequest("POST", `/api/admin/settings/prompts/${backendKey}`, { message });
    },
    onSuccess: (_, variables) => {
      toast({ title: "Siker", description: "Prompt mentve" });
      let key = variables.key;
      let backendKey = key;
      if (['system-message', 'internet-content-prompt', 'flux-schnell-prompt', 'youtube-prompt'].includes(key)) {
        backendKey = `ai_${key.replace(/-/g, '_')}`;
      }
      queryClient.invalidateQueries({ queryKey: [`/api/admin/settings/prompts/${backendKey}`] });
    }
  });

  const PromptField = ({ label, valueKey, description, rows = 4 }: any) => (
    <div className="space-y-3">
      <Label>{label}</Label>
      <Textarea
        value={(prompts as any)[valueKey]}
        onChange={(e) => setPrompts(p => ({ ...p, [valueKey]: e.target.value }))}
        rows={rows}
        className="font-mono text-sm"
      />
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{description}</p>
        <Button 
          size="sm" 
          onClick={() => updatePromptMutation.mutate({ key: valueKey.replace(/([A-Z])/g, '-$1').toLowerCase(), message: (prompts as any)[valueKey] })}
          disabled={updatePromptMutation.isPending}
        >
          Mentés
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Globális AI Rendszerüzenet
          </CardTitle>
          <CardDescription>Ez határozza meg az AI alapvető viselkedését minden interakció során.</CardDescription>
        </CardHeader>
        <CardContent>
          <PromptField 
            label="Rendszerüzenet" 
            valueKey="systemMessage" 
            description="Határozza meg az AI tónusát, nyelvét és korlátait."
            rows={6}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-500">
            <Wand2 className="h-5 w-5 text-indigo-500" />
            AI Képgenerálás (Flux Schnell / DALL-E 3) Prompt
          </CardTitle>
          <CardDescription>A prezentációkhoz és diákhoz generált oktatási illusztrációk stílusát meghatározó sablon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PromptField 
            label="Illusztráció Prompt Sablon" 
            valueKey="fluxSchnellPrompt" 
            description="Használja a {prompt} kifejezést a diák tartalmának beillesztéséhez. Pl.: 'Blueprint style diagram of {prompt}'"
            rows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Szekvenciális Tartalomgenerálás Promptok
          </CardTitle>
          <CardDescription>A modulok AI-val történő fejlesztésének lépései.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <PromptField label="1. Internet tartalom & Vizuális elemek (SVG/Mermaid)" valueKey="internetContentPrompt" description="Kiegészíti az eredeti szöveget friss információkkal, SVG technikai rajzokkal és Mermaid ábrákkal." />
          <div className="border-t pt-6">
            <PromptField label="2. Tömör verzió készítése" valueKey="conciseContentPrompt" description="Létrehozza a lényegre törő változatot." />
          </div>
          <div className="border-t pt-6">
            <PromptField label="3. YouTube keresés" valueKey="youtubePrompt" description="Generálja a keresési kifejezéseket a videókhoz." />
          </div>
          <div className="border-t pt-6">
            <PromptField label="4. Hangos magyarázat" valueKey="audioExplanationPrompt" description="Szöveg a beszéd szintézishez." />
          </div>
          <div className="border-t pt-6">
            <PromptField label="5. Szöveges magyarázat" valueKey="textExplanationPrompt" description="Részletes válaszok a tanulói kérdésekre." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
