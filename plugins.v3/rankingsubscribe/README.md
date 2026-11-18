# 榜单自动订阅

MoviePilot V3 榜单订阅插件。可浏览聚合影视榜单，单部或多选创建 MoviePilot
原生订阅，也可按 Cron 周期自动订阅综艺、动漫等榜单。

## 功能

- 支持 TMDB、豆瓣、爱奇艺、腾讯视频、优酷、芒果TV。
- 支持电影、电视剧、综艺、动漫四类榜单。
- 海报墙浏览，可设置每页 12、20、30 或 50 条。
- 支持翻页、片名筛选和最低评分筛选。
- 每张海报均可单独选择，也可全选当前筛选结果。
- 选择状态可跨页保留，点击“订阅已选”统一创建订阅。
- 可一键订阅当前榜单，或处理一种类型的全部来源。
- 自动检查媒体库和已有订阅，避免重复条目。
- 支持最低评分、单次处理上限、演练模式和 MoviePilot 通知。

## 安装

### 作为 MoviePilot 插件仓库

在 MoviePilot 的插件市场设置中添加本仓库地址：

```text
https://github.com/xiaoqin333/MoviePilot-RankingSubscribe
```

刷新插件市场后搜索“榜单自动订阅”并安装。

### 手动安装 Release 包

从 GitHub Releases 下载最新 `.zip`，解压到 MoviePilot 的插件目录：

```text
/config/plugins/rankingsubscribe/
```

然后重新加载插件或重启 MoviePilot。

## 配置

默认榜单 API：

```text
https://pan.qbb365.xyz/rank-api
```

此地址可在“自动规则”中修改。目标 API 应提供与
`rank-api/api/v1/rankings/{source}` 兼容的 JSON 数据。

默认每 6 小时运行一次，自动来源为六个来源，自动类型为“综艺”和“动漫”。
如需电影或电视剧，请在自动规则中勾选。

自动订阅只会创建 MoviePilot 订阅。实际搜索与下载资源仍取决于 MoviePilot
已配置的站点和可用资源。

## 前端开发

```bash
cd plugins.v3/rankingsubscribe/frontend
npm install
npm run build
```

构建产物输出到 `plugins.v3/rankingsubscribe/dist/assets/`。
