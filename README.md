# MV BASIC for Zed

Zed 的 MV BASIC（jBASE / T24 / PickBASIC / UniVerse / UniData / D3 / OpenQM）扩展：
语法高亮 + 格式化。移植自 VS Code 的
[mvextensions.mvbasic](https://github.com/mvextensions/mvbasic)（MIT）。

只做两件事：**高亮** 和 **格式化**。不做编译、跳转、诊断。

## 目录

```
extension.toml                      Zed 扩展清单（语言 + grammar + LSP）
src/lib.rs                          用 Zed 自带 node 启动格式化服务
languages/mvbasic/config.toml       语言名 MV BASIC，后缀 .b/.bas
languages/mvbasic/highlights.scm    关键字 / 内建函数 / 标签 / 字符串高亮
languages/mvbasic/brackets.scm      () [] 配对
grammars/tree-sitter-mvbasic/       tree-sitter 语法（含已生成的 parser.c）
formatter/server.js                 格式化逻辑 + 极简 LSP（单文件，编进 wasm）
formatter/test_format.js            自检：node formatter/test_format.js
```

## 安装

开发扩展：

1. Zed → 命令面板 → `zed: install dev extension` → 选择本仓库目录
   （含 `extension.toml` 的那一层）。
2. 打开任意 `.b` / `.bas` 文件。

格式化：命令面板 → `editor: format buffer`，或在 settings.json 里开
`"format_on_save": "on"`。

### 首次安装前提

Zed 会把 tree-sitter 语法编译成 wasm，需要 wasi-sdk（默认从 GitHub 下载，
国内常失败），下载后设置环境变量：

```
WASI_SDK_PATH = D:\dev\wasi-sdk-25.0-x86_64-windows   (需重启 Zed)
```

另外 rust 的 gnu 工具链若缺 `libgcc_eh.a`（w64devkit 15.2 已并入 libgcc.a），
cargo 会报 `cannot find -lgcc_eh`：

```powershell
ar rcs D:\dev\w64devkit\lib\gcc\x86_64-w64-mingw32\15.2.0\libgcc_eh.a
rustup target add wasm32-wasip2   # Zed 1.27 用 wasip2
```

## 格式化服务怎么起来的

dev 扩展会被软链到 `extensions/installed/mvbasic`，而 wasm 里的 `current_dir()`
是空的 `extensions/work/mvbasic`，读不到外面的文件。所以 `src/lib.rs` 用
`include_str!` 把 `formatter/server.js` 编进 wasm，启动时执行：

```
<zed 自带 node> -e "<server.js 全文>\nstartServer();"
```

不依赖任何磁盘路径。改完 `formatter/server.js` 需要重装扩展（重新编译 wasm）。

## 格式化选项

与原插件默认值一致，用环境变量覆盖（T24 风格：margin 4）：

| 变量 | 默认 | 说明 |
|------|------|------|
| `MVBASIC_MARGIN` | 4 | 代码起始列 |
| `MVBASIC_INDENT` | 4 | 每层缩进 |
| `MVBASIC_INDENT_COMMENT` | ignore | `left` / `margin` / `code` / `ignore` |
| `MVBASIC_FORMAT_STRUCTURE` | 1 | PROGRAM/SUBROUTINE/FUNCTION/STOP 顶格 |

## 已知差异

- 数字标签（`0010 X = 1`）按数字高亮，不按标签；`LABEL:` 形式正常。
- 不做自动缩进（未提供 indents.scm），回车沿用上一行缩进。

## 语法仓库怎么定位

Zed 装扩展时不读本地目录，而是 `git clone <repository>` 后 `checkout <rev>`，
再在克隆结果里找 `path` 指定的子目录。所以语法就在本仓库里：

```toml
[grammars.mvbasic]
repository = "https://github.com/YOUR_GITHUB_USER/zed-mvbasic"
rev = "<本仓库的一个 commit sha>"
path = "grammars/tree-sitter-mvbasic"
```

克隆目标 `grammars/mvbasic/`、编译产物 `grammars/*.wasm`、`extension.wasm`、
`target/` 都已 gitignore。

## 改语法

```powershell
cd grammars/tree-sitter-mvbasic
# 改 grammar.js
tree-sitter generate      # 重新生成 src/parser.c（要提交）
tree-sitter parse sample.b
cd ../.. && git add -A && git commit -m "grammar: ..."
git rev-parse HEAD        # 把新 sha 填回 extension.toml 的 rev，再提交
```
