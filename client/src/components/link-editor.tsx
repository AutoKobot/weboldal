import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Youtube, ExternalLink, Edit3, Globe } from "lucide-react";
import { KeyConceptsData, KeyConcept, YoutubeVideo, WikipediaLink } from "@shared/schema";

interface LinkEditorProps {
  keyConceptsData: KeyConceptsData;
  onUpdate: (updatedData: KeyConceptsData) => void;
}

export function LinkEditor({ keyConceptsData, onUpdate }: LinkEditorProps) {
  const [editingConcept, setEditingConcept] = useState<number | null>(null);
  const [editingVideo, setEditingVideo] = useState<{ conceptIndex: number; videoIndex: number } | null>(null);

  const updateConcept = (index: number, updatedConcept: KeyConcept) => {
    const updated = [...keyConceptsData];
    updated[index] = updatedConcept;
    onUpdate(updated);
  };

  const deleteConcept = (index: number) => {
    const updated = keyConceptsData.filter((_, i) => i !== index);
    onUpdate(updated);
  };

  const addNewConcept = () => {
    const newConcept: KeyConcept = {
      concept: "Új fogalom",
      definition: "Fogalom definíciója",
      youtubeVideos: [],
      wikipediaLinks: []
    };
    onUpdate([...keyConceptsData, newConcept]);
  };

  const updateVideo = (conceptIndex: number, videoIndex: number, updatedVideo: YoutubeVideo) => {
    const updated = [...keyConceptsData];
    updated[conceptIndex].youtubeVideos[videoIndex] = updatedVideo;
    onUpdate(updated);
  };

  const deleteVideo = (conceptIndex: number, videoIndex: number) => {
    const updated = [...keyConceptsData];
    updated[conceptIndex].youtubeVideos = updated[conceptIndex].youtubeVideos.filter((_, i) => i !== videoIndex);
    onUpdate(updated);
  };

  const addNewVideo = (conceptIndex: number) => {
    const newVideo: YoutubeVideo = {
      title: "Új videó",
      videoId: "",
      description: "Videó leírása",
      url: "https://www.youtube.com/watch?v="
    };
    const updated = [...keyConceptsData];
    updated[conceptIndex].youtubeVideos.push(newVideo);
    onUpdate(updated);
  };

  const updateWikipediaLink = (conceptIndex: number, linkIndex: number, updatedLink: WikipediaLink) => {
    const updated = [...keyConceptsData];
    if (!updated[conceptIndex].wikipediaLinks) {
      updated[conceptIndex].wikipediaLinks = [];
    }
    updated[conceptIndex].wikipediaLinks![linkIndex] = updatedLink;
    onUpdate(updated);
  };

  const deleteWikipediaLink = (conceptIndex: number, linkIndex: number) => {
    const updated = [...keyConceptsData];
    if (updated[conceptIndex].wikipediaLinks) {
      updated[conceptIndex].wikipediaLinks = updated[conceptIndex].wikipediaLinks!.filter((_, i) => i !== linkIndex);
    }
    onUpdate(updated);
  };

  const addNewWikipediaLink = (conceptIndex: number) => {
    const newLink: WikipediaLink = {
      text: "Új Wikipedia link",
      url: "https://hu.wikipedia.org/wiki/",
      description: "Link leírása"
    };
    const updated = [...keyConceptsData];
    if (!updated[conceptIndex].wikipediaLinks) {
      updated[conceptIndex].wikipediaLinks = [];
    }
    updated[conceptIndex].wikipediaLinks!.push(newLink);
    onUpdate(updated);
  };

  const extractVideoIdFromUrl = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : "";
  };

  if (!keyConceptsData || keyConceptsData.length === 0) {
    return (
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-sm text-blue-700">YouTube és Wikipedia linkek</h4>
        <div className="text-center py-8 text-muted-foreground bg-blue-50 rounded-lg">
          <Youtube className="mx-auto h-12 w-12 mb-4 text-blue-300" />
          <p>Nincs AI-generált kulcsfogalom és videó adat</p>
          <p className="text-sm">Használd az AI regenerálás gombot tartalom generálásához</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm text-blue-700 flex items-center gap-2">
          <Youtube className="h-4 w-4" />
          YouTube és Wikipedia linkek szerkesztése
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addNewConcept}
          className="flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Új fogalom
        </Button>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {keyConceptsData.map((concept, conceptIndex) => (
          <Card key={conceptIndex} className="bg-blue-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-800">
                  {editingConcept === conceptIndex ? (
                    <Input
                      value={concept.concept}
                      onChange={(e) => updateConcept(conceptIndex, { ...concept, concept: e.target.value })}
                      onBlur={() => setEditingConcept(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingConcept(null)}
                      className="text-sm font-medium"
                      autoFocus
                    />
                  ) : (
                    <span 
                      onClick={() => setEditingConcept(conceptIndex)}
                      className="cursor-pointer hover:text-blue-600"
                    >
                      {concept.concept}
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingConcept(conceptIndex)}
                    className="h-7 w-7 p-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteConcept(conceptIndex)}
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-blue-600">Definíció</Label>
                <Textarea
                  value={concept.definition}
                  onChange={(e) => updateConcept(conceptIndex, { ...concept, definition: e.target.value })}
                  rows={2}
                  className="text-sm bg-white"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-blue-600">YouTube videók</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addNewVideo(conceptIndex)}
                    className="h-6 text-xs px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Videó
                  </Button>
                </div>
                
                {concept.youtubeVideos.map((video, videoIndex) => (
                  <div key={videoIndex} className="bg-white p-3 rounded-md border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Youtube className="h-4 w-4 text-red-500" />
                        <span className="text-xs font-medium">Videó {videoIndex + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {video.url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(video.url, '_blank')}
                            className="h-6 w-6 p-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteVideo(conceptIndex, videoIndex)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Cím</Label>
                        <Input
                          value={video.title}
                          onChange={(e) => updateVideo(conceptIndex, videoIndex, { ...video, title: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">YouTube URL</Label>
                        <Input
                          value={video.url}
                          onChange={(e) => {
                            const newUrl = e.target.value;
                            const videoId = extractVideoIdFromUrl(newUrl);
                            updateVideo(conceptIndex, videoIndex, { 
                              ...video, 
                              url: newUrl,
                              videoId: videoId 
                            });
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Leírás</Label>
                      <Textarea
                        value={video.description}
                        onChange={(e) => updateVideo(conceptIndex, videoIndex, { ...video, description: e.target.value })}
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
                
                {concept.youtubeVideos.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground bg-gray-50 rounded-md">
                    <p className="text-xs">Nincsenek YouTube videók</p>
                  </div>
                )}
              </div>

              {/* Wikipedia linkek kezelése */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-blue-600">Wikipedia linkek</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addNewWikipediaLink(conceptIndex)}
                    className="h-6 text-xs px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Wiki link
                  </Button>
                </div>
                
                {concept.wikipediaLinks && concept.wikipediaLinks.map((link, linkIndex) => (
                  <div key={linkIndex} className="bg-white p-3 rounded-md border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-medium">Wikipedia {linkIndex + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {link.url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(link.url, '_blank')}
                            className="h-6 w-6 p-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteWikipediaLink(conceptIndex, linkIndex)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Szöveg</Label>
                        <Input
                          value={link.text}
                          onChange={(e) => updateWikipediaLink(conceptIndex, linkIndex, { ...link, text: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Wikipedia URL</Label>
                        <Input
                          value={link.url}
                          onChange={(e) => updateWikipediaLink(conceptIndex, linkIndex, { ...link, url: e.target.value })}
                          placeholder="https://hu.wikipedia.org/wiki/..."
                          className="text-xs"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Leírás</Label>
                      <Textarea
                        value={link.description || ""}
                        onChange={(e) => updateWikipediaLink(conceptIndex, linkIndex, { ...link, description: e.target.value })}
                        rows={2}
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
                
                {(!concept.wikipediaLinks || concept.wikipediaLinks.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground bg-gray-50 rounded-md">
                    <p className="text-xs">Nincsenek Wikipedia linkek</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}