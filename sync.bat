@echo off
set /p msg="Add meg a commit uzenetet (vagy hagy uresen az alapertelmezettnek): "
if "%msg%"=="" set msg="Auto-sync: %date% %time%"

echo.
echo [+] Valtoztatasok hozzaadasa...
git add .

echo [+] Mentes (commit)...
git commit -m "%msg%"

echo [+] Feltoltes GitHubra (origin main)...
git push origin main

echo.
echo [OK] Kesz! Nyomj egy gombot a bezarashoz.
pause
