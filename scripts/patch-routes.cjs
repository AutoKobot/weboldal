const fs = require('fs');

let content = fs.readFileSync('server/routes.ts', 'utf8');

function patchRoute(method, path, varName) {
    // Replace the role check and insert schoolAdminId assignment
    const escapePath = path.replace(/\//g, '\\/').replace(/\:/g, '\\:');

    const regexAdminCheck = new RegExp(`app\\.${method}\\('${escapePath}'[\\s\\S]*?if \\(!user \\|\\| user\\.role !== 'admin'\\)[\\s\\S]*?\\{`, 'g');

    content = content.replace(regexAdminCheck, (match) => {
        return match.replace(
            "user.role !== 'admin'",
            "!['admin', 'school_admin', 'teacher'].includes(user.role)"
        );
    });

    const regexDataDef = new RegExp(`  const ${varName}Data = [^;]+;`, 'g');
    let matched = false;
    content = content.replace(regexDataDef, (match) => {
        if (matched) return match; // Only first match per route if multiple
        let newStr = match + `\n      if (user.role !== 'admin') {
        ${varName}Data.schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }`;
        return newStr;
    });
}

patchRoute('post', '/api/professions', 'profession');
patchRoute('patch', '/api/professions/:id', 'profession');
patchRoute('put', '/api/professions/:id', 'profession');

patchRoute('post', '/api/subjects', 'subject');
patchRoute('patch', '/api/subjects/:id', 'subject');
patchRoute('put', '/api/subjects/:id', 'subject');

patchRoute('post', '/api/modules', 'module');
patchRoute('patch', '/api/modules/:id', 'module');
patchRoute('put', '/api/modules/:id', 'module');

const deleteRegex = new RegExp(`app\\.delete\\('/api/(professions|subjects|modules)/:id'[\\s\\S]*?if \\(!user \\|\\| user\\.role !== 'admin'\\)[\\s\\S]*?\\{`, 'g');
content = content.replace(deleteRegex, (match) => {
    return match.replace(
        "user.role !== 'admin'",
        "!['admin', 'school_admin', 'teacher'].includes(user.role)"
    );
});

fs.writeFileSync('server/routes.ts.patched', content);
console.log('Done patching!');
