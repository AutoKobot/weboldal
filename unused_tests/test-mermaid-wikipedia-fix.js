// Test the Mermaid Wikipedia link fix
function fixMermaidSyntax(content) {
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  
  return content.replace(mermaidRegex, (match, mermaidCode) => {
    let fixedCode = mermaidCode.trim();
    
    // Step 0: Remove Wikipedia links that break Mermaid syntax
    fixedCode = fixedCode.replace(/\[([^\]]+)\]\(https:\/\/hu\.wikipedia\.org\/wiki\/[^)]+\)/g, '$1');
    
    return '```mermaid\n' + fixedCode + '\n```';
  });
}

const testContent = `
Ez egy teszt tartalom Mermaid diagrammal:

\`\`\`mermaid
flowchart TD
    A[[vas](https://hu.wikipedia.org/wiki/vas)] --> B[Hőkezelés]
    B --> C[[acél](https://hu.wikipedia.org/wiki/acél)]
    C --> D[Végső termék]
\`\`\`

További tartalom.
`;

console.log('Original content:');
console.log(testContent);
console.log('\n--- FIXED CONTENT ---\n');
console.log(fixMermaidSyntax(testContent));