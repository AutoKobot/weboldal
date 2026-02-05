import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Youtube, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EnhancedModuleFormProps {
  onModuleCreated: (module: any) => void;
  subjects: Array<{ id: number; name: string; }>;
}

export function EnhancedModuleForm({ onModuleCreated, subjects }: EnhancedModuleFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [moduleNumber, setModuleNumber] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [enhancedContent, setEnhancedContent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  const generateEnhancedContent = async () => {
    if (!title || !content) {
      toast({
        title: "Hiányzó adatok",
        description: "Cím és alapvető tartalom szükséges",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest('POST', '/api/admin/modules/generate-enhanced', {
        title,
        content,
        subjectId
      });

      if (response.ok) {
        const enhanced = await response.json();
        setEnhancedContent(enhanced);
        setActiveTab('enhanced');
        
        toast({
          title: "Sikeres generálás",
          description: "Az AI elkészítette a tömör és bővített változatokat YouTube videókkal"
        });
      } else {
        throw new Error('Failed to generate enhanced content');
      }
    } catch (error) {
      console.error('Enhanced content generation error:', error);
      toast({
        title: "Generálási hiba",
        description: "Nem sikerült a bővített tartalmat elkészíteni",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const createModule = async () => {
    if (!title || !content || !subjectId) {
      toast({
        title: "Hiányzó adatok",
        description: "Cím, tartalom és tantárgy szükséges",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const moduleData = {
        title,
        content,
        subjectId,
        moduleNumber,
        conciseContent: enhancedContent?.conciseVersion || null,
        detailedContent: enhancedContent?.detailedVersion || null,
        keyConceptsData: enhancedContent?.keyConceptsWithVideos || null
      };

      const response = await apiRequest('POST', '/api/admin/modules/create-with-enhancement', moduleData);

      if (response.ok) {
        const module = await response.json();
        onModuleCreated(module);
        
        // Reset form
        setTitle('');
        setContent('');
        setSubjectId(null);
        setModuleNumber(1);
        setEnhancedContent(null);
        setActiveTab('basic');
        
        toast({
          title: "Modul létrehozva",
          description: "A bővített modul sikeresen mentésre került"
        });
      } else {
        throw new Error('Failed to create module');
      }
    } catch (error) {
      console.error('Module creation error:', error);
      toast({
        title: "Létrehozási hiba",
        description: "Nem sikerült a modult létrehozni",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Bővített Modul Létrehozása (AI + YouTube videók)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Alapadatok</TabsTrigger>
            <TabsTrigger value="enhanced" disabled={!enhancedContent}>
              AI Bővítés
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!enhancedContent}>
              Előnézet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Modul címe</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="pl. Kémiai tulajdonságok"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module-number">Modul száma</Label>
                <Input
                  id="module-number"
                  type="number"
                  value={moduleNumber}
                  onChange={(e) => setModuleNumber(parseInt(e.target.value))}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Tantárgy</Label>
              <select
                id="subject"
                value={subjectId || ''}
                onChange={(e) => setSubjectId(parseInt(e.target.value) || null)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Válassz tantárgyat</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Alapvető tartalom</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Írj be egy alapvető tartalmat, az AI ebből fog tömör és bővített változatot készíteni..."
                rows={8}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={generateEnhancedContent}
                disabled={isGenerating || !title || !content}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AI dolgozik...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    AI Bővítés Generálása
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="enhanced" className="space-y-4">
            {enhancedContent && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tömör verzió</h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="whitespace-pre-wrap">{enhancedContent.conciseVersion}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Bővített verzió</h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="whitespace-pre-wrap">{enhancedContent.detailedVersion}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Kulcsfogalmak YouTube videókkal</h3>
                  <div className="space-y-4">
                    {enhancedContent.keyConceptsWithVideos?.map((concept: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline">{concept.concept}</Badge>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground mb-2">
                                {concept.definition}
                              </p>
                              {concept.youtubeVideos?.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1 text-sm font-medium">
                                    <Youtube className="h-4 w-4 text-red-500" />
                                    Kapcsolódó videók:
                                  </div>
                                  {concept.youtubeVideos.map((video: any, vIndex: number) => (
                                    <div key={vIndex} className="pl-4 border-l-2 border-red-200">
                                      <a
                                        href={video.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm font-medium"
                                      >
                                        {video.title}
                                      </a>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {video.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {enhancedContent && (
              <div className="space-y-4">
                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Modul előnézet</h4>
                  <p className="text-sm text-green-700">
                    A modul 3 különböző verzióban lesz elérhető: alapvető, tömör és bővített.
                    A kulcsfogalmak automatikusan linkek lesznek a kapcsolódó YouTube videókhoz.
                  </p>
                </div>

                <Button
                  onClick={createModule}
                  disabled={isCreating}
                  className="w-full"
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Modul létrehozása...
                    </>
                  ) : (
                    'Bővített Modul Létrehozása'
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}