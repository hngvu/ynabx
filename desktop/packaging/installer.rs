#![windows_subsystem = "windows"]
#![forbid(unsafe_code)]
#![deny(clippy::float_arithmetic)]

use std::env;
use std::fs;
use std::io;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{self, Command};

const CREATE_NO_WINDOW: u32 = 0x0800_0000;
const APP_NAME: &str = "YNAB Desktop";
const APP_VERSION: &str = "0.3.0";
const APP_PUBLISHER: &str = "YNABx";
const UNINSTALL_REG_KEY: &str =
    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\YNABDesktop";

const YNAB_EXE_BYTES: &[u8] = include_bytes!("../dist/portable/ynab-desktop.exe");
const WEBVIEW2_DLL_BYTES: &[u8] = include_bytes!("../dist/portable/WebView2Loader.dll");
const APP_ICON_BYTES: &[u8] = include_bytes!("../crates/ynab-desktop/assets/app_icon.ico");

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let silent = args.iter().any(|a| {
        a.eq_ignore_ascii_case("--silent")
            || a.eq_ignore_ascii_case("/S")
            || a.eq_ignore_ascii_case("/silent")
            || a.eq_ignore_ascii_case("--quiet")
    });
    let is_self_check = args.iter().any(|a| a.eq_ignore_ascii_case("--self-check"));
    let is_uninstall = args
        .iter()
        .any(|a| a.eq_ignore_ascii_case("--uninstall") || a.eq_ignore_ascii_case("/uninstall"));

    if is_self_check {
        let exe_ok = !YNAB_EXE_BYTES.is_empty();
        let dll_ok = !WEBVIEW2_DLL_BYTES.is_empty();
        let ico_ok = APP_ICON_BYTES.len() >= 4 && APP_ICON_BYTES[0..4] == [0, 0, 1, 0];
        if exe_ok && dll_ok && ico_ok {
            process::exit(0);
        }
        process::exit(1);
    }

    if is_uninstall {
        if !silent {
            let confirmed = show_yes_no_dialog(
                "Remove YNAB Desktop, its shortcuts, and registry uninstall entry?",
            );
            if !confirmed {
                process::exit(0);
            }
        }
        match run_uninstall() {
            Ok(()) => {
                if !silent {
                    show_info_dialog("YNAB Desktop has been uninstalled.");
                }
                process::exit(0);
            }
            Err(err) => {
                if !silent {
                    show_error_dialog(&format!("Uninstall failed:\n{err}"));
                }
                process::exit(1);
            }
        }
    }

    let install_dir = resolve_install_dir();
    if !silent {
        let confirmed = show_yes_no_dialog(&format!(
            "Install {APP_NAME} v{APP_VERSION} to:\n{}\n\nDesktop and Start Menu shortcuts will be created.",
            install_dir.display()
        ));
        if !confirmed {
            process::exit(0);
        }
    }

    match run_install(&install_dir) {
        Ok(()) => {
            if !silent {
                show_info_dialog(&format!(
                    "{APP_NAME} v{APP_VERSION} was installed successfully to:\n{}\n\nShortcuts were created on your Desktop and Start Menu.",
                    install_dir.display()
                ));
            }
            process::exit(0);
        }
        Err(err) => {
            if !silent {
                show_error_dialog(&format!("Installation failed:\n{err}"));
            }
            process::exit(1);
        }
    }
}

fn resolve_local_app_data() -> PathBuf {
    if let Some(dir) = env::var_os("LOCALAPPDATA") {
        if !dir.is_empty() {
            return PathBuf::from(dir);
        }
    }
    if let Some(profile) = env::var_os("USERPROFILE") {
        if !profile.is_empty() {
            return PathBuf::from(profile).join("AppData").join("Local");
        }
    }
    env::temp_dir()
}

fn resolve_install_dir() -> PathBuf {
    resolve_local_app_data().join("Programs").join(APP_NAME)
}

