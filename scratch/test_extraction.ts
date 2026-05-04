
import { ikkService } from "../server/ikk-service";
import { getOpenAIClient } from "../server/openai";
import { readFileSync } from "fs";
import { join } from "path";

async function testExtraction() {
  console.log("🔍 Teszt extrakció indítása (Villamos alapismeretek)...");

  // Egy reprezentatív részlet a hegesztő PDF-ből (Villamos alapismeretek fejezet)
  const sampleText = `
3.3.1 Villamos alapismeretek tantárgy 288/288 óra 
  
3.3.1.1 A tantárgy tanításának fő célja 
... 
3.3.1.4 A képzés órakeretének legalább 50%-át gyakorlati helyszínen (tanműhely, üzem stb.) kell lebonyolítani. 

3.3.1.6 A tantárgy témakörei 
3.3.1.6.1 Villamos áramkör 
Mérések, hálózati alapok...
3.3.1.6.2 Villamos áramkör ábrázolása 
Rajzjelek, szabványok...
`;

  const prompt = ikkService.buildExtractionPrompt(sampleText, 'both');
  
  console.log("--- GENERÁLT PROMPT (Részlet) ---");
  console.log(prompt.substring(0, 500) + "...");
  console.log("--------------------------------");

  try {
    const openai = await getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Te egy precíz PTT elemző vagy." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("--- AI VÁLASZ (JSON) ---");
    console.log(JSON.stringify(result, null, 2));
    
    if (result.subjects && result.subjects[0]) {
        const sub = result.subjects[0];
        console.log(`\n✅ Felismert tantárgy: ${sub.name}`);
        console.log(`✅ Felismert óraszám: ${sub.hours}`);
        console.log(`✅ Felismert gyakorlati arány: ${sub.practicalPercent}%`);
        
        if (sub.hours === 288 && sub.practicalPercent === 50) {
            console.log("\n✨ SIKER: Az AI pontosan kinyerte az adatokat a szövegből!");
        } else {
            console.log("\n⚠️ FIGYELEM: Az adatok eltérnek a várttól (Várt: 288 óra, 50%).");
        }
    }

  } catch (error: any) {
    console.error("❌ Hiba a teszt során:", error.message);
  }
}

testExtraction();
