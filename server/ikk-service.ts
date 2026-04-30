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

      // Check for extremely large PDFs (e.g., > 15MB) that might crash the server
      const MAX_PDF_SIZE = 15 * 1024 * 1024;
      if (buffer.length > MAX_PDF_SIZE) {
        console.warn(`[IKK-SERVICE] Nagyméretű PDF észlelve (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Feldolgozás megkísérlése...`);
      }

      console.log(`[IKK-SERVICE] PDF elemzése megkezdve (ID: ${mediaId})...`);
      console.time(`pdf-parse-${mediaId}`);
      try {
        if (buffer.length < 100) {
           throw new Error(`A letöltött fájl túl kicsi (${buffer.length} bájt), valószínűleg nem érvényes PDF.`);
        }
        
        const data = await pdf(buffer);
        console.timeEnd(`pdf-parse-${mediaId}`);
        console.log(`[IKK-SERVICE] PDF elemzése kész (ID: ${mediaId}). Oldalak száma: ${data.numpages || 'ismeretlen'}, Szöveg hossza: ${data.text?.length || 0} karakter.`);
        return data.text;
      } catch (pdfError: any) {
        console.timeEnd(`pdf-parse-${mediaId}`);
        console.error(`[IKK-SERVICE] Kritikus hiba a PDF elemzésekor (pdf-parse) ID ${mediaId}:`, pdfError);
        throw new Error(`A PDF dokumentum tartalma nem olvasható (ID: ${mediaId}): ${pdfError.message}`);
      }
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

    console.log(`[IKK-SERVICE] Dokumentumok feldolgozása szekvenciálisan (KKK majd PTT)...`);
    
    let kkkTextRaw = '';
    if (kkkAttachment?.media_id) {
      try {
        kkkTextRaw = await this.getPdfText(kkkAttachment.media_id);
      } catch (e) {
        console.error('KKK hiba:', e);
      }
    }

    let pttTextRaw = '';
    if (pttAttachment?.media_id) {
      try {
        pttTextRaw = await this.getPdfText(pttAttachment.media_id);
      } catch (e) {
        console.error('PTT hiba:', e);
      }
    }

    const kkkText = kkkTextRaw || '';
    const pttText = pttTextRaw || '';

    if (!kkkText && !pttText) {
      const details = profession.attachments?.map(a => `${a.name} (media_id: ${a.media_id})`).join(', ');
      throw new Error(`Nem sikerült feldolgozni a dokumentumokat. Részletek: ${details}`);
    }

    return { 
      kkkText: this.preprocessText(kkkText), 
      pttText: this.preprocessText(pttText) 
    };
  }

  /**
   * Pre-processes raw PDF text to remove noise that confuses the AI.
   * - Removes page numbers (e.g., "15 / 80. oldal")
   * - Fixes hyphenation at line breaks
   * - Removes common PDF artifacts and redundant headers
   */
  private preprocessText(text: string): string {
    if (!text) return '';
    
    return text
      // Remove page numbers: "X / Y. oldal" or "X / Y oldal"
      .replace(/\d+\s*\/\s*\d+\.\s*oldal/gi, '')
      .replace(/\d+\s*\/\s*\d+\s*oldal/gi, '')
      // Remove Programtanterv repeated headers if any
      .replace(/P\s*R\s*O\s*G\s*R\s*A\s*M\s*T\s*A\s*N\s*T\s*E\s*R\s*V/g, '')
      // Fix hyphenation: "szerszám-\nkészítés" -> "szerszámkészítés"
      .replace(/([a-záéíóöőuúüű])-\n\s*([a-záéíóöőuúüű])/gi, '$1$2')
      // Fix common PDF spacing issues (e.g. "S Z A K M Á H O Z")
      .replace(/S\s*Z\s*A\s*K\s*M\s*Á\s*H\s*O\s*Z/g, 'SZAKMÁHOZ')
      // Remove multiple empty lines
      .replace(/\n\s*\n\s*\n/g, '\n\n');
  }

  /**
   * Splits PTT text into intelligent chunks based on section headers.
   * Catches both Subject definitions (e.g. 3.3.1) and Topic definitions (e.g. 3.3.1.6.1).
   */
  splitPttIntoSections(text: string): string[] {
    if (!text) return [];

    // Look for patterns like "3.4.2.6.1" or "3.4.2 " at the start of a line
    // The pattern \n\s*\d+\.\d+\.\d+ catches subjects and topics
    const sections = text.split(/(?=\n\s*\d+\.\d+\.\d+)/);
    
    // Filter out very small fragments and trim
    return sections
      .map(s => s.trim())
      .filter(s => s.length > 50);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PASS 1 – NYERS SZERKEZETI KINYERÉS
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
  FOGADD EL SZABÁLYKÉNT: A témakör címe alatt található **MAJDNEM MINDEN EGYES MONDAT / BEKEZDÉS EGY ÖNÁLLÓ MODUL**. 
  Ne vond össze a mondatokat! Ha egy bekezdésben 5 külön mondat van (vagy egy sorban 5 különböző technika), az 5 KÜLÖN MODUL!
  Példa egy sorra: "A munkavédelem fogalma, szakterületei." → 1 modul
  "Munkabalesetek és foglalkozási megbetegedések." → 1 modul

FORMA B – Bevezető + ‒ gondolatjeles lista (pl. Divatszabó PTT):
  A témakör fejléce NEM modul.
  A bevezető "A témakör... ismerteti." mondat(ok) NEM modulok!
  Az "Ezen belül az alábbi témákat tartalmazza:" sor NEM modul!
  CSAK a "‒" karakterrel KEZDŐDŐ sorok modulok. MINDEN EGYES GONDOLATJEL EGY ÚJ MODUL.
    "‒ Modellrajz"         → 1 modul
    "‒ Gyártmányrajz"      → 1 modul

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
      "name": "Tantárgy Pontos Neve",
      "code": "X.X.X",
      "description": "A tantárgy tartalmának rövid összefoglalása a dokumentum alapján.",
      "practicalPercent": 0,
      "modules": [
        { "title": "X.X.X.X.X Fejezetcím - Modul konkrét szövege", "type": "theory", "sectionCode": "X.X.X.X.X" },
        { "title": "X.X.X.X.X Fejezetcím - Másik modul szövege", "type": "theory", "sectionCode": "X.X.X.X.X" }
      ]
    }
  ]
}
`.trim();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PASS 2 – TARTALOMGENERÁLÁS
  // ──────────────────────────────────────────────────────────────────────────

  buildContentPrompt(professionName: string, subjectName: string, modules: RawModule[]): string {
    const moduleList = modules.map((m, i) => `${i + 1}. [${m.type.toUpperCase()}] ${m.title}`).join('\n');
    return `
