@echo off
cd /d %~dp0
echo Starting server at %date% %time% > mcp_status.txt
:: CRÍTICO: No redirigir stdout (1) a archivo, Claude lo necesita.
:: Solo redirigimos stderr (2) a archivo para ver errores.
"C:\Program Files\nodejs\node.exe" index.js 2>> mcp_errors.txt
