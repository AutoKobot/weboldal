const fs = require('fs');

let content = fs.readFileSync('client/src/pages/admin-dashboard.tsx', 'utf8');

// 1. Add useAuth to the imports if it's missing
if (!content.includes('import { useAuth } from "@/hooks/useAuth"')) {
    content = content.replace(
        'import { useState, useEffect } from "react";',
        'import { useState, useEffect } from "react";\nimport { useAuth } from "@/hooks/useAuth";'
    );
}

// 2. Add `const { user } = useAuth();` inside AdminDashboard
content = content.replace(
    'export default function AdminDashboard() {',
    'export default function AdminDashboard() {\n  const { user } = useAuth();\n  const isAdmin = user?.role === "admin";'
);

// 3. Conditionally render the sensitive tabs
const sensitiveTabs = ['users', 'school_admins', 'costs', 'settings', 'prompts'];
for (const tab of sensitiveTabs) {
    content = content.replace(
        new RegExp(`<TabsTrigger value="${tab}"[^>]*>[\\s\\S]*?<\\/TabsTrigger>`),
        (match) => `{isAdmin && ( ${match} )}`
    );

    content = content.replace(
        new RegExp(`<TabsContent value="${tab}">[\\s\\S]*?<\\/TabsContent>`),
        (match) => `{isAdmin && ( ${match} )}`
    );
}

// 4. Change the title "Adminisztrációs Felület Pult" based on role
content = content.replace(
    '<h1 className="text-3xl font-bold text-neutral-800 flex items-center">',
    '<h1 className="text-3xl font-bold text-neutral-800 flex items-center">'
);
content = content.replace(
    '<Building className="mr-3 h-8 w-8 text-primary" />\n                  Adminisztrációs Pult',
    '<Building className="mr-3 h-8 w-8 text-primary" />\n                  {isAdmin ? "Adminisztrációs Pult" : "Tartalomkezelő"}'
);

fs.writeFileSync('client/src/pages/admin-dashboard.tsx.patched', content);
console.log('Admin Dashboard patching logic complete');
