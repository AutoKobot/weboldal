// Direct test of Mermaid conversion functionality
import fetch from 'node-fetch';

async function testDirectMermaidConversion() {
  const testContent = `# Test Module

This content has a Mermaid diagram:

\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

More content after diagram.`;

  try {
    console.log('Testing direct Mermaid SVG conversion...');
    
    // First test the SVG generation API
    const svgResponse = await fetch('http://localhost:5000/api/mermaid/svg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        mermaidCode: `graph TD
    A[Start] --> B[Process]
    B --> C[End]` 
      })
    });

    if (svgResponse.ok) {
      const svgContent = await svgResponse.text();
      console.log('✓ SVG generation works, content length:', svgContent.length);
      
      // Save SVG manually to test file serving
      const fs = await import('fs');
      const filename = `test_mermaid_${Date.now()}.svg`;
      fs.writeFileSync(`./uploads/${filename}`, svgContent);
      console.log('✓ SVG saved to uploads/' + filename);
      
      // Test if file is accessible via HTTP
      const fileResponse = await fetch(`http://localhost:5000/uploads/${filename}`);
      if (fileResponse.ok) {
        console.log('✓ SVG file is accessible via HTTP');
      } else {
        console.log('✗ SVG file not accessible via HTTP');
      }
      
    } else {
      console.log('✗ SVG generation failed');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDirectMermaidConversion();