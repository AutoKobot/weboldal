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

## 🛠️ Segédeszközök

- **`scripts/map-codebase.ts`**: Indexeli a függvényeket és osztályokat a gyors navigációhoz.
- **`scripts/code-map.json`**: A térkép szkript kimenete.
- **`scripts/data-integrity-check.ts`**: Diagnosztikai eszköz az adatbázis konzisztencia ellenőrzéséhez.

## 🚀 Legutóbbi Fontos Fejlesztések

- **Elmélet és Gyakorlat Szigorú Szétválasztása**:
  - Az IKK importálás során külön választható az Elméleti vagy Gyakorlati tananyag kinyerése.
  - A generált tartalom stílusa alkalmazkodik a típushoz: az elmélet akadémiai mélységű, a gyakorlat feladat-orientált (eszközökkel, biztonsági előírásokkal).
- **Admin Dashboard Frissítés**:
  - Az IKK Import gomb helyett három célirányos gomb került a fejlécre: **IKK Elmélet**, **IKK Gyakorlat** és **Teljes Import**.
  - A szinkronizáció során a kiválasztott típusnak megfelelő gomb kiemelt marad az átláthatóság érdekében.
- **Hibajavítások és Stabilitás**:
  - **Ikonok**: Pótólva a hiányzó `Wrench` és egyéb `lucide-react` importok a diák felületen.
  - **Akadálymentesítés**: Minden interaktív elem (gombok, iframe-ek) kapott `aria-label` vagy `title` attribútumot.
  - **Típusbiztonság**: Javítva a `ProfessionManager` TypeScript hibái és a dátumkezelési problémák.

## 📌 Szabályok és Irányelvek az AI számára

1. **NE KUTYULD ÖSSZE!**: Az elméleti és gyakorlati modulokat mindig szigorúan külön kell kezelni. Soha ne keverd a pedagógiai módszertanokat.
2. **Mindig frissítsd a `docs/developer/task-log.md` fájlt** jelentős módosítások után.
3. **Használd a `docs/developer/prompts.md` fájlt** mielőtt változtatnál az IKK vagy tananyag generálási logikán.
4. **Nincs redundáns komponens**: Új UI elem előtt ellenőrizd a `docs/developer/component-catalog.md` fájlt.
5. **FIGYELEM**: A Google Translate-et ki KELL kapcsolni az admin felületen, mert összeomlást okoz a React DOM kezelésében.
6. **Aesthetics is King**: A webes felületeknek modernnek, prémiumnak és dinamikusnak kell lenniük. Használj harmonikus színeket, animációkat és minőségi tipográfiát.
