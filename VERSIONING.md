# 版本管理与恢复

## 当前约定

- `main` 保存经过检查、可继续开发的状态。
- 新功能使用 `feat/说明` 分支，修复使用 `fix/说明` 分支。
- 提交应描述一个清楚的改动，例如 `feat: 增加课件导入提示`、`fix: 修复回退后的展开状态`、`docs: 更新三页试讲教程`。
- 软件版本使用 `主版本.次版本.修订号`。修复通常递增修订号，兼容的新功能递增次版本；破坏内容协议或公开接口时评估主版本。
- 根目录 `VERSION`、源码 `package.json` 和 `package-lock.json` 的应用版本保持一致；课程包的 `deckId/revision` 单独管理。

## 日常保存

在仓库根目录执行：

```powershell
git status
git add <这次修改的文件或目录>
git diff --cached
git commit -m "docs: 描述本次改动"
git push origin main
```

涉及程序逻辑或内容协议时先运行源码目录的 `npm run check`。每次 push 的自动检查结果在 GitHub Actions 查看。

## 发布一个新版本

1. 用源码目录的 `npm version 0.2.1 --no-git-tag-version` 同步更新 package 与 lock，再把根目录 `VERSION` 改为 `0.2.1`。
2. 在 CHANGELOG 中写清行为变化和验证范围；运行根目录 `node scripts/verify-backup.mjs` 与源码目录 `npm run check`。
3. 提交修改，再为这次提交创建带说明的标签并推送：

```powershell
git tag -a v0.2.1 -m "Release v0.2.1"
git push origin main
git push origin v0.2.1
```

4. 在 GitHub 为该标签创建 Release；上传新交付包及其 SHA-256 校验文件。便携包构建还需要本机 `runtime/node.exe`；见现有 `packaging/release.mjs` 和交付说明。

上述 `0.2.1` 是下一次修订的命令示例，当前版本仍为 `0.2.0`。

## 恢复源码

新电脑安装 Git 和 Node 24.22.1，再执行：

```powershell
gh repo clone wayofmusic/h5deck-presenter
cd h5deck-presenter
git switch --detach v0.2.0
node scripts/verify-backup.mjs
cd "双屏演讲系统-Codex开发交接包"
npm ci
npm run build
npm run check
npm start
```

要从旧版继续开发，可用 `git switch -c fix/从备份恢复 v0.2.0` 建立新分支。查看旧版不会改写 main 历史。

## 恢复可直接运行的版本

打开本仓库 `v0.2.0` Release，下载对应 ZIP；用附件 `SHA256SUMS.txt` 对照文件名与 SHA-256。Windows 可用 `Get-FileHash -Algorithm SHA256 -LiteralPath <文件路径>`。

旧版 ZIP 只说明当时的交付状态；新版真机、连续运行与干净 Windows 的验收范围，仍按各自说明和 STATUS 记录。

## 排除项

Git 不保存运行凭据、`.runtime/` 日志、环境密钥、缓存、依赖和本机 `data/`。已有导入课件与设置需要备份时，单独保存对应 data 目录。对外开放仓库前，需从私有备份中整理移除个人和客户材料的分发版本。

