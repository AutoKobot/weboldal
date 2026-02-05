import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MermaidTest() {
  const [mermaidCode, setMermaidCode] = useState(`flowchart TD
    A[Kezdés] --> B[Feldolgozás]
    B --> C[Döntés]
    C -->|Igen| D[Művelet 1]
    C -->|Nem| E[Művelet 2]
    D --> F[Befejezés]
    E --> F`);
  
  const [svgUrl, setSvgUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateSVG = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mermaid/svg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mermaidCode }),
      });

      if (response.ok) {
        const svgText = await response.text();
        const blob = new Blob([svgText], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        setSvgUrl(url);
      } else {
        console.error('Failed to generate SVG');
      }
    } catch (error) {
      console.error('Error generating SVG:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadSVG = () => {
    if (svgUrl) {
      const link = document.createElement('a');
      link.href = svgUrl;
      link.download = 'mermaid-diagram.svg';
      link.click();
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Mermaid Diagram Teszt</h1>
        <p className="text-muted-foreground mt-2">
          Mermaid kódból SVG képek generálása
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mermaid Kód</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={mermaidCode}
              onChange={(e) => setMermaidCode(e.target.value)}
              placeholder="Írd be a Mermaid diagram kódot..."
              rows={10}
              className="font-mono text-sm"
            />
            <Button 
              onClick={generateSVG} 
              disabled={loading || !mermaidCode.trim()}
              className="w-full"
            >
              {loading ? 'Generálás...' : 'SVG Generálás'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generált SVG</CardTitle>
          </CardHeader>
          <CardContent>
            {svgUrl ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white">
                  <img 
                    src={svgUrl} 
                    alt="Generated Mermaid Diagram" 
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
                <Button onClick={downloadSVG} variant="outline" className="w-full">
                  SVG Letöltése
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Generálj egy SVG-t a bal oldali kódból
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Példa Mermaid Kódok</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => setMermaidCode(`flowchart TD
    A[Kezdés] --> B[Feldolgozás]
    B --> C[Döntés]
    C -->|Igen| D[Művelet 1]
    C -->|Nem| E[Művelet 2]
    D --> F[Befejezés]
    E --> F`)}
            >
              Folyamatábra
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setMermaidCode(`graph LR
    A[Felhasználó] --> B[Bejelentkezés]
    B --> C[Dashboard]
    C --> D[Modulok]
    D --> E[Tanulás]`)}
            >
              Rendszerdiagram
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setMermaidCode(`sequenceDiagram
    participant U as Felhasználó
    participant S as Szerver
    participant DB as Adatbázis
    
    U->>S: Bejelentkezés
    S->>DB: Felhasználó ellenőrzés
    DB-->>S: Eredmény
    S-->>U: Válasz`)}
            >
              Szekvencia diagram
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setMermaidCode(`classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    
    class Module {
        +String title
        +String content
        +complete()
    }
    
    User --> Module : tanul`)}
            >
              Osztálydiagram
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}