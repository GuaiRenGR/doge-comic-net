<p align="center">
  <img src="app_icon.png" width="128" height="128" alt="Doge Comic icon">
</p>

<h1 align="center">Doge Comic Network Edition</h1>

<p align="center">A third-party comic search, reader, and download app for Youdao dictionary pens.</p>

<p align="center">
  <a href="README.md">中文</a>
  ·
  <a href="https://github.com/GuaiRenGR/doge-comic-net/releases">Releases</a>
  ·
  <a href="Pixiv登录与Token-Cookie获取教程.md">Pixiv login guide</a>
  ·
  <a href="https://github.com/GuaiRenGR/doge-comic">Original project</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Youdao%20Dictionary%20Pen%20%7C%20Linux%20ARMv7l-2ea44f" alt="Supported platform">
  <img src="https://img.shields.io/badge/Framework-Vue.js-42b883?logo=vue.js&logoColor=white" alt="Vue.js">
  <img src="https://img.shields.io/badge/Version-1.3.2-00A98F" alt="Version 1.3.2">
  <img src="https://img.shields.io/badge/License-AGPLv3-blue" alt="AGPLv3 license">
</p>

## ✨ Overview

Doge Comic Network Edition is forked from [adogecheems/doge-comic](https://github.com/adogecheems/doge-comic) and maintained by [GuaiRenGR](https://github.com/GuaiRenGR). It is built with Vue.js and the miniapp framework for dictionary pens with 1020×240 screens and similar aspect ratios.

The main features have been tested on the Youdao A7P. Dictionary pens do not include a system keyboard or WebView, so the app includes a compact landscape keyboard and supports Pixiv password login, Cookie import, and OAuth token import.

## 🚀 Features

- Search, read, and download comics over the network
- Browse local images, image folders, and converted comics
- Convert online WebP images to JPEG automatically
- Save reading progress and adjust image scale and render sync time
- Responsive layout and collapsible sidebar for small landscape screens
- Pixiv search, home recommendations, descriptions, multi-page reading, and downloads
- Multiple network routes and comic sources

## 🌐 Comic sources

The following sources have been tested on the Youdao A7P:

- JM (禁漫)
- Bika (哔咔, account login required)
- Pixiv (login required; search, recommendations, reading, and downloads)
- E-Hentai
- Gentleman Comics (绅士漫画)

nHentai and Hitomi are integrated but have not yet completed availability testing on the Youdao A7P.

### Pixiv login

Because the dictionary pen has no WebView, Pixiv supports three login methods:

1. Enter a Pixiv username and password in the app.
2. Export a `PHPSESSID` Cookie from a desktop browser and import it.
3. Import a Pixiv OAuth `access_token`/`refresh_token`.

See the detailed [Pixiv login and Token/Cookie guide](Pixiv登录与Token-Cookie获取教程.md), including ADB file transfer commands. Login state is stored in the miniapp `$dataDir/__kv__` store and is separate from the comic cache directory.

## 🖼️ Preview

![Home](https://cdn.mmoe.work/public/doge-comic/index.png)
![Reader](https://cdn.mmoe.work/public/doge-comic/reader.png)

## 📦 Installation

### Install a release

1. Prepare ADB by following the [dictionary pen ADB guide](https://www.bilibili.com/read/cv40931661/?plat_id=35&share_from=article&share_medium=iphone&share_plat=ios&share_source=QQ&share_tag=s_i&timestamp=1741365791&unique_k=3UbJ6rn&opus_fallback=1).
2. Download the latest `.amr` package from [Releases](https://github.com/GuaiRenGR/doge-comic-net/releases).
3. Push the package to the dictionary pen, for example:

```bash
adb push 8003172478459463.1_3_2.amr /userdisk/Favorite/
```

4. Install it with:

```bash
adb shell "miniapp_cli install /userdisk/Favorite/8003172478459463.1_3_2.amr"
```

### Build from source

Use Node.js 16, 18, or 20 and a working miniapp build toolchain. Build a production package with:

```bash
npm install
npm run build:prod
```

The generated `.amr` package appears in the project root. Install it using the ADB command above. Node.js 22 and later may be incompatible with the current build toolchain.

## 🛠️ Usage

- Name local pages with numeric order, such as `001.jpg` and `002.jpg`, to preserve reading order.
- The miniapp reader cannot render WebP directly. WebP files in network caches are converted to JPEG by the built-in ARM conversion module.
- [`convert.py`](convert.py) converts a folder, ZIP archive, or PDF into a reader-compatible image directory:

```bash
pip install Pillow pypdfium2 tqdm
python convert.py <comic-folder|ZIP|PDF> [output-directory] [-j <workers>] [--no-confirm]
```

- Older devices may lack the `storage` module and therefore cannot save history or reading progress.

## 🔐 Security

Pixiv `PHPSESSID` values, OAuth tokens, and Bika account credentials are sensitive login data. Do not commit them to Git, post them in chat, or include them in screenshots. Delete plaintext token files after transfer. If credentials leak, sign out devices, change the password, or revoke the affected token in the corresponding service.

## 📁 Project structure

```text
doge-comic-net/
├── src/                         # miniapp source
├── assets/                      # static assets
├── native/                      # ARM image conversion module
├── webp2jpg-armv7-miniapp/      # WebP-to-JPEG tool and build files
├── tools/                       # build helpers
├── docs/                        # local development documentation (ignored)
├── package.json                 # build scripts and app metadata
└── app_icon.png                # application icon
```

## 📄 About

- Original project: [adogecheems/doge-comic](https://github.com/adogecheems/doge-comic)
- Original author: [adogecheems](https://github.com/adogecheems)
- Network edition maintainer: [GuaiRenGR](https://github.com/GuaiRenGR)
- Repository: [GuaiRenGR/doge-comic-net](https://github.com/GuaiRenGR/doge-comic-net)
- License: AGPLv3

“Doge” stands for “Dictpen OS Generic Ecosystem”.

<div align="center">
  <sub>Built for dictionary pens · Thanks for every ⭐</sub>
</div>
