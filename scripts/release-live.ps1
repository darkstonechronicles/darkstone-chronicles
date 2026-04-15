param(
  [Parameter(Mandatory = $true)]
  [string]$Message
)

$ErrorActionPreference = "Stop"

Write-Host "Bumping asset version..." -ForegroundColor Cyan
node scripts\bump-asset-version.js

Write-Host "Staging files..." -ForegroundColor Cyan
git add .

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
git push origin main

Write-Host "Release complete." -ForegroundColor Green
