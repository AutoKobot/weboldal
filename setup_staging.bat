@echo off
echo [+] Staging kornyezet elokeszitese...
echo [+] 'dev' ag letrehozasa...
git checkout -b dev
echo [+] Elso feltoltes a 'dev' agra...
git push -u origin dev
echo [OK] Sikeresen ataltal a 'dev' agra! 
echo.
echo MOST MENJ A RENDER-RE ES HOZZ LETRE AZ UJ SERVICE-T A 'dev' AGGAL!
pause
