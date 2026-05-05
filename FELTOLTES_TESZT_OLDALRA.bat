@echo off
echo [+] MENTES ES FELTOLTES A TESZT OLDALRA...
git add .
git commit -m "Mentes: %date% %time%"
echo [+] Kenyszeritett feltoltes a dev agra...
git push origin HEAD:dev --force
echo.
echo [OK] A Teszt oldal frissitese elindult a Renderen!
timeout /t 5
