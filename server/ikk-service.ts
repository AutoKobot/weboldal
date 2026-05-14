import axios from 'axios';
import * as cheerio from 'cheerio';
import pdf from 'pdf-parse';

interface IKKAttachment {
  name: string;
  media: string;
  media_id: number;
  version: number;
  publishDate: string;
}

interface IKKProfession {
  id: number;
  name: string;
  okjId: string;
  sector: { name: string };
  attachments: IKKAttachment[];
}

export interface RawModule {
  title: string;
  type: 'theory' | 'practical';
  sectionCode: string;
}

export interface RawSubject {
  name: string;
  code: string;
  description: string;
  practicalPercent: number;
  hours?: number;
  modules: RawModule[];
}

export class IKKService {
  private static readonly BASE_URL = 'https://akkreditaltvizsgaztatas.ikk.hu/kkk-ptt';
  private static readonly API_MEDIA_URL = 'https://api.ikk.hu/v1/media/documents';

  async getProfessions(): Promise<IKKProfession[]> {
    try {
      const response = await axios.get(IKKService.BASE_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const $ = cheerio.load(response.data);
      const nextDataJson = $('#__NEXT_DATA__').html();
      if (!nextDataJson) throw new Error('Nem található __NEXT_DATA__ az IKK oldalon.');
      const nextData = JSON.parse(nextDataJson);
      return nextData.props.pageProps.kkk_ptts || [];
    } catch (error) {
      console.error('Hiba az IKK szakmák lekérésekor:', error);
      throw error;
    }
  }

  async getPdfText(mediaId: number): Promise<string> {
    try {
      const response = await axios.get(`${IKKService.API_MEDIA_URL}/${mediaId}`, {
        responseType: 'arraybuffer',
        timeout: 45000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/pdf,application/octet-stream',
          'Referer': 'https://akkreditaltvizsgaztatas.ikk.hu/'
        }
      });
      const buffer = Buffer.from(response.data);
      const data = await pdf(buffer);
      return data.text;
    } catch (error: any) {
      console.error(`Hiba a PDF feldolgozásakor (ID: ${mediaId}):`, error.message);
      throw error;
    }
  }

  async getProfessionContent(profession: IKKProfession) {
    const kkkAttachment = profession.attachments
      .filter(a => a.name.toUpperCase().includes('KKK'))
      .sort((a, b) => b.version - a.version)[0];
    const pttAttachment = profession.attachments
      .filter(a => a.name.toUpperCase().includes('PTT'))
      .sort((a, b) => b.version - a.version)[0];

    let kkkTextRaw = '';
    if (kkkAttachment?.media_id) {
      try { kkkTextRaw = await this.getPdfText(kkkAttachment.media_id); } catch (e) {}
    }

    let pttTextRaw = '';
    if (pttAttachment?.media_id) {
      try { pttTextRaw = await this.getPdfText(pttAttachment.media_id); } catch (e) {}
    }

    return { 
      kkkText: this.preprocessText(kkkTextRaw || ''), 
      pttText: this.preprocessText(pttTextRaw || '') 
    };
  }

