@echo off
title Deploy ke Firebase kafilasuci4
echo ======================================================================
echo   DEPLOY KE FIREBASE: kafilasuci4
echo ======================================================================
echo.
echo Pastikan Anda sudah login ke Firebase:
echo ^> firebase login
echo.
echo Mengupload folder dist ke project kafilasuci4...
echo.
echo Menjalankan build terlebih dahulu...
call npm run build
echo.
firebase deploy --only hosting
echo.
echo ======================================================================
echo Selesai! Web Anda aktif di https://kafilasuci4.web.app
echo ======================================================================
pause