fn run_install(install_dir: &Path) -> io::Result<()> {
    fs::create_dir_all(install_dir)?;

    let exe_path = install_dir.join("ynab-desktop.exe");
    let dll_path = install_dir.join("WebView2Loader.dll");
    let ico_path = install_dir.join("app_icon.ico");
    let uninst_path = install_dir.join("uninstall.exe");

    fs::write(&exe_path, YNAB_EXE_BYTES)?;
    fs::write(&dll_path, WEBVIEW2_DLL_BYTES)?;
    fs::write(&ico_path, APP_ICON_BYTES)?;

    if let Ok(self_exe) = env::current_exe() {
        if self_exe != uninst_path {
            let _ = fs::copy(&self_exe, &uninst_path);
        }
    }

    create_shortcuts(&exe_path, install_dir, &ico_path)?;

    let total_bytes = YNAB_EXE_BYTES.len() + WEBVIEW2_DLL_BYTES.len() + APP_ICON_BYTES.len();
    let est_kb = total_bytes.saturating_add(1023) / 1024;
    register_uninstall_entry(install_dir, &ico_path, &uninst_path, est_kb)?;

    Ok(())
}

fn create_shortcuts(exe_path: &Path, working_dir: &Path, ico_path: &Path) -> io::Result<()> {
    let script = r#"
$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$programs = [Environment]::GetFolderPath('Programs')
foreach ($lnkDir in @($desktop, $programs)) {
    if (-not [string]::IsNullOrWhiteSpace($lnkDir)) {
        if (-not (Test-Path $lnkDir)) { New-Item -ItemType Directory -Force -Path $lnkDir | Out-Null }
        $lnkPath = Join-Path $lnkDir 'YNAB Desktop.lnk'
        $sc = $shell.CreateShortcut($lnkPath)
        $sc.TargetPath = $env:YNAB_INST_EXE
        $sc.WorkingDirectory = $env:YNAB_INST_DIR
        $sc.IconLocation = "$($env:YNAB_INST_ICON),0"
        $sc.Description = 'YNAB Desktop - Zero-Based Envelope Budgeting'
        $sc.Save()
    }
}
"#;

    let status = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ])
        .env("YNAB_INST_EXE", exe_path)
        .env("YNAB_INST_DIR", working_dir)
        .env("YNAB_INST_ICON", ico_path)
        .creation_flags(CREATE_NO_WINDOW)
        .status()?;

    if !status.success() {
        return Err(io::Error::other(format!(
            "Failed to create Windows shortcuts (exit code {:?})",
            status.code()
        )));
    }
    Ok(())
}

