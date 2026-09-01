# ============================================================
#  scripts/build-electron.ps1
#  Full production build -> .exe installer
#
#  Usage:
#    npm run electron:build          # Local .exe build only
#    npm run electron:publish        # Build & publish to GitHub Releases
# ============================================================

param(
  [switch]$Publish
)

$root = Split-Path -Parent $PSScriptRoot   # project root
Set-Location $root

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  AI TTS Generator - Electron Build Pipeline" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# -- Load GH_TOKEN from .env if not already in environment ---
if (-not $env:GH_TOKEN -and (Test-Path "$root\.env")) {
  $envLines = Get-Content "$root\.env"
  foreach ($line in $envLines) {
    if ($line -match '^\s*GH_TOKEN\s*=\s*["'']?([^"'']+)["'']?') {
      $env:GH_TOKEN = $matches[1].Trim()
      Write-Host "[OK] Loaded GH_TOKEN from .env" -ForegroundColor Green
      break
    }
  }
}

# -- Step 1: Next.js standalone build ------------------------
Write-Host "[1/3] Building Next.js (standalone)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { 
  Write-Host "❌ Error: next build failed with exit code $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE 
}

# -- Step 2: Copy public/ and .next/static into standalone ---
Write-Host ""
Write-Host "[2/3] Copying static assets into standalone output..." -ForegroundColor Yellow
node scripts/copy-static.mjs
if ($LASTEXITCODE -ne 0) { 
  Write-Host "❌ Error: copy-static.mjs failed with exit code $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE 
}

# -- Step 3: electron-builder packaging ----------------------
Write-Host ""
if ($Publish) {
  if (-not $env:GH_TOKEN) {
    Write-Host "[WARNING] GH_TOKEN is not set in environment or .env. Publishing might fail." -ForegroundColor Red
  }
  Write-Host "[3/3] Packaging & Publishing to GitHub Releases..." -ForegroundColor Yellow
  npx electron-builder --win --x64 --publish always
} else {
  Write-Host "[3/3] Packaging with electron-builder (local installer)..." -ForegroundColor Yellow
  npx electron-builder --win --x64
}
if ($LASTEXITCODE -ne 0) { 
  Write-Host "❌ Error: electron-builder failed with exit code $LASTEXITCODE" -ForegroundColor Red
  exit $LASTEXITCODE 
}

# -- Done ----------------------------------------------------
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  [OK] Build complete! dist folder:" -ForegroundColor Green
Get-ChildItem "$root\dist" -Filter "*.exe" | ForEach-Object {
  $size = [math]::Round($_.Length / 1MB, 1)
  Write-Host "     * $($_.Name)  ($size MB)" -ForegroundColor White
}
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
