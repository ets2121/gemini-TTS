# ============================================================
#  scripts/build-electron.ps1
#  Full production build → .exe installer
#
#  Usage:
#    npm run electron:build
#    # or directly:
#    powershell -ExecutionPolicy Bypass -File scripts\build-electron.ps1
#
#  To also PUBLISH to GitHub Releases, set GH_TOKEN first:
#    $env:GH_TOKEN = "ghp_xxxx..."
#    npm run electron:build
# ============================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot   # project root

Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Gemini TTS Studio — Electron Build Pipeline" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Next.js standalone build ────────────────────────
Write-Host "▶  [1/4] Building Next.js (standalone)..." -ForegroundColor Yellow
Set-Location $root
npm run build
if ($LASTEXITCODE -ne 0) { throw "next build failed" }

# ── Step 2: Copy public/ and .next/static into standalone ───
Write-Host ""
Write-Host "▶  [2/4] Copying static assets into standalone output..." -ForegroundColor Yellow
node scripts/copy-static.mjs
if ($LASTEXITCODE -ne 0) { throw "copy-static.mjs failed" }

# ── Step 3: Production npm install (only electron-updater) ──
Write-Host ""
Write-Host "▶  [3/4] Installing production dependencies for Electron..." -ForegroundColor Yellow
npm install --omit=dev --ignore-scripts 2>&1 | Out-Null
# Restore dev deps for future dev work
npm install 2>&1 | Out-Null
Write-Host "   ✅  Done." -ForegroundColor Green

# ── Step 4: electron-builder packaging ──────────────────────
Write-Host ""
Write-Host "▶  [4/4] Packaging with electron-builder..." -ForegroundColor Yellow
npx electron-builder --win --x64
if ($LASTEXITCODE -ne 0) { throw "electron-builder failed" }

# ── Done ────────────────────────────────────────────────────
Write-Host ""
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅  Build complete!  dist\ folder:" -ForegroundColor Green
Get-ChildItem "$root\dist" -Filter "*.exe" | ForEach-Object {
  $size = [math]::Round($_.Length / 1MB, 1)
  Write-Host "     📦  $($_.Name)  ($size MB)" -ForegroundColor White
}
Write-Host "══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
