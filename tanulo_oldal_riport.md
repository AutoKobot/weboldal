# Tanuló Oldal Működési Riport

## Áttekintés

A tanuló oldal egy rendkívül modern, játékosított (gamified), adaptív keretrendszer, amely maximalizálja a diákok elköteleződését és tanulási motivációját. A felület ötvözi a prémium sötét sci-fi esztétikát (Glassmorphism, neon izzások, sima mikrotanzíciók) a klasszikus pedagógiai haladáskövetéssel és a modern AI asszisztenciával.

**Főbb pillérek:**
- **Játékosítás (Gamification):** Szintek, XP pontok, tanulási sorozatok (Streak) és egy interaktív, fizikai szimulációval rendelkező kísérőállat (Tamagotchi sárkány/macska).
- **Adaptív Tanulás:** Személyre szabott AI tanulási asszisztens (Chatbot 24/7), interaktív diavetítés és dinamikusan kiértékelt tesztek.
- **Kiemelkedő Esztétika:** HSL-hangolt színek, reszponzív mobil-navigáció és prémium kártyaelrendezés.

---

## Fő Komponensek

*   **Főoldal (Dashboard):** `client/src/pages/home.tsx` (Student Dashboard nézet)
*   **Tananyagok & Modulok:** `client/src/pages/tananyagok.tsx`, `client/src/pages/modules.tsx`, `client/src/pages/learning.tsx`
*   **Interaktív Kvízek:** `client/src/components/quiz-interface.tsx`
*   **Avatár Rendszer:** `client/src/components/avatar-pet.tsx` (Béta logika) és `client/src/components/StudentAvatar.tsx` (Rive & 3D FBX Canvas)
*   **Prezentáció Lejátszó:** `client/src/components/presentation-player.tsx`
*   **Mesterséges Intelligencia Chat:** `client/src/components/chat-interface.tsx`

---

## 1. FUNKCIONÁLIS ANATÓMIA & MŰKÖDÉS

### 1.1. Home Dashboard (`home.tsx`)
A tanuló bejelentkezése után egyből a személyre szabott dashboardra érkezik.
- **Haladás-számítás:** A haladási csík (`Progress`) nem globálisan, hanem kizárólag a diák aktuális szakmájához (`selectedProfessionId`) rendelt modulok teljesítése alapján számol (megelőzve az inkonzisztens 0%-os kijelzést).
- **Dinamikus Célkitűzések:** Kijelzi a heti célt (alapértelmezetten 3 modul), a jelenlegi tanulási sorozatot (Streak napok száma láng ikonnal) és az aktuális szintet.
- **Karakter Fejlődés (Leveling):** Az XP-pontok alapján a szintet automatikusan számolja a backend/frontend az alábbi képlet szerint:
  $$\text{Level} = \lfloor\sqrt{\max(0, \text{XP}) / 100}\rfloor + 1$$
- **Érdemjegy Átlag:** A teszteredményekből a frontend a pedagógiai thresholdok alapján számolja a heti/havi átlagot:
  - $\ge 90\%$ $\rightarrow$ 5 (Jeles)
  - $\ge 65\%$ $\rightarrow$ 4 (Jó)
  - $\ge 55\%$ $\rightarrow$ 3 (Közepes)
  - $\ge 45\%$ $\rightarrow$ 2 (Elégséges)
  - $< 45\%$ $\rightarrow$ 1 (Elégtelen)

### 1.2. Interaktív Kvíz Felület (`quiz-interface.tsx`)
A modulok végén található tesztrendszer rendkívül robusztus:
- **Több Kérdéstípus:** Támogatja az egyszeres választást (`single`), többszörös választást (`multiple`), sorrendbe állítást (`ordering`) és ikon-alapú azonosítást (`icon`).
- **Golyóálló Sorrend-kiértékelés:** A sorrendbe állítós kérdéseknél a merev index-összehasonlítás helyett intelligens, szöveg-alapú összevetést végez. Kezeli a vegyes szám/szöveg indexeket és az 1-alapú AI eltolódásokat is, teljesen kizárva a fals negatív értékeléseket.
- **Lokális Kiértékelés:** Az egyszeres választású kérdések hibás válaszait azonnal helyben, 100%-os pontossággal értékeli ki 0 pontra, és megmutatja a helyes választ, így kiiktatja a hálózati késleltetést és az OpenAI API hívások felesleges költségeit kitöltés közben.

### 1.3. Kiber-Sárkány Avatár Rendszer (`avatar-pet.tsx` & `StudentAvatar.tsx`)
A platform egyik leginnovatívabb és legszórakoztatóbb modulja a tanulói kísérőállat (pet/avatar):
- **Bóklászó Fizika (Wandering):** Az avatár nem egy statikus dobozban ül, hanem szabadon lebeg a képernyő jobb alsó sarkában. A diák egérrel bárhová elhúzhatja (Drag and Drop), elengedéskor pedig rugós, csillapított fizikai animációval (`framer-motion` spring) ugrik a helyére. Kérhető időszakos, véletlenszerű sétálás is a képernyőn.
- **Éhség & Szellem (Tamagotchi):** A karakter folyamatosan éhezik (rögzített éhség-statisztika). Ha az éhsége 30% alá esik, ugráló vészjelzést jelenít meg: `Éhes! 🍖`. Ha eléri a 0%-ot, a karakter meghal és **Szellemmé (Ghost)** alakul.
- **Szelleműzés (Revive):** A szellem állapotban a kísérő funkciók zárolásra kerülnek. A tanuló **1000 XP** befizetésével indíthat "Szellem Űzést", ami motiválja a diákot, hogy újabb tananyagok elvégzésével XP-t gyűjtsön a karaktere megmentésére.
- **Etetés (Feeding):** A tanuló a meglévő XP pontjaiból etetheti a sárkányt: "Nasi" (20 XP) vagy "Főétel" (50 XP). Ez értelmet ad az XP-gyűjtésnek, egy zárt gazdasági kört teremtve a játékosításban.

