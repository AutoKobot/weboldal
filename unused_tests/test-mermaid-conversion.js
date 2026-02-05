// Test script to verify Mermaid SVG conversion functionality
import { enhancedModuleGenerator } from './server/enhanced-module-generator.js';

async function testMermaidConversion() {
  console.log('Testing Mermaid SVG conversion...');
  
  const testContent = `
# Test Module

This is a test module with a Mermaid diagram:

\`\`\`mermaid
graph TD
    A[Kezdés] --> B[Feldolgozás]
    B --> C[Döntés]
    C -->|Igen| D[Művelet 1]
    C -->|Nem| E[Művelet 2]
    D --> F[Befejezés]
    E --> F
\`\`\`

Some more content after the diagram.
`;

  try {
    const result = await enhancedModuleGenerator.convertMermaidToSVGImages(testContent);
    console.log('Conversion result:');
    console.log(result);
    
    if (result.includes('![Mermaid Diagram]')) {
      console.log('✓ Mermaid diagram successfully converted to SVG image reference');
    } else {
      console.log('✗ Mermaid diagram conversion failed');
    }
  } catch (error) {
    console.error('Error during conversion:', error);
  }
}

testMermaidConversion();