@echo off
chcp 65001 >nul
cd /d "%~dp0tools\stem-proxy"
echo.
echo  ========================================
echo   בוזוקי — שירות הורדת YouTube למחשב
echo   השאירו את החלון הזה פתוח
echo  ========================================
echo.
where yt-dlp >nul 2>&1
if errorlevel 1 (
  echo [אזהרה] yt-dlp לא נמצא. התקנה: winget install yt-dlp
  echo.
)
if not exist node_modules (
  echo מתקין תלויות...
  call npm install
)
start "" "https://bouzoukifret.vercel.app"
echo פותח את האתר בדפדפן...
echo.
call npm start
