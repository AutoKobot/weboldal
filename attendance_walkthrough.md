# Automated Attendance System - Felhasználói Útmutató

Az új jelenléti rendszer lehetővé teszi a tanulók automatikus óránkénti regisztrációját, a tanárok számára pedig egy mobilbarát felületet biztosít a jelenlét ellenőrzésére, módosítására és napi megjegyzések fűzésére.

## 1. Automatikus Jelenlét (Tanulóknak)
A tanulóknak nincs külön teendőjük a jelenlét rögzítéséhez.
- Amikor a tanuló bejelentkezik a weboldalra, a rendszer **automatikusan** rögzíti a jelenlétét az aktuális tanórához.
- A rendszer felismeri, hogy a diák **délelőtti** vagy **délutáni** munkarendbe tartozik-e, és az annak megfelelő órarendhez rögzíti a jelenlétet.

## 2. Tanári Dashboard (Jelenlét Fül)
A tanárok az **Osztályok kezelése** oldalon belül az új **Jelenlét** fülön kezelhetik az adatokat:
- **Napi nézet**: Kiválasztható az osztály és a dátum.
- **Óránkénti bontás**: A rendszer listázza az adott napi tanórákat és a hozzájuk tartozó diákokat.
- **Státusz módosítása**: A tanár kézzel is átállíthatja a diák státuszát (`Jelen`, `Késő`, `Igazolt`, `Hiányzik`).
- **Napi megjegyzések**: Minden diákhoz fűzhető egy szabad szöveges megjegyzés az adott napra.
- **CSV Export**: Az osztály jelenléti adatai és a megjegyzések letölthetők Excel-kompatibilis CSV formátumban.

## 3. Iskola Admin Dashboard (Órarend és Műszakok)
Az iskola adminisztrátorai a **Hozzárendelések** és **Órarend** füleken konfigurálhatják a rendszert:
- **Műszakválasztás**: Új osztály létrehozásakor vagy szerkesztésekor megadható a munkarend (Délelőtt/Délután).
- **Egyedi csengetési rend**: Az **Órarend** fülön műszakonként külön-külön beállíthatók a tanórák pontos időpontjai.

> [!TIP]
> Ha egy diák elfelejt bejelentkezni, a tanár utólag bármikor rögzítheti a jelenlétét a Dashboardon.
