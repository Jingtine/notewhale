@echo off
setlocal

cd /d "%~dp0"
set "DATABASE_URL="
set "NOTEWHALE_UPLOAD_DIR=uploads"

".venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
