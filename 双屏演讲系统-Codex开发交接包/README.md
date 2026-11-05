# 双屏演讲平台 v0.2

一套固定平台，导入不同的互动 H5 课件与逐页讲稿。电脑投屏，手机看稿和遥控，电脑操作也同步手机。

集中交付：双屏演讲平台-v0.2-完整交付包.zip。解压后双击顶层“启动双屏演讲.cmd”，结束后台服务用“停止双屏演讲.cmd”。运行时与依赖已包含，无须安装 Node。

## 使用

1. 启动后选择课件，点击“打开投屏画面”，移到大屏后按 F 或 F11 全屏。
2. 手机与电脑连接可互通的局域网，工作台选择对应 Wi-Fi/热点网卡，手机扫码配对。
3. 手机看当前页逐字稿，“下一步”先展开再翻页；电脑方向键也同步手机。
4. 添加新课程：点击“导入内容包”，选择 .h5deck，再在课件列表中选择。工作台与交付包均提供两个标准样例。
5. 导入不切走当前演讲；切课会撤销旧手机，用新二维码重新配对。

二维码两分钟有效且只用一次，“重新配对”撤销旧手机。讲稿字号、阅读位置和自动滚动独立于投屏，读到稿尾不会自动翻页。

“演讲工具”提供直接翻页、黑屏、重播、计时和练习，“目录”可跳转。常亮与全屏取决于浏览器支持。

手机断线不补发点击，恢复取最新状态。电脑投屏已加载时可继续单机演示；服务恢复后在投屏按 C，以当前画面恢复遥控，恢复前不要刷新窗口。全部窗口和服务关闭后的跨天续讲未实现。

会场 Wi-Fi 隔离设备时可尝试手机热点，重新选择地址。避开 VPN/虚拟网卡。程序不会自动修改防火墙或浏览器设置。

## 内容与数据

按 [标准内容包制作指南](03-标准内容包制作指南.md) 制作，提供基础/互动模板、SDK、Schema、初始化/校验/打包工具。符合协议的 H5 可替换视觉和互动，任意网页或 PPTX 需要单独适配。

完整包从顶层启动时，导入课程和设置在顶层 data，备份/升级保留它。直接从源码启动默认在项目 data。日志与进程记录在应用 .runtime。

保留原 32 页课件与三页兼容样例。baseline/outputs 中独立 HTML 含本机备注，可备用放映。私人讲稿、肖像与联系二维码仅按本项目用途使用，不自动上传或公开。

## 开发

使用附带 Node 24.22.1，在源码根目录执行，完整包对应 app：

```powershell
.\runtime\node.exe packaging/build.mjs
.\runtime\node.exe --test verification/core.test.mjs verification/server.test.mjs verification/content.test.mjs
.\runtime\node.exe packaging/launch.mjs --no-open
.\runtime\node.exe packaging/content-cli.mjs init "D:\我的课程\课程一" basic
.\runtime\node.exe packaging/content-cli.mjs validate "D:\我的课程\课程一"
.\runtime\node.exe packaging/content-cli.mjs pack "D:\我的课程\课程一" "D:\我的课程\课程一.h5deck"
.\runtime\node.exe packaging/release.mjs
```

release 工具的 --replace 参数可更新已有交付包。baseline 保留为来源对照。新增标准内容无需修改平台内核。

10 项自动化及桌面/移动视口浏览器回归通过。两部 Android 手机的成功反馈来自 v0.1；v0.2 导入与沙箱流程仍需真机复测。Chrome 真机、热点、锁屏、长时间和干净 Windows 缺口见 [STATUS](STATUS.md)。

内置 AI、桌面安装器、眼镜、多天长课、原生 PPTX 与公网协作仍在假设池。scrcpy 为可选联调工具，不是运行依赖。

开发首读 [顶层文档](00-顶层开发文档.md) 和 [STATUS](STATUS.md)，内容制作读 [制作指南](03-标准内容包制作指南.md)，过程复用读 [复盘手册](01-开发复盘与复用手册.md)。
