# Antigravity Agent Manager 本地文件导入补丁

适用版本：Windows 版 Antigravity 2.13.0。

这个补丁会在 Agent Manager 中增加“导入 Word / Excel”按钮。文件会复制到 Antigravity 默认可读取的本地目录，并把文件路径写入对话输入框；它不会把 Office 文件伪装成图片上传。

## 安装

1. 安装 Node.js（需要 `node` 和 `npx`）。
2. 双击 `安装补丁.bat`。
3. 等待 Antigravity 自动重启。
4. 在对话输入框附近点击“导入 Word / Excel”。

首次运行会通过 npm 获取标准的 `@electron/asar` 打包工具，因此需要联网。安装脚本会先检查 Antigravity 版本，并在替换前自动备份现有 `app.asar`。

## 还原

双击 `还原补丁.bat`，脚本会使用最近一次由本补丁建立的备份恢复。

## 注意

- 仅在 Antigravity 2.13.0 测试通过；不要用于其他版本。
- Antigravity 更新后补丁可能失效，需要针对新版本重新适配。
- 导入文件位于 `%USERPROFILE%\.gemini\antigravity\file-inbox`。
- 如果 Agent 请求读取文件的权限，请核对路径后再允许。

