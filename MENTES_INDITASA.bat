@echo off
echo [+] INTERAKTIV TANANYAG MENTES INDITASA...
echo.
npx tsx scripts/create-backup.ts
echo.
echo [OK] Az adatbazis mentese elkeszult a 'backups' mappaban!
echo.
echo Tipp: Masold a 'backups' mappa tartalmat es a '.env' fajlt a Google Drive-ra.
pause
