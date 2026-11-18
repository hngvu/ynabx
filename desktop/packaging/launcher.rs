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

const YNAB_EXE_BYTES: &[u8] = include_bytes!("../dist/portable/ynab-desktop.exe");
const WEBVIEW2_DLL_BYTES: &[u8] = include_bytes!("../dist/portable/WebView2Loader.dll");

fn main() {
    let args: Vec<std::ffi::OsString> = env::args_os().skip(1).collect();
    let is_self_check = args.iter().any(|a| a == "--self-check");

    let runtime_dir = match prepare_runtime_dir() {
        Ok(dir) => dir,
        Err(err) => {
            if !is_self_check {
                show_error_dialog(&format!("Failed to prepare YNAB Desktop runtime:\n{err}"));
            }
            process::exit(1);
        }
    };

    let exe_path = runtime_dir.join("ynab-desktop.exe");
    let dll_path = runtime_dir.join("WebView2Loader.dll");

    if is_self_check {
        let exe_ok = fs::metadata(&exe_path)
            .map(|m| m.is_file() && m.len() == YNAB_EXE_BYTES.len() as u64)
            .unwrap_or(false);
        let dll_ok = fs::metadata(&dll_path)
            .map(|m| m.is_file() && m.len() == WEBVIEW2_DLL_BYTES.len() as u64)
            .unwrap_or(false);
        if exe_ok && dll_ok {
            process::exit(0);
        }
        process::exit(1);
    }

    if let Err(err) = env::set_current_dir(&runtime_dir) {
        show_error_dialog(&format!("Failed to set runtime working directory:\n{err}"));
        process::exit(1);
    }

    match Command::new(&exe_path)
        .args(&args)
        .current_dir(&runtime_dir)
        .spawn()
    {
        Ok(_child) => process::exit(0),
        Err(err) => {
            show_error_dialog(&format!("Failed to launch {}:\n{err}", exe_path.display()));
            process::exit(1);
        }
    }
}

fn fnv1a_64_pair(first: &[u8], second: &[u8]) -> u64 {
    const OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
    const PRIME: u64 = 0x0100_0000_01b3;

    let mut hash = OFFSET_BASIS;
    for &byte in first {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(PRIME);
    }
    hash ^= 0xff;
    hash = hash.wrapping_mul(PRIME);
    for &byte in second {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(PRIME);
    }
    hash
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

fn prepare_runtime_dir() -> io::Result<PathBuf> {
    let checksum = fnv1a_64_pair(YNAB_EXE_BYTES, WEBVIEW2_DLL_BYTES);
    let runtime_dir = resolve_local_app_data()
        .join("com.ynabx.desktop")
        .join("runtime")
        .join(format!("{checksum:016x}"));

    fs::create_dir_all(&runtime_dir)?;

    extract_if_needed(&runtime_dir.join("ynab-desktop.exe"), YNAB_EXE_BYTES)?;
    extract_if_needed(&runtime_dir.join("WebView2Loader.dll"), WEBVIEW2_DLL_BYTES)?;

    Ok(runtime_dir)
}

fn extract_if_needed(target: &Path, bytes: &[u8]) -> io::Result<()> {
    let expected_len = bytes.len() as u64;
    if let Ok(meta) = fs::metadata(target) {
        if meta.is_file() && meta.len() == expected_len {
            return Ok(());
        }
    }

    let pid = process::id();
    let tmp_name = format!(
        "{}.tmp.{pid}",
        target
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("payload")
    );
    let tmp_path = target.with_file_name(tmp_name);

    fs::write(&tmp_path, bytes)?;
    if fs::rename(&tmp_path, target).is_err() {
        let _ = fs::remove_file(&tmp_path);
        if let Ok(meta) = fs::metadata(target) {
            if meta.is_file() && meta.len() == expected_len {
                return Ok(());
            }
        }
        fs::write(target, bytes)?;
    }

    Ok(())
}

fn show_error_dialog(message: &str) {
    let script = "Add-Type -AssemblyName System.Windows.Forms; \
        [System.Windows.Forms.MessageBox]::Show(\
            $env:YNAB_DLG_MSG, \
            'YNAB Desktop', \
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