  /**
   * AI-alapú óraszám-generálás: a PTT szövegét + a tantárgy/modul struktúrát elküldi az AI-nak,
   * amely összehasonlítja a PTT-ben szereplő óraszámokat és visszaadja tantárgyanként
   * az elméleti és gyakorlati órákat. A rendszer ezeket egyenlően osztja szét a modulok között.
   *
   * @param professionName Szakma neve
   * @param pttText        A PTT dokumentum teljes szövege
   * @param subjects       Tantárgyak listája moduljaikkal (id, name, modules[])
   * @returns              Modul-szintű óra elosztás: { moduleId, hours }[]
   */
  async generateHoursFromPtt(
    professionName: string,
    pttText: string,
    subjects: {
      id: number;
      name: string;
      hours?: number | null;
      modules: { id: number; title: string; type: string }[];
    }[]
  ): Promise<{ moduleId: number; hours: number }[]> {
    if (subjects.length === 0) return [];

    const { getOpenAIClient } = await import('./openai');
    const openai = await getOpenAIClient();

    // Build a compact subject/module list for the prompt
    const subjectList = subjects
      .map(s => {
        const mods = s.modules
          .map(m => `    - [${m.type.toUpperCase()}] ${m.title}`)
          .join('\n');
        return `Tantárgy: "${s.name}" (DB óra: ${s.hours ?? 'ismeretlen'})\n${mods}`;
      })
      .join('\n\n');

    // We truncate pttText to avoid exceeding context limits (keep first 12k chars)
    const pttExcerpt = pttText.length > 12000 ? pttText.substring(0, 12000) + '\n...[csonkítva]' : pttText;

    const prompt = `
Te egy PTT (Programtanterv) dokumentum-elemző szakértő és SZAKOKTATÓ vagy.
Szakma: ${professionName}

FELADAT:
A PTT szövegéből keresd meg az egyes tantárgyakhoz rendelt TELJES óraszámot, és oszd fel azokat ELMÉLETI és GYAKORLATI órákra.
Majd add vissza tantárgyanként:
- theoryHours: az elméleti órák száma
- practicalHours: a gyakorlati órák száma

SZABÁLYOK:
1. Ha egy tantárgy óraszáma nem szerepel a PTT-ben, használd az adatbázisban tárolt értéket ("DB óra" mező).
2. Ha sem a PTT-ben, sem az adatbázisban nincs adat, becsüld meg a modulok száma alapján (1 modul ≈ 2 óra).
3. Az elméleti és gyakorlati arány meghatározásához keresd a tantárgy melletti "%-os" arány vagy "elmélet/gyakorlat" bontást a PTT-ben.
4. Ha nincs bontás, az összes THEORY típusú modul → elmélet, PRACTICAL típusú → gyakorlat.
5. Válaszolj KIZÁRÓLAG valid JSON-nel.

TANTÁRGYAK ÉS MODULJAIK:
${subjectList}

PTT SZÖVEG (részlet):
${pttExcerpt}

VÁLASZ FORMÁTUMA:
{
  "subjects": [
    {
      "name": "Tantárgy neve",
      "theoryHours": 36,
      "practicalHours": 36
    }
  ]
}
`.trim();

    let aiSubjectHours: { name: string; theoryHours: number; practicalHours: number }[] = [];

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'PTT elemző szakértő vagy. Csak valid JSON-t adsz vissza.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      });
      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      aiSubjectHours = parsed.subjects || [];
    } catch (err) {
      console.error('[generateHoursFromPtt] AI hiba:', err);
      // Fallback: use subject.hours evenly split
    }

    // Now distribute evenly among modules
    const result: { moduleId: number; hours: number }[] = [];

    for (const subject of subjects) {
      const aiEntry = aiSubjectHours.find(
        s => s.name?.toLowerCase().trim() === subject.name?.toLowerCase().trim()
      );

      const theoryModules = subject.modules.filter(m => m.type === 'theory');
      const practicalModules = subject.modules.filter(m => m.type === 'practical');

      let theoryHours: number;
      let practicalHours: number;

      if (aiEntry) {
        theoryHours = aiEntry.theoryHours || 0;
        practicalHours = aiEntry.practicalHours || 0;
      } else {
        // Fallback: use stored hours, split 50/50 or by module count ratio
        const total = subject.hours || (subject.modules.length * 2);
        const ratio = theoryModules.length / (subject.modules.length || 1);
        theoryHours = Math.round(total * ratio);
        practicalHours = total - theoryHours;
      }

      // Evenly distribute theory hours among theory modules
      if (theoryModules.length > 0 && theoryHours > 0) {
        const perTheory = Math.round((theoryHours / theoryModules.length) * 2) / 2; // round to 0.5
        for (const m of theoryModules) {
          result.push({ moduleId: m.id, hours: perTheory });
        }
      }

      // Evenly distribute practical hours among practical modules
      if (practicalModules.length > 0 && practicalHours > 0) {
        const perPractical = Math.round((practicalHours / practicalModules.length) * 2) / 2;
        for (const m of practicalModules) {
          result.push({ moduleId: m.id, hours: perPractical });
        }
      }
    }

