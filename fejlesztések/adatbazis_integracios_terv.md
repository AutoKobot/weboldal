# Adatbázis Integrációs és Szinkronizációs Terv

## Célkitűzés
Az Interaktív Tananyag rendszer összekapcsolása a Központi Iskolai Nyilvántartóval (Supabase).
A cél a tanulói és oktatói adatok központosított kezelése, miközben a tananyagok és szakmai tartalmak továbbra is a jelenlegi tárhelyen (Neon) maradnak, elkerülve a rendszerek szükségtelen keveredését.

## Logikai Architektúra
A rendszer egy hibrid adatbázis-modellre fog átállni, ahol a feladatkörök szétválnak:

1.  **Neon DB (Tartalomkezelő):**
    - `modules` (tananyag modulok)
    - `subjects` (tantárgyak)
    - `professions` (szakmák tartalom felőli része)
    - `flashcards` (tanulókártyák)
    - `chat_messages` (AI tanár beszélgetések)
    - *Ez az adatbázis felel a rendszer szakmai "lelkérét", ami független maradhat az adminisztratív nyilvántartástól.*

2.  **Supabase DB (Nyilvántartó és Értékelő):**
    - `users` (diákok és oktatók összes adata)
    - `classes` (osztályok névsora és beosztása)
    - `test_results` (tudáspróbák eredményei, jegyek)
    - `attendance` (napi jelenléti adatok)
    - *Ez az adatbázis a "közös nevező" a másik weboldallal.*

## Megvalósítási Lépések (Logikai sorrendben)

### 1. Előkészítés és Feltérképezés (FOLYAMATBAN)
- **Séma Mapping:** A Supabase adatbázis `auth` és `public` sémái közötti összefüggések elemzése.
- **Kompatibilitási vizsgáltat:** Annak ellenőrzése, hogy a jelenlegi `schema.ts`-ben definiált mezők (pl. `xp`, `completedModules`) hogyan illeszthetők be a Supabase adatbázisába a legkisebb átalakítással.

### 2. Két-adatbázisos motor kialakítása
- A `server/db.ts` felkészítése két párhuzamos adatbázis-kapcsolati pool (Neon és Supabase) kezelésére.
- Olyan logikai réteg kialakítása, amely automatikusan a megfelelő helyre irányítja a kéréseket.

### 3. Adatmigrációs és Szinkronizációs stratégia
- **Beolvasás:** A diákok és tanárok adatainak beolvasása közvetlenül a Supabase-ben lévő táblákból.
- **Írás:** A jegyek (test_results) és a jelenlét (attendance) írása a Supabase-ben lévő közös táblákba.
- **Biztonság:** A hozzáférési jogok (admin, tanár, diák) összehangolása.

## Előnyök
- **Valós idejű adatok:** Nem kell várni a szinkronizációra, a jegy azonnal látszik az adminisztratív oldalon is.
- **Stabilitás:** A tananyagok biztonságban maradnak a Neon-on, így egy esetleges Supabase karbantartás alatt az olvasóleckék még elérhetőek lehetnek.
- **Skálázhatóság:** A két rendszer egymástól függetlenül fejleszthető.

## Kockázatok
- **Azonosító ütközések:** A UUID-k (Supabase) és a String alapú ID-k (miénk) közötti konverzió.
- **Séma módosítások:** Ha a másik weboldal fejlesztői módosítják a Supabase sémát, az nálunk is hibát okozhat.

---
**Kelt:** 2026. április 14.
**Készítette:** Antigravity AI
