# MoviePilot 榜单自动订阅

[![MoviePilot V3](https://img.shields.io/badge/MoviePilot-V3-7c5cff)](https://github.com/jxxghp/MoviePilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **这是一个 MoviePilot V3 插件源。**
> 把下方仓库地址添加到 MoviePilot 的插件市场仓库列表，刷新插件市场后即可搜索并安装
> “榜单自动订阅”。不需要单独下载源码，也不需要重新构建前端。

## 这个插件有什么用

MoviePilot 原生订阅需要一部一部搜索和添加。本插件把影视榜单直接接入 MoviePilot：

- 在 MoviePilot 中浏览 TMDB、豆瓣、爱奇艺、腾讯视频、优酷、芒果TV 榜单。
- 点击海报即可把电影、电视剧、综艺或动漫加入 MoviePilot 订阅。
- 支持勾选多部影片、全选当前筛选结果，再一次性批量订阅。
- 设置每页显示 12、20、30、50 条并前后翻页。
- 定时读取榜单，为“综艺”“动漫”等指定类型自动添加订阅。
- 自动检查媒体库和现有订阅，避免重复添加。

默认对接 [media-rank-api](https://github.com/xiaoqin333/media-rank-api)，榜单 API
地址也可以在插件设置中替换。

## 在 MoviePilot 中添加本插件源

### 1. 复制仓库地址

```text
https://github.com/xiaoqin333/MoviePilot-RankingSubscribe/
```

这是插件源地址，不是 Release 下载地址。

### 2. 添加到插件市场

在 MoviePilot V3 中进入“设定”，找到插件相关设置里的“插件市场仓库地址”
（配置项名称为 `PLUGIN_MARKET`），把上面的地址追加进去。

多个仓库地址可以用英文逗号或换行分隔。保存后，在插件市场页面刷新缓存。

### 3. 安装插件

刷新完成后搜索“榜单自动订阅”或插件 ID `RankingSubscribe`，点击安装并启用。

安装完成后，左侧“订阅”区域会出现“榜单订阅”入口。

## 怎么使用

1. 打开左侧“订阅 → 榜单订阅”。
2. 选择榜单来源，例如 TMDB、豆瓣或腾讯视频。
3. 选择电影、电视剧、综艺或动漫。
4. 点击海报左上角“选择”，或者点击“全选当前筛选”。
5. 点击“订阅已选”，把这些影片一次性加入 MoviePilot 订阅。
6. 也可以点击单张海报的“订阅此片”，只订阅当前影片。
7. 打开“自动规则”，设置自动来源、自动类型、执行周期和评分阈值。

默认自动规则是：六个来源全部参与，每 6 小时处理一次综艺和动漫，每来源取前
20 部，每轮最多处理 40 部。可在界面中随时修改。

> 插件只负责创建 MoviePilot 订阅。是否能搜索并下载到资源，取决于 MoviePilot
> 已配置的站点、搜索规则和资源情况。

## 功能清单

- TMDB、豆瓣、爱奇艺、腾讯视频、优酷、芒果TV 排行榜。
- 电影、电视剧、综艺、动漫四种媒体类型。
- 单部影片立即订阅。
- 每张海报单独选择，一键全选当前筛选结果。
- 多选状态跨页保留，统一批量订阅。
- 每页可选 12、20、30、50 条，并支持前后翻页。
- 当前榜单一键订阅，或处理某种类型的全部来源。
- 自动检查媒体库和已有订阅，避免重复条目。
- 支持最低评分、单次处理上限、自动演练和 MoviePilot 通知。
- 默认每 6 小时自动处理全部来源的综艺和动漫。

## 手动安装方式

从 [Releases](https://github.com/xiaoqin333/MoviePilot-RankingSubscribe/releases)
下载最新的 `MoviePilot-RankingSubscribe-v1.1.0.zip`，解压后确认目录为：

```text
/config/plugins/rankingsubscribe/__init__.py
/config/plugins/rankingsubscribe/dist/assets/remoteEntry.js
```

重新加载插件或重启 MoviePilot。

## 添加源后找不到插件

- 确认添加的是上面的 GitHub 仓库首页，不是 GitHub Release 地址。
- 确认 MoviePilot 版本为 V3，并在保存地址后强制刷新插件市场。
- 检查 MoviePilot 容器能否访问 `github.com`；如使用代理，请确认插件市场请求没有被拦截。
- 仓库应同时包含 `package.v3.json` 和 `plugins.v3/rankingsubscribe/`，当前仓库已按
  MoviePilot V3 插件源格式组织。

## 配置自己的榜单 API

默认地址：

```text
https://pan.qbb365.xyz/rank-api
```

可在插件“自动规则 → 榜单 API 地址”中替换为你自己的兼容 API。

## 开发

插件后端位于 `plugins.v3/rankingsubscribe/__init__.py`，前端位于
`plugins.v3/rankingsubscribe/frontend/`。

```bash
cd plugins.v3/rankingsubscribe/frontend
npm install
npm run build
```

构建产物写入 `plugins.v3/rankingsubscribe/dist/assets/`。

## 许可证

[MIT](LICENSE)
