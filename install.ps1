#Requires -Version 5.1
<#
    Claude Style for DeepSeek Harness - Windows installer.

    Finds the dsh CLI (PATH, the desktop app's bundled launcher, or npm),
    repairs the user PATH entry when it is missing, installs the plugin into a
    profile, and makes sure the profile selects the bundle. That last step is
    the one a plain "dsh plugin add" does not do: a dependency that is not
    listed in dsh.profile.bundles is installed but never mounted.

    Run it with install.bat (double-clickable), or directly:
        powershell -ExecutionPolicy Bypass -File install.ps1
        powershell -ExecutionPolicy Bypass -File install.ps1 -Profile web
        powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall

    Exit codes: 0 ok, 1 failed, 2 needs the app to be opened once.
#>
[CmdletBinding()]
param(
    # auto: desktop when this machine has a desktop profile, otherwise web.
    [ValidateSet('auto', 'desktop', 'web')]
    [string] $Profile = 'auto',

    # Remove the plugin instead of installing it.
    [switch] $Uninstall,

    # Do not touch the user PATH.
    [switch] $NoPathRepair,

    # Lower the host's auto-compaction threshold in this profile (0.5 - 0.95).
    # 0 keeps the shipped policy. The host already compacts automatically; this
    # only makes it happen earlier.
    [ValidateRange(0, 0.95)]
    [double] $CompactThreshold = 0
)

$ErrorActionPreference = 'Stop'

$PackageName = 'claude-style-deepseek'
$PackageSpec = 'github:devopshelper/claude-style-deepseek'
$RepoUrl = 'https://github.com/devopshelper/claude-style-deepseek'
$DesktopProduct = 'DeepSeek Harness'

# ---------------------------------------------------------------- output ---

function Write-Step([string] $Text) {
    Write-Host ''
    Write-Host "  $Text" -ForegroundColor Cyan
}
function Write-Info([string] $Text) { Write-Host "    $Text" }
function Write-Ok([string] $Text) { Write-Host "    $Text" -ForegroundColor Green }
function Write-Note([string] $Text) { Write-Host "    $Text" -ForegroundColor DarkGray }
function Write-Bad([string] $Text) { Write-Host "    $Text" -ForegroundColor Red }

# --------------------------------------------------------------- helpers ---

function Get-DshHome {
    if ($env:DSH_HOME -and $env:DSH_HOME.Trim() -ne '') { return $env:DSH_HOME }
    return (Join-Path $env:USERPROFILE '.dsh')
}

function Get-ProfileDir([string] $Name) {
    return (Join-Path (Get-DshHome) (Join-Path 'profiles' $Name))
}

function Get-DesktopRoots {
    $roots = New-Object System.Collections.Generic.List[string]

    $roots.Add((Join-Path (Join-Path $env:LOCALAPPDATA 'Programs') $DesktopProduct))
    if ($env:ProgramFiles) { $roots.Add((Join-Path $env:ProgramFiles $DesktopProduct)) }
    if (${env:ProgramFiles(x86)}) { $roots.Add((Join-Path ${env:ProgramFiles(x86)} $DesktopProduct)) }

    # Any similarly named folder under the per-user Programs directory.
    $programs = Join-Path $env:LOCALAPPDATA 'Programs'
    if (Test-Path -LiteralPath $programs) {
        Get-ChildItem -LiteralPath $programs -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like '*DeepSeek*' } |
            ForEach-Object { [void] $roots.Add($_.FullName) }
    }

    # The Add/Remove Programs entries carry the real install location.
    $uninstallKeys = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    foreach ($key in $uninstallKeys) {
        $items = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
        foreach ($item in $items) {
            if ($null -eq $item) { continue }
            $name = $item.DisplayName
            if (-not $name -or $name -notlike "*$DesktopProduct*") { continue }
            if ($item.InstallLocation) {
                [void] $roots.Add($item.InstallLocation)
            } elseif ($item.DisplayIcon) {
                $icon = ([string] $item.DisplayIcon).Trim('"')
                if ($icon -match '^[A-Za-z]:\\') { [void] $roots.Add((Split-Path -Parent $icon)) }
            }
        }
    }

    $seen = @{}
    foreach ($root in $roots) {
        if (-not $root) { continue }
        try { $full = [System.IO.Path]::GetFullPath($root).TrimEnd('\') } catch { continue }
        $key = $full.ToLowerInvariant()
        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $full
        }
    }
}

function Find-DshLauncher {
    # 1. Already on PATH.
    $onPath = Get-Command dsh -CommandType Application, ExternalScript -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($onPath -and $onPath.Source) { return $onPath.Source }

    # 2. The launcher the desktop app ships.
    foreach ($root in (Get-DesktopRoots)) {
        $candidate = Join-Path $root 'resources\runtime\cli\bin\dsh.cmd'
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }

    # 3. A global npm install that is not on PATH yet.
    if ($env:APPDATA) {
        $npmShim = Join-Path (Join-Path $env:APPDATA 'npm') 'dsh.cmd'
        if (Test-Path -LiteralPath $npmShim) { return $npmShim }
    }

    return $null
}

function Add-UserPathEntry {
    param([string] $Directory)

    $trimmed = $Directory.TrimEnd('\')
    $current = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($null -eq $current) { $current = '' }

    foreach ($entry in ($current -split ';')) {
        if ($entry.Trim() -eq '') { continue }
        try {
            if ([System.IO.Path]::GetFullPath($entry.Trim('"')).TrimEnd('\') -ieq $trimmed) { return $false }
        } catch {
            if ($entry.Trim('"').TrimEnd('\') -ieq $trimmed) { return $false }
        }
    }

    $newValue = if ($current.Trim() -eq '') { $trimmed } else { $current.TrimEnd(';') + ';' + $trimmed }

    # Preserve the registry value kind: a REG_SZ rewrite would expand every
    # %VARIABLE% entry in the user's PATH for good.
    $kind = [Microsoft.Win32.RegistryValueKind]::ExpandString
    try {
        $key = Get-Item -LiteralPath 'HKCU:\Environment'
        if ($null -ne $key.GetValue('Path', $null, 'DoNotExpandEnvironmentNames')) {
            $kind = $key.GetValueKind('Path')
        }
    } catch {
        # No user PATH value yet: an ExpandString is what Windows creates.
    }
    New-ItemProperty -Path 'HKCU:\Environment' -Name 'Path' -Value $newValue -PropertyType $kind -Force | Out-Null

    # The current process can use it right away, without waiting for a logoff.
    $env:Path = $env:Path.TrimEnd(';') + ';' + $trimmed
    return $true
}

function Install-NpmCli {
    $npm = Get-Command npm -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $npm) { return $null }

    Write-Step 'Installing the dsh CLI from npm'
    Write-Info 'npm install -g @deepseek-ai/dsh'
    & npm install -g '@deepseek-ai/dsh' 2>&1 | ForEach-Object { Write-Note ([string] $_).TrimEnd() }
    if ($LASTEXITCODE -ne 0) { return $null }

    $env:Path = $env:Path.TrimEnd(';') + ';' + (Join-Path $env:APPDATA 'npm')
    return (Find-DshLauncher)
}

function Read-ProfileDocument([string] $PackageJson) {
    if (-not (Test-Path -LiteralPath $PackageJson)) { return $null }
    try { return (Get-Content -LiteralPath $PackageJson -Raw | ConvertFrom-Json) } catch { return $null }
}

function Test-BundleSelected([string] $PackageJson, [string] $Name) {
    $doc = Read-ProfileDocument $PackageJson
    if (-not $doc -or -not $doc.dsh -or -not $doc.dsh.profile -or -not $doc.dsh.profile.bundles) { return $false }
    return (@($doc.dsh.profile.bundles) -ccontains $Name)
}

<#
    Edits only the "bundles" array text, so the rest of the profile file keeps
    its formatting and key order. Returns $true when the file changed.
    Returns $null when the file has no bundles array at all.
#>
function Select-Bundle {
    param(
        [string] $PackageJson,
        [string] $Name,
        [switch] $Remove
    )

    if (-not (Test-Path -LiteralPath $PackageJson)) { return $null }
    $text = Get-Content -LiteralPath $PackageJson -Raw
    $nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $match = [regex]::Match($text, '("bundles"\s*:\s*\[)([\s\S]*?)(\])')
    if (-not $match.Success) { return $null }

    $inner = $match.Groups[2].Value
    $quoted = '"' + $Name + '"'
    $present = $inner.Contains($quoted)

    if ($Remove) {
        if (-not $present) { return $false }
        $newInner = [regex]::Replace($inner, ',\s*' + [regex]::Escape($quoted), '')
        if ($newInner.Contains($quoted)) {
            $newInner = [regex]::Replace($newInner, [regex]::Escape($quoted) + '\s*,', '')
        }
        $newText = $text.Substring(0, $match.Index) + $match.Groups[1].Value + $newInner + $match.Groups[3].Value + $text.Substring($match.Index + $match.Length)
        Set-Content -LiteralPath $PackageJson -Value $newText -NoNewline
        return $true
    }

    if ($present) { return $false }

    $indent = '        '
    $lines = $inner -split '\r?\n'
    for ($i = $lines.Length - 1; $i -ge 0; $i--) {
        if ($lines[$i].Trim() -ne '') {
            if ($lines[$i] -match '^(\s*)') { $indent = $Matches[1] }
            break
        }
    }

    $entry = $nl + $indent + $quoted
    if ($inner.Trim() -eq '') {
        $newInner = $entry + $nl + '      '
    } else {
        $trailing = [regex]::Match($inner, '\s*$')
        $newInner = $inner.Substring(0, $trailing.Index) + ',' + $entry + $trailing.Value
    }

    $newText = $text.Substring(0, $match.Index) + $match.Groups[1].Value + $newInner + $match.Groups[3].Value + $text.Substring($match.Index + $match.Length)
    Set-Content -LiteralPath $PackageJson -Value $newText -NoNewline
    return $true
}

<#
    The host already compacts automatically. This writes a loader patch entry
    that lowers its threshold for this profile, inside a marked block, so a
    later run replaces the block instead of stacking duplicates, and removing
    it hands the profile back to the shipped policy.
#>
function Set-CompactThreshold {
    param(
        [string] $ProfileDir,
        [double] $Threshold = 0,
        [switch] $Remove
    )

    $path = Join-Path $ProfileDir 'cordis.patch.yml'
    $start = '# >>> claude-style-deepseek auto-compact'
    $end = '# <<< claude-style-deepseek auto-compact'
    $existing = if (Test-Path -LiteralPath $path) { Get-Content -LiteralPath $path -Raw } else { '' }
    $has = $existing.Contains($start)

    if ($Remove) {
        if (-not $has) { return $false }
        Copy-Item -LiteralPath $path -Destination ($path + '.bak-compact') -Force
        $text = [regex]::Replace($existing, '(?s)\r?\n*' + [regex]::Escape($start) + '.*?' + [regex]::Escape($end), '')
        Set-Content -LiteralPath $path -Value ($text.TrimEnd() + "`r`n") -NoNewline
        return $true
    }

    $value = $Threshold.ToString([System.Globalization.CultureInfo]::InvariantCulture)
    $block = @(
        $start,
        '- id: compaction-basic',
        '  name: "@deepseek-ai/dsh-compaction-basic"',
        '  config:',
        ('    thresholdRatio: ' + $value),
        $end
    ) -join "`r`n"

    if ($has) {
        $text = [regex]::Replace($existing, '(?s)' + [regex]::Escape($start) + '.*?' + [regex]::Escape($end), $block)
    } else {
        $text = if ($existing.Trim() -eq '') { '' } else { $existing.TrimEnd() + "`r`n`r`n" }
        $text += $block
    }

    if (Test-Path -LiteralPath $path) { Copy-Item -LiteralPath $path -Destination ($path + '.bak-compact') -Force }
    Set-Content -LiteralPath $path -Value ($text.TrimEnd() + "`r`n") -NoNewline
    return $true
}

# ------------------------------------------------------------------ start ---

if ($Profile -eq 'auto') {
    if (Test-Path -LiteralPath (Get-ProfileDir 'desktop')) { $Profile = 'desktop' }
    elseif ((Get-DesktopRoots | Measure-Object).Count -gt 0) { $Profile = 'desktop' }
    else { $Profile = 'web' }
}

$profileDir = Get-ProfileDir $Profile
$packageJson = Join-Path $profileDir 'package.json'

Write-Host ''
Write-Host '  Claude Style for DeepSeek Harness' -ForegroundColor White
Write-Host '  ---------------------------------' -ForegroundColor DarkGray

# -------------------------------------------------------------------- cli ---

Write-Step 'Locating the dsh CLI'
$dsh = Find-DshLauncher
if (-not $dsh) { $dsh = Install-NpmCli }
if (-not $dsh) {
    Write-Bad 'Could not find dsh, and there is no npm to install it with.'
    Write-Note 'Install DeepSeek Harness, or install the CLI yourself:'
    Write-Note '    npm install -g @deepseek-ai/dsh'
    exit 1
}
Write-Ok $dsh

# ------------------------------------------------------------------- path ---

if (-not $NoPathRepair) {
    $binDir = Split-Path -Parent $dsh
    if (Add-UserPathEntry $binDir) {
        Write-Step 'Repairing PATH'
        Write-Ok "Added $binDir to your user PATH. New terminals pick it up."
    }
}

# ---------------------------------------------------------------- profile ---

if (-not (Test-Path -LiteralPath $profileDir) -and $Profile -eq 'desktop') {
    Write-Step 'Profile check'
    Write-Bad "The desktop profile does not exist yet: $profileDir"
    Write-Note 'Open DeepSeek Harness once so it creates the profile, close it, then run this again.'
    exit 2
}

Write-Step "Using the '$Profile' profile"
Write-Info $profileDir

# -------------------------------------------------------------- uninstall ---

if ($Uninstall) {
    Write-Step 'Removing the plugin'
    $doc = Read-ProfileDocument $packageJson
    $declared = $null
    if ($doc -and $doc.dependencies) { $declared = $doc.dependencies.$PackageName }
    if (-not $declared) {
        [void] (Select-Bundle -PackageJson $packageJson -Name $PackageName -Remove)
        Write-Note "$PackageName is not installed in this profile."
        Write-Ok 'Nothing to remove.'
        Write-Host ''
        exit 0
    }

    & $dsh plugin --profile $Profile remove $PackageName 2>&1 | ForEach-Object { Write-Note ([string] $_).TrimEnd() }
    $code = $LASTEXITCODE
    [void] (Select-Bundle -PackageJson $packageJson -Name $PackageName -Remove)
    [void] (Set-CompactThreshold -ProfileDir $profileDir -Remove)

    if ($code -ne 0) {
        Write-Bad "pnpm exited with $code."
        exit 1
    }
    Write-Ok 'Removed, and the bundle is no longer selected.'
    Write-Note 'Restart DeepSeek Harness to get the shipped look back.'
    Write-Host ''
    exit 0
}

# ---------------------------------------------------------------- install ---

Write-Step 'Installing the plugin'
Write-Info "$dsh plugin --profile $Profile add $PackageSpec"
& $dsh plugin --profile $Profile add $PackageSpec 2>&1 | ForEach-Object { Write-Note ([string] $_).TrimEnd() }
if ($LASTEXITCODE -ne 0) {
    Write-Bad "The install command failed with exit code $LASTEXITCODE."
    Write-Note 'Check that git is installed and that this profile can reach GitHub.'
    if (-not (Test-Path -LiteralPath $packageJson)) {
        Write-Note "If the '$Profile' profile was never booted, run 'dsh $Profile' once first."
    }
    exit 1
}

# ----------------------------------------------------------------- select ---
# A dependency alone is not enough: the profile has to list the bundle, or the
# app boots without ever mounting the plugin.

Write-Step 'Selecting the bundle in the profile'
$changed = $false
if (-not (Test-BundleSelected $packageJson $PackageName)) {
    $result = Select-Bundle -PackageJson $packageJson -Name $PackageName
    if ($null -eq $result) {
        # No bundles array to edit (a hand-made or empty profile): rewrite it.
        $doc = Read-ProfileDocument $packageJson
        if ($doc) {
            if (-not $doc.dsh) { $doc | Add-Member -NotePropertyName dsh -NotePropertyValue ([pscustomobject]@{}) -Force }
            if (-not $doc.dsh.profile) { $doc.dsh | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{}) -Force }
            $bundles = @()
            if ($doc.dsh.profile.bundles) { $bundles = @($doc.dsh.profile.bundles) }
            $bundles = @($bundles) + $PackageName
            if ($doc.dsh.profile.PSObject.Properties['bundles']) {
                $doc.dsh.profile.bundles = $bundles
            } else {
                $doc.dsh.profile | Add-Member -NotePropertyName bundles -NotePropertyValue $bundles -Force
            }
            $doc | ConvertTo-Json -Depth 32 | Set-Content -LiteralPath $packageJson
            $changed = $true
        }
    } else {
        $changed = [bool] $result
    }
}

if (Test-BundleSelected $packageJson $PackageName) {
    if ($changed) { Write-Ok 'The profile now selects Claude Style.' }
    else { Write-Note 'Already selected.' }
} else {
    Write-Bad 'Could not select the bundle automatically.'
    Write-Note 'Open Settings -> Plugins in DeepSeek Harness and enable Claude Style there.'
    exit 1
}

# ----------------------------------------------------------------- verify ---

Write-Step 'Verifying'
$doc = Read-ProfileDocument $packageJson
$declared = $null
if ($doc -and $doc.dependencies) { $declared = $doc.dependencies.$PackageName }
if (-not $declared) {
    Write-Bad "The profile does not declare $PackageName."
    exit 1
}

$installedDir = Join-Path $profileDir (Join-Path 'node_modules' $PackageName)
$installedClient = Join-Path $installedDir 'client.js'
if (-not (Test-Path -LiteralPath $installedClient)) {
    Write-Bad "The client half is missing: $installedClient"
    exit 1
}

$version = 'unknown'
$installedManifest = Join-Path $installedDir 'package.json'
if (Test-Path -LiteralPath $installedManifest) {
    try { $version = (Get-Content -LiteralPath $installedManifest -Raw | ConvertFrom-Json).version } catch { }
}

Write-Ok "Version $version, dependency $declared, bundle selected"

# ------------------------------------------------------------- auto-compact ---
# The host ships automatic compaction already; this only moves its threshold.

if ($CompactThreshold -gt 0) {
    if ($CompactThreshold -lt 0.5) {
        Write-Bad 'A threshold below 0.5 would compact almost every step; use 0.5 - 0.95.'
        exit 1
    }
    Write-Step 'Setting the auto-compact threshold'
    [void] (Set-CompactThreshold -ProfileDir $profileDir -Threshold $CompactThreshold)
    Write-Ok ('thresholdRatio ' + $CompactThreshold + ' written to ' + (Join-Path $profileDir 'cordis.patch.yml'))
    Write-Note 'Restart DeepSeek Harness: the loader reads the profile patch at boot.'
}

Write-Host ''
Write-Host '  Done.' -ForegroundColor Green
Write-Host '  Refresh DeepSeek Harness with Ctrl+R. If the theme does not appear,' -ForegroundColor Gray
Write-Host '  quit the app completely and open it again: the profile is read at boot.' -ForegroundColor Gray
Write-Host ''
Write-Host "  $RepoUrl" -ForegroundColor DarkGray
Write-Host ''
exit 0
