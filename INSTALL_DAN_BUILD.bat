@echo off
title Install Dependencies & Build
echo ========================================================
echo   STEP 1: INSTALL DEPENDENCIES (Firebase, React, dll)
echo ========================================================
echo.
call npm install
echo.
echo ========================================================
echo   STEP 2: BUILD APLIKASI (npm run build)
echo ========================================================
echo.
call npm run build
echo.
echo ========================================================
echo Selesai! Folder 'dist' sudah siap di-deploy.
echo Anda sekarang bisa menjalankan DEPLOY_KE_FIREBASE.bat
echo ========================================================
pause