fn reg_add_sz(name: &str, value: &str) -> io::Result<()> {
    let status = Command::new("reg.exe")
        .args([
            "add",
            UNINSTALL_REG_KEY,
            "/v",
            name,
            "/t",
            "REG_SZ",
            "/d",
            value,
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .status()?;
    if !status.success() {
        return Err(io::Error::other(format!(
            "reg.exe failed setting {name} (exit {:?})",
            status.code()
        )));
    }
    Ok(())
}

fn reg_add_dword(name: &str, value: usize) -> io::Result<()> {
    let val_str = value.to_string();
    let status = Command::new("reg.exe")
        .args([
            "add",
            UNINSTALL_REG_KEY,
            "/v",
            name,
            "/t",
            "REG_DWORD",
            "/d",
            &val_str,
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .status()?;
    if !status.success() {
        return Err(io::Error::other(format!(
            "reg.exe failed setting {name} (exit {:?})",
            status.code()
        )));
    }
    Ok(())
}

fn register_uninstall_entry(
    install_dir: &Path,
    ico_path: &Path,
    uninst_path: &Path,
    est_kb: usize,
) -> io::Result<()> {
    let uninst_cmd = format!("\"{}\" --uninstall", uninst_path.display());
    let quiet_uninst_cmd = format!("\"{}\" --uninstall --silent", uninst_path.display());

    reg_add_sz("DisplayName", APP_NAME)?;
    reg_add_sz("DisplayVersion", APP_VERSION)?;
    reg_add_sz("Publisher", APP_PUBLISHER)?;
    reg_add_sz("DisplayIcon", &ico_path.to_string_lossy())?;
    reg_add_sz("InstallLocation", &install_dir.to_string_lossy())?;
    reg_add_sz("UninstallString", &uninst_cmd)?;
    reg_add_sz("QuietUninstallString", &quiet_uninst_cmd)?;
    reg_add_dword("EstimatedSize", est_kb)?;
    reg_add_dword("NoModify", 1)?;
    reg_add_dword("NoRepair", 1)?;
    Ok(())
}

fn run_uninstall() -> io::Result<()> {
    let remove_lnk_script = r#"
$desktop = [Environment]::GetFolderPath('Desktop')
$programs = [Environment]::GetFolderPath('Programs')
foreach ($lnkDir in @($desktop, $programs)) {
    if (-not [string]::IsNullOrWhiteSpace($lnkDir)) {
        $lnkPath = Join-Path $lnkDir 'YNAB Desktop.lnk'
        if (Test-Path $lnkPath) { Remove-Item -Force $lnkPath -ErrorAction SilentlyContinue }
    }
}
"#;
    let _ = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            remove_lnk_script,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .status();

    let _ = Command::new("reg.exe")
        .args(["delete", UNINSTALL_REG_KEY, "/f"])
        .creation_flags(CREATE_NO_WINDOW)
        .status();

    let install_dir = resolve_install_dir();
    if install_dir.exists() {
        let _ = fs::remove_file(install_dir.join("ynab-desktop.exe"));
        let _ = fs::remove_file(install_dir.join("WebView2Loader.dll"));
        let _ = fs::remove_file(install_dir.join("app_icon.ico"));
        if fs::remove_dir_all(&install_dir).is_err() {
            // If running from uninstall.exe inside install_dir, schedule delayed cleanup
            let cmd_line = format!(
                "ping -n 2 127.0.0.1 >nul & rmdir /s /q \"{}\"",
                install_dir.display()
            );
            let _ = Command::new("cmd.exe")
                .args(["/C", &cmd_line])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
        }
    }

    Ok(())
}

fn show_yes_no_dialog(message: &str) -> bool {
    let script = "Add-Type -AssemblyName System.Windows.Forms; \
        $r = [System.Windows.Forms.MessageBox]::Show(\
            $env:YNAB_DLG_MSG, \
            'YNAB Desktop Setup', \
            [System.Windows.Forms.MessageBoxButtons]::YesNo, \
            [System.Windows.Forms.MessageBoxIcon]::Question\
        ); \
        if ($r -eq [System.Windows.Forms.DialogResult]::Yes) { exit 0 } else { exit 1 }";

    Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ])
        .env("YNAB_DLG_MSG", message)
        .creation_flags(CREATE_NO_WINDOW)
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn show_info_dialog(message: &str) {
    let script = "Add-Type -AssemblyName System.Windows.Forms; \
        [System.Windows.Forms.MessageBox]::Show(\
            $env:YNAB_DLG_MSG, \
            'YNAB Desktop Setup', \
            [System.Windows.Forms.MessageBoxButtons]::OK, \
            [System.Windows.Forms.MessageBoxIcon]::Information\
        ) | Out-Null";

    let _ = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ])
        .env("YNAB_DLG_MSG", message)
        .creation_flags(CREATE_NO_WINDOW)
        .status();
}

fn show_error_dialog(message: &str) {
    let script = "Add-Type -AssemblyName System.Windows.Forms; \
        [System.Windows.Forms.MessageBox]::Show(\
            $env:YNAB_DLG_MSG, \
            'YNAB Desktop Setup', \
            [System.Windows.Forms.MessageBoxButtons]::OK, \
            [System.Windows.Forms.MessageBoxIcon]::Error\
        ) | Out-Null";

    let _ = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ])
        .env("YNAB_DLG_MSG", message)
        .creation_flags(CREATE_NO_WINDOW)
        .status();
}
