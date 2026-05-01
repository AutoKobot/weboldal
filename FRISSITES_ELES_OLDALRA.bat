@echo off
echo [!] FIGYELEM: EZ AZ ELES OLDALT FOGJA FRISSITENI!
echo Csak akkor folytasd, ha a teszt oldalon mar mindent rendben talaltal.
echo.
set /p choice="Biztosan ki akarod kuldeni a valtoztatasokat az ELES oldalra? (i/n): "
if /i "%choice%" neq "i" exit

echo [+] Valtoztatasok atmasolasa az eles agra (Merge)...
git checkout main
git merge dev
git push origin main
git checkout dev

echo.
echo [OK] Az ELES oldal frissitese elindult a Renderen!
timeout /t 5
