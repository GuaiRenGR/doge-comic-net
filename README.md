<p align="center">
  <img src="app_icon.png" width="128" height="128" alt="Doge 漫画图标">
</p>

<h1 align="center">Doge 漫画网络版</h1>

<p align="center">为有道词典笔 OS 设计的第三方漫画搜索、阅读与下载应用。</p>

<p align="center">
  <a href="README_en.md">English</a>
  ·
  <a href="https://github.com/GuaiRenGR/doge-comic-net/releases">下载发行版</a>
  ·
  <a href="Pixiv登录与Token-Cookie获取教程.md">Pixiv 登录教程</a>
  ·
  <a href="https://github.com/GuaiRenGR/doge-comic">原始项目</a>
</p>


<p align="center">
  <img src="https://img.shields.io/badge/平台-有道词典笔%20%7C%20Linux%20ARMv7l-2ea44f" alt="支持平台">
  <img src="https://img.shields.io/badge/框架-Vue.js-42b883?logo=vue.js&logoColor=white" alt="Vue.js">
  <img src="https://img.shields.io/badge/版本-1.3.2-00A98F" alt="版本 1.3.2">
  <img src="https://img.shields.io/badge/许可证-AGPLv3-blue" alt="AGPLv3 许可证">
</p>

## ✨ 项目简介

Doge 漫画网络版 fork 自 [adogecheems/doge-comic](https://github.com/adogecheems/doge-comic)，由 [GuaiRenGR](https://github.com/GuaiRenGR) 维护。项目面向 1020×240 及相同比例的词典笔屏幕，使用 Vue.js 和 miniapp 框架构建。

当前已在有道 A7P 上完成主要功能测试。由于词典笔没有内置输入法和 WebView，项目内置了适配横向小屏的输入键盘，并提供 Pixiv 账号密码、Cookie 和 OAuth Token 导入方式。

## 🚀 核心功能

- 联网搜索、在线阅读和下载漫画
- 本地图片、图片文件夹和转换后漫画浏览
- WebP 图片自动转换为阅读器支持的 JPEG
- 阅读进度自动保存，支持调整图片缩放和渲染同步时间
- 适配词典笔横向小屏的响应式布局和可隐藏侧边栏
- Pixiv 搜索、首页推荐、作品简介、多页阅读与下载
- 支持多种网络线路和漫画源

## 🌐 漫画源

以下源已在有道 A7P 上测试可用：

- 禁漫
- 哔咔（需要账号登录）
- Pixiv（需要登录，支持搜索、推荐、阅读和下载）
- E-Hentai
- 绅士漫画

nHentai 和 Hitomi 已接入，但尚未在有道 A7P 上完成可用性验证。

### Pixiv 登录

词典笔没有 WebView，Pixiv 支持以下登录方式：

1. 在应用中直接输入 Pixiv 账号和密码。
2. 在电脑浏览器获取 `PHPSESSID` Cookie 后导入。
3. 导入 Pixiv OAuth `access_token`/`refresh_token`。

详细步骤和 ADB 文件导入命令见 [Pixiv 登录与 Token/Cookie 获取教程](Pixiv登录与Token-Cookie获取教程.md)。登录状态保存在 miniapp 的 `$dataDir/__kv__` 中，不会写入漫画缓存目录。

## 🖼️ 预览

![首页](https://cdn.mmoe.work/public/doge-comic/index.png)
![阅读器](https://cdn.mmoe.work/public/doge-comic/reader.png)

## 📦 安装

### 直接安装

1. 按照[词典笔 ADB 教程](https://www.bilibili.com/read/cv40931661/?plat_id=35&share_from=article&share_medium=iphone&share_plat=ios&share_source=QQ&share_tag=s_i&timestamp=1741365791&unique_k=3UbJ6rn&opus_fallback=1)准备 ADB 环境。
2. 从 [Releases](https://github.com/GuaiRenGR/doge-comic-net/releases) 下载最新 `.amr` 安装包。
3. 将安装包传到词典笔，例如：

```bash
adb push 8003172478459463.1_3_2.amr /userdisk/Favorite/
```

4. 执行安装：

```bash
adb shell "miniapp_cli install /userdisk/Favorite/8003172478459463.1_3_2.amr"
```

### 从源码构建

项目需要 Node.js 16、18 或 20，以及可用的 miniapp 构建工具。构建生产包：

```bash
npm install
npm run build:prod
```

构建完成后，项目根目录会生成 `.amr` 安装包，再按上面的 ADB 命令安装。Node.js 22 及更高版本可能与当前构建工具不兼容。

## 🛠️ 使用说明

- 本地漫画应按数字顺序命名，例如 `001.jpg`、`002.jpg`，以保证阅读顺序正确。
- miniapp 阅读器不支持直接渲染 WebP；联网缓存中的 WebP 会由内置 ARM 转换模块转为 JPEG。
- 也可以使用 [`convert.py`](convert.py) 将文件夹、ZIP 或 PDF 转换为可阅读的图片目录：

```bash
pip install Pillow pypdfium2 tqdm
python convert.py <漫画文件夹|ZIP|PDF> [输出目录] [-j <并行数>] [--no-confirm]
```

- 较旧设备可能缺少 `storage` 模块，因此无法保存历史记录或阅读进度。

## 🔐 安全提醒

Pixiv 的 `PHPSESSID`、OAuth Token 和哔咔账号信息都属于敏感凭据。不要提交到 Git、聊天群或截图中；传输完成后删除明文 token 文件。若凭据泄露，请及时在对应服务中退出设备、修改密码或撤销 Token。

## 📁 项目结构

```text
doge-comic-net/
├── src/                         # miniapp 源码
├── assets/                      # 静态资源
├── native/                      # ARM 图片转换模块
├── webp2jpg-armv7-miniapp/      # WebP 转 JPEG 工具及构建文件
├── tools/                       # 构建辅助工具
├── docs/                        # 本地开发文档（不提交）
├── package.json                 # 构建脚本和应用信息
└── app_icon.png                # 应用图标
```

## 📄 关于

- 原项目：[adogecheems/doge-comic](https://github.com/adogecheems/doge-comic)
- 原作者：[adogecheems](https://github.com/adogecheems)
- 网络版维护者：[GuaiRenGR](https://github.com/GuaiRenGR)
- 项目地址：[GuaiRenGR/doge-comic-net](https://github.com/GuaiRenGR/doge-comic-net)
- 许可证：AGPLv3

“Doge” 是“词典笔 OS 通用生态系统”（Dictpen OS Generic Ecosystem）的缩写。

<div align="center">
  <sub>为词典笔而生 · 感谢每一颗 ⭐</sub>
</div>
