const fs = require('fs');
let code = fs.readFileSync('server/routes.ts', 'utf-8');
code = code.replace(/(\w+Data)\.schoolAdminId = /g, '($1 as any).schoolAdminId = ');
code = code.replace(/moduleData\.schoolAdminId === /g, '(moduleData as any).schoolAdminId === ');
fs.writeFileSync('server/routes.ts', code);
console.log('Fixed types in server/routes.ts');
