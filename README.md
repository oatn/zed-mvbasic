# MV BASIC for Zed

A [Zed](https://zed.dev) extension for MV BASIC — the Pick-family BASIC used by
jBASE, Temenos T24, PickBASIC, UniVerse, UniData, D3 and OpenQM.

It does two things: **syntax highlighting** and **formatting**. It does not
compile, run, index, or diagnose your programs.

The grammar, highlighting queries and formatter are ported from the VS Code
extension [mvextensions.mvbasic](https://github.com/mvextensions/mvbasic)
(MIT).

## Features

- Syntax highlighting for keywords, built-in functions, labels, numbers,
  strings and comments.
- Bracket matching for `()`, `[]`, `"` and `'`.
- Document formatting (`editor: format buffer`, or `format_on_save`), matching
  the layout produced by the VS Code MV BASIC formatter.

## Repository layout

```
extension.toml                       Zed extension manifest
src/lib.rs                           Starts the formatter language server
languages/mvbasic/config.toml        Language "MV BASIC", suffixes .b / .bas
languages/mvbasic/highlights.scm     Highlight queries
languages/mvbasic/brackets.scm       Bracket pairs
grammars/tree-sitter-mvbasic/        Tree-sitter grammar (parser.c is committed)
formatter/server.js                  Formatter + minimal LSP, single file
formatter/test_format.js             Formatter self-test
```

## Installing

### From the extension registry

In Zed, open `zed: extensions`, search for **MV BASIC**, and install it. Open any
`.b` or `.bas` file to activate the language.

### As a dev extension

1. `zed: extensions` → `Install Dev Extension`
2. Select this repository's root directory (the one containing `extension.toml`).
3. Open any `.b` or `.bas` file.

### Build prerequisites

Zed compiles the tree-sitter grammar to WebAssembly on first install, which
requires wasi-sdk. Zed downloads it from GitHub automatically; if that fails,
install it yourself and point Zed at it, then restart Zed:

```
WASI_SDK_PATH = D:\dev\wasi-sdk-25.0-x86_64-windows
```

On Windows, if the GNU Rust toolchain has no `libgcc_eh.a` (w64devkit 15.2 merged
it into `libgcc.a`), cargo fails with `cannot find -lgcc_eh`. Work around it with:

```powershell
ar rcs D:\dev\w64devkit\lib\gcc\x86_64-w64-mingw32\15.2.0\libgcc_eh.a
rustup target add wasm32-wasip2   # Zed 1.27+ targets wasip2
```

## Formatting

Run `editor: format buffer` from the command palette, or enable
`"format_on_save": "on"` in `settings.json`.

### How the formatter is started

The formatter is a small Node.js language server, and it is **not** compiled
into the extension. On first use the extension downloads
`formatter/server.js` from this repository at the tag named in `src/lib.rs`
(currently `v0.1.0`) into its own working directory, then runs it with the Node
binary bundled with Zed. The downloaded copy is cached per tag, so no network
access is needed afterwards.

If formatting fails on first use, check the Zed log (`zed: open log`) for a
`could not download the MV BASIC formatter` message; it means the pinned tag is
missing or unreachable.

### Formatting options

Defaults match the VS Code extension (T24 style: code starts at margin 4).
Override them with environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `MVBASIC_MARGIN` | `4` | Column where code starts |
| `MVBASIC_INDENT` | `4` | Indent width per block |
| `MVBASIC_INDENT_COMMENT` | `ignore` | `left` / `margin` / `code` / `ignore` |
| `MVBASIC_FORMAT_STRUCTURE` | `1` | `1` keeps `PROGRAM`/`SUBROUTINE`/`FUNCTION`/`STOP` at column 0 |

Set these before starting Zed (the formatter inherits Zed's shell environment).

## Known differences from the VS Code extension

- Numeric line labels (`0010 X = 1`) are highlighted as numbers, not as labels.
  `LABEL:` style labels are highlighted as labels.
- No `indents.scm`, so there is no automatic indentation: pressing Enter keeps
  the previous line's indentation. Use the formatter instead.

## Grammar

The grammar lives in this repository and is registered by revision in
`extension.toml`. Zed clones `repository`, checks out `rev`, and looks for the
grammar in `path` — it never reads the local working tree:

```toml
[grammars.mvbasic]
repository = "https://github.com/oatn/zed-mvbasic"
rev = "<a commit sha that contains grammars/tree-sitter-mvbasic>"
path = "grammars/tree-sitter-mvbasic"
```

Clone output (`grammars/mvbasic/`), build artifacts (`grammars/*.wasm`,
`extension.wasm`) and `target/` are gitignored.

### Changing the grammar

```powershell
cd grammars/tree-sitter-mvbasic
# edit grammar.js
tree-sitter generate      # regenerates src/parser.c (commit it)
tree-sitter parse sample.b
cd ../.. ; git add -A ; git commit -m "grammar: ..."
git rev-parse HEAD        # put the new sha into extension.toml's rev, commit again
```

## Development

```powershell
node formatter/test_format.js                              # formatter self-test
cargo build --target wasm32-wasip2 --release               # build the extension wasm
```

Reinstall the dev extension after touching `src/lib.rs` or `extension.toml`
(the wasm is recompiled). After changing `formatter/server.js`, bump
`SERVER_TAG` in `src/lib.rs` and `version` in `extension.toml`, push a matching
tag, then reinstall — the tag is what invalidates the cached download.

## License

MIT. The formatter logic and the keyword/function lists are ported from
[MVExtensions.mvbasic](https://github.com/mvextensions/mvbasic), also MIT; the
copyright notice is preserved in [LICENSE](LICENSE).
