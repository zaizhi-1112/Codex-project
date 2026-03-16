# Codex Project Showcase

这个仓库用于集中收录我使用 Codex 制作的工具网页项目。

## 仓库目标

- 每个工具项目独立目录，互不影响
- 每个项目都有单独介绍（README）
- 仓库首页统一展示所有项目
- 任何人都可以按项目目录自取使用

## 项目展示

- 总览页：`/index.html`
- 项目清单：`/projects/projects.json`

## 当前项目

| 项目 | 简介 | 目录 | 说明文档 |
| --- | --- | --- | --- |
| AI 新闻助手 | 抓取多信源新闻并筛选、去重、生成精选摘要 | `projects/ai-news-assistant` | `projects/ai-news-assistant/README.md` |
| 桌面倒计时提醒器 | 支持多倒计时、声音提醒、桌面通知和浮窗提示 | `projects/reminder-clock` | `projects/reminder-clock/README.md` |
| 图片无缝拼接工具 | 支持纵横拼接、间距背景设置、下载和复制图片 | `projects/image-stitcher` | `projects/image-stitcher/README.md` |
| 视频转 GIF 工具 | 支持本地上传视频并在浏览器内转换和下载 GIF | `projects/video-to-gif` | `projects/video-to-gif/README.md` |

## 统一目录规范

```text
.
├─ index.html                      # 项目总览页
├─ projects/
│  ├─ projects.json                # 所有项目元数据
│  └─ <project-slug>/              # 每个工具独立目录
│     ├─ README.md                 # 项目介绍
│     ├─ index.html                # 工具入口页面
│     └─ ...                       # 项目自己的资源文件
└─ scripts/
   └─ add-project.ps1              # 新增项目登记脚本
```

## 自取使用方式

1. 打开某个项目目录下的 `README.md` 了解功能与运行方式。
2. 直接下载该项目目录，或克隆整个仓库后只使用该目录。
3. 静态页面项目建议使用本地静态服务运行（如 `python -m http.server 8080`）。

## 后续迁移方式

你把本地项目路径发给我后，我会为每个项目执行：

1. 复制到 `projects/<slug>/`
2. 补齐该项目的 `README.md`
3. 更新 `projects/projects.json`
4. 确保不会影响其他项目
