@echo off
echo [!] FIGYELEM: EZ AZ ELES (PROD) OLDALAT FOGJA FRISSITENI!
echo Csak akkor folytasd, ha a teszt oldalon mindent rendben talaltal.
echo.
set /p choice="Biztosan frissited az ELES oldalt? (i/n): "
if /i "%choice%" neq "i" exit

echo [+] Valtoztatasok bekuldese az eles (main) agra...
git push origin dev:main --force

echo.
echo [OK] Az ELES oldal frissitese elindult a Railway-en!
timeout /t 5
