<div align="center">

# 🎬 Video Scanner Pro

### 本地视频信息扫描器 | Local Video Information Scanner

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/Electron-Latest-47848f?style=for-the-badge&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/yourusername/Local-Movie-Information-Screening?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/yourusername/Local-Movie-Information-Screening?style=social" alt="Forks">
  <img src="https://img.shields.io/github/watchers/yourusername/Local-Movie-Information-Screening?style=social" alt="Watchers">
</p>

<p align="center">
  <strong>一款功能强大的本地视频文件扫描和管理工具</strong><br>
  <em>A powerful local video file scanning and management tool</em>
</p>

---

<!-- Language Toggle -->
<p align="center">
  <a href="#中文文档">🇨🇳 中文</a> •
  <a href="#english-documentation">🇺🇸 English</a>
</p>

</div>

---

## 中文文档

### 📋 目录

- [✨ 功能特性](#-功能特性)
- [🚀 快速开始](#-快速开始)
- [📦 安装说明](#-安装说明)
- [🎯 使用指南](#-使用指南)
- [⚙️ 配置选项](#️-配置选项)
- [🛠️ 技术栈](#️-技术栈)
- [📸 界面预览](#-界面预览)
- [🤝 贡献指南](#-贡献指南)
- [📄 许可证](#-许可证)
- [📞 联系我们](#-联系我们)

### ✨ 功能特性

<table>
<tr>
<td width="50%">

#### 🔍 智能扫描
- **快速扫描** 本地视频文件
- **元数据提取** 分辨率、编码、时长等
- **实时进度** 显示扫描状态
- **格式支持** MP4、MKV、AVI、MOV等

</td>
<td width="50%">

#### 📁 文件管理
- **智能整理** 按元数据自动分类
- **批量操作** 移动、复制、重命名
- **预览功能** 操作前预览效果
- **安全操作** 防止文件丢失

</td>
</tr>
<tr>
<td width="50%">

#### 🔄 自动刷新
- **实时监控** 文件系统变化
- **增量更新** 高效的变化检测
- **智能过滤** 只关注视频文件
- **性能优化** 防抖和缓存机制

</td>
<td width="50%">

#### ⚙️ 高级设置
- **默认路径** 自动加载常用目录
- **历史记录** 最近使用路径管理
- **主题切换** 浅色/深色模式
- **性能调优** 可配置扫描参数

</td>
</tr>
</table>

### 🚀 快速开始

#### 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| **Node.js** | 16.0+ | 18.0+ |
| **npm** | 8.0+ | 9.0+ |
| **FFprobe** | 4.0+ | 5.0+ |
| **操作系统** | Windows 10+ / macOS 10.15+ / Ubuntu 18.04+ | 最新版本 |

#### 一键启动

```bash
# 克隆项目
git clone https://github.com/yourusername/Local-Movie-Information-Screening.git

# 进入目录
cd Local-Movie-Information-Screening

# 安装依赖
npm install

# 启动应用
npm start
```

### 📦 安装说明

#### 方式一：从源码安装

```bash
# 1. 克隆仓库
git clone https://github.com/yourusername/Local-Movie-Information-Screening.git
cd Local-Movie-Information-Screening

# 2. 安装依赖
npm install

# 3. 安装FFprobe（必需）
# Windows (使用Chocolatey)
choco install ffmpeg

# macOS (使用Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# 4. 启动开发模式
npm run dev

# 5. 构建生产版本
npm run build
```

#### 方式二：下载预编译版本

1. 访问 [Releases 页面](https://github.com/yourusername/Local-Movie-Information-Screening/releases)
2. 下载适合您操作系统的安装包
3. 运行安装程序
4. 启动应用

### 🎯 使用指南

#### 基础操作

1. **选择扫描目录**
   ```
   点击 "选择目录" 按钮 → 选择包含视频文件的文件夹 → 开始扫描
   ```

2. **查看视频信息**
   ```
   在视频列表中点击任意视频 → 右侧显示详细信息 → 支持播放和定位
   ```

3. **搜索和筛选**
   ```
   使用搜索框输入关键词 → 按分辨率筛选 → 实时结果更新
   ```

#### 高级功能

<details>
<summary><strong>📁 文件整理功能</strong></summary>

1. 打开设置页面
2. 启用 "按元数据信息整理" 选项
3. 选择分类规则：
   - ✅ 按分辨率分类 (4K/2K/1080p/720p等)
   - ✅ 按编码格式分类 (H264/H265/VP9等)
   - ✅ 按时长分类 (短片/中等/长片)
   - ✅ 按文件大小分类
4. 选择操作模式（移动/复制）
5. 预览整理计划
6. 执行整理操作

</details>

<details>
<summary><strong>🔄 自动刷新设置</strong></summary>

1. 在设置中启用 "自动刷新列表"
2. 系统将监控默认扫描目录
3. 检测到视频文件变化时自动更新列表
4. 支持配置监控范围和频率

</details>

<details>
<summary><strong>⚙️ 个性化配置</strong></summary>

- **默认扫描路径**: 设置常用的视频目录
- **主题模式**: 切换浅色/深色界面
- **性能设置**: 调整扫描线程数和缓存大小
- **文件过滤**: 自定义支持的视频格式

</details>

### ⚙️ 配置选项

#### 扫描设置

| 选项 | 描述 | 默认值 | 可选值 |
|------|------|--------|--------|
| **扫描深度** | 子目录扫描层级 | 5 | 1-10 |
| **并发数** | 同时处理文件数 | 4 | 1-8 |
| **缓存大小** | 元数据缓存容量 | 1000 | 100-5000 |
| **超时时间** | 单文件处理超时 | 30s | 10-120s |

#### 文件过滤

```json
{
  "supportedFormats": [
    ".mp4", ".mkv", ".avi", ".mov",
    ".wmv", ".flv", ".webm", ".m4v"
  ],
  "excludePatterns": [
    "*.tmp", "*.part", "Thumbs.db"
  ],
  "minFileSize": "1MB",
  "maxFileSize": "50GB"
}
```

### 🛠️ 技术栈

<div align="center">

| 前端技术 | 后端技术 | 工具链 |
|:--------:|:--------:|:------:|
| ![Electron](https://img.shields.io/badge/Electron-47848f?style=for-the-badge&logo=electron&logoColor=white) | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white) | ![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white) |
| ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) | ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) | ![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white) |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) | ![File System](https://img.shields.io/badge/File_System-4285F4?style=for-the-badge&logo=google-drive&logoColor=white) | ![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white) |
| ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) | ![IPC](https://img.shields.io/badge/IPC-00599C?style=for-the-badge&logo=electron&logoColor=white) | ![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white) |

</div>

#### 核心依赖

```json
{
  "electron": "^latest",
  "node": ">=18.0.0",
  "python": ">=3.8",
  "ffprobe": ">=4.0"
}
```

### 📸 界面预览

<div align="center">

#### 🖥️ 主界面
> 简洁直观的视频扫描界面

![主界面预览](https://via.placeholder.com/800x500/2196F3/FFFFFF?text=主界面预览)

#### ⚙️ 设置页面
> 功能丰富的配置选项

![设置页面预览](https://via.placeholder.com/800x500/4CAF50/FFFFFF?text=设置页面预览)

#### 📁 文件整理
> 智能的文件分类管理

![文件整理预览](https://via.placeholder.com/800x500/FF9800/FFFFFF?text=文件整理预览)

</div>

### 🔄 更新日志

<details>
<summary><strong>📅 版本历史</strong></summary>

#### v2.0.0 (2024-05-25) - 重大更新
- ✨ **新增** 按元数据自动整理功能
- ✨ **新增** 实时文件监控和自动刷新
- ✨ **新增** 默认扫描路径管理
- 🔧 **修复** 浏览按钮卡死问题
- 🔧 **修复** IPC通信超时问题
- 🎨 **优化** 模块化代码架构
- 🎨 **优化** 用户界面和交互体验

#### v1.2.0 (2024-03-15)
- ✨ **新增** 搜索和筛选功能
- ✨ **新增** 主题切换支持
- 🔧 **修复** 大文件扫描性能问题
- 🎨 **优化** 界面响应速度

#### v1.1.0 (2024-02-01)
- ✨ **新增** 多格式视频支持
- ✨ **新增** 批量操作功能
- 🔧 **修复** 路径包含特殊字符的问题

#### v1.0.0 (2024-01-01) - 首次发布
- 🎉 **发布** 基础视频扫描功能
- 🎉 **发布** 元数据提取功能
- 🎉 **发布** 跨平台支持

</details>

### 🤝 贡献指南

我们欢迎所有形式的贡献！请阅读以下指南：

#### 🐛 报告问题

1. 检查 [Issues](https://github.com/yourusername/Local-Movie-Information-Screening/issues) 中是否已存在相同问题
2. 使用问题模板创建新的 Issue
3. 提供详细的复现步骤和环境信息

#### 💡 功能建议

1. 在 [Discussions](https://github.com/yourusername/Local-Movie-Information-Screening/discussions) 中讨论新功能
2. 创建 Feature Request Issue
3. 详细描述功能需求和使用场景

#### 🔧 代码贡献

```bash
# 1. Fork 项目
# 2. 创建功能分支
git checkout -b feature/amazing-feature

# 3. 提交更改
git commit -m 'Add some amazing feature'

# 4. 推送到分支
git push origin feature/amazing-feature

# 5. 创建 Pull Request
```

#### 📝 开发规范

- **代码风格**: 遵循 ESLint 配置
- **提交信息**: 使用 [Conventional Commits](https://conventionalcommits.org/)
- **测试覆盖**: 新功能需要包含测试
- **文档更新**: 更新相关文档和README

### 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

```
MIT License

Copyright (c) 2024 Video Scanner Pro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### 📞 联系我们

<div align="center">

| 联系方式 | 信息 |
|:--------:|:----:|
| 📧 **邮箱** | [your.email@example.com](mailto:2412433138@qq.com) |
| 🐛 **问题反馈** | [GitHub Issues](https://github.com/bailin633/Local-Movie-Information-Screening/issues) |
| 💬 **讨论交流** | [GitHub Discussions](https://github.com/bailin633/Local-Movie-Information-Screening/discussions) |


</div>

---

## English Documentation

### 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [🎯 Usage Guide](#-usage-guide)
- [⚙️ Configuration](#️-configuration)
- [🛠️ Tech Stack](#️-tech-stack)
- [📸 Screenshots](#-screenshots)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [📞 Contact](#-contact)

### ✨ Features

<table>
<tr>
<td width="50%">

#### 🔍 Smart Scanning
- **Fast Scanning** of local video files
- **Metadata Extraction** resolution, codec, duration, etc.
- **Real-time Progress** display scanning status
- **Format Support** MP4, MKV, AVI, MOV, etc.

</td>
<td width="50%">

#### 📁 File Management
- **Smart Organization** auto-categorize by metadata
- **Batch Operations** move, copy, rename
- **Preview Function** preview effects before operations
- **Safe Operations** prevent file loss

</td>
</tr>
<tr>
<td width="50%">

#### 🔄 Auto Refresh
- **Real-time Monitoring** file system changes
- **Incremental Updates** efficient change detection
- **Smart Filtering** focus only on video files
- **Performance Optimization** debounce and caching

</td>
<td width="50%">

#### ⚙️ Advanced Settings
- **Default Paths** auto-load common directories
- **History Management** recent paths management
- **Theme Switching** light/dark mode
- **Performance Tuning** configurable scan parameters

</td>
</tr>
</table>

### 🚀 Quick Start

#### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Node.js** | 16.0+ | 18.0+ |
| **npm** | 8.0+ | 9.0+ |
| **FFprobe** | 4.0+ | 5.0+ |
| **OS** | Windows 10+ / macOS 10.15+ / Ubuntu 18.04+ | Latest |

#### One-Click Launch

```bash
# Clone the project
git clone https://github.com/yourusername/Local-Movie-Information-Screening.git

# Enter directory
cd Local-Movie-Information-Screening

# Install dependencies
npm install

# Start application
npm start
```

### 📦 Installation

#### Method 1: Install from Source

```bash
# 1. Clone repository
git clone https://github.com/yourusername/Local-Movie-Information-Screening.git
cd Local-Movie-Information-Screening

# 2. Install dependencies
npm install

# 3. Install FFprobe (required)
# Windows (using Chocolatey)
choco install ffmpeg

# macOS (using Homebrew)
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# 4. Start development mode
npm run dev

# 5. Build production version
npm run build
```

#### Method 2: Download Pre-built Version

1. Visit [Releases Page](https://github.com/yourusername/Local-Movie-Information-Screening/releases)
2. Download the installer for your operating system
3. Run the installer
4. Launch the application

### 🎯 Usage Guide

#### Basic Operations

1. **Select Scan Directory**
   ```
   Click "Select Directory" button → Choose folder containing video files → Start scanning
   ```

2. **View Video Information**
   ```
   Click any video in the list → Detailed info displays on the right → Support playback and location
   ```

3. **Search and Filter**
   ```
   Use search box to enter keywords → Filter by resolution → Real-time result updates
   ```

#### Advanced Features

<details>
<summary><strong>📁 File Organization</strong></summary>

1. Open settings page
2. Enable "Organize by Metadata" option
3. Select classification rules:
   - ✅ By Resolution (4K/2K/1080p/720p, etc.)
   - ✅ By Codec (H264/H265/VP9, etc.)
   - ✅ By Duration (short/medium/long)
   - ✅ By File Size
4. Choose operation mode (move/copy)
5. Preview organization plan
6. Execute organization

</details>

<details>
<summary><strong>🔄 Auto Refresh Settings</strong></summary>

1. Enable "Auto Refresh List" in settings
2. System will monitor default scan directory
3. Auto-update list when video file changes detected
4. Support configurable monitoring scope and frequency

</details>

<details>
<summary><strong>⚙️ Personalization</strong></summary>

- **Default Scan Path**: Set common video directories
- **Theme Mode**: Switch light/dark interface
- **Performance Settings**: Adjust scan threads and cache size
- **File Filtering**: Customize supported video formats

</details>

### ⚙️ Configuration

#### Scan Settings

| Option | Description | Default | Range |
|--------|-------------|---------|-------|
| **Scan Depth** | Subdirectory scan levels | 5 | 1-10 |
| **Concurrency** | Simultaneous file processing | 4 | 1-8 |
| **Cache Size** | Metadata cache capacity | 1000 | 100-5000 |
| **Timeout** | Single file processing timeout | 30s | 10-120s |

#### File Filtering

```json
{
  "supportedFormats": [
    ".mp4", ".mkv", ".avi", ".mov",
    ".wmv", ".flv", ".webm", ".m4v"
  ],
  "excludePatterns": [
    "*.tmp", "*.part", "Thumbs.db"
  ],
  "minFileSize": "1MB",
  "maxFileSize": "50GB"
}
```

### 🛠️ Tech Stack

<div align="center">

| Frontend | Backend | Tools |
|:--------:|:-------:|:-----:|
| ![Electron](https://img.shields.io/badge/Electron-47848f?style=for-the-badge&logo=electron&logoColor=white) | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white) | ![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white) |
| ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) | ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) | ![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white) |
| ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) | ![File System](https://img.shields.io/badge/File_System-4285F4?style=for-the-badge&logo=google-drive&logoColor=white) | ![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white) |
| ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) | ![IPC](https://img.shields.io/badge/IPC-00599C?style=for-the-badge&logo=electron&logoColor=white) | ![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white) |

</div>

#### Core Dependencies

```json
{
  "electron": "^latest",
  "node": ">=18.0.0",
  "python": ">=3.8",
  "ffprobe": ">=4.0"
}
```

### 📸 Screenshots

<div align="center">

#### 🖥️ Main Interface
> Clean and intuitive video scanning interface

![Main Interface](https://via.placeholder.com/800x500/2196F3/FFFFFF?text=Main+Interface)

#### ⚙️ Settings Page
> Feature-rich configuration options

![Settings Page](https://via.placeholder.com/800x500/4CAF50/FFFFFF?text=Settings+Page)

#### 📁 File Organization
> Smart file classification management

![File Organization](https://via.placeholder.com/800x500/FF9800/FFFFFF?text=File+Organization)

</div>

### 🔄 Changelog

<details>
<summary><strong>📅 Version History</strong></summary>

#### v2.0.0 (2024-05-25) - Major Update
- ✨ **Added** Auto-organize by metadata feature
- ✨ **Added** Real-time file monitoring and auto-refresh
- ✨ **Added** Default scan path management
- 🔧 **Fixed** Browse button freeze issue
- 🔧 **Fixed** IPC communication timeout issue
- 🎨 **Improved** Modular code architecture
- 🎨 **Improved** User interface and interaction experience

#### v1.2.0 (2024-03-15)
- ✨ **Added** Search and filter functionality
- ✨ **Added** Theme switching support
- 🔧 **Fixed** Large file scanning performance issues
- 🎨 **Improved** Interface response speed

#### v1.1.0 (2024-02-01)
- ✨ **Added** Multi-format video support
- ✨ **Added** Batch operation functionality
- 🔧 **Fixed** Path with special characters issue

#### v1.0.0 (2024-01-01) - Initial Release
- 🎉 **Released** Basic video scanning functionality
- 🎉 **Released** Metadata extraction functionality
- 🎉 **Released** Cross-platform support

</details>

### 🤝 Contributing

We welcome all forms of contributions! Please read the following guidelines:

#### 🐛 Reporting Issues

1. Check [Issues](https://github.com/yourusername/Local-Movie-Information-Screening/issues) for existing similar issues
2. Create a new Issue using the issue template
3. Provide detailed reproduction steps and environment information

#### 💡 Feature Suggestions

1. Discuss new features in [Discussions](https://github.com/yourusername/Local-Movie-Information-Screening/discussions)
2. Create a Feature Request Issue
3. Describe feature requirements and use cases in detail

#### 🔧 Code Contributions

```bash
# 1. Fork the project
# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Commit changes
git commit -m 'Add some amazing feature'

# 4. Push to branch
git push origin feature/amazing-feature

# 5. Create Pull Request
```

#### 📝 Development Standards

- **Code Style**: Follow ESLint configuration
- **Commit Messages**: Use [Conventional Commits](https://conventionalcommits.org/)
- **Test Coverage**: New features should include tests
- **Documentation**: Update relevant documentation and README

### 📄 License

This project is licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2024 Video Scanner Pro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### 📞 Contact

<div align="center">

| Contact Method | Information |
|:--------------:|:-----------:|
| 📧 **Email** | [your.email@example.com](mailto:2412433138@qq.com) |
| 🐛 **Bug Reports** | [GitHub Issues](https://github.com/bailin633/Local-Movie-Information-Screening/issues) |
| 💬 **Discussions** | [GitHub Discussions](https://github.com/bailin633/Local-Movie-Information-Screening/discussions) |

</div>

---

<div align="center">

### 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/Local-Movie-Information-Screening&type=Date)](https://star-history.com/#yourusername/Local-Movie-Information-Screening&Date)

### 💝 Support This Project

If you find this project helpful, please consider:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/yourusername)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/yourusername)
[![PayPal](https://img.shields.io/badge/PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/yourusername)

**⭐ Star this repository** • **🍴 Fork it** • **📢 Share with friends**

---

<p align="center">
  <strong>Made with ❤️ by the Video Scanner Pro Team</strong><br>
  <em>© 2024 Video Scanner Pro. All rights reserved.</em>
</p>

</div>