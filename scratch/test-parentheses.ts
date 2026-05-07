import { fixMermaidSyntax } from '../server/openai';

const testText = `\`\`\`mermaid
flowchart TD;
    A[Feszültség (V)] -->|Növekszik| B[Áram (I)]
\`\`\``;

console.log("Original text:\n", testText);
console.log("\nFixed text:\n", fixMermaidSyntax(testText));
