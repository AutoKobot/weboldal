const fs = require('fs');

let content = fs.readFileSync('server/routes.ts', 'utf8');

// 1. Remove duplicates of schoolAdminId settings that was a mistake before
const dupRegex = /if \(user\.role !== 'admin'\) \{\s*[a-zA-Z]+Data\.schoolAdminId = user\.role === 'school_admin' \? user\.id : user\.schoolAdminId;\s*\}/g;

content = content.replace(dupRegex, (match) => {
    return '';
});

// Re-add one copy back into each POST/PUT/PATCH!
// It's easier: I already removed ALL of them. Let's just cleanly insert one copy.
const regexDataDef = /(const (profession|subject|module)Data = [^;]+;)/g;

content = content.replace(regexDataDef, (match, def, varName) => {
    return match + `\n      if (user.role !== 'admin') {
        ${varName}Data.schoolAdminId = user.role === 'school_admin' ? user.id : user.schoolAdminId;
      }`;
});

// 2. Patch GET /api/public/professions
const profGetRegex = /(app\.get\('\/api\/public\/professions', [\s\S]*?try \{)(\s*)(const professions = await storage\.getProfessions\(\);)/;
content = content.replace(profGetRegex, (match, prefix, spaces, oldCall) => {
    return prefix + spaces +
        `const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
      const professions = await storage.getProfessions(schoolAdminId);`;
});

// 3. Patch GET /api/public/subjects
const subjGetRegex = /(app\.get\('\/api\/public\/subjects', [\s\S]*?try \{[\s\S]*?const professionId = [^;]+;)(\s*)(const subjects = await storage\.getSubjects\(professionId\);)/;
content = content.replace(subjGetRegex, (match, prefix, spaces, oldCall) => {
    return prefix + spaces +
        `const userId = req.user?.claims?.sub || req.user?.id;
      const user = await storage.getUser(userId);
      const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
      const subjects = await storage.getSubjects(professionId, schoolAdminId);`;
});

// 4. Patch GET /api/public/modules (already has user fetched!)
// Line ~2122
/*
      // For teachers and admins, show all modules; for students, only published ones
      if (user.role === 'teacher' || user.role === 'admin') {
        // If subjectId is provided, use it directly
        if (subjectId) {
          const modules = await storage.getModules(subjectId);
*/
// We need to replace `storage.getModules(subjectId)` with `storage.getModules(subjectId, schoolAdminId)`
const modGetPattern1 = /(const schoolAdminId = user\?\.role === 'admin' \? undefined : \(user\?\.role === 'school_admin' \? user\.id : user\?\.schoolAdminId\);\s*)?(const modules = await storage\.getModules\(subjectId\);)/g;
content = content.replace(modGetPattern1, `const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
          const modules = await storage.getModules(subjectId, schoolAdminId);`);

const modGetPattern2 = /(const schoolAdminId = user\?\.role === 'admin' \? undefined : \(user\?\.role === 'school_admin' \? user\.id : user\?\.schoolAdminId\);\s*)?(const modules = await storage\.getModules\(subject\.id\);)/g;
content = content.replace(modGetPattern2, `const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
          const modules = await storage.getModules(subject.id, schoolAdminId);`);

const modGetPattern3 = /(const schoolAdminId = user\?\.role === 'admin' \? undefined : \(user\?\.role === 'school_admin' \? user\.id : user\?\.schoolAdminId\);\s*)?(const modules = await storage\.getPublishedModules\(subjectId\);)/g;
content = content.replace(modGetPattern3, `const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
          const modules = await storage.getPublishedModules(subjectId, schoolAdminId);`);

const modGetPattern4 = /(const schoolAdminId = user\?\.role === 'admin' \? undefined : \(user\?\.role === 'school_admin' \? user\.id : user\?\.schoolAdminId\);\s*)?(const modules = await storage\.getPublishedModules\(subject\.id\);)/g;
content = content.replace(modGetPattern4, `const schoolAdminId = user?.role === 'admin' ? undefined : (user?.role === 'school_admin' ? user.id : user?.schoolAdminId);
            const modules = await storage.getPublishedModules(subject.id, schoolAdminId);`);

fs.writeFileSync('server/routes.ts.patched.get', content);
console.log('GET patch done');
