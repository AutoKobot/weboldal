import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlashcardImport } from "@/components/flashcard-import";
import { LinkEditor } from "@/components/link-editor";
import FileUpload from "@/components/file-upload";
import { Module, Subject, insertModuleSchema, KeyConceptsData } from "./types";

const moduleEditorSchema = insertModuleSchema.extend({
  conciseContent: z.string().optional().nullable(),
  detailedContent: z.string().optional().nullable(),
  youtubeUrl: z.string().optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  audioUrl: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  presentationUrl: z.string().optional().nullable(),
  podcastUrl: z.string().optional().nullable(),
  keyConceptsData: z.any().optional().nullable(),
});

interface ModuleEditorProps {
  module?: Module;
  subjects: Subject[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export function ModuleEditor({ module, subjects, onSave, onCancel }: ModuleEditorProps) {
  const form = useForm({
    resolver: zodResolver(moduleEditorSchema),
    defaultValues: module ? {
      ...module,
      conciseContent: module.conciseContent || "",
      detailedContent: module.detailedContent || "",
      youtubeUrl: module.youtubeUrl || "",
      videoUrl: module.videoUrl || "",
      audioUrl: module.audioUrl || "",
      imageUrl: module.imageUrl || "",
      presentationUrl: module.presentationUrl || "",
      podcastUrl: module.podcastUrl || "",
      keyConceptsData: module.keyConceptsData || [],
    } : {
      title: "",
      content: "",
      moduleNumber: 1,
      subjectId: 0,
      isPublished: false,
      keyConceptsData: [],
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="sectionCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kód (pl. 3.4.1.6.1)</FormLabel>
                <FormControl><Input {...field} value={field.value || ""} placeholder="3.x.x.x.x" /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Cím</FormLabel>
                <FormControl><Input {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="moduleNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sorszám</FormLabel>
                <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="suggestedHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Óraszám</FormLabel>
                <FormControl><Input type="number" step="0.5" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value)} /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alapvető tartalom</FormLabel>
              <FormControl><Textarea {...field} rows={5} /></FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="conciseContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tömör verzió (AI)</FormLabel>
                <FormControl><Textarea {...field} value={field.value || ""} rows={3} className="bg-purple-50/30" /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="detailedContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Részletes verzió (AI)</FormLabel>
                <FormControl><Textarea {...field} value={field.value || ""} rows={3} className="bg-purple-50/30" /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-sm">Médiatartalom</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input {...form.register("youtubeUrl")} placeholder="https://youtube.com/..." />
             </div>
             <div className="space-y-2">
                <Label>Videó fájl</Label>
                <FileUpload acceptedTypes="video/*" onFileUploaded={(file) => form.setValue("videoUrl", `/uploads/${file.filename}`)} />
             </div>
          </div>
        </div>

        {module && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Kulcsfogalmak és Tanulókártyák</h4>
            <LinkEditor 
              keyConceptsData={(Array.isArray(form.watch("keyConceptsData")) ? form.watch("keyConceptsData") : []) as any} 
              onUpdate={(data) => form.setValue("keyConceptsData", data)} 
            />
            <div className="mt-4">
              <FlashcardImport moduleId={module.id} moduleTitle={module.title} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>Mégse</Button>
          <Button type="submit">Mentés</Button>
        </div>
      </form>
    </Form>
  );
}
