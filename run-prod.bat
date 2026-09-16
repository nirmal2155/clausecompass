@echo off
echo Starting ClauseCompass Production Server...
start http://localhost:3000
node .\node_modules\next\dist\bin\next start -p 3000
pause
