// Test the full Mermaid conversion in module content
import { enhancedModuleGenerator } from './server/enhanced-module-generator.js';

const testContent = `# Teszt Modul

Ez egy teszt tartalom Mermaid diagrammal:

\`\`\`mermaid
graph TD
    A[Kezdés] --> B[Feldolgozás]
    B --> C[Döntés]
    C -->|Igen| D[Művelet 1]
    C -->|Nem| E[Művelet 2]
    D --> F[Befejezés]
    E --> F
\`\`\`

És még egy diagram:

\`\`\`mermaid
flowchart LR
    X[Input] --> Y[Process] --> Z[Output]
\`\`\`

További tartalom a diagramok után.`;

try {
  const generator = new (await import('./server/enhanced-module-generator.js')).EnhancedModuleGenerator();
  const result = await generator.convertMermaidToSVGImages(testContent);
  
  console.log('Original content length:', testContent.length);
  console.log('Converted content length:', result.length);
  console.log('\nConverted content:');
  console.log(result);
  
  // Check if Mermaid blocks were replaced with image references
  if (result.includes('![Mermaid Diagram]') && !result.includes('```mermaid')) {
    console.log('\n✓ SUCCESS: Mermaid diagrams converted to SVG images');
  } else {
    console.log('\n✗ FAILED: Mermaid diagrams not properly converted');
  }
} catch (error) {
  console.error('Error:', error);
}