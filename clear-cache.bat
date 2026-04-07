@echo off
echo Clearing Vite cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
echo Cache cleared! Please restart the dev server.
pause
