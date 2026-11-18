# MoviePilot 榜单自动订阅

[![MoviePilot V3](https://img.shields.io/badge/MoviePilot-V3-7c5cff)](https://github.com/jxxghp/MoviePilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

将聚合影视榜单转换为 MoviePilot 原生订阅。支持直接浏览海报、多选影片、批量订阅，
也可以按计划自动处理综艺、动漫等榜单。

默认对接 [media-rank-api](https://github.com/xiaoqin333/media-rank-api)，榜单 API
地址可在插件配置中修改。

## 功能

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

## 安装

### 方法一：添加插件仓库

在 MoviePilot V3 的插件市场添加以下仓库地址：

```text
https://github.com/xiaoqin333/MoviePilot-RankingSubscribe
```

刷新插件市场，搜索“榜单自动订阅”并安装。

### 方法二：下载 Release

从 [Releases](https://github.com/xiaoqin333/MoviePilot-RankingSubscribe/releases)
下载最新的 `MoviePilot-RankingSubscribe-v1.1.0.zip`，解压后确认目录为：

```text
/config/plugins/rankingsubscribe/__init__.py
/config/plugins/rankingsubscribe/dist/assets/remoteEntry.js
```

重新加载插件或重启 MoviePilot。

## 使用

1. 打开 MoviePilot，左侧“订阅”区域进入“榜单订阅”。
2. 选择榜单来源和媒体类型。
3. 点击海报上的“选择”，或使用“全选当前筛选”。
4. 点击“订阅已选”批量创建订阅。
5. 在“自动规则”中设置定时任务、自动来源、自动类型和评分阈值。

> 插件负责创建 MoviePilot 订阅。能否找到并下载资源，取决于 MoviePilot 已配置的
> 站点、搜索规则和可用资源。

## 榜单 API

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
