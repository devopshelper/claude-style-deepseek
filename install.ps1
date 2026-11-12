# Claude Style for DeepSeek Harness - installer (Windows).
#
#   .\install.ps1                       install into the "web" profile from GitHub
#   .\install.ps1 -Profile desktop      install into the desktop profile
#   .\install.ps1 -Local                install this working copy instead of GitHub
#   .\install.ps1 -DryRun               print the command, run nothing
#
# The installer runs one `dsh plugin` command. It never edits a profile by hand.
[CmdletBinding()]
param(
  [string]$Profile = 'web',
  [string]$Spec = 'github:devopshelper/claude-style-deepseek',
  [switch]$Local,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Repo = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command dsh -ErrorAction SilentlyContinue)) {
  Write-Error "dsh is not on PATH. Install DeepSeek Harness first, or run this from a shell where 'dsh' resolves."
  exit 1
}

$Target = if ($Local) { $Repo } else { $Spec }
$Command = @('plugin', '--profile', $Profile, 'add', $Target)

if ($DryRun) {
  Write-Host ("dsh " + ($Command -join ' '))
  exit 0
}

Write-Host "Installing Claude Style into the '$Profile' profile..."
& dsh @Command
if ($LASTEXITCODE -ne 0) {
  Write-Error "dsh plugin add failed with exit code $LASTEXITCODE. Nothing was enabled."
  exit $LASTEXITCODE
}

Write-Host ''
Write-Host 'Installed.'
Write-Host '  1. Refresh the app window (Ctrl+R).'
Write-Host '  2. Settings -> Plugins -> Claude Style toggles the palette and the transcript skin.'
Write-Host '  3. Restart DeepSeek Harness once if the theme does not appear after the refresh.'
Write-Host ''
Write-Host "Remove it later with: dsh plugin --profile $Profile remove claude-style-deepseek"
