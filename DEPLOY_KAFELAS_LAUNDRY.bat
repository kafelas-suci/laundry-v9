@echo off
title Deploy Kafela's Laundry ke Firebase
echo ========================================================
echo   UPLOAD / DEPLOY KAFELA'S LAUNDRY KE FIREBASE HOSTING
echo ========================================================
echo.
echo Mengupload folder 'dist' ke https://kafelaslaundry.web.app ...
echo.
firebase deploy --only hosting
echo.
echo ========================================================
echo Selesai! Web Anda aktif di https://kafelaslaundry.web.app
echo ========================================================
pause
