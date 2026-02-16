import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Loader2, Download } from "lucide-react";

interface FlashcardImportProps {
    moduleId: number;
    moduleTitle: string;
    onSuccess?: () => void;
}

export function FlashcardImport({ moduleId, moduleTitle, onSuccess }: FlashcardImportProps) {
    const [file, setFile] = useState<File | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const importMutation = useMutation({
        mutationFn: async (fd: FormData) => {
            const response = await fetch(`/api/modules/${moduleId}/flashcards/import`, {
                method: 'POST',
                body: fd
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Importálás sikertelen');
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Sikeres importálás",
                description: data.message,
            });
            queryClient.invalidateQueries({ queryKey: [`/api/modules/${moduleId}/flashcards`] });
            if (onSuccess) onSuccess();
        },
        onError: (error: Error) => {
            toast({
                title: "Hiba az importálás során",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        importMutation.mutate(formData);
    };

    const downloadTemplate = () => {
        const content = "Front,Back\n\"Mi a Nap?\",\"Egy csillag\"\n\"Mi a víz vegyjele?\",\"H2O\"";
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tanulokartya_sablon.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Tanulókártyák importálása - {moduleTitle}</h3>
                <p className="text-sm text-muted-foreground">
                    Tölts fel egy .csv fájlt a tanulókártyák importálásához.
                    A fájlnak rendelkeznie kell <strong>Front</strong> és <strong>Back</strong> fejlécekkel.
                </p>
            </div>

            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="csv-file">CSV Fájl kiválasztása</Label>
                    <div className="flex gap-2">
                        <Input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadTemplate}
                        className="gap-2 w-fit"
                    >
                        <Download className="h-4 w-4" />
                        Sablon letöltése
                    </Button>

                    <Button
                        onClick={handleImport}
                        disabled={!file || importMutation.isPending}
                        className="gap-2"
                    >
                        {importMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileUp className="h-4 w-4" />
                        )}
                        Importálás indítása
                    </Button>
                </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-1 text-muted-foreground">
                <p className="font-semibold">Tippek:</p>
                <p>• A NotebookLM exportált CSV fájljai alapértelmezés szerint támogatottak.</p>
                <p>• Győződj meg róla, hogy a fájl UTF-8 kódolású a speciális karakterek (pl. ékezetek) megőrzéséhez.</p>
                <p>• Ha a fájlban nincsenek Front/Back fejlécek, az első két oszlopot fogjuk használni.</p>
            </div>
        </div>
    );
}
