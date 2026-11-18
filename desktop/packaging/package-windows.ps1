$ErrorActionPreference = 'Stop'

$PackagingDir = $PSScriptRoot
$DesktopDir = Split-Path -Parent $PackagingDir
$CrateDir = Join-Path $DesktopDir 'crates\ynab-desktop'
$DistDir = Join-Path $DesktopDir 'dist'
$PortableDir = Join-Path $DistDir 'portable'
$TmpDir = Join-Path $DesktopDir 'target\tmp\packaging'

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
New-Item -ItemType Directory -Force -Path $PortableDir | Out-Null
New-Item -ItemType Directory -Force -Path $TmpDir | Out-Null

Write-Host '[1/6] Building ynab-desktop (--release --offline)...'
Push-Location $DesktopDir
try {
    & cargo build --release -p ynab-desktop --offline
    if ($LASTEXITCODE -ne 0) {
        throw "cargo build --release failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

$ReleaseDir = Join-Path $DesktopDir 'target\release'
$ReleaseExe = Join-Path $ReleaseDir 'ynab-desktop.exe'
if (-not (Test-Path $ReleaseExe)) {
    throw "Expected release binary missing: $ReleaseExe"
}

$WebViewDll = Join-Path $ReleaseDir 'WebView2Loader.dll'
if (-not (Test-Path $WebViewDll)) {
    $FoundDll = Get-ChildItem -Path (Join-Path $ReleaseDir 'build') -Recurse -Filter 'WebView2Loader.dll' -ErrorAction SilentlyContinue |
        Where-Object { $_.Directory.Name -eq 'x64' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($null -eq $FoundDll) {
        throw 'WebView2Loader.dll (x64) not found in target/release or target/release/build'
    }
    $WebViewDll = $FoundDll.FullName
}

Write-Host '[2/6] Preparing stripped portable bundle...'
$PortableExe = Join-Path $PortableDir 'ynab-desktop.exe'
$PortableDll = Join-Path $PortableDir 'WebView2Loader.dll'
Copy-Item -Force $ReleaseExe $PortableExe
Copy-Item -Force $WebViewDll $PortableDll

$StripCmd = Get-Command 'strip.exe' -ErrorAction SilentlyContinue
if ($null -eq $StripCmd) {
    $StripCmd = Get-Command 'x86_64-w64-mingw32-strip.exe' -ErrorAction SilentlyContinue
}
if ($null -ne $StripCmd) {
    & $StripCmd.Source --strip-debug --strip-unneeded $PortableExe
    if ($LASTEXITCODE -ne 0) {
        throw "strip failed with exit code $LASTEXITCODE"
    }
} else {
    Write-Warning 'strip.exe not found in PATH; using unstripped release binary'
}

Write-Host '[3/6] Compiling Windows resource object (app_icon.rc -> app_icon.o)...'
$IconPath = Join-Path $CrateDir 'assets\app_icon.ico'
if (-not (Test-Path $IconPath)) {
    throw "Missing icon file: $IconPath"
}
$IconRcPath = $IconPath -replace '\\', '/'
$RcPath = Join-Path $TmpDir 'app_icon.rc'
$ObjPath = Join-Path $TmpDir 'app_icon.o'

$RcContent = @"
#define IDI_ICON1 1
IDI_ICON1 ICON "$IconRcPath"

1 VERSIONINFO
FILEVERSION 0,3,0,0
PRODUCTVERSION 0,3,0,0
FILEFLAGSMASK 0x3fL
FILEFLAGS 0x0L
FILEOS 0x40004L
FILETYPE 0x1L
FILESUBTYPE 0x0L
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "040904b0"
    BEGIN
      VALUE "CompanyName", "YNABx"
      VALUE "FileDescription", "YNAB Desktop"
      VALUE "FileVersion", "0.3.0"
      VALUE "InternalName", "ynab-desktop"
      VALUE "OriginalFilename", "ynab-desktop.exe"
      VALUE "ProductName", "YNAB Desktop"
      VALUE "ProductVersion", "0.3.0"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x409, 1200
  END
END
"@
Set-Content -Path $RcPath -Value $RcContent -Encoding Ascii

$WindresCmd = Get-Command 'windres.exe' -ErrorAction SilentlyContinue
if ($null -eq $WindresCmd) {
    $WindresCmd = Get-Command 'x86_64-w64-mingw32-windres.exe' -ErrorAction SilentlyContinue
}
$RcCompiler = Get-Command 'rc.exe' -ErrorAction SilentlyContinue
$RustcVersionInfo = (& rustc -vV) -join "`n"
$IsMsvcHost = $RustcVersionInfo -match 'host:\s*\S+msvc'

$ExtraLinkArgs = @()
if (-not $IsMsvcHost) {
    if ($null -eq $WindresCmd) {
        throw 'windres.exe not found in PATH'
    }
    & $WindresCmd.Source -i $RcPath -o $ObjPath -O coff
    if ($LASTEXITCODE -ne 0) {
        throw "windres failed with exit code $LASTEXITCODE"
    }
    $ExtraLinkArgs = @('-C', "link-arg=$ObjPath")
} else {
    $ResPath = Join-Path $TmpDir 'app_icon.res'
    if ($null -ne $RcCompiler) {
        & $RcCompiler.Source /nologo /fo $ResPath $RcPath
        if ($LASTEXITCODE -eq 0 -and (Test-Path $ResPath)) {
            $ExtraLinkArgs = @('-C', "link-arg=$ResPath")
        }
    } elseif ($null -ne $WindresCmd) {
        & $WindresCmd.Source -i $RcPath -o $ResPath -O res
        if ($LASTEXITCODE -eq 0 -and (Test-Path $ResPath)) {
            $ExtraLinkArgs = @('-C', "link-arg=$ResPath")
        }
    } else {
        Write-Warning 'Neither rc.exe nor windres.exe found for MSVC packaging; skipping icon embed'
    }
}

Write-Host '[4/6] Compiling standalone single-file launcher (YNAB-Desktop.exe)...'
$LauncherExe = Join-Path $DistDir 'YNAB-Desktop.exe'
& rustc --edition 2021 -O @ExtraLinkArgs -o $LauncherExe (Join-Path $PackagingDir 'launcher.rs')
if ($LASTEXITCODE -ne 0) {
    throw "rustc launcher.rs failed with exit code $LASTEXITCODE"
}

Write-Host '[5/6] Compiling standalone setup installer (YNAB-Desktop-Setup.exe)...'
$SetupExe = Join-Path $DistDir 'YNAB-Desktop-Setup.exe'
& rustc --edition 2021 -O @ExtraLinkArgs -o $SetupExe (Join-Path $PackagingDir 'installer.rs')
if ($LASTEXITCODE -ne 0) {
    throw "rustc installer.rs failed with exit code $LASTEXITCODE"
}

Write-Host '[6/6] Running --self-check verification...'
$pLauncher = Start-Process -FilePath $LauncherExe -ArgumentList '--self-check' -Wait -PassThru
if ($pLauncher.ExitCode -ne 0) {
    throw "YNAB-Desktop.exe --self-check failed with exit code $($pLauncher.ExitCode)"
}
$pSetup = Start-Process -FilePath $SetupExe -ArgumentList '--self-check' -Wait -PassThru
if ($pSetup.ExitCode -ne 0) {
    throw "YNAB-Desktop-Setup.exe --self-check failed with exit code $($pSetup.ExitCode)"
}

Write-Host ''
Write-Host 'Packaging complete:'
Get-Item $PortableExe, $PortableDll, $LauncherExe, $SetupExe | Format-Table Name, Length, FullName