Te egy szakképzési tananyagfejlesztő és módszertani szakértő vagy. Az alábbi modulok MINDEGYIKÉHEZ generálj alapvető szakmai tartalmat és gyakorlati feladatokat.

Szakma: ${professionName}
Tantárgy: ${subjectName}

MODULOK (${modules.length} db):
${moduleList}

KÖVETELMÉNYEK:
- Minden modulhoz a következő mezőket generálj:
  "content" → Alapvető, lényegre törő szakmai tartalom (5-8 mondat, markdown használható).
  "practicalTasks" → KIZÁRÓLAG GYAKORLATI (PRACTICAL) típusú moduloknál: Egy 3-5 elemből álló lista a konkrét gyakorlati feladatokról. Elméleti modulnál hagyd üresen ([]).
    
    • THEORY (elméleti) modulnál: 
      - A legfontosabb fogalmak és összefüggések tömör kifejtése.
    
    • PRACTICAL (gyakorlati) modulnál a "content" tartalmazza:
      - Szükséges eszközök, munkavédelmi előírások és a folyamat rövid leírása.
    • PRACTICAL modulnál a "practicalTasks" tartalmazza:
      - Konkrét, elvégzendő feladatok (pl. "Végezzen el egy sarokvarratot PB pozícióban", "Ellenőrizze a varrat minőségét szemrevételezéssel").

- A tartalom legyen szakmailag pontos és lényegre törő.
- A "title" mezőt VÁLTOZTATÁS NÉLKÜL másold át!

VÁLASZ (CSAK JSON, semmi más):
{
  "modules": [
    { 
      "title": "...", 
      "content": "...", 
      "practicalTasks": ["feladat 1", "feladat 2"] 
    }
  ]
}`.trim();
  }

  // Legacy compatibility shim
  async structureCurriculum(professionName: string, _kkkText: string, chunk: string): Promise<string> {
    return this.buildExtractionPrompt(chunk);
  }
}

export const ikkService = new IKKService();
