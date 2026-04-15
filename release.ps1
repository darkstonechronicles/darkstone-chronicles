param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Message,

  [string]$LiveUrl = "https://www.darkstone-chronicles.com/",

  [int]$VerifyTimeoutSec = 180,

  [int]$VerifyIntervalSec = 5
)

$ErrorActionPreference = "Stop"

powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\scripts\release-live.ps1" -Message $Message -LiveUrl $LiveUrl -VerifyTimeoutSec $VerifyTimeoutSec -VerifyIntervalSec $VerifyIntervalSec
