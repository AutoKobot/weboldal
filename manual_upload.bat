@echo off
echo ========================================
echo   GitHub Gyors Feltoltes (Manual)
echo ========================================
echo.

:: Ellenorizzuk a valtozasokat
git status -s

echo.
set /p msg="Add meg a commit uzenetet (vagy Enter): "
if "%msg%"=="" set msg="Update: Reszletes osztalyzat nyomtatas"

echo.
echo [+] Valtozasok hozzaadasa (git add .)...
git add .

echo [+] Mentes (git commit)...
git commit -m "%msg%"

echo [+] Feltoltes GitHub-ra (git push)...
git push origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Hiba a 'main' agnal, probaljuk a 'master'-t...
    git push origin master
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HIBA] A feltoltes nem sikerult! Ellenorizd a kapcsolatot vagy a jogosultsagokat.
) else (
    echo.
    echo [SIKER] Minden valtozas feltoltve!
)

echo.
echo Nyomj meg egy gombot a kilépéshez...
pause > nul
