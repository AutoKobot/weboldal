import fs from 'fs';
import path from 'path';

const studentPages = [
  'client/src/pages/tananyagok.tsx',
  'client/src/pages/subjects.tsx', 
  'client/src/pages/modules.tsx',
  'client/src/pages/module-viewer.tsx',
  'client/src/pages/learning.tsx',
  'client/src/pages/progress.tsx',
  'client/src/pages/settings.tsx',
  'client/src/pages/community-learning.tsx'
];

console.log('Updating student page backgrounds...');

studentPages.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace various background classes with the new warm background
    const oldBackgrounds = [
      'bg-neutral-50',
      'bg-gray-50', 
      'bg-white',
      'bg-background',
      'bg-optimized-gradient',
      'min-h-screen bg-neutral-50',
      'min-h-screen bg-gray-50',
      'min-h-screen bg-white'
    ];
    
    let updated = false;
    oldBackgrounds.forEach(oldBg => {
      if (content.includes(oldBg)) {
        if (oldBg.includes('min-h-screen')) {
          content = content.replace(oldBg, 'min-h-screen bg-student-warm');
        } else {
          content = content.replace(new RegExp(oldBg, 'g'), 'bg-student-warm');
        }
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Updated ${filePath}`);
    } else {
      console.log(`- No changes needed for ${filePath}`);
    }
  } else {
    console.log(`! File not found: ${filePath}`);
  }
});

console.log('Student page background update completed!');