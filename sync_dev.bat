@echo off
echo [+] FEJLESZTOI (DEV) OLDAL FRISSITESE...
git add .
git commit -m "Fejlesztesi mentes: %date% %time%"
git push origin dev
echo.
echo [OK] A teszt oldal frissitese elindult a Renderen!
timeout /t 5
