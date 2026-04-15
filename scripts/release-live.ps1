param(
  [Parameter(Mandatory = $true)]
  [string]$Message,

  [string]$LiveUrl = "https://www.darkstone-chronicles.com/",

  [int]$VerifyTimeoutSec = 180,

  [int]$VerifyIntervalSec = 5
)

$ErrorActionPreference = "Stop"

function Test-GitHasWorkingChanges {
  git diff --quiet --
  if ($LASTEXITCODE -ne 0) { return $true }

  git diff --cached --quiet --
  if ($LASTEXITCODE -ne 0) { return $true }

  $untracked = git ls-files --others --exclude-standard
  return -not [string]::IsNullOrWhiteSpace(($untracked | Out-String))
}

function New-AssetVersion {
  $now = Get-Date
  return "{0}{1}{2}-{3}{4}{5}" -f $now.Year, $now.ToString("MM"), $now.ToString("dd"), $now.ToString("HH"), $now.ToString("mm"), $now.ToString("ss")
}

function Get-LiveContent {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  $headers = @{
    "Cache-Control" = "no-cache"
    "Pragma"        = "no-cache"
  }

  return (Invoke-WebRequest -Uri $Url -UseBasicParsing -Headers $headers).Content
}

if (-not (Test-GitHasWorkingChanges)) {
  Write-Host "No local changes to release. Everything is already synced with git." -ForegroundColor Green
  return
}

$assetVersion = New-AssetVersion

Write-Host "Bumping asset version to $assetVersion..." -ForegroundColor Cyan
node scripts\bump-asset-version.js $assetVersion

Write-Host "Staging files..." -ForegroundColor Cyan
git add .

git diff --cached --quiet --
if ($LASTEXITCODE -eq 0) {
  Write-Host "Nothing new to commit after staging. Live release skipped." -ForegroundColor Green
  return
}

Write-Host "Creating commit..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "Pushing to origin/main..." -ForegroundColor Cyan
git push origin main

Write-Host "GitHub push complete." -ForegroundColor Green

$deadline = (Get-Date).AddSeconds([Math]::Max(10, $VerifyTimeoutSec))
$versionMarker = "?v=$assetVersion"
$liveVerified = $false

Write-Host "Verifying live site at $LiveUrl ..." -ForegroundColor Cyan

while ((Get-Date) -lt $deadline) {
  try {
    $content = Get-LiveContent -Url $LiveUrl
    if ($content -like "*$versionMarker*") {
      $liveVerified = $true
      break
    }

    Write-Host "Live site not updated yet. Waiting $VerifyIntervalSec seconds..." -ForegroundColor Yellow
  } catch {
    Write-Host "Live check failed temporarily: $($_.Exception.Message)" -ForegroundColor Yellow
  }

  Start-Sleep -Seconds ([Math]::Max(2, $VerifyIntervalSec))
}

if ($liveVerified) {
  Write-Host "Release complete. Live site is serving asset version $assetVersion." -ForegroundColor Green
} else {
  Write-Host "Push succeeded, but live site did not confirm version $assetVersion within $VerifyTimeoutSec seconds." -ForegroundColor Yellow
  Write-Host "GitHub is updated. The deploy/cache layer may still be catching up." -ForegroundColor Yellow
}