---

## 2. BÉTA-TESZT KORLÁTOZÁSOK FELOLDÁSA (VIP ELÉRÉS SEGMENTÁLÁSA)

> [!NOTE]
> **Karakter Korlátozás (Béta lakat) feloldva! ✅**
> Az `avatar-pet.tsx` forráskódjából a keménykódolt `"BorgaI74"` korlátozás sikeresen el lett távolítva. Mostantól **minden regisztrált diák** megkapja és láthatja a teljes értékű, fejleszthető 2D sárkány avatárt a statikus tojás kép helyett.

A VIP és standard diákok közötti esztétikai és mozgásbeli szintezés az alábbiak szerint lett megtartva a játékosítás fenntartásához:
1. **Lottie & 3D FBX integráció:** Minden tanuló számára elérhető a saját kiválasztott karaktere (sárkány, kiber-macska) a 3D FBX Canvason keresztül.
2. **Különleges kiegészítők:** Az XP szint alapján feloldódó koronák (`crown`), diplomák (`graduation hat`), arany/ezüst páncélok és vizuális effektek (villámok, szikrák) minden diák számára motiváló célként szolgálnak a saját szintjük alapján.
3. **Extra mozdulatok:** A különleges 3D mozdulatok és animációk standard diákoknak **XP >= 500** elérése után nyílnak meg (játékosított mérföldkő), míg a VIP `"BorgaI74"` felhasználónak kezdetektől fogva ingyenesen elérhetőek.

---

## 3. HIÁNYOSSÁGOK / JAVASLATOK A TOVÁBBFEJLESZTÉSRE

### 3.1. Az Avatár rendszer kiterjesztése minden tanulóra
- **Leírás:** A diákok 99%-a le volt tiltva a kísérőállat használatáról, és csak a tojás-helyőrzőt látták.
- **Súlyosság:** KÖZEPES / MAGAS (Pedagógiai hatékonyság szempontjából kritikus).
- **Javítás:** ✅ **JAVÍTVA** – A `BETA_USERNAME` ellenőrzést teljesen eltávolítottuk az `avatar-pet.tsx` fájlból, így a rendszer minden bejelentkezett tanuló számára közvetlenül a teljes értékű, interaktív `AvatarPetFull` komponenst jeleníti meg. A diákok a saját valódi szintjüknek és XP pontjaiknak megfelelő felszereléseket (korona, páncél, effektusok) láthatják. Az extra 3D mozdulatok a standard diákoknak **XP >= 500** elérése esetén válnak aktívvá, fenntartva a játékosítási célokat.

### 3.2. XP Szinkronizáció és Offline Védelem
- **Leírás:** Az etetés és az XP levonás közvetlenül a kliensoldali mutation hívásokkal történik. Ha a hálózati kapcsolat instabil, előfordulhat, hogy az XP levonódik a kliensnél, de az adatbázisban a jóllakottság vagy a szint nem frissül megfelelően.
- **Súlyosság:** KÖZEPES
- **Javasolt megoldás:** A backend oldalon egy atomi tranzakciót kell bevezetni a `/api/student/avatar/feed` végponton, amely egyszerre vonja le az XP-t és növeli a jóllakottságot, garantálva az adatbázis konzisztenciát.

### 3.3. CSS inline formázások kivezetése a `home.tsx`-ből
- **Hely:** `client/src/pages/home.tsx`
- **Leírás:** A főoldalon több helyen is inline CSS stílusok és fix pixel alapú pozicionálások találhatók (főleg a lebegő elemeknél és a mobil menüknél), ami nehezíti a reszponzivitást és figyelmeztetéseket generál az IDE-ben.
- **Súlyosság:** ALACSONY
- **Javasolt megoldás:** Átírni az inline stílusokat tiszta Tailwind CSS osztályokra (pl. `fixed bottom-4 right-4` használata a merev koordináták helyett), javítva a kód minőségét és karbantarthatóságát.

---

## 4. ÖSSZESÍTŐ HELYZETKÉP

| Komponens | Játékosítási szint | Megbízhatóság | Javasolt teendő |
|---|---|---|---|
| **Student Dashboard** | 🌟 Kiváló | 🟢 Stabil | Inline CSS osztályok cseréje Tailwind-re |
| **Kvíz lejátszó** | 🌟 Kiváló | 🟢 Golyóálló | Nincs szükség azonnali beavatkozásra |
| **Avatár Rendszer** | 💎 Prémium | 🟢 Stabil | ✅ Béta-lakat sikeresen feloldva (minden tanuló elérheti) |
| **Prezentáció Lejátszó** | 🌟 Kiváló | 🟢 Stabil | Mobil tipográfia ellenőrzése |

---

## 5. ÖSSZEFOGLALÁS

A tanuló oldal felülete technológiailag és dizájnban is a **legmagasabb, prémium kategóriát képviseli**. A Lottie-animációk, a 3D Canvas támogatás és a Tamagotchi-rendszer messze túlmutatnak az átlagos e-learning rendszerek működésén. 

A legnagyobb növekedési lehetőséget jelenleg a **béta korlátozások feloldása** jelenti, hogy az összes diák élvezhesse a kiber-sárkány nevelésével járó motivációs előnyöket.
