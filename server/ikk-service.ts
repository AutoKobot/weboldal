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
  modules: RawModule[];
}

export class IKKService {
  private static readonly BASE_URL = 'https://akkreditaltvizsgaztatas.ikk.hu/kkk-ptt';
  private static readonly API_MEDIA_URL = 'https://api.ikk.hu/v1/media/documents';

  // ──────────────────────────────────────────────────────────────────────────
  // ALAP API METÓDUSOK
  // ──────────────────────────────────────────────────────────────────────────

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
      console.log(`IKK PDF Letöltés: ${IKKService.API_MEDIA_URL}/${mediaId}`);
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
      const signature = buffer.slice(0, 4).toString();
      console.log(`Letöltve: ${buffer.length} bájt. Szignatúra: ${signature}`);
      if (signature !== '%PDF') {
        throw new Error(`A szerver nem érvényes PDF-et küldött (ID: ${mediaId}). Tartalom kezdete: ${signature}`);
      }
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error(`Hiba a PDF feldolgozásakor (ID: ${mediaId}):`, error);
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

    let kkkText = '';
    let pttText = '';

    if (kkkAttachment?.media_id) {
      try { kkkText = await this.getPdfText(kkkAttachment.media_id); }
      catch (e) { console.error('KKK hiba:', e); }
    }
    if (pttAttachment?.media_id) {
      try { pttText = await this.getPdfText(pttAttachment.media_id); }
      catch (e) { console.error('PTT hiba:', e); }
    }

    if (!kkkText && !pttText) {
      const details = profession.attachments?.map(a => `${a.name} (media_id: ${a.media_id})`).join(', ');
      throw new Error(`Nem sikerült feldolgozni a dokumentumokat. Részletek: ${details}`);
    }

    return { kkkText, pttText };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PASS 1 – NYERS SZERKEZETI KINYERÉS
  //
  // Két dokumentumtípust kezel:
  //   FORMA A (Hegesztő-stílus): teljes mondatos sorok a témaköri fejezet alatt
  //   FORMA B (Divatszabó-stílus): bevezető mondat + ‒ gondolatjeles lista
  //
  // NEM generál tartalmat – csak az eredeti szöveg sorait listázza modulokként.
  // ──────────────────────────────────────────────────────────────────────────

