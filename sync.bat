@echo off
echo [+] Valtoztatasok osszegyujtese...
git add .

echo [+] Mentes folyamatban...
git commit -m "Auto-update from sync.bat: %date% %time%"

echo [+] Feltoltes GitHubra (ez inditja a Rendet frissitest)...
git push origin main

echo.
echo [OK] A feltoltes kesz, a Render szerver most mar frissit!
timeout /t 5
