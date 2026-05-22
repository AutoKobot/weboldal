import { IKKService } from '../server/ikk-service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Teszt szkript - csak 1 tantárgy (Hegesztés alapjai) 3 fázison keresztül
 * Használat: npx tsx ptt/test_new_ikk_logic.ts
 */

async function main() {
    console.log("=".repeat(80));
    console.log("IKK LOGIKA TESZT - Hegesztés alapjai (1 tantárgy, 3 fázis)");
    console.log("=".repeat(80));

    const pttText = fs.readFileSync(path.join(process.cwd(), 'ptt', 'hegeszto_text.txt'), 'utf-8');
    console.log(`\n📄 PTT betöltve: ${pttText.length} karakter\n`);

    const ikkService = new IKKService();
    const professionName = 'Hegesztő';

    // ── 1. LÉPÉS: Óraszámok kinyerése ──
    const subjects = [
        { id: 1, name: 'Munkavállalói ismeretek', code: '2.1', hours: 18 },
        { id: 2, name: 'Munkavállalói idegen nyelv', code: '2.2', hours: 62 },
        { id: 5, name: 'Hegesztés alapjai', code: '4.1', hours: 120 },
        { id: 8, name: 'Hegesztő gyakorlat', code: '4.4', hours: 200 },
    ];

    console.log("📋 1. LÉPÉS: extractSubjectHours");
    const subjectHours = await ikkService.extractSubjectHours(professionName, pttText, subjects, '3year');
    const target = subjectHours.find(s => s.name === 'Hegesztés alapjai')!;
    console.log(`  ✅ ${target.name}: theory=${target.theoryHours}h, practical=${target.practicalHours}h\n`);

    // ── 2. LÉPÉS: Modul bontás (CSAK elmélet, max 4 modul) ──
    console.log("📋 2. LÉPÉS: generateModulesForSubject (elmélet, korlátozva 4-re)");
    const pttChunk = ikkService.getSubjectPttText(target.name, pttText, target.code);

    // Limit to only 4 theory hours for testing
    const testTheoryHours = Math.min(4, target.theoryHours);
    const modules = await ikkService.generateModulesForSubject(
        professionName, target.name, target.code || '4.1',
        testTheoryHours, 0, // only theory, no practical
        pttChunk, 'theory'
    );
    console.log(`  ✅ ${modules.length} modul generálva:\n`);
    for (const m of modules) {
        console.log(`     📖 [${m.type}] ${m.title}`);
        console.log(`        sectionCode: ${m.sectionCode}\n`);
    }

    // ── 3. LÉPÉS: Tartalom generálás ──
    console.log("📋 3. LÉPÉS: buildContentPrompt");
    const rawModules = modules.map(m => ({ title: m.title, type: m.type as 'theory' | 'practical', sectionCode: m.sectionCode }));

    const { getOpenAIClient } = await import('../server/openai');
    const openai = await getOpenAIClient();
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: "Tananyagfejlesztő vagy." },
            { role: "user", content: ikkService.buildContentPrompt(professionName, target.name, rawModules) }
        ],
        temperature: 0.4
    }, { timeout: 60000 });

    const contentData = JSON.parse(response.choices[0].message.content || '{"modules":[]}');
    console.log(`  ✅ ${contentData.modules?.length || 0} modulhoz generált tartalom:\n`);
    for (const mod of (contentData.modules || [])) {
        console.log(`  ┌─ ${mod.title}`);
        if (mod.content) {
            const words = mod.content.split(' ').length;
            console.log(`  │ 📝 ${words} szó (${mod.content.substring(0, 150)}...)`);
        }
        console.log(`  └─\n`);
    }

    console.log("=".repeat(80));
    console.log("✅ TESZT SIKERES");
}

main().catch(e => console.error("❌ HIBA:", e));