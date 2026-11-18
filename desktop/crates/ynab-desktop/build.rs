#![allow(clippy::print_stdout, clippy::print_stderr)]

use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::SystemTime;

fn main() {
    println!("cargo:rerun-if-changed=assets/app_icon.ico");
    println!("cargo:rerun-if-changed=build.rs");

    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    if target_os != "windows" && !cfg!(target_os = "windows") {
        return;
    }

    let Ok(out_dir_str) = env::var("OUT_DIR") else {
        return;
    };
    let out_dir = PathBuf::from(&out_dir_str);

    if let Ok(manifest_dir_str) = env::var("CARGO_MANIFEST_DIR") {
        let manifest_dir = PathBuf::from(manifest_dir_str);
        embed_windows_icon_and_version(&manifest_dir, &out_dir);
    }

    copy_webview2_loader(&out_dir);
}

fn embed_windows_icon_and_version(manifest_dir: &Path, out_dir: &Path) {
    let ico_path = manifest_dir.join("assets").join("app_icon.ico");
    if !ico_path.exists() {
        println!(
            "cargo:warning=Missing Windows icon asset at {}",
            ico_path.display()
        );
        return;
    }

    let maj = env::var("CARGO_PKG_VERSION_MAJOR").unwrap_or_else(|_| "0".to_string());
    let min = env::var("CARGO_PKG_VERSION_MINOR").unwrap_or_else(|_| "3".to_string());
    let pat = env::var("CARGO_PKG_VERSION_PATCH").unwrap_or_else(|_| "0".to_string());
    let ver = env::var("CARGO_PKG_VERSION").unwrap_or_else(|_| format!("{maj}.{min}.{pat}"));

    let ico_rc_path = ico_path.to_string_lossy().replace('\\', "/");
    let rc_content = format!(
        r#"#define IDI_ICON1 1
IDI_ICON1 ICON "{ico_rc_path}"

1 VERSIONINFO
FILEVERSION {maj},{min},{pat},0
PRODUCTVERSION {maj},{min},{pat},0
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
      VALUE "FileVersion", "{ver}"
      VALUE "InternalName", "ynab-desktop"
      VALUE "OriginalFilename", "ynab-desktop.exe"
      VALUE "ProductName", "YNAB Desktop"
      VALUE "ProductVersion", "{ver}"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x409, 1200
  END
END
"#
    );

    let rc_path = out_dir.join("app_icon.rc");
    if let Err(err) = fs::write(&rc_path, rc_content) {
        println!("cargo:warning=Failed to write {}: {err}", rc_path.display());
        return;
    }

    let target = env::var("TARGET").unwrap_or_default();
    let target_env = env::var("CARGO_CFG_TARGET_ENV").unwrap_or_default();
    let obj_path = out_dir.join("app_icon.o");

    let windres_candidates: &[&str] = if target.contains("i686") {
        &[
            "windres.exe",
            "windres",
            "i686-w64-mingw32-windres.exe",
            "i686-w64-mingw32-windres",
        ]
    } else {
        &[
            "windres.exe",
            "windres",
            "x86_64-w64-mingw32-windres.exe",
            "x86_64-w64-mingw32-windres",
        ]
    };

    for tool in windres_candidates {
        if let Ok(output) = Command::new(tool)
            .arg("-i")
            .arg(&rc_path)
            .arg("-o")
            .arg(&obj_path)
            .arg("-O")
            .arg("coff")
            .output()
        {
            if output.status.success() && obj_path.exists() {
                println!("cargo:rustc-link-arg-bins={}", obj_path.display());
                return;
            }
        }
    }

    if target_env == "msvc" || target.contains("msvc") {
        let res_path = out_dir.join("app_icon.res");
        if let Ok(output) = Command::new("rc.exe")
            .arg("/nologo")
            .arg("/fo")
            .arg(&res_path)
            .arg(&rc_path)
            .output()
        {
            if output.status.success() && res_path.exists() {
                println!("cargo:rustc-link-arg-bins={}", res_path.display());
                return;
            }
        }
        println!(
            "cargo:warning=Neither windres nor rc.exe found for MSVC target; skipping icon embed"
        );
    } else {
        println!(
            "cargo:warning=windres.exe not found in PATH; skipping Windows icon/version embed"
        );
    }
}

fn copy_webview2_loader(out_dir: &Path) {
    let Some(build_dir) = out_dir.parent().and_then(|p| p.parent()) else {
        return;
    };
    let Some(profile_dir) = build_dir.parent() else {
        return;
    };

    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_else(|_| "x86_64".to_string());
    let arch_folder = match target_arch.as_str() {
        "aarch64" => "arm64",
        "x86" => "x86",
        _ => "x64",
    };

    let mut newest_dll: Option<(SystemTime, PathBuf)> = None;
    if let Ok(entries) = fs::read_dir(build_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if !name_str.starts_with("webview2-com-sys-") {
                continue;
            }
            let candidate = entry
                .path()
                .join("out")
                .join(arch_folder)
                .join("WebView2Loader.dll");
            if candidate.is_file() {
                let modified = candidate
                    .metadata()
                    .and_then(|m| m.modified())
                    .unwrap_or(SystemTime::UNIX_EPOCH);
                let replace = match &newest_dll {
                    Some((best_time, _)) => modified >= *best_time,
                    None => true,
                };
                if replace {
                    newest_dll = Some((modified, candidate));
                }
            }
        }
    }

    let src_dll = newest_dll.map(|(_, p)| p).or_else(|| {
        let deps_candidate = profile_dir.join("deps").join("WebView2Loader.dll");
        if deps_candidate.is_file() {
            Some(deps_candidate)
        } else {
            None
        }
    });

    let Some(src) = src_dll else {
        return;
    };

    let dst = profile_dir.join("WebView2Loader.dll");
    let should_copy = match (fs::metadata(&src), fs::metadata(&dst)) {
        (Ok(sm), Ok(dm)) => sm.len() != dm.len(),
        (Ok(_), Err(_)) => true,
        _ => false,
    };

    if should_copy {
        if let Err(err) = fs::copy(&src, &dst) {
            println!(
                "cargo:warning=Failed to copy {} to {}: {err}",
                src.display(),
                dst.display()
            );
        }
    }
}
