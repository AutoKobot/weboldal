// Test the final Mermaid Wikipedia link fix
const testContent = `
Ez egy teszt Mermaid diagram:

\`\`\`mermaid
flowchart TD
    A[[vas](https://hu.wikipedia.org/wiki/vas)] --> B[Hőkezelés]
    B --> C[[acél](https://hu.wikipedia.org/wiki/acél)]
    C --> D[Végső termék]
\`\`\`

További tartalom.
`;

// Simulate the fix function from server/openai.ts
function fixMermaidSyntax(content) {
  const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
  
  return content.replace(mermaidRegex, (match, mermaidCode) => {
    let fixedCode = mermaidCode.trim();
    
    // Step 0: Remove Wikipedia links that break Mermaid syntax
    fixedCode = fixedCode.replace(/\[([^\]]+)\]\(https:\/\/hu\.wikipedia\.org\/wiki\/[^)]+\)/g, '$1');
    
    // Additional cleanup steps would be here...
    
    return '```mermaid\n' + fixedCode + '\n```';
  });
}

console.log('Original content with Wikipedia links in Mermaid:');
console.log(testContent);
console.log('\n--- FIXED CONTENT (Wikipedia links removed) ---\n');
console.log(fixMermaidSyntax(testContent));

// Test that normal Wikipedia links outside Mermaid are preserved
const mixedContent = `
Normal paragraph with [acél](https://hu.wikipedia.org/wiki/acél) link.

\`\`\`mermaid
flowchart TD
    A[[vas](https://hu.wikipedia.org/wiki/vas)] --> B[Process]
\`\`\`

Another paragraph with [hegesztés](https://hu.wikipedia.org/wiki/hegesztés) link.
`;

console.log('\n--- MIXED CONTENT TEST ---\n');
console.log('Mixed content (preserves normal links, fixes Mermaid):');
console.log(fixMermaidSyntax(mixedContent));