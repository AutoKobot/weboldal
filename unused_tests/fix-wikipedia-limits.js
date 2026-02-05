import fs from 'fs';

console.log('Fixing Wikipedia keyword limits...');

const filePath = 'server/enhanced-module-generator.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Count current .slice(0, 10) occurrences
const sliceMatches = content.match(/\.slice\(0, 10\)/g);
console.log(`Found ${sliceMatches ? sliceMatches.length : 0} .slice(0, 10) limitations`);

// Replace all .slice(0, 10) with .slice(0, 30) to allow more Wikipedia keywords
content = content.replace(/\.slice\(0, 10\)/g, '.slice(0, 30)');

// Also update the prompt text to request more keywords
content = content.replace(/8-12 magyar kulcsszót/g, '15-25 magyar kulcsszót');
content = content.replace(/12-15 magyar kulcsszót/g, '15-25 magyar kulcsszót');
content = content.replace(/8-12 releváns kulcsszó/g, '15-25 releváns kulcsszó');
content = content.replace(/12-15 releváns kulcsszó/g, '15-25 releváns kulcsszó');

fs.writeFileSync(filePath, content);

console.log('✅ Wikipedia keyword limits increased from 10 to 30');
console.log('✅ Prompt updated to request 15-25 keywords instead of 8-15');
console.log('Wikipedia links will now be generated for all relevant terms in the content');