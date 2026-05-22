# Projekt Emlékeztető & Fejlesztői Irányelvek

Ez a fájl tartalmazza a legfontosabb tudnivalókat a projektről, az aktuális állapotot és a fejlesztési szabályokat.

## 🧠 Tudásbázis és Dokumentáció

- **Adatbázis Séma**: `docs/developer/database-schema.md` (Táblák és kapcsolatok)
- **UI Komponens Katalógus**: `docs/developer/component-catalog.md` (Shadcn/UI és egyedi elemek)
- **API Végpontok**: `docs/developer/api-endpoints.md` (Backend route-ok listája)
- **AI Prompt Könyvtár**: `docs/developer/prompts.md` (IKK extraction és tartalom generálási szabályok)
- **Feladat Napló**: `docs/developer/task-log.md` (A legutóbbi 2026-05-03-as nagy frissítések részletei)
- **AI Optimalizációs Jelentések**: `ai-optimization-report.md` és `youtube-optimization-report.md`
- **Oktatóanyagok**: `attendance_walkthrough.md` és `replit.md`
- **IKK Import Logika**: `ikk import logika.pdf` (A 3 fázisú import folyamat promptjai és specifikációja)

## 🛠️ Segédeszközök

- **`scripts/map-codebase.ts`**: Indexeli a függvényeket és osztályokat a gyors navigációhoz.
- **`scripts/code-map.json`**: A térkép szkript kimenete.
- **`scripts/data-integrity-check.ts`**: Diagnosztikai eszköz az adatbázis konzisztencia ellenőrzéséhez.
- **`ptt/test_new_ikk_logic.ts`**: Tesztszkript az IKK import 3 fázisának kipróbálásához lokális PTT szöveggel.

## 🗄️ Adatbázis & Tárhely

- **Elsődleges Adatbázis**: **Supabase** (PostgreSQL). A Neon adatbázis elavult, ne használd!
- **Média Tárhely**: **Supabase Storage** (vödör: `presentations`).
- **Környezeti változók**: Mindig ellenőrizd a `.env` fájlban, hogy a `DATABASE_URL` a Supabase-re mutat-e.

## 🚀 Legutóbbi Fontos Fejlesztések

- **Navigáció és Állapotmegőrzés**:
  - Az Admin Dashboard állapotai (kiválasztott szakma/tantárgy) megmaradnak lapváltáskor.
  - A tananyag és modul listák URL-paraméterekkel szinkronizálnak, így a "vissza" gomb és a szűrések (elmélet/gyakorlat) stabilak.
- **Óraszám Összesítés és Szinkronizálás**:
  - A rendszer automatikusan összesíti a modulok óraszámait a tantárgyakhoz, és a tantárgyakét a szakmákhoz (fallback kijelzés ha nincs rögzített érték).
  - A tantárgy óraszámának módosítása automatikusan, arányosan újraelosztja az órákat a modulok között.
  - A szerkesztő felületeken bűvös pálca gomb (`Wand2`) segíti az automatikus óraszám-szinkronizálást a gyeremek-elemekből.
- **AI Folyamatjelző és Interaktív HTML**:
  - Globális AI állapotjelző került a fejlécekbe, amely mutatja, ha háttérfolyamat (bulk fejlesztés) fut.
  - Az interaktív prezentációk mostantól megállnak a kérdéseknél, a narráció nem szalad tovább a válaszadás előtt.
- **Sorrendezés és Láthatóság**:
  - A tantárgyak (pl. 3.1, 3.1.1) és modulok természetes numerikus sorrendben jelennek meg minden felületen.
  - Intézményi láthatóság (School-Aware): Az iskola adminok látják az összes hozzájuk tartozó tanárt és diákot, függetlenül attól, ki hozta létre őket.
- **Wikipedia-mentes és Gazdagabb AI Tartalmak (2026-05-06)**:
  - Teljesen eltávolítottuk a Wikipédiás hivatkozásokat mind a kódból, mind az AI-promptokból, garantálva a tiszta szakmai szövegeket.
  - Az elméleti tananyag generálása mostantól KÖTELEZŐEN egyszerre tartalmaz mind Mermaid diagramot, mind egyedi műszaki SVG ábrát is.
  - A kulcsfogalmak gyűjtését kiterjesztettük maximum 20 elemre, általánosítva a technikai/elméleti területekre.
