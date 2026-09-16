@echo off
echo Starting ClauseCompass...
start http://localhost:3000
node .\node_modules\next\dist\bin\next dev
pause
