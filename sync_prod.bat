@echo off
echo [!] FIGYELEM: EZ AZ ELES (PROD) OLDALAT FOGJA FRISSITENI!
echo Csak akkor folytasd, ha a teszt oldalon mindent rendben talaltal.
echo.
set /p choice="Biztosan frissited az ELES oldalt? (i/n): "
if /i "%choice%" neq "i" exit

echo [+] Valtoztatasok atmasolasa az eles agra...
git checkout main
git merge dev
git push origin main
git checkout dev

echo.
echo [OK] Az ELES oldal frissitese elindult!
timeout /t 5