    return result;
  }

  private preprocessText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\d+\s*\/\s*\d+\.\s*oldal/gi, '')
      .replace(/\d+\s*\/\s*\d+\s*oldal/gi, '')
      .replace(/P\s*R\s*O\s*G\s*R\s*A\s*M\s*T\s*A\s*N\s*T\s*E\s*R\s*V/g, '')
      .replace(/([a-záéíóöőuúüű])-\n\s*([a-záéíóöőuúüű])/gi, '$1$2')
      .replace(/\n\s*\n\s*\n/g, '\n\n');
  }

  splitPttIntoSections(text: string): string[] {
    if (!text) return [];
    
    // First try splitting by subjects
    const rawSections = text.split(/(?=\n\s*\d+\.\d+(\.\d+)?\s+[^\n]+tantárgy)/i);
    
    const CHUNK_SIZE = 10000;
    const OVERLAP = 2000;
    const finalChunks: string[] = [];

    for (const section of rawSections) {
      if (section.length <= CHUNK_SIZE) {
        if (section.length > 100) finalChunks.push(section.trim());
      } else {
        // If a single subject section is too long, chunk it with overlap
        for (let i = 0; i < section.length; i += CHUNK_SIZE - OVERLAP) {
          const chunk = section.substring(i, i + CHUNK_SIZE);
          if (chunk.length > 100) finalChunks.push(chunk.trim());
          if (i + CHUNK_SIZE >= section.length) break;
        }
      }
    }

    return finalChunks;
  }

  buildExtractionPrompt(chunk: string, importType: 'theory' | 'practical' | 'both' = 'both'): string {
    const typeFocus = importType === 'theory' ? 'CSAK AZ ELMÉLETI' : importType === 'practical' ? 'CSAK A GYAKORLATI' : 'AZ ÖSSZES';
    
    return `
Te egy PTT (Programtanterv) dokumentum-elemző szakértő és SZAKOKTATÓ vagy. A feladatod a szakmai tartalom kinyerése és SZAKMAI BŐVÍTÉSE/FELBONTÁSA.
Most kifejezetten ${typeFocus} tananyagrészekre kell fókuszálnod.

── TANTÁRGY ÉS MODUL STRUKTÚRA ──
1. TANTÁRGY: Minden "X.X.X [Név] tantárgy [óra] óra" formátumú egységet rögzíts.
2. MODULOK ÉS GRANULÁRIS FELBONTÁS (KRITIKUS): 
   - Keress meg minden szakmai egységet (fejezetet).
   - **KÖTELEZŐ FELBONTÁS**: Ha egy fejezet (pl. 3.3.2.6.1) több, jól elkülöníthető témát, felsorolást vagy alpontot tartalmaz, akkor azt KÖTELEZŐ több kisebb, logikus modulra bontani!
     * Példa: Ha egy felsorolásban szerepelnek fémes anyagok, nem-fémes anyagok és segédanyagok, akkor ezeket NE egy modulba tedd, hanem bontsd 3 külön modulra!
     * Példa (Gyakorlatnál): Hegesztésnél bontsd szét pozíciók (PA, PB, PC, PF, stb.) és varrattípusok szerint.
   - Minden ilyen almodult (a, b, c...) vegyél fel külön elemként. 
   - A "sectionCode" végére MINDIG fűzz egy kisbetűt, ha felbontást végzel: 3.3.2.6.1.a, 3.3.2.6.1.b, stb.
   - **CÉL**: Egy modul ne legyen hosszabb 200-300 szónál a kifejtés után. Ha a forrásanyag túl sűrű, bontsd tovább!

── GYAKORLATI MODULOK LÉPCSŐZETES FELÉPÍTÉSE (RENDKÍVÜL FONTOS) ──
Gyakorlati tantárgyak és modulok kinyerésekor KÖTELEZŐ egy logikusan, szakmailag szigorúan egymásra épülő, lépcsőzetes elsajátítási szemléletet (progressive learning curve) követni:
1. Biztosíts szakmai egymásra épülést: a legelső modulok mindig az alapokat adják meg (pl. munkavédelmi és technológiai előkészítés, szerszámok és anyagok kiválasztása), amit a részletes, középhaladó végrehajtási folyamatok (főműveletek), majd a komplex feladatok, és végül az ellenőrzési, befejezési fázisok követnek.
2. A PTT szövegében szereplő gyakorlati követelményeket és leírásokat úgy csoportosítsd és bontsd modulokra, hogy azok egy koherens, egymást követő cselekvési láncolatot alkossanak.
3. Kerüld az ad-hoc, elszórt vagy ismétlődő gyakorlati témákat. Csak a szakma szempontjából releváns, valós ipari gyakorlatot tükröző lépések szerepeljenek a modulok sorrendjében.

── EXTRAKCIÓS SZABÁLYOK ──
- SZŰRÉS: ${typeFocus} modulokat keresünk.
- ELMÉLET DEFINÍCIÓ: Ismeretek, szabályok, elméleti összefüggések, anyagismeret, fogalmak.
- GYAKORLAT DEFINÍCIÓ: Cselekvések, készségek, konkrét szakmai műveletek végrehajtása.
- CÍM (FONTOS): A modul címe legyen pontos és szakmai (pl. "Szerkezeti anyagok szilárdsági jellemzői" vagy "Ipari gázok kezelése és tárolása").

VÁLASZ FORMÁTUMA (SZIGORÚ JSON):
{
  "subjects": [
    {
      "name": "Tantárgy neve",
      "code": "3.X.X",
      "hours": 72,
      "practicalPercent": 50,
      "modules": [
        { "title": "Szakmai cím 1", "type": "theory", "sectionCode": "3.X.X.6.1.a" },
        { "title": "Szakmai cím 2", "type": "theory", "sectionCode": "3.X.X.6.1.b" },
        { "title": "Szakmai cím 3", "type": "practical", "sectionCode": "3.X.X.6.1.c" }
      ]
    }
  ]
}

── FONTOS INSTRUKCIÓK ──
1. HOURS: Keresd meg a tantárgy neve melletti óraszámot.
2. PRACTICALPERCENT: Keresd meg a tantárgyra vonatkozó gyakorlati arányt.
3. MODULES: Légy nagyon részletes! Inkább legyen több kis modul, mint egy óriási. A mobil kijelzőkön a kisebb egységek jobban olvashatóak.

ELEMEZENDŐ SZÖVEG:
${chunk}
`.trim();
  }

  buildContentPrompt(professionName: string, subjectName: string, modules: RawModule[]): string {
    const moduleList = modules.map((m, i) => `${i + 1}. [${(m.type || 'theory').toUpperCase()}] ${m.title}`).join('\n');
    return `
Te egy profi szakoktató és tananyagfejlesztő vagy. Generálj szakmai tananyagot TANULÓK számára.

Szakma: ${professionName}
Tantárgy: ${subjectName}

── FELADAT ──
Minden modulhoz írj egy alapos, de lényegre törő szakmai kifejtést az alábbi SZIGORÚ szabályok szerint:

1. HA A MODUL [THEORY] (Elmélet):
   - A "content" mezőbe írj 8-10 mondatos, részletes szakmai magyarázatot.
   - Összpontosíts a fogalmakra, összefüggésekre, technikai adatokra és szabályokra.
   - Használj szakmailag pontos terminológiát.
   - A "practicalTasks" mező KÖTELEZŐEN ÜRES lista maradjon: [].

2. HA A MODUL [PRACTICAL] (Gyakorlat):
   - A "content" mezőbe írj egy rövid (max 3 mondat) szakmai bevezetőt a feladat konkrét céljáról és az elsajátítandó szakmai fogásokról.
   - A "practicalTasks" mezőbe generálj pontosan 6-8 konkrét, szakmailag szigorúan egymásra épülő, lépcsőzetesen felépülő gyakorlati feladatot (instrukciót), amelyek egy valós ipari munkafolyamatot (workflow) követnek:
     * 1. Lépés: Előkészítés és munkavédelem (egyéni védőeszközök kiválasztása, munkaterület, szerszámok és anyagok ellenőrzése).
     * 2. Lépés: Mérési, előrajzolási, kalibrálási vagy gépbeállítási paraméterek meghatározása (pl. anyagelőkészítés).
     * 3-5. Lépés: Technológiai főműveletek végrehajtása (cselekvés-orientált, szakmailag precíz lépések, pl. megmunkálás, hegesztés, vezetékezés, programozás, hibakeresés).
     * 6. Lépés: Utóműveletek (pl. sorjázás, tisztítás, rögzítés, felületkezelés, összeszerelés).
     * 7. Lépés: Minőségellenőrzés és mérés (dimenziók, tűréshatárok, tömítettség vagy működés ellenőrzése és mérése).
     * 8. Lépés: Rendrakás és szakmai adminisztráció (szerszámok elrakása, hulladékkezelés, munkalap vagy jegyzőkönyv kitöltése).
   - Mindegyik feladat legyen cselekvés-orientált, felszólító módban megfogalmazva (pl. "Állítsa be a nyomást...", "Végezze el a...", "Mérje meg a..."), kerülve a felesleges elméletet vagy elnagyolt instrukciókat. Just return the array of these tasks.

── SZIGORÚ TILALOM ──
- NE keverd az elméleti magyarázatot a gyakorlati feladatokkal!
- Kerüld a pedagógiai sallangokat (pl. "A tanuló képes lesz...").
- Ne legyen túl tömör, de ne is legyen feleslegesen bőbeszédű.

MODULOK:
${moduleList}

VÁLASZ (JSON):
{
  "modules": [
    { "title": "Pontos modul cím", "content": "Szakmai tartalom...", "practicalTasks": ["1. feladat", "2. feladat"] }
  ]
}
`.trim();
  }

  buildWorkshopActivityExtractionPrompt(chunk: string): string {
    return `
Te egy PTT (Programtanterv) dokumentum-elemző szakértő és SZAKOKTATÓ vagy. 
A feladatod, hogy kigyűjts MINDEN gyakorlati, műhelyben elvégezhető tevékenységet, feladatot és követelményt a megadott szövegből.

── SZABÁLYOK ──
1. Csak a VALÓDI, fizikai, kézzel fogható műhelygyakorlathoz kapcsolódó tevékenységeket gyűjtsd ki (pl. mérések, fűrészelés, hegesztés, vezetékezés, hibakeresés, beállítások, szerszámhasználat).
2. Könyörtelenül szűrj ki minden pedagógiai sallangot (pl. "a tanuló ismeri...", "képes megérteni...") és elméleti leírást.
3. A kigyűjtött elemeket egy tömör, világos listaként add vissza.

VÁLASZ FORMÁTUMA (SZIGORÚ JSON):
{
  "rawActivities": [
    "Első kigyűjtött műhelytevékenység leírása...",
    "Második kigyűjtött műhelytevékenység leírása..."
  ]
}

ELEMEZENDŐ SZÖVEG:
${chunk}
`.trim();
  }

  buildWorkshopDaySizingPrompt(subjectName: string, rawActivities: string[]): string {
    return `
Te egy zseniális SZAKOKTATÓ és gyakorlati tanmenet-tervező vagy.
Kaptál egy listát, ami egy adott tantárgyhoz kigyűjtött nyers műhelytevékenységeket tartalmazza.

Tantárgy: ${subjectName}

── FELADAT ──
1. Csoportosítsd és strukturáld ezeket a tevékenységeket egymásra épülő, szekvenciális egységekre (modulokra).
2. **KÖTELEZŐ 1 NAPOS MÉRETEZÉS**: Minden egyes egység (modul) pontosan akkora méretű legyen, amit egy tanuló **1 műhelygyakorlati nap (kb. 6-8 óra gyakorlat)** alatt reálisan meg tud tanulni és el tud végezni a műhelyben!
3. Adj minden napnak egy vonzó, szakmailag pontos "Nap [X]: [Cím]" formátumú nevet (pl. "1. nap: Kéziszerszámok biztonságos használata és fémfűrészelés alapjai").
4. A válaszként kapott modulok sora egy tökéletes, logikusan egymásra épülő napi tanmenetet alkosson.

VÁLASZ FORMÁTUMA (SZIGORÚ JSON):
{
  "modules": [
    {
      "title": "1. nap: Kéziszerszámok biztonságos használata és fémfűrészelés alapjai",
      "type": "practical",
      "sectionCode": "nap-1",
      "activities": [
        "Nyers műhelytevékenység leírása..."
      ]
    }
  ]
}

NYERS MŰHELYTEVÉKENYSÉGEK LISTÁJA:
${rawActivities.map((act, i) => `${i + 1}. ${act}`).join('\n')}
`.trim();
  }

  buildPracticalDayContentPrompt(professionName: string, subjectName: string, moduleTitle: string, activities: string[]): string {
    return `
Te egy profi szakoktató és gyakorlati tananyagfejlesztő vagy. 
Generálj részletes gyakorlati útmutatót tanulók számára egy adott gyakorlati naphoz (műhelynaphoz).

Szakma: ${professionName}
Tantárgy: ${subjectName}
Gyakorlati nap címe: ${moduleTitle}

── FELADAT ──
Írj egy alapos, cselekvés-orientált gyakorlati útmutatót az alábbi SZIGORÚ szabályok szerint:

1. A "content" mezőbe írj egy rövid (max 3-4 mondat) szakmai bevezetőt és motivációt a mai műhelygyakorlat céljáról, a használandó főbb berendezésekről és a megszerezhető szakmai készségekről.
2. A "practicalTasks" mezőbe generálj pontosan 6-8 konkrét, szakmailag szigorúan egymásra épülő gyakorlati feladatot (instrukciót), amelyek lefedik a mai napra kijelölt tevékenységeket, és egy valós ipari munkafolyamatot (workflow) követnek:
   - 1. Lépés: Előkészítés és munkavédelem (egyéni védőeszközök (EVE) ellenőrzése, munkaterület biztonságossá tétele, szerszámok és anyagok előkészítése).
   - 2. Lépés: Mérési, előrajzolási, kalibrálási vagy gépbeállítási paraméterek meghatározása (pl. anyagelőkészítés).
   - 3-5. Lépés: Technológiai főműveletek végrehajtása (cselekvés-orientált, szakmailag precíz lépések, pl. megmunkálás, hegesztés, vezetékezés, programozás, hibakeresés).
   - 6. Lépés: Utóműveletek (pl. sorjázás, tisztítás, rögzítés, felületkezelés, összeszerelés).
   - 7. Lépés: Minőségellenőrzés és mérés (dimenziók, tűréshatárok, működés ellenőrzése).
   - 8. Lépés: Rendrakás és szakmai adminisztráció (szerszámok elrakása, hulladékkezelés, munkalap vagy jegyzőkönyv kitöltése).
3. Mindegyik feladat legyen cselekvés-orientált, felszólító módban megfogalmazva (pl. "Állítsa be...", "Végezze el...", "Mérje meg..."), kerülve a felesleges elméletet.

KIJELÖLT NAPI TEVÉKENYSÉGEK:
${activities.map((act, i) => `- ${act}`).join('\n')}

VÁLASZ (JSON):
{
  "content": "A mai műhelynap célja...",
  "practicalTasks": [
    "1. Lépés: ...",
    "2. Lépés: ...",
    "3. Lépés: ...",
    "4. Lépés: ...",
    "5. Lépés: ...",
    "6. Lépés: ...",
    "7. Lépés: ...",
    "8. Lépés: ..."
  ]
}
`.trim();
  }

  async structureCurriculum(_professionName: string, _kkkText: string, chunk: string, importType?: 'theory' | 'practical' | 'both'): Promise<string> {
    return this.buildExtractionPrompt(chunk, importType);
  }
}

export const ikkService = new IKKService();
