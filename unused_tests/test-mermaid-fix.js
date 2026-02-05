// Test the improved Mermaid syntax fixer
function fixMermaidSyntax(content) {
  // Find all Mermaid code blocks
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  
  return content.replace(mermaidRegex, (match, mermaidCode) => {
    let fixedCode = mermaidCode.trim();
    
    // Fix 1: Remove duplicate flowchart/graph declarations
    fixedCode = fixedCode.replace(/(flowchart\s+\w+)\s*flowchart\s+\w+/gi, '$1');
    fixedCode = fixedCode.replace(/(graph\s+\w+)\s*graph\s+\w+/gi, '$1');
    fixedCode = fixedCode.replace(/flowchart\s+flowchart/gi, 'flowchart');
    fixedCode = fixedCode.replace(/graph\s+graph/gi, 'graph');
    
    // Fix 2: Remove invalid characters like quotation marks around node IDs
    fixedCode = fixedCode.replace(/["'`]/g, '');
    
    // Fix 3: Ensure proper flowchart syntax
    if (fixedCode.includes('flowchart') || fixedCode.includes('graph')) {
      // Fix flowchart direction - ensure it has proper direction
      fixedCode = fixedCode.replace(/^(\s*)flowchart\s*$/gm, '$1flowchart TD');
      fixedCode = fixedCode.replace(/^(\s*)graph\s*$/gm, '$1graph TD');
      fixedCode = fixedCode.replace(/^(\s*)flowchart\s+([A-Z]+)\s*flowchart/gm, '$1flowchart $2');
      
      // Skip problematic regex for now
      
      // Fix arrows - standardize arrow syntax
      fixedCode = fixedCode.replace(/-->/g, ' --> ');
      fixedCode = fixedCode.replace(/\s+-->\s+/g, ' --> ');
      
      // Fix node labels with brackets
      fixedCode = fixedCode.replace(/\[([^\]]+)\]/g, '[$1]');
    }
    
    // Fix 4: Remove empty lines and clean up structure
    const lines = fixedCode.split('\n');
    let cleanedLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Fix 5: Ensure proper diagram type declaration is first
    let hasProperStart = false;
    const diagramTypes = ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gitgraph'];
    
    for (let i = 0; i < cleanedLines.length; i++) {
      const line = cleanedLines[i];
      if (diagramTypes.some(type => line.startsWith(type))) {
        if (i > 0) {
          // Move diagram declaration to the beginning
          cleanedLines = [line, ...cleanedLines.slice(0, i), ...cleanedLines.slice(i + 1)];
        }
        hasProperStart = true;
        break;
      }
    }
    
    if (!hasProperStart) {
      cleanedLines.unshift('flowchart TD');
    }
    
    // Fix 6: Proper indentation for non-declaration lines
    cleanedLines = cleanedLines.map((line, index) => {
      if (index === 0) return line; // Keep first line (diagram type) as is
      if (line.match(/^\s*(flowchart|graph|sequenceDiagram)/)) return line;
      return line.startsWith('    ') ? line : '    ' + line;
    });
    
    fixedCode = cleanedLines.join('\n');
    
    return '```mermaid\n' + fixedCode + '\n```';
  });
}

// Test problematic input similar to what was causing errors
const problematicInput = `
```mermaid
flowchart TDflowchart TDA[Vasér] --> B[Ötvözet]
    B --> C[Hegesztés]
    C --> D[Eredmény]
```
`;

console.log('Original problematic input:');
console.log(problematicInput);

console.log('\nFixed output:');
console.log(fixMermaidSyntax(problematicInput));

// Test another case
const anotherTest = `
```mermaid
flowchart TD
flowchart TD
A[Start] --> B[Process]
B --> C[End]
```
`;

console.log('\nAnother test input:');
console.log(anotherTest);

console.log('\nFixed output:');
console.log(fixMermaidSyntax(anotherTest));