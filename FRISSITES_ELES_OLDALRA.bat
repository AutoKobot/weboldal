@echo off
echo [!] FIGYELEM: EZ AZ ELES OLDALT FOGJA FRISSITENI!
echo Csak akkor folytasd, ha a teszt oldalon mar mindent rendben talaltal.
echo.
set /p choice="Biztosan ki akarod kuldeni a valtoztatasokat az ELES oldalra? (i/n): "
if /i "%choice%" neq "i" exit

echo [+] Valtoztatasok bekuldese az eles (main) agra...
git push origin dev:main --force

echo.
echo [OK] Az ELES oldal frissitese elindult a Railway-en!
timeout /t 5
