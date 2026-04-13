# 🧊 3D Objektum Integráció (Koncepció)

## Célkitűzés
A statikus képi tartalom továbbfejlesztése interaktív, 3D-s objektumokra, amelyek segítik a térbeli megértést és a technikai részletek alaposabb megismerését.

## Javasolt Technológiai Folyamat
1. **2D-to-3D Conversion (Meta AI / LGM):** A szakmai tananyaghoz generált 2D illusztrációk automatikus átalakítása 3D modellekké (.glb vagy .obj formátum).
2. **Webes Megjelenítés:** `<model-viewer>` komponens integrálása a React frontendbe.
3. **Interakció:** Forgatás, közelítés (Zoom), és esetenként kiterjesztett valóság (AR) támogatás mobilon.

## Felhasználási Példák (Szakmai oktatás)
- **Gépészet:** 3D gépalkatrészek körbeforgatható nézete.
- **Fémipar:** Hegesztési varratok, zárványok térbeli szemléltetése.
- **Vegyipar:** Molekulák vagy tartályok felépítésének bemutatása.

## UX Előnyök
- **Mélyebb megértés:** A térbeli tárgyak jobb megértést biztosítanak a fotóknál.
- **Modern platform:** Piackutatásunk alapján kevés tanulási felület kínál ilyen szintű interaktivitást.
- **Gamifikáció:** Az objektumok gyűjthetők vagy "szétszedhetők" lehetnének a későbbi fázisokban.

## Megvalósíthatóság
Mivel a kép-3D konverzió jelenleg még fejlődőben lévő AI terület, a megvalósítás előtt egy kisebb kutatómunkát (PoC) javasolt végezni a Meta AI vagy hasonló API-k (pl. Tripo AI, CSM.ai) integrálására.
