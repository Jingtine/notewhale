# NoteWhale backend starter example.
# Copy this file to start_backend.local.ps1 if you want local custom changes.

$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$requirements = Join-Path $PSScriptRoot "requirements.txt"

function Find-Python {
  $candidates = @("py", "python", "python3")

  foreach ($candidate in $candidates) {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($command) {
      return $candidate
    }
  }

  return $null
}

if (-not (Test-Path $venvPython)) {
  $pythonCommand = Find-Python

  if (-not $pythonCommand) {
    Write-Host "Python was not found on PATH. Install Python 3.11+ first, then rerun this script." -ForegroundColor Red
    exit 1
  }

  Write-Host "Creating backend virtual environment..." -ForegroundColor Cyan
  & $pythonCommand -m venv .venv
}

try {
  & $venvPython --version | Out-Host
} catch {
  Write-Host "The existing .venv is not usable. Remove backend\.venv and rerun this script." -ForegroundColor Red
  exit 1
}

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
& $venvPython -m pip install -r $requirements

if (-not $env:NOTEWHALE_SECRET_KEY) {
  $env:NOTEWHALE_SECRET_KEY = "notewhale-local-dev-secret-change-before-deploy"
}

if (-not $env:NOTEWHALE_TEXT_API_URL) {
  $env:NOTEWHALE_TEXT_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
}

if (-not $env:NOTEWHALE_TEXT_MODEL) {
  $env:NOTEWHALE_TEXT_MODEL = "glm-4-flash-250414"
}

if (-not $env:NOTEWHALE_VISION_API_URL) {
  $env:NOTEWHALE_VISION_API_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
}

if (-not $env:NOTEWHALE_VISION_MODEL) {
  $env:NOTEWHALE_VISION_MODEL = "glm-4v-flash"
}

Write-Host "Checking Python syntax..." -ForegroundColor Cyan
& $venvPython -m py_compile main.py models.py database.py

Write-Host "Starting NoteWhale backend at http://127.0.0.1:8000" -ForegroundColor Green
& $venvPython -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
