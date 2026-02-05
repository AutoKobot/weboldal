// Simple test for Mermaid SVG conversion
async function testMermaidSVGGeneration() {
  const testMermaidCode = `graph TD
    A[Kezdés] --> B[Feldolgozás]
    B --> C[Döntés]
    C -->|Igen| D[Művelet 1]
    C -->|Nem| E[Művelet 2]
    D --> F[Befejezés]
    E --> F`;

  try {
    const response = await fetch('http://localhost:5000/api/mermaid/svg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mermaidCode: testMermaidCode }),
    });

    if (response.ok) {
      const svgContent = await response.text();
      console.log('SVG generation successful!');
      console.log('SVG content length:', svgContent.length);
      
      // Save to file for testing
      const fs = await import('fs');
      fs.writeFileSync('./test-output.svg', svgContent);
      console.log('SVG saved to test-output.svg');
      
      return true;
    } else {
      console.error('SVG generation failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

testMermaidSVGGeneration();