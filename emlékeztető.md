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
- **IKK Import Optimalizálás**:
  - Granuláris modulbontás: A nagy fejezeteket az AI automatikusan szétbontja logikai almodulokra (a, b, c).
  - Megnövelt tartalom: 8-10 mondatos szakmai leírások és 5-8 konkrét gyakorlati feladat minden modulhoz.
  - Stabilitás: Kisebb batch méret (4) és 120s timeout a biztosabb generálásért.
- **Sorrendezés és Láthatóság**:
  - A tantárgyak (pl. 3.1, 3.1.1) és modulok természetes numerikus sorrendben jelennek meg minden felületen.
  - Intézményi láthatóság (School-Aware): Az iskola adminok látják az összes hozzájuk tartozó tanárt és diákot, függetlenül attól, ki hozta létre őket.
- **Hibajavítások**:
  - Megszűnt a modulcímek sorszám-duplikációja (pl. 3.1.1.) a robusztusabb regex-szel.
  - Pótólva a hiányzó `Wand2` és egyéb ikon importok.
  - Az IKK import hiba esetén nem törli a már létrehozott szakmát, segítve a hibakeresést.

## 📌 Szabályok és Irányelvek az AI számára

1. **NE KUTYULD ÖSSZE!**: Az elméleti és gyakorlati modulokat mindig szigorúan külön kell kezelni. Soha ne keverd a pedagógiai módszertanokat.
2. **Mindig frissítsd a `docs/developer/task-log.md` fájlt** jelentős módosítások után.
3. **Használd a `docs/developer/prompts.md` fájlt** mielőtt változtatnál az IKK vagy tananyag generálási logikán.
4. **Nincs redundáns komponens**: Új UI elem előtt ellenőrizd a `docs/developer/component-catalog.md` fájlt.
5. **FIGYELEM**: A Google Translate-et ki KELL kapcsolni az admin felületen, mert összeomlást okoz a React DOM kezelésében.
6. **Aesthetics is King**: A webes felületeknek modernnek, prémiumnak és dinamikusnak kell lenniük. Használj harmonikus színeket, animációkat és minőségi tipográfiát.
