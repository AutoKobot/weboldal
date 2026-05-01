@echo off
echo [+] MENTES ES FELTOLTES A TESZT OLDALRA...
git add .
git commit -m "Mentes: %date% %time%"
git push origin dev
echo.
echo [OK] A Teszt oldal frissitese elindult a Renderen!
timeout /t 5
