use zed_extension_api as zed;

// The formatter LSP is a single self-contained JS file, compiled into the
// extension so it can be started with `node -e` and does not depend on files
// being present on disk next to the (possibly symlinked) extension.
const SERVER_JS: &str = include_str!("../formatter/server.js");

struct MvBasicExtension;

impl zed::Extension for MvBasicExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<zed::Command> {
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec!["-e".to_string(), format!("{SERVER_JS}\nstartServer();\n")],
            env: worktree.shell_env(),
        })
    }
}

zed::register_extension!(MvBasicExtension);