  buildExtractionPrompt(chunk: string): string {
    return `
Te egy PTT (Programtanterv) dokumentum-elemző vagy. Kizárólag a dokumentumban ténylegesen szereplő szövegeket listázod fel. Semmit nem adsz hozzá, nem generálsz!

═══ A PTT DOKUMENTUM SZERKEZETE ═══

── TANTÁRGY FELISMERÉS ──
Tantárgy = minden sor, amelynek VÉGÉN szerepel az "óra" szó egy törtszám után.
  "3.3.1 Villamos alapismeretek tantárgy 288/288 óra"              → "Villamos alapismeretek"
  "3.4.2 Gépészeti alapmérések tantárgy 72/72 óra"                 → "Gépészeti alapmérések"
  "3.4.2 Textiltermékek gyártástechnológiája tantárgy 36/36 óra"   → "Textiltermékek gyártástechnológiája"
A tantárgy neve = az órakeret és a "tantárgy" szó ELHAGYÁSÁVAL maradó szöveg.

── ELMÉLET/GYAKORLAT ARÁNY ──
Keresd a "A képzés órakeretének legalább X%-át gyakorlati helyszínen" sort!
  X = 0   → practicalPercent = 0,   modulok type = "theory"
  X = 50  → practicalPercent = 50,  modulok type = "practical"
  X = 100 → practicalPercent = 100, modulok type = "practical"
Ha nincs ilyen sor → practicalPercent = 0, type = "theory"

── MODULOK HELYE ──
Modulok KIZÁRÓLAG az "A tantárgy témakörei" c. fejezet UTÁN találhatók!
Ez a fejezet mindig "3.X.X.6 A tantárgy témakörei" formátumú.

AMIT KI KELL HAGYNI (NEM modulok!):
  ✗ "A tantárgy tanításának fő célja" + az utána lévő bekezdések
  ✗ "A tantárgyat oktató végzettségére vonatkozó..." + tartalma
  ✗ "Kapcsolódó közismereti, szakmai tartalmak" + tartalma
  ✗ "A képzés órakeretének legalább..." sor
  ✗ Kompetencia-táblázat sorai ("Készségek, képességek", "Ismeretek", "Önállóság és felelősség",
    "Teljesen önállóan", "Instrukció alapján", "részben önállóan" stb.)
  ✗ "X/80. oldal" vagy "X/47. oldal" oldalszámok
  ✗ Üres sorok

── MODULOK KÉT FORMÁJA ──

FORMA A – Teljes mondatos sorok (pl. Hegesztő PTT):
  A témakör fejléce (pl. "3.3.2.6.1 Munkabiztonság, tűz- és környezetvédelem") NEM modul.
  Az utána lévő minden szöveges sor ÖNÁLLÓ MODUL:
    "A munkavédelem fogalma, szakterületei"              → 1 modul
    "Munkabalesetek és foglalkozási megbetegedések"      → 1 modul
    "A munkabalesetek bejelentése, nyilvántartása..."    → 1 modul (sorfolytatás összefűzve!)

FORMA B – Bevezető + ‒ gondolatjeles lista (pl. Divatszabó PTT):
  A témakör fejléce NEM modul.
  A bevezető "A témakör... ismerteti." mondat(ok) NEM modulok!
  Az "Ezen belül az alábbi témákat tartalmazza:" sor NEM modul!
  CSAK a "‒" karakterrel KEZDŐDŐ sorok modulok:
    "‒ Modellrajz"         → 1 modul
    "‒ Gyártmányrajz"      → 1 modul
    "‒ Részletrajz"        → 1 modul

── SORFOLYTATÁS ──
Ha sor kötőjellel végződik és a következő sor folytatja → fűzd össze:
  "útvo-" + "nalak, egyéb infrastruktúra"  → "útvonalak, egyéb infrastruktúra"
  "szerkesztésé-" + "hez szükséges..."     → "szerkesztéséhez szükséges..."

── MODUL CÍM FORMÁTUMA ──
"AlfejezeteKód AlfejezestCím - Sor szövege"

Hegesztő példák (Forma A):
  "3.3.2.6.1 Munkabiztonság - A munkavédelem fogalma, szakterületei"
  "3.3.2.6.1 Munkabiztonság - Munkabalesetek és foglalkozási megbetegedések"
  "3.3.2.6.1 Munkabiztonság - Gépek, berendezések biztonsági követelményei"
  "3.3.2.6.2 Műszaki rajz alapjai - A műszaki rajzok tartalmi és formai követelményei"
  "3.4.1.6.2 Rajztechnikai alapszabványok - Vetületi ábrázolás - Látás és ábrázolás, vetítési módok"

Divatszabó példák (Forma B):
  "3.4.2.6.1 Ruhaipari ábrázolások - Modellrajz"
  "3.4.2.6.1 Ruhaipari ábrázolások - Gyártmányrajz"
  "3.4.2.6.1 Ruhaipari ábrázolások - Részletrajz"
  "3.4.2.6.1 Ruhaipari ábrázolások - Alkatrészrajz"
  "3.4.2.6.2 Varrástechnológia - Varrással kapcsolatos alapfogalmak"
  "3.4.2.6.2 Varrástechnológia - Öltések és varratok"
  "3.4.2.6.3 Alkatrész-technológia - A ruházati termékek záródási lehetőségei"
  "3.4.2.6.3 Alkatrész-technológia - Hasítékok készítésének módja"
  "3.4.1.6.2 Alapszerkesztés - Méretek a szoknya szerkesztéséhez"
  "3.4.1.6.2 Alapszerkesztés - Egyenes vonalú szoknya alapszerkesztése"

═══ PTT SZÖVEG (feldolgozandó részlet) ═══
${chunk}

═══ VÁLASZ – CSAK VALID JSON, SEMMI MÁS ═══
{
  "subjects": [
    {
      "name": "Textiltermékek gyártástechnológiája",
      "code": "3.4.2",
      "description": "Varrástechnológiai alapismeretek és alkatrész-technológiák elsajátítása.",
      "practicalPercent": 0,
      "modules": [
        { "title": "3.4.2.6.1 Ruhaipari ábrázolások - Modellrajz", "type": "theory", "sectionCode": "3.4.2.6.1" },
        { "title": "3.4.2.6.1 Ruhaipari ábrázolások - Gyártmányrajz", "type": "theory", "sectionCode": "3.4.2.6.1" },
        { "title": "3.4.2.6.1 Ruhaipari ábrázolások - Részletrajz", "type": "theory", "sectionCode": "3.4.2.6.1" },
        { "title": "3.4.2.6.2 Varrástechnológia - Varrással kapcsolatos alapfogalmak", "type": "theory", "sectionCode": "3.4.2.6.2" },
        { "title": "3.4.2.6.3 Alkatrész-technológia - A ruházati termékek záródási lehetőségei", "type": "theory", "sectionCode": "3.4.2.6.3" }
      ]
    }
  ]
}`.trim();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PASS 2 – TARTALOMGENERÁLÁS (kis kötegekben, 20 modul / hívás)
  // Bemenet: tantárgy neve + modul-cím lista
  // Kimenet: minden modulhoz conciseContent + detailedContent
  // ──────────────────────────────────────────────────────────────────────────

  buildContentPrompt(professionName: string, subjectName: string, modules: RawModule[]): string {
    const moduleList = modules.map((m, i) => `${i + 1}. [${m.type.toUpperCase()}] ${m.title}`).join('\n');
    return `
Te egy szakképzési tananyagfejlesztő vagy. Az alábbi modulok MINDEGYIKÉHEZ generálj szakmai szöveges tartalmat.

Szakma: ${professionName}
Tantárgy: ${subjectName}

MODULOK (${modules.length} db):
${moduleList}

KÖVETELMÉNYEK:
- Minden modulhoz PONTOSAN 2 mezőt generálj (ne hagyj ki egyet sem!):
  "conciseContent" → 3-5 tömör, szakmai összefoglaló mondat
  "detailedContent" → 8-12 részletes szakmai mondat
    • THEORY modulnál: Elmélet, fogalmak, szabványok, összefüggések kifejtése
    • PRACTICAL modulnál: Lépésről-lépésre munkafolyamat, eszközök, biztonsági előírások, ellenőrzési módszer
- A tartalom legyen szakmailag pontos és érthető egy szakképzős diáknak
- A "title" mezőt VÁLTOZTATÁS NÉLKÜL másold át az eredeti listából!

VÁLASZ (CSAK JSON, semmi más):
{
  "modules": [
    { "title": "3.4.2.6.1 Ruhaipari ábrázolások - Modellrajz", "conciseContent": "...", "detailedContent": "..." },
    { "title": "...", "conciseContent": "...", "detailedContent": "..." }
  ]
}`.trim();
  }

  // Legacy compatibility shim
  async structureCurriculum(professionName: string, _kkkText: string, chunk: string): Promise<string> {
    return this.buildExtractionPrompt(chunk);
  }
}

export const ikkService = new IKKService();
