@echo off
title Kirsehir Taksi Server
cd /d "E:\PROJELER\kirsehirtaksi"
echo ========================================================
echo   KIRSEHIR TAKSI (kirsehirtaksi.net) BASLATILIYOR...
echo ========================================================
start http://localhost:3000/
bun run dev
pause