- **Dinamikus 30 Kérdéses Teszt Pool (2026-05-06)**:
  - Az AI az új modulokhoz pontosan 30 kérdésből álló, kép nélküli lapos kérdés-poolt generál.
  - A backend a vizsgázáskor ebből a 30 kérdésből kever össze és ad fel pontosan 10 véletlenszerű kérdést a tanulónak.
- **Automatikus Mermaid Szintaxis-Öngyógyítás (2026-05-06)**:
  - A háttérszerver beépített regex-szel észleli és automatikusan idézőjelek közé zárja a zárójeleket tartalmazó szögletes Mermaid feliratokat (pl. `B["Leírás (WPS)"]`), teljesen megelőzve a kirajzolási és parser összeomlásokat.
- **Kijelölt Osztályok Értesítései és Felugró Ablak Fix (2026-05-06)**:
  - Elválasztottuk a tanulói érkező üzeneteket (`/api/announcements/my`) és a tanári küldött üzeneteket (`/api/announcements/teacher`).
  - Ezzel véglegesen megszűnt a tanári felületen folyamatosan és bezárhatatlanul felugró, zavaró üzenetküldési modál ablak.
- **OpenAI TTS Standard Hangköltség-felezés (2026-05-06)**:
  - Átírtuk az összes háttérbeli hanggenerálást a drágább `tts-1-hd` modellről az optimalizált, standard `tts-1` modellre, ami azonnali 50%-os közvetlen megtakarítást jelent a hangosanyag-generálásoknál, füllel hallható minőségvesztés nélkül.
- **Forradalmi Élő Elmetérkép Funkció (2026-05-06)**:
  - Kiépítettük az "Élő Elmetérkép" (Living Mind Map) modult: az AI legenerál egy fastruktúrát magyarázó címkékkel, leírásokkal és narrációval, amire rekurzív hanggenerálás épül.
  - A frontendről elérhető interaktív Mind Map Player automatikusan radial layoutba rendezi a csomópontokat, neonos, lüktető animált SVG vonalakkal ábrázolja az információ áramlását, és cinematic kameramozgással rácsúszik az éppen felolvasott csomópontra, miközben lejátsza annak egyedi magyarázó hangját.
- **Pedagógiai Értékelési Thresholdok Finomítása (2026-05-07)**:
  - A tesztek értékelését a tanulók számára kedvezőbbé tettük a következő határokkal: 45%-tól 2-es (elégséges), 55%-tól 3-as (közepes), 65%-tól 4-es (jó), 90%-tól 5-ös (jeles).
  - A backend score-to-grade átalakítókat (`routes.ts`, `routes/teacher.ts`) és az összes kliensoldali felületet (`student-dashboard.tsx`, `home.tsx`, `StudentDetailView.tsx`, `quiz-interface.tsx`) az új sávokhoz igazítottuk.
  - Az OpenAI válasz-kiértékelő modell küszöbét (`openai.ts`) szintén 60-ról 45 pontra csökkentettük, így a sikeres átmenetel határa egységesen 45% lett.
- **Wikipédia Komponensek Teljes Eltávolítása (2026-05-07)**:
  - Véglegesen kitisztítottuk az összes korábbi Wikipédia-maradványt az `enhanced-module-generator.ts` fájlból, beleértve az interfészeket, kulcsszókereső segédfüggvényeket és képátalakító rutinokat.
