@echo off
echo ============================================================
echo   [!] FIGYELEM: EZ AZ ELES OLDALT FOGJA FRISSITENI (MAIN AG)!
echo   A szamitogepeden levo jelenlegi fajlokat fogja feltolteni.
echo ============================================================
echo.
set /p choice="Biztosan frissiteni akarod az ELES oldalt a helyi fajlokkal? (i/n): "
if /i "%choice%" neq "i" exit

echo.
echo [+] 1. Valtozasok hozzaadasa (git add .)...
git add .

echo.
set /p commit_msg="Add meg a commit uzenetet (vagy hagyd uresen a menteshez): "
if "%commit_msg%"=="" set commit_msg="Mentes elesre: %date% %time%"

echo.
echo [+] 2. Helyi mentes letrehozasa (git commit)...
git commit -m "%commit_msg%"

echo.
echo [+] 3. Kenyszeritett feltoltes az ELES (main) agra...
git push origin HEAD:main --force

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HIBA] A feltoltes nem sikerult! Ellenorizd a GitHub jogaidat vagy az internetkapcsolatot.
) else (
    echo.
    echo [OK] Az ELES oldal frissitese sikeresen elindult a Railway-en!
)

echo.
echo Nyomj meg egy gombot a kilepeshez...
pause > nul
