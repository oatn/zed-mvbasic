use std::path::{Path, PathBuf};

use zed_extension_api::{self as zed, DownloadedFileType, Result, Worktree};

/// Tag of this repository that serves `formatter/server.js`.
///
/// The formatter language server is deliberately *not* compiled into the
/// extension wasm: Zed's publishing rules require language servers to be
/// downloaded at runtime (or found in the user's environment), never bundled
/// with the extension. The wasm therefore only carries the URL below; the
/// script is fetched into this extension's working directory the first time the
/// language server is started, and cached there.
///
/// Bump `SERVER_TAG` (together with `extension.toml`'s `version`) whenever
/// `formatter/server.js` changes: the cache location is keyed by the tag, so a
/// new tag means a fresh download. The tag must exist and be pushed.
const SERVER_TAG: &str = "v0.1.0";

const RAW_BASE: &str = "https://raw.githubusercontent.com/oatn/zed-mvbasic";

fn server_relative_path() -> String {
    format!("mvbasic-formatter/{SERVER_TAG}/server.js")
}

struct MvBasicExtension {
    /// Absolute path of the downloaded server, memoized per extension instance.
    server_path: Option<PathBuf>,
}

impl MvBasicExtension {
    fn resolve_server_path(&self) -> Result<PathBuf> {
        let work_dir = std::env::current_dir()
            .map_err(|e| format!("could not resolve the extension working directory: {e}"))?;
        Ok(work_dir.join(server_relative_path()))
    }

    fn ensure_server_downloaded(&mut self) -> Result<PathBuf> {
        if let Some(path) = &self.server_path {
            return Ok(path.clone());
        }

        let path = self.resolve_server_path()?;
        if !path.is_file() {
            let relative = server_relative_path();
            if let Some(parent) = Path::new(&relative).parent() {
                std::fs::create_dir_all(parent).map_err(|e| {
                    format!("could not create the directory {}: {e}", parent.display())
                })?;
            }

            let url = format!("{RAW_BASE}/{SERVER_TAG}/formatter/server.js");
            zed::download_file(&url, &relative, DownloadedFileType::Uncompressed).map_err(|e| {
                format!(
                    "could not download the MV BASIC formatter from {url}: {e}. \
                     Check that tag {SERVER_TAG} exists in the extension repository and \
                     that formatter/server.js is reachable."
                )
            })?;

            if !path.is_file() {
                return Err(format!(
                    "the formatter download reported success, but {} does not exist",
                    path.display()
                ));
            }
        }

        self.server_path = Some(path.clone());
        Ok(path)
    }
}

impl zed::Extension for MvBasicExtension {
    fn new() -> Self {
        Self { server_path: None }
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &Worktree,
    ) -> Result<zed::Command> {
        let server_path = self.ensure_server_downloaded()?;

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![server_path.to_string_lossy().into_owned()],
            env: worktree.shell_env(),
        })
    }
}

zed::register_extension!(MvBasicExtension);
