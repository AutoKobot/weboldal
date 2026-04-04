import { storage } from "./storage";

async function verify() {
  try {
    const modules = await storage.getModules();
    console.log(`Found ${modules.length} modules.`);
    
    for (const mod of modules) {
      if (mod.presentationData) {
        console.log(`\n--- Module: ${mod.title} (ID: ${mod.id}) ---`);
        const slides = mod.presentationData as any[];
        slides.forEach((slide, idx) => {
          console.log(`Slide ${idx + 1}: ${slide.narrationAudioUrl || 'NO AUDIO URL'}`);
        });
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

verify();
