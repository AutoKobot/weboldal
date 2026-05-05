# Virtuális Műhely - Fejlesztési Terv

Ez a dokumentum a szakmai tananyagba integrált interaktív 3D szimulációs környezet (robotkar, CNC gép, hegesztőállomás) megvalósításának lépéseit tartalmazza.

## 1. Fázis: Alapozás és Adatmodell
- [ ] **Séma bővítése:** A `modules` táblához vagy egy új `workshop_tasks` táblához adjunk hozzá egy `workshopConfig` (JSONB) mezőt.
- [ ] **Feladat struktúra:** Definíció szerint minden feladathoz tartozzon:
    - Gép típusa (pl. `robot-arm-6axis`)
    - Kezdőállapot (munkadarab pozíciója)
    - Célállapot (pl. hol legyen a furat)
    - Sikerfeltételek (tolerancia küszöbök)

## 2. Fázis: 3D Megjelenítő Motor (Three.js)
- [ ] **WorkshopScene komponens:** Egy bázis komponens létrehozása `@react-three/fiber` alapokon.
- [ ] **Alapgépek modellezése:**
    - `RobotArm`: Primitívekből (Box, Cylinder) felépített csuklós kar.
    - `Worktable`: Munkalap koordináta rácsozással.
- [ ] **Inverz Kinematika (IK):** FABRIK algoritmus implementálása, hogy a robotkar vége kövesse a célpontot.

## 3. Fázis: Interaktív Felület
- [ ] **Workshop Card:** Új kártya típus a modul nézetben.
- [ ] **Control Panel:**
    - Egyszerű irányító gombok (Jogging).
    - Mini G-kód vagy parancssoros beviteli mező.
- [ ] **Feladatlista:** A modulon belüli szekvenciális feladatok megjelenítése.

## 4. Fázis: Logika és Értékelés
- [ ] **Simulation Engine:** Parancsok (pl. `MOVE TO 10,20`) lefordítása 3D mozgássá.
- [ ] **Validation:** A mozgás végén a rendszer ellenőrzi a szerszám és a munkadarab relatív helyzetét.
- [ ] **Feedback System:** Vizuális jelzés (zöld/piros) és szöveges AI visszajelzés a teljesítményről.

## 5. Fázis: AI Automatizáció
- [ ] **Task Generator:** Olyan AI prompt készítése, ami a modul szöveges leírásából legenerálja a `workshopConfig` JSON-t.
- [ ] **Tutor AI:** Interaktív segítség, ha a diák elakad a programozásban.

---
*Megjegyzés: A projektben már rendelkezésre áll a Three.js és a React Three Fiber, így a technikai akadályok elhárultak.*
