import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Loader2, Download, Trash2, Link } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface FlashcardImportProps {
    moduleId: number;
    moduleTitle: string;
    onSuccess?: () => void;
}

export function FlashcardImport({ moduleId, moduleTitle, onSuccess }: FlashcardImportProps) {
    const [file, setFile] = useState<File | null>(null);
    const [csvUrl, setCsvUrl] = useState("");
    const [overwrite, setOverwrite] = useState(false);
    const [importMode, setImportMode] = useState<'file' | 'url'>('file');
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`/api/modules/${moduleId}/flashcards`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Törlés sikertelen');
            return response.json();
        },
        onSuccess: () => {
            toast({ title: "Sikeres törlés", description: "Minden kártya eltávolítva." });
            queryClient.invalidateQueries({ queryKey: [`/api/modules/${moduleId}/flashcards`] });
        }
    });

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

    const handleImport = async () => {
        if (importMode === 'file' && !file) return;
        if (importMode === 'url' && !csvUrl.trim()) return;

        if (overwrite) {
            try {
                await deleteMutation.mutateAsync();
            } catch (e) {
                return;
            }
        }

        if (importMode === 'url') {
            // URL mód: lekérjük a CSV-t a böngészőből, majd FormData-ként elküldjük
            try {
                toast({ title: "Letöltés...", description: "CSV letöltése az URL-ről..." });
                const resp = await fetch(csvUrl);
                if (!resp.ok) throw new Error(`Nem sikerült letölteni: ${resp.status}`);
                const text = await resp.text();
                const blob = new Blob([text], { type: 'text/csv' });
                const urlFile = new File([blob], 'import_url.csv', { type: 'text/csv' });
                const formData = new FormData();
                formData.append('file', urlFile);
                importMutation.mutate(formData);
            } catch (e: any) {
                toast({
                    title: "URL letöltési hiba",
                    description: e.message || "Nem sikerült a CSV letöltése az URL-ről.",
                    variant: "destructive",
                });
            }
        } else {
            const formData = new FormData();
            formData.append('file', file!);
            importMutation.mutate(formData);
        }
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

    const isLoading = importMutation.isPending || deleteMutation.isPending;
    const canImport = importMode === 'file' ? !!file : !!csvUrl.trim();

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Tanulókártyák importálása - {moduleTitle}</h3>
                <p className="text-sm text-muted-foreground">
                    Tölts fel egy .csv fájlt, vagy adj meg egy publikus CSV URL-t.
                    A fájlnak rendelkeznie kell <strong>Front</strong> és <strong>Back</strong> fejlécekkel.
                </p>
            </div>

            {/* Mód váltó */}
            <div className="flex gap-2">
                <Button
                    variant={importMode === 'file' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setImportMode('file')}
                    className="gap-2"
                >
                    <FileUp className="h-4 w-4" />
                    Fájl feltöltés
                </Button>
                <Button
                    variant={importMode === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setImportMode('url')}
                    className="gap-2"
                >
                    <Link className="h-4 w-4" />
                    URL megadása
                </Button>
            </div>

            <div className="grid gap-4">
                {importMode === 'file' ? (
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
                ) : (
                    <div className="grid gap-2">
                        <Label htmlFor="csv-url" className="text-blue-700 font-medium">🔗 CSV fájl URL-je</Label>
                        <Input
                            id="csv-url"
                            type="url"
                            value={csvUrl}
                            onChange={(e) => setCsvUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                            className="border-blue-200 focus:border-blue-400"
                        />
                        <p className="text-xs text-gray-500">
                            Google Sheets esetén: <em>Fájl → Letöltés → CSV</em> menüből másold ki a letöltési linket,
                            vagy a Megosztás &gt; Közzétételből kapott CSV URL-t.
                        </p>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="overwrite"
                        checked={overwrite}
                        onCheckedChange={(checked) => setOverwrite(checked as boolean)}
                    />
                    <Label htmlFor="overwrite" className="text-sm cursor-pointer">
                        Meglévő kártyák törlése importálás előtt (Felülírás)
                    </Label>
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
                        disabled={!canImport || isLoading}
                        className="gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <FileUp className="h-4 w-4" />
                        )}
                        Importálás indítása
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (confirm("Biztosan törölni szeretnéd az összes tanulókártyát ehhez a modulhoz?")) {
                                deleteMutation.mutate();
                            }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 w-fit mt-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Minden kártya törlése
                    </Button>
                </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-1 text-muted-foreground">
                <p className="font-semibold">Tippek:</p>
                <p>• A NotebookLM exportált CSV fájljai alapértelmezés szerint támogatottak.</p>
                <p>• Google Sheets URL: <em>Fájl → Megosztás → Közzététel a weben → CSV formátum</em>.</p>
                <p>• Győződj meg róla, hogy a fájl UTF-8 kódolású a speciális karakterek (pl. ékezetek) megőrzéséhez.</p>
                <p>• Ha a fájlban nincsenek Front/Back fejlécek, az első két oszlopot fogjuk használni.</p>
            </div>
        </div>
    );
}

