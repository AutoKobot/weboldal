@echo off
echo [GitHub Feltoltes] Valtozasok keresese...

:: Beallitjuk a GitHub cimet ha meg nem lenne
git remote remove origin 2>nul
git remote add origin https://github.com/AutoKobot/weboldal

git add .
set /p commit_msg="Add meg a commit uzenetet (vagy hagyd uresen az alapertelmezetthez): "
if "%commit_msg%"=="" set commit_msg="Fix white screen and update AdminDashboard logic"

echo [GitHub Feltoltes] Mentes (commit)...
git commit -m "%commit_msg%"

echo [GitHub Feltoltes] Feltoltes a GitHub-ra...
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [PROBALJUK MASTER AGGYAL...]
    git push -u origin master
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [HIBA] A feltoltes sikertelen. Ellenorizd a GitHub jogaidat!
) else (
    echo.
    echo [SIKER] A kod feltoltve az AutoKobot/weboldal taroloba!
    echo A Render nemsokara frissiti az elo oldalt.
)
pause
