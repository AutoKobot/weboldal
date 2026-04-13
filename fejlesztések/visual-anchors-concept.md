# 🚀 AI-Vizuális Horgonyok a Tananyagban (Terv)

## Célkitűzés
A bővített tananyag (Detailed Content) vizuális gazdagítása 4-5 generált, realisztikus illusztrációval, amelyek rögzítik a kulcsfontosságú mondatok jelentését. Ezzel a tanulási élmény "magazin-szerűvé" és könnyebben emészthetővé válik.

## Technikai Architektúra
1. **AI Elemzés:** A `server/openai.ts` kiegészítése egy "visual_anchoring" fázissal, amely kiválasztja a tananyag legfontosabb 4-5 állítását.
2. **Adatstruktúra:** `visual_anchors` JSONB mező a `modules` táblában (Mondat -> Kép URL kapcsolat).
3. **Queue Manager:** A meglévő `ai-queue-manager` kiterjesztése az illusztrációk háttérben történő generálására.

## UI/UX Irányelvek
- **Stílus:** Realistic Cinematic, No-Text (követve a prezentációk esztétikáját).
- **Méretezés:** Kis, lekerekített sarkú kártyák a szöveg mellett/között, amelyek kattintásra (Lightbox) nagyíthatók.
- **Progresszív betöltés:** A szöveg azonnal látszik, a képek menet közben, animálva jelennek meg.

## Előnyök
- **Extrém alacsony költség:** A Flux-Schnell modellel a generálás költsége elenyésző.
- **Magas kognitív hatékonyság:** A képi asszociáció segíti a hosszú távú memóriát.
- **Dizájn:** A platform vizuálisan egységessé válik a prezentációkkal.

## Implementációs Lépések
1. Adatbázis séma módosítása (új mező a modulokhoz).
2. Szerver oldali logika: Mondatok kiválasztása és prompt generálás.
3. Frontend: Kép-szöveg elrendezés kialakítása a `ModuleViewer`-ben.
4. Tesztelés: Különböző tantárgyak (pl. fémipar, kémia) vizuális hűségének ellenőrzése.
