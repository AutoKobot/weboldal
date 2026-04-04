import 'dotenv/config';
import { db } from './db.js';
import { modules } from '../shared/schema.js';
import { desc, isNotNull } from 'drizzle-orm';

async function checkModules() {
  console.log('📌 Ellenőrzöm a legutóbbi prezentáció adatokat az adatbázisban...\n');
  
  const latestModules = await db.select({
    id: modules.id,
    title: modules.title,
    presentationData: modules.presentationData
  })
  .from(modules)
  .where(isNotNull(modules.presentationData))
  .orderBy(desc(modules.id))
  .limit(3);

  if (latestModules.length === 0) {
    console.log('❌ Egyetlen modulnak sincs presentationData adata mentve az adatbázisban!');
    return;
  }

  latestModules.forEach(mod => {
    console.log(`\n===========================================`);
    console.log(`Modul ID: ${mod.id} | Cím: ${mod.title}`);
    
    const slides = mod.presentationData as any[];
    if (!slides || !Array.isArray(slides)) {
      console.log('Hibás presentationData formátum.');
      return;
    }
    
    console.log(`Diák száma: ${slides.length}`);
    
    let hasAudio = 0;
    let hasNarrationText = 0;
    
    slides.forEach((slide, idx) => {
      if (slide.narration) hasNarrationText++;
      if (slide.narrationAudioUrl) hasAudio++;
      
      if (idx < 2) {
        console.log(`\n  Dia #${slide.id} (${slide.type}):`);
        console.log(`  - Narration text: ${slide.narration ? 'VAN' : 'NINCS'}`);
        console.log(`  - Audio URL: ${slide.narrationAudioUrl || 'NINCS'}`);
      }
    });
    
    console.log(`\nÖsszesítés: ${hasNarrationText}/${slides.length} diának van narrációs szövege, ${hasAudio}/${slides.length} diának van hang URL-je.`);
  });
  
  process.exit(0);
}

checkModules().catch(console.error);
