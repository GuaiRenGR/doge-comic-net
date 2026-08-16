# Pixiv 登录与 Token/Cookie 获取教程

词典笔没有 WebView，Doge 漫画的 Pixiv 源提供三种登录方式：

1. 在词典笔中直接输入 Pixiv 账号和密码。
2. 从电脑浏览器复制 `PHPSESSID` cookie，再通过文件导入。
3. 导入已有的 Pixiv OAuth access token/refresh token。

推荐使用第 2 种。它不需要在词典笔上打开 Pixiv 登录页面，也不需要输入很长的令牌。

## 方式一：账号密码登录

1. 打开 Doge 漫画，进入“联网漫画”。
2. 选择 `Pixiv` 源。
3. 在账号和密码框中输入 Pixiv 凭据，点击“登录”。
4. 登录成功后可以搜索、查看推荐、阅读和下载作品。

Pixiv 账号启用二次验证，或者 Pixiv 禁用了密码授权时，密码模式可能失败。此时使用下面的 cookie 或 token 方式。

## 方式二：浏览器获取 PHPSESSID

### Chrome/Edge

1. 在电脑浏览器登录 <https://www.pixiv.net>。
2. 按 `F12` 打开开发者工具。
3. 打开 `Application`（Edge 中也可能叫“应用”）页签。
4. 左侧展开 `Storage -> Cookies -> https://www.pixiv.net`。
5. 找到名称为 `PHPSESSID` 的条目，复制它的 `Value`，不要复制名称列。
6. 新建纯文本文件 `pixiv-token.txt`，内容写成：

```text
PHPSESSID=这里填写刚刚复制的值
```

也可以在开发者工具的 `Network` 页签中打开一个 `www.pixiv.net` 请求，复制请求头里的完整 `Cookie` 值。完整 cookie 往往比只复制 `PHPSESSID` 更稳定。

### Firefox

1. 登录 <https://www.pixiv.net>，按 `F12`。
2. 打开“存储”页签，展开“Cookie -> https://www.pixiv.net”。
3. 找到 `PHPSESSID`，复制值并按上面的格式保存。

### 注意

不要在控制台只执行 `document.cookie` 来获取它。`PHPSESSID` 通常是 `HttpOnly`，不会出现在这个结果中。

## 将文件传到词典笔

确认电脑已经能使用 ADB，然后执行：

```bash
adb devices
adb push pixiv-token.txt /userdisk/Favorite/pixiv-token.txt
adb shell ls -l /userdisk/Favorite/pixiv-token.txt
```

在词典笔中：

1. 进入“联网漫画”，选择 `Pixiv`。
2. 点击“读取文件”。
3. 页面提示“Pixiv cookie 导入成功”后即可搜索或打开“pixiv推荐”。

导入成功后可以删除明文文件：

```bash
adb shell rm /userdisk/Favorite/pixiv-token.txt
```

删除文件不会删除已经保存的登录状态。登录状态保存在 miniapp 的 `$dataDir/__kv__` 中。

## 方式三：导入 OAuth Token

如果你已经从可信的 Pixiv OAuth 客户端导出了令牌，可以将以下任一种内容保存为 `pixiv-token.txt`：

### OAuth JSON

```json
{
  "access_token": "你的 access token",
  "refresh_token": "你的 refresh token"
}
```

### Bearer 格式

```text
Bearer 你的 access token
```

也支持只放一行 access token。将文件推送到词典笔后，点击“读取文件”即可。不要把 `PHPSESSID` 当成 Bearer token，也不要把 token 发给他人。

## 直接在页面输入

不方便传文件时，可以在 Pixiv 登录面板点击“粘贴 token 或 PHPSESSID”输入框，使用屏幕键盘输入内容，再点击“导入令牌”。

- cookie 必须包含 `PHPSESSID=` 前缀。
- 令牌区分大小写，使用“大小写”键切换。
- JSON 需要输入完整的引号、冒号和大括号，长内容建议使用文件导入。

## 常见问题

### 提示“未识别到 access_token 或 PHPSESSID”

检查文件是否确实包含 `PHPSESSID=`、`Bearer ` 或 `access_token`。不要把浏览器 cookie 的名称和值顺序打乱。

### 导入成功但搜索返回 401

access token 已过期或被撤销。重新导出 OAuth token，或者改用最新的浏览器 cookie。带 refresh token 的 OAuth JSON 会在可能时自动刷新 access token。

### cookie 导入成功但网页接口返回 HTML

Pixiv 可能要求额外 cookie 或触发了风控。重新登录电脑浏览器，并从一个 `www.pixiv.net` 网络请求中复制完整 `Cookie` 请求头，而不是只复制一个字段。

### 图片无法加载

Pixiv 图片默认通过 `i.pixiv.re` 代理访问。图片失败通常是词典笔网络线路或代理不可达，不代表登录失败；可以先确认搜索结果和作品简介是否正常。

## 安全提醒

`PHPSESSID` 和 OAuth token 都相当于登录凭据。不要提交到 Git、聊天群或截图中；使用完传输文件后应删除。若凭据泄露，请在 Pixiv 登出所有设备、修改密码或撤销对应 token。
