import { fixMermaidSyntax } from '../server/openai';

const testDiagram = `\`\`\`mermaid
graph TD;
    A[Technológiai dokumentációk] --> B[Hegesztési eljárás leírása (WPS)]
    A --> C[Hegesztési eljárás ellenőrzése (PQR)]
    A --> D[Minőségellenőrzési terv (QCP)]
    A --> E[Műszaki specifikációk]
    A --> F[Hegesztési napló]
    B --> G[Anyagok]
    B --> H[Gépek és berendezések]
    B --> I[Hegesztési paraméterek]
    B --> J[Biztonsági előírások]
    B --> K[Minőségellenőrzés]
\`\`\``;

console.log("Original diagram:");
console.log(testDiagram);
console.log("\n====================================\n");
console.log("Fixed diagram:");
console.log(fixMermaidSyntax(testDiagram));
