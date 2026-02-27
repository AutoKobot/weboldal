const fs = require('fs');

let content = fs.readFileSync('server/routes.ts', 'utf8');

// We want to patch the roles in professions, subjects, modules routes
// to allow 'admin', 'school_admin', 'teacher'
function patchRoute(method, path, varName, isGet) {
    // Regex to find things like: app.post('/api/professions', ... {
    //   try { ...
    //     if (!user || user.role !== 'admin') { return res.status(403).json({ message: "Access denied" }); }
    const regex = new RegExp(`app\\.${method}\\('${path}'[\\s\\S]*?if \\(!user \\|\\| user\\.role !== 'admin'\\)[\\s\\S]*?\\}[\\s]*const ${varName}Data = [^\\n]*;`, 'g');

    content = content.replace(regex, (match) => {
        // Modify the role check
        let newMatch = match.replace(
            "user.role !== 'admin'",
            "!['admin', 'school_admin', 'teacher'].includes(user.role)"
        );
        newMatch = newMatch.replace(
            '"Only administrators can',
            '"Csak adminisztrátorok vagy tanárok'
        );

        // Add schoolAdminId assignment before creation/updating
        const appendStr = `\n      if (user.role !== 'admin') {
        ${varName}Data.schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }`;

        return newMatch + appendStr;
    });
}

patchRoute('post', '/api/professions', 'profession', false);
patchRoute('put', '/api/professions/:id', 'profession', false);
patchRoute('patch', '/api/professions/:id', 'profession', false);

patchRoute('post', '/api/subjects', 'subject', false);
patchRoute('put', '/api/subjects/:id', 'subject', false);
patchRoute('patch', '/api/subjects/:id', 'subject', false);

patchRoute('post', '/api/modules', 'module', false);
patchRoute('put', '/api/modules/:id', 'module', false);
patchRoute('patch', '/api/modules/:id', 'module', false);

// Also need to patch DELETE routes to allow teacher to delete
const deleteRegex = new RegExp(`app\\.delete\\('/api/(professions|subjects|modules)/:id'[\\s\\S]*?if \\(!user \\|\\| user\\.role !== 'admin'\\)[\\s\\S]*?\\}`, 'g');
content = content.replace(deleteRegex, (match) => {
    let newMatch = match.replace(
        "user.role !== 'admin'",
        "!['admin', 'school_admin', 'teacher'].includes(user.role)"
    );
    return newMatch;
});

fs.writeFileSync('server/routes.ts.patched', content);
console.log('Done!');
