# 视频转 GIF 工具

## 项目简介

一个本地浏览器视频转 GIF 工具，支持拖拽上传视频、设置截取参数，并在浏览器内完成转换与下载。

## 功能特点

- 支持拖拽或选择视频文件
- 支持设置开始时间、截取时长、输出宽度
- 支持设置帧率和质量档位
- 支持原视频预览与 GIF 结果预览
- 全程本地处理，不上传服务器
- 附带 Windows 批处理版本，可配合 `ffmpeg` 使用

## 文件结构

```text
video-to-gif/
├─ index.html
├─ style.css
├─ script.js
├─ README.md
└─ video_to_gif.bat
```

## 网页端使用

1. 打开 `index.html`
2. 上传或拖拽视频文件
3. 设置开始时间、时长、宽度、帧率、质量
4. 点击“开始转换”
5. 生成后下载 GIF

## 命令行使用（Windows）

`video_to_gif.bat` 依赖本机已安装 `ffmpeg`：

```bat
ffmpeg -version
```

执行格式：

```bat
video_to_gif.bat input.mp4 [output.gif] [start] [duration] [width] [fps] [quality]
```
