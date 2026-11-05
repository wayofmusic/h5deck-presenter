# scrcpy 与双屏演讲的关系

调研日期：2026-10-27，依据 Genymobile 官方仓库 README、连接文档与开发协议。

任务是电脑显示 HTML PPT，手机独立阅读逐页讲稿，两边同步页码与渐进步骤。scrcpy 的主要任务是把 Android 屏幕和声音传给电脑，从电脑向手机注入操作，两者的数据层次与方向不同。

| 问题 | 结论 |
|---|---|
| 观察真实 Android 界面 | USB/TCP-IP 镜像适合查看 Chrome 看稿界面和录屏 |
| 电脑操作手机 | 可辅助实机联调 |
| 手机控制电脑 H5 | 仍需独立应用状态协议与局域网服务 |
| 逐页讲稿与步骤 | 需要页面 ID、内容包与统一内核，scrcpy 不代替这部分 |
| 复用内部协议 | 官方说明为内部协议，可随版本变化，客户端与服务端须版本匹配；不作为本项目核心依赖 |
| 后续 iPhone | scrcpy 面向 Android，浏览器路线便于后续测试 iPhone；当前无 iPhone 实测 |

实现采用浏览器 + POST 命令 + SSE 状态快照。手机只读取文字与状态，讲稿凭配对权限获取。当前没有可访问的真实 Android 设备，不需要先下载 scrcpy。

后续需要实机镜像时从官方仓库获取，用 USB 观察 Android Chrome。普通镜像控制需设备开启 USB 调试并授权，无线模式另需配置 ADB。模拟移动视口不算真机验收。

官方来源：

- [项目 README](https://github.com/Genymobile/scrcpy)
- [连接与无线模式](https://github.com/Genymobile/scrcpy/blob/master/doc/connection.md)
- [开发结构与内部协议](https://github.com/Genymobile/scrcpy/blob/master/doc/develop.md)

本轮未下载、安装或运行 scrcpy。