- **Golyóálló Sorrendbe Állítás Kiértékelés (2026-05-07)**:
  - A [quiz-interface.tsx](file:///e:/Antigravity_projektek/InteractiveLearning/client/src/components/quiz-interface.tsx) fájlban lecseréltük a merev index-összehasonlító logikát egy robusztus, szöveg-alapú kiértékelő motorra.
  - Az új motor automatikusan kezeli a vegyes szám/szöveg indexeket, az 1-alapú AI eltolódásokat, és szövegesen veti össze a diák által kiválasztott lépéseket az elvárt folyamattal, megszüntetve a fals negatív értékeléseket.
- **Kvíz Ismétlődés Megelőzés, Fisher-Yates Shuffle & Laposított Pool (2026-05-07)**:
  - Lecseréltük a korábbi instabil és elfogult JavaScript `.sort()` alapú keverést a matematikailag tökéletes, teljesen pártatlan **Fisher-Yates keverési algoritmusra** a backend oldalon.
  - Beépítettünk egy automatikus laposító motort (`flatPool`): ha a modul a régi struktúrát használja (pl. 5 darab előre legyártott 10-kérdéses külön tesztsor), a rendszer összefésüli mind az 50 kérdést egyetlen nagy medencébe, majd ebből kever ki Fisher-Yates módszerrel 10 teljesen egyedi kérdést. Az új 30-kérdéses poolnál ugyanígy 30-ból választ ki 10 teljesen véletlenszerűt.
  - Hozzáadtuk a `Cache-Control` no-cache fejlécet a `/api/modules/:id/quiz` végpontra, és kliensoldalon egy dinamikus `_t=${Date.now()}` időbélyeg-alapú cache-bustert vezettünk be. Ez garantálja a maximális változatosságot minden egyes kattintáskor!
- **3-Lépcsős, 1-Napos Méretezésű Gyakorlati IKK Import Pipeline (2026-05-07)**:
  - Teljesen szétbontottuk a korábbi monolitikus gyakorlati importálást egy rendkívül fejlett, többlépcsős pedagógiai folyamatra az [ikk-service.ts](file:///e:/Antigravity_projektek/InteractiveLearning/server/ikk-service.ts) és a [routes/ikk.ts](file:///e:/Antigravity_projektek/InteractiveLearning/server/routes/ikk.ts) fájlokban:
    1. **1. Lépés: Nyers Műhelytevékenységek Kigyűjtése**: Az AI először kizárólag a fizikai, kézzel fogható, műhelyben elvégezhető gyakorlati feladatokat és méréseket gyűjti ki a PTT leírásból, kiszűrve minden elméletet és sallangot.
    2. **2. Lépés: 1 Műhelynapos Tanulási Egységekre Tervezés (Sizing)**: A kigyűjtött elemeket az AI szekvenciálisan csoportosítja olyan méretű modulokba (napokba), amelyeket a tanuló **pontosan 1 műhelynap (6-8 óra gyakorlat)** alatt reálisan meg tud tanulni és el tud végezni. A modulok automatikusan a `"Nap X: [Cím]"` formátumot kapják.
    3. **3. Lépés: Részletes Gyakorlati Útmutatók Generálása**: Minden egyes napi egységhez az AI felépít egy precíz, cselekvés-orientált, felszólító módban írt 6-8 lépéses munkafolyamat leírást (Munkavédelem $\rightarrow$ Kalibrálás & Anyagelőkészítés $\rightarrow$ Főműveletek $\rightarrow$ Utóműveletek $\rightarrow$ Minőségellenőrzés $\rightarrow$ Rendrakás & Szakmai Adminisztráció).
- **Szabad Szavas Válaszok és OpenAI Kérdés-Kiértékelések Eltávolítása (2026-05-07)**:
  - Teljesen eltávolítottuk a szabad szavas (nyitott) kérdések beviteli mezőit és a "Szöveges kiértékelés" gombokat a kvíz felületről ([quiz-interface.tsx](file:///e:/Antigravity_projektek/InteractiveLearning/client/src/components/quiz-interface.tsx)), egyszerűsítve és átláthatóbbá téve a diákok kitöltési felületét.
  - Megszüntettük az ehhez kapcsolódó szerveroldali GPT `evaluateAnswerMutation` hívásokat is.
  - **Lokális, Azonnali Kiértékelés Egyszeres Választásnál**: Korábban a hibás egyszeres választások kiértékelését is átirányította a rendszer a GPT-nek, ami zavaró vagy hibás visszajelzésekhez vezetett. Mostantól a rendszer azonnal, helyben, tiszta JS-sel és 100%-os pontossággal értékeli ki a rossz egyszeres választásokat is 0 pontra, és megmutatja a helyes választ, teljesen kiiktatva a hálózati várakozást és az OpenAI API költségeket kitöltés közben.
- **Hibajavítások és Kódtisztítás (2026-05-07)**:
  - Bevezettük az **automatikus dia-méretezést és reszponzív tipográfiát** a HTML prezentáció lejátszóban ([presentation-player.tsx](file:///e:/Antigravity_projektek/InteractiveLearning/client/src/components/presentation-player.tsx)). Az új megoldás korlátozza a vizuális média magasságát `35vh` és `48vh` közé, csökkenti a margókat, és rugalmasan méretezi a betűméreteket (`text-2xl` - `text-4xl`, `prose-sm` - `prose-lg`), megakadályozva, hogy a szöveg vagy a kép kilógjon a diából bármilyen képernyőméret (pl. laptopok vagy mobilok) esetén.
  - Feloldottuk a Git összeolvadási konfliktusokat a régi `routes.ts` fájlban, egyszerűen átirányítva azt az új `routes/index.ts` modulra.
  - Kijavítottuk a diák műszerfalán lévő mobil menü gomb akadálymentesítési (a11y) hibáját a megfelelő `title` és `aria-label` attribútumok hozzáadásával.
  - Megszűnt a modulcímek sorszám-duplikációja (pl. 3.1.1.) a robusztusabb regex-szel.
  - Pótolva a hiányzó `Wand2` és egyéb ikon importok.
  - Javítottuk a hiányzó `MessageSquare` ikon import miatti összeomlást a tanár-dashboard és tanuló-listázó oldalakon.
  - Az IKK import hiba esetén nem törli a már létrehozott szakmát, segítve a hibakeresést.
- **IKK Import Optimalizáció & Robusztusság és Finomított Promptek (2026-05-21)**:
  - **JSON Csonkolási/Túlfolyási Hiba Elleni Védelem (`tryRepairJson`)**: Megvalósítottuk a `tryRepairJson` univerzális segédfüggvényt a [routes/ikk.ts](file:///e:/Antigravity_projektek/InteractiveLearning/server/routes/ikk.ts) fájlban, ami képes automatikusan lezárni a csonkolt JSON sztringeket (például a lezáró kapcsos zárójelek és szögletes zárójelek pótlásával), így megelőzi a 401-es és egyéb parser összeomlásokat ha az AI válasz eléri a token-limitet.
  - **Dinamikus Blokk-Méretezés (Dynamic Block Sizing)**: Logikát építettünk be a [routes/ikk.ts](file:///e:/Antigravity_projektek/InteractiveLearning/server/routes/ikk.ts) fájlba, amely a tantárgyak óraszáma alapján dinamikusan skálázza a generálási blokkok méretét, elkerülve a token túlcsordulási és API leállási hibákat.
  - **Továbbfejlesztett és Finomított IKK Promptek**:
    - **1. Óraarányok meghatározása (`generateHoursFromPtt`)**: Új módszertani és prioritási szabályokkal láttuk el, különösképp az óraszám-összesítő táblázat két fő blokkjának (3-éves nappali vs. 2-éves felnőttképzés) pontos kezelésére, a magyar szakképzés szigorú `[ELMÉLET]/[GYAKORLAT]` sorrendjének betartására, valamint a tiszta JSON kimenet kényszerítésére (\` \`\`\`json \` markdown mentesítésével).
    - **2. Granuláris Modul-bontás (`buildExtractionPrompt`)**: Új matematikai óra-kényszer és szakmai tartalom-bővítési stratégia került beépítésre, amely garantálja, hogy pontosan N darab (1 tanóra = 1 önálló modul) elem jöjjön létre logikai és szakmai-módszertani evolúció mentén, és ábécé sorrendes alszámokkal (a, b, c) egészüljön ki.
    - **3. Szakmai tananyag generálása modulonként (`buildContentPrompt`)**: Bevezettük a "Mesteroktató" és professzionális tananyagfejlesztő szerepkört, külön szétbontott `[THEORY]` (5-6 mondatos tömör leírás, üres gyakorlati feladatok) és `[PRACTICAL]` (rövid bevezetés + 6-8 lépéses valós ipari munkafolyamat útmutató WPS/technológiai utasítás alapon, felszólító módban) szabályozással, LaTeX matematikai és fizikai képlet-kényszerítéssel, valamint pedagógiai sallangok tilalmával.
  - **Kódbázis és Szintaxis Tisztítás**: Kijavítottuk a template literálok hibás formázásait az [ikk-service.ts](file:///e:/Antigravity_projektek/InteractiveLearning/server/ikk-service.ts) fájlban, és eltávolítottuk az orphaned/duplikált prompt-maradványokat, visszaállítva a fájl tökéletes szintaxisát.

- **IKK Import Teljes Újrastrukturálás - 3 Fázisú Logika (2026-05-22)**:
  - A monolitikus import helyett a folyamatot 3 tiszta, jól elkülönített fázisra bontottuk a [ikk import logika.pdf](file:///e:/Antigravity_projektek/InteractiveLearning/ikk%20import%20logika.pdf) dokumentum alapján.
  - **Fázisok**:
    1. **`extractSubjectHours`** (Phase 1): Kizárólag tantárgyak + elméleti/gyakorlati óraszámok kinyerése a PTT-ből. Az AI a `X.X.X.4` pontot keresi (pl. "3.3.1.4 A képzés órakeretének legalább 50%-át gyakorlati helyszínen kell lebonyolítani") és ennek alapján számolja az elmélet/gyakorlat arányt. **NINCS modul generálás ebben a lépésben.**
    2. **`generateModulesForSubject`** (Phase 2): Modulok bontása tantárgyanként, szekvenciálisan. Elmélet: 1 óra = 1 modul. Gyakorlat: 7 óra = 1 modul (műhelynap). A `X.X.X.6` "A tantárgy témakörei" pont alapján bontja fel az AI.
    3. **`buildContentPrompt`** (Phase 3): 2-es batch-ekben történő tartalom generálás. Elmélet: **pontosan 4-5 mondatos** szakmai kifejtés. Gyakorlat: **6-8 lépéses** ipari munkafolyamat (Munkavédelem → Kalibrálás → Főműveletek → Utóműveletek → Minőségellenőrzés → Adminisztráció).
  - **Fontos prompt szabályok**:
    - Az óraszámoknál a sorrend MINDIG: [ELMÉLET] / [GYAKORLAT] (magyar szakképzési konvenció)
    - A `3.X.X.4` pont a tantárgy RÉSZLETES LEÍRÁSÁBAN található (nem az összesítő táblázatban)
    - A kódok a PTT-ben 3 számjegyesek (3.3.1), míg a DB-ben 2 számjegyesek (3.1) lehetnek - a tantárgy NEVE alapján kell párosítani
  - **Stabilitási javítások**: Phase 1 párhuzamosság 1-re csökkentve, batch méret 2-re csökkentve, minden AI hívás 120s timeout-tal védve, `tryRepairJson` a csonkolt JSON-ok javítására
  - **Típusonkénti szűrés**:
    - `theory` import: csak theory subject-ek jönnek létre, csak theory modulok generálódnak
    - `practical` import: nem jönnek létre theory subject-ek, csak practical modulok
    - `both` import: mindkét típus
  - **Érintett fájlok**: `server/ikk-service.ts` (új metódusok: `extractSubjectHours`, `generateModulesForSubject`, frissített `buildContentPrompt`), `server/routes/ikk.ts` (teljesen átírt import flow), `.clinerules` (módosítva)
  - **Dokumentáció**: `ikk import logika.pdf` (6 prompt specifikációja)

## 📌 Szabályok és Irányelvek az AI számára

1. **NE KUTYULD ÖSSZE!**: Az elméleti és gyakorlati modulokat mindig szigorúan külön kell kezelni. Soha ne keverd a pedagógiai módszertanokat.
2. **Mindig frissítsd a `docs/developer/task-log.md` fájlt** jelentős módosítások után.
3. **Használd a `docs/developer/prompts.md` fájlt** mielőtt változtatnál az IKK vagy tananyag generálási logikán.
4. **Nincs redundáns komponens**: Új UI elem előtt ellenőrizd a `docs/developer/component-catalog.md` fájlt.
5. **FIGYELEM**: A Google Translate-et ki KELL kapcsolni az admin felületen, mert összeomlást okoz a React DOM kezelésében.
6. **Aesthetics is King**: A webes felületeknek modernnek, prémiumnak és dinamikusnak kell lenniük. Használj harmonikus színeket, animációkat és minőségi tipográfiát.
7. **IKK Import 3 Fázis**: Új IKK import logika bevezetésekor mindig kövesd a `ikk import logika.pdf` dokumentumban leírt prompt specifikációkat. A 3 fázis szigorúan elkülönítve fut: (1) tantárgyak+óraszámok, (2) modul bontás, (3) tartalom generálás.
8. **`.clinerules` fájl**: A projekt alapvető törvényeit tartalmazza. Módosítása csak indokolt esetben, a projekt konvencióinak megfelelően történjen.