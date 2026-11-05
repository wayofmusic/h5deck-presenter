# 文件与来源

## 2026-10-27 新工程

core/state.mjs：状态、命令、计时与内容校验。  
server/index.mjs：局域网 HTTP、配对、权限、POST 命令、SSE 快照与资源白名单。  
clients/host：电脑设置、二维码、网卡与会话管理。  
clients/presenter：独立手机讲稿、控制与阅读设置。  
clients/display：原课件适配与通用三页渲染。  
packaging：构建与 Windows 启动器；runtime：附带 Node 24.22.1 与许可。  
decks/reuse-demo：独立三页内容与讲稿包。  
verification：核心与服务端自动化测试。  
dist：构建生成的公开课件、私有讲稿、原渲染与素材，服务按权限分别提供。  
docs/SCRCPY-RESEARCH.md：scrcpy 官方文档调研与接入决定。

## 既有课件源码

baseline/work/content.js：章节、页面数据、逐页讲稿、提示和计划时长。  
baseline/work/app.js：现有演示器、分步、画布、计时、个人联系页。  
baseline/work/shell.html：页面结构与弹窗。  
baseline/work/style.css、keynote.css：基础样式与确认后的演讲视觉。  
baseline/work/build.cjs：生成离线HTML及讲稿的构建脚本。

## 构建所需资源

baseline/outputs/TED配图：四幅主题配图与两幅浅背景。  
baseline/outputs/个人资料：原始形象照、微信二维码。  
baseline/reference：确认后的概览、浅背景、控件排列和结束页。

源课件已经移除原始PPT入口、PPT参考弹窗和PPT文件，交接包不重新带入。未复制临时二维码解码内容或整份工作缓存。

## 文档

00-顶层开发文档.md：统一开发入口，定义当前范围、分层、验收和假设管理。  

01-开发复盘与复用手册.md：本次过程、工程复用位置、故障经验与下次启动指令；技能纳入完整交付包的“开发复用”目录。  
02-平台与内容包标准草案.md：固定平台、内容包结构、HTML 适配与标准化生产的研究方案，当前未实现。  

DESIGN.md：双屏模块细化设计与历史依据。  
PLAN.md：原 M0–M6 计划与实施演进，当前阶段以顶层文档和 STATUS 为准。  
IMPLEMENT.md：可直接作为Codex开发启动要求。  
STATUS.md：开发状态与后续记录。  
BASELINE-VERIFICATION.md：本次基线核验。  
SOURCE-MANIFEST.json：源文件与素材校验清单。

原交接快照保留在 baseline；当前工程实现与真机验收缺口见 STATUS.md。
