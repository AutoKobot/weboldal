// Simple test for the Mermaid syntax fixer
function fixMermaidSyntax(content) {
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  
  return content.replace(mermaidRegex, (match, mermaidCode) => {
    let fixedCode = mermaidCode.trim();
    
    // Handle duplicate flowchart declarations
    fixedCode = fixedCode.replace(/flowchart\s+TD\s*flowchart\s+TD/gi, 'flowchart TD');
    fixedCode = fixedCode.replace(/flowchart\s+TD\s*flowchart/gi, 'flowchart TD');
    fixedCode = fixedCode.replace(/flowchart\s*flowchart/gi, 'flowchart');
    
    // Clean up lines
    const lines = fixedCode.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let cleanedLines = [];
    let hasValidStart = false;
    
    for (const line of lines) {
      if (line.match(/^(flowchart|graph|sequenceDiagram)/)) {
        if (!hasValidStart) {
          cleanedLines.push(line);
          hasValidStart = true;
        }
        continue;
      }
      
      if (hasValidStart) {
        cleanedLines.push(line);
      }
    }
    
    if (!hasValidStart) {
      cleanedLines = ['flowchart TD', ...cleanedLines];
    }
    
    // Apply indentation
    cleanedLines = cleanedLines.map((line, index) => {
      if (index === 0) return line;
      if (line.startsWith('    ')) return line;
      return '    ' + line;
    });
    
    fixedCode = cleanedLines.join('\n');
    
    // Remove quotes and fix arrows
    fixedCode = fixedCode.replace(/["'`]/g, '');
    fixedCode = fixedCode.replace(/-->/g, ' --> ');
    fixedCode = fixedCode.replace(/\s+-->\s+/g, ' --> ');
    
    return '```mermaid\n' + fixedCode + '\n```';
  });
}

// Test the problematic case
const problematic = `
```mermaid
flowchart TDflowchart TDA[Vasér] --> B[Ötvözet]
    B --> C[Hegesztés]
    C --> D[Eredmény]
```
`;

console.log('ORIGINAL:');
console.log(problematic);

console.log('\nFIXED:');
console.log(fixMermaidSyntax(problematic));