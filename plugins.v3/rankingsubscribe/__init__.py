"""影视榜单到 MoviePilot 订阅的桥接插件。"""

from __future__ import annotations

import copy
import hashlib
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote, urlparse

import requests
from apscheduler.triggers.cron import CronTrigger
from fastapi import Body, Depends, Query

from app.api.dependencies.auth import get_current_active_superuser as get_current_admin
from app.chain.download import DownloadChain
from app.chain.media import MediaChain
from app.chain.subscribe import SubscribeChain
from app.db.models.user import User
from app.schemas.response import Response
from app.schemas.types import MediaSource, MediaType
from app.sdk.config import settings
from app.sdk.logging import logger
from app.sdk.media import MediaInfo, MetaInfo
from app.sdk.plugin import _PluginBase


SOURCES: List[Dict[str, str]] = [
    {"id": "tmdb", "name": "TMDB"},
    {"id": "douban", "name": "豆瓣"},
    {"id": "iqiyi", "name": "爱奇艺"},
    {"id": "tencent", "name": "腾讯视频"},
    {"id": "youku", "name": "优酷"},
    {"id": "mango", "name": "芒果TV"},
]
SOURCE_NAMES = {item["id"]: item["name"] for item in SOURCES}
MEDIA_TYPES = [
    {"id": "movie", "name": "电影"},
    {"id": "tv", "name": "电视剧"},
    {"id": "variety", "name": "综艺"},
    {"id": "anime", "name": "动漫"},
]
MEDIA_TYPE_NAMES = {item["id"]: item["name"] for item in MEDIA_TYPES}
SUCCESS_STATUSES = {"subscribed", "exists", "library"}

DEFAULT_CONFIG: Dict[str, Any] = {
    "enabled": False,
    "cron": "0 */6 * * *",
    "api_base": "https://pan.qbb365.xyz/rank-api",
    "auto_sources": [item["id"] for item in SOURCES],
    "auto_types": ["variety", "anime"],
    "rank_limit": 20,
    "min_score": 0.0,
    "max_new_per_run": 40,
    "skip_existing_library": True,
    "dry_run": False,
    "notify": False,
    "username": "榜单自动订阅",
}


def _now_text() -> str:
    """返回带时区的当前时间文本。"""
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    """把输入转换为限定范围内的整数。"""
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def _clamp_float(value: Any, default: float, minimum: float, maximum: float) -> float:
    """把输入转换为限定范围内的浮点数。"""
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def _unique_strings(value: Any, allowed: set[str]) -> List[str]:
    """规范字符串列表并仅保留允许的标识。"""
    if isinstance(value, str):
        value = [item.strip() for item in value.split(",")]
    if not isinstance(value, (list, tuple, set)):
        return []
    result: List[str] = []
    for item in value:
        text = str(item or "").strip()
        if text in allowed and text not in result:
            result.append(text)
    return result


class RankingSubscribe(_PluginBase):
    """把聚合影视榜单转换为 MoviePilot 原生订阅。"""

    plugin_name = "榜单自动订阅"
    plugin_desc = "浏览聚合影视榜单，点击订阅单部影片，并按综艺、动漫等榜单定时自动订阅。"
    plugin_icon = (
        "https://raw.githubusercontent.com/jxxghp/MoviePilot-Plugins/"
        "main/icons/movie.jpg"
    )
    plugin_version = "1.1.0"
    plugin_label = "订阅"
    plugin_author = "xiaoqin333"
    author_url = "https://github.com/xiaoqin333"
    plugin_config_prefix = "ranking_subscribe_"
    plugin_order = 30
    auth_level = 2

    def __init__(self) -> None:
        """初始化插件运行对象。"""
        super().__init__()
        self._config: Dict[str, Any] = copy.deepcopy(DEFAULT_CONFIG)
        self._lock = threading.RLock()
        self._cache_lock = threading.Lock()
        self._ranking_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
        self._downloadchain = DownloadChain()
        self._mediachain = MediaChain()
        self._subscribechain = SubscribeChain()

    def init_plugin(self, config: Optional[dict] = None) -> None:
        """根据插件配置初始化运行状态。"""
        self._config = self._normalize_config(config or {})
        self._ranking_cache.clear()
        logger.info(
            "榜单自动订阅已加载：启用=%s，类型=%s，来源数=%s",
            self._config["enabled"],
            ",".join(self._config["auto_types"]) or "无",
            len(self._config["auto_sources"]),
        )

    def get_state(self) -> bool:
        """返回插件自动订阅是否启用。"""
        return bool(self._config.get("enabled"))

    @staticmethod
    def get_command() -> List[Dict[str, Any]]:
        """本插件不注册远程命令。"""
        return []

    @staticmethod
    def get_render_mode() -> Tuple[str, str]:
        """声明插件使用 Vue 联邦组件渲染。"""
        return "vue", "dist/assets"

    def get_sidebar_nav(self) -> List[Dict[str, Any]]:
        """启用后在订阅区域提供榜单入口。"""
        if not self.get_state():
            return []
        return [
            {
                "nav_key": "main",
                "title": "榜单订阅",
                "icon": "mdi-trophy-outline",
                "section": "subscribe",
                "permission": "subscribe",
                "order": 15,
            }
        ]

    def get_api(self) -> List[Dict[str, Any]]:
        """注册配置、榜单、订阅和运行历史接口。"""
        definitions = [
            ("/config", self.api_config, ["GET"], "读取榜单订阅配置"),
            ("/config", self.api_save_config, ["POST"], "保存榜单订阅配置"),
            ("/sources", self.api_sources, ["GET"], "读取可用榜单来源"),
            ("/rankings", self.api_rankings, ["GET"], "读取指定榜单"),
            ("/subscribe", self.api_subscribe, ["POST"], "订阅单个榜单条目"),
            ("/subscribe-selected", self.api_subscribe_selected, ["POST"], "订阅用户多选的榜单条目"),
            ("/subscribe-batch", self.api_subscribe_batch, ["POST"], "批量订阅榜单条目"),
            ("/run", self.api_run, ["POST"], "按自动配置立即运行一次"),
            ("/status", self.api_status, ["GET"], "读取插件运行状态"),
            ("/history", self.api_history, ["GET"], "读取最近订阅结果"),
            ("/history", self.api_clear_history, ["DELETE"], "清空订阅结果历史"),
        ]
        return [
            {
                "path": path,
                "endpoint": endpoint,
                "methods": methods,
                "auth": "bear",
                "summary": summary,
            }
            for path, endpoint, methods, summary in definitions
        ]

    def get_service(self) -> List[Dict[str, Any]]:
        """注册定时自动订阅服务。"""
        if not self._config.get("enabled"):
            return []
        cron = str(self._config.get("cron") or "").strip()
        if not cron:
            return []
        try:
            trigger = CronTrigger.from_crontab(cron)
        except ValueError as error:
            logger.error("榜单自动订阅 Cron 无效：%s（%s）", cron, error)
            return []
        return [
            {
                "id": "RankingSubscribe",
                "name": "榜单自动订阅服务",
                "trigger": trigger,
                "func": self.run_auto_subscribe,
                "kwargs": {},
            }
        ]

    def get_form(self) -> Tuple[Optional[List[dict]], Dict[str, Any]]:
        """Vue 模式只返回默认配置。"""
        return None, copy.deepcopy(DEFAULT_CONFIG)

    def get_page(self) -> Optional[List[dict]]:
        """详情页由联邦 Page 组件渲染。"""
        return None

    def stop_service(self) -> None:
        """周期任务由 MoviePilot 调度器统一注销。"""
        return None

    def api_config(
        self, _: User = Depends(get_current_admin)
    ) -> Response:
        """返回当前完整插件配置。"""
        return Response(success=True, data=copy.deepcopy(self._config))

    def api_save_config(
        self,
        payload: dict = Body(...),
        _: User = Depends(get_current_admin),
    ) -> Response:
        """校验并保存前端提交的配置。"""
        if not isinstance(payload, dict):
            return Response(success=False, message="配置格式不正确")
        self.init_plugin(payload)
        self.update_config(copy.deepcopy(self._config))
        return Response(
            success=True,
            message="榜单订阅配置已保存",
            data=copy.deepcopy(self._config),
        )

    def api_sources(
        self, _: User = Depends(get_current_admin)
    ) -> Response:
        """返回榜单来源和媒体类型。"""
        return Response(
            success=True,
            data={"sources": copy.deepcopy(SOURCES), "media_types": copy.deepcopy(MEDIA_TYPES)},
        )

    def api_rankings(
        self,
        source: str = Query("tmdb"),
        media_type: str = Query("tv"),
        page: int = Query(1),
        limit: int = Query(30),
        _: User = Depends(get_current_admin),
    ) -> Response:
        """读取一个来源和类型对应的榜单。"""
        source = str(source or "").strip()
        media_type = str(media_type or "").strip()
        if source not in SOURCE_NAMES:
            return Response(success=False, message="不支持的榜单来源")
        if media_type not in MEDIA_TYPE_NAMES:
            return Response(success=False, message="不支持的媒体类型")
        try:
            data = self.fetch_ranking(
                source=source,
                media_type=media_type,
                page=_clamp_int(page, 1, 1, 50),
                limit=_clamp_int(limit, 30, 1, 50),
            )
        except Exception as error:
            logger.warning("读取榜单失败：%s", error)
            return Response(success=False, message=str(error))
        return Response(success=True, data=data)

    def api_subscribe(
        self,
        payload: dict = Body(...),
        _: User = Depends(get_current_admin),
    ) -> Response:
        """订阅用户在榜单页面点击的单部影片。"""
        normalized, error = self.normalize_rank_item(payload)
        if error or not normalized:
            return Response(success=False, message=error or "榜单条目格式错误")
        with self._lock:
            try:
                item = self.find_rank_item(
                    source=normalized["source"],
                    media_type=normalized["media_type"],
                    source_id=normalized["source_id"],
                    title=normalized["title"],
                )
                if not item:
                    return Response(success=False, message="当前榜单中找不到该影片，请刷新页面")
                result = self.subscribe_item(
                    item=item,
                    history=self.load_history(),
                    skip_seen=False,
                    dry_run=False,
                    enforce_score=False,
                )
                self.record_history(result)
            except Exception as error_obj:
                logger.error("手动订阅榜单影片失败：%s", error_obj, exc_info=True)
                return Response(success=False, message=f"订阅失败：{error_obj}")
        ok = result.get("status") in SUCCESS_STATUSES
        return Response(
            success=ok,
            message=result.get("message") or result.get("title") or "",
            data={"result": result},
        )

    def api_subscribe_batch(
        self,
        payload: dict = Body(...),
        _: User = Depends(get_current_admin),
    ) -> Response:
        """批量订阅当前榜单或一种媒体类型的全部来源。"""
        if not isinstance(payload, dict):
            return Response(success=False, message="请求格式不正确")
        source = str(payload.get("source") or "").strip()
        media_type = str(payload.get("media_type") or "").strip()
        if source != "all" and source not in SOURCE_NAMES:
            return Response(success=False, message="不支持的榜单来源")
        if media_type not in MEDIA_TYPE_NAMES:
            return Response(success=False, message="不支持的媒体类型")
        limit = _clamp_int(payload.get("limit"), self._config["rank_limit"], 1, 50)
        max_items = _clamp_int(payload.get("max_items"), 50, 1, 200)
        min_score = _clamp_float(payload.get("min_score"), 0.0, 0.0, 10.0)
        try:
            items = self.fetch_type_items(
                media_type=media_type,
                source=source,
                limit=limit,
            )
        except Exception as error:
            logger.warning("读取批量订阅榜单失败：%s", error)
            return Response(success=False, message=f"读取榜单失败：{error}")
        if not items:
            return Response(success=False, message="当前榜单没有可订阅条目")
        with self._lock:
            summary = self.process_items(
                items=items,
                history=self.load_history(),
                skip_seen=False,
                dry_run=False,
                min_score=min_score,
                max_items=max_items,
            )
        return Response(
            success=summary["attempted"] > 0,
            message=self.summary_message(summary),
            data=summary,
        )

    def api_subscribe_selected(
        self,
        payload: dict = Body(...),
        _: User = Depends(get_current_admin),
    ) -> Response:
        """订阅用户在榜单页面多选的影片。"""
        if not isinstance(payload, dict):
            return Response(success=False, message="请求格式不正确")
        raw_items = payload.get("items")
        if not isinstance(raw_items, list) or not raw_items:
            return Response(success=False, message="请先选择要订阅的影片")
        if len(raw_items) > 50:
            return Response(success=False, message="一次最多选择 50 部影片")

        items: List[Dict[str, Any]] = []
        seen_keys: set[str] = set()
        for raw_item in raw_items:
            normalized, error = self.normalize_rank_item(raw_item)
            if error or not normalized:
                return Response(success=False, message=error or "所选影片数据格式错误")
            item = self.decorate_item(normalized)
            key = self.rank_key(item)
            if key not in seen_keys:
                seen_keys.add(key)
                items.append(item)

        with self._lock:
            summary = self.process_items(
                items=items,
                history=self.load_history(),
                skip_seen=False,
                dry_run=bool(payload.get("dry_run", False)),
                min_score=0,
                max_items=50,
            )
        return Response(
            success=summary["attempted"] > 0,
            message=self.summary_message(summary),
            data=summary,
        )

    def api_run(
        self,
        _: User = Depends(get_current_admin),
    ) -> Response:
        """按配置立即执行一次自动订阅。"""
        summary, error = self.run_auto_subscribe()
        return Response(
            success=error is None,
            message=error or self.summary_message(summary or {}),
            data=summary,
        )

    def api_status(
        self, _: User = Depends(get_current_admin)
    ) -> Response:
        """返回插件配置摘要、历史统计和上次运行结果。"""
        history = self.load_history()
        subscribed = sum(1 for item in history if item.get("status") == "subscribed")
        failed = sum(
            1
            for item in history
            if item.get("status") in {"error", "unrecognized", "not_found"}
        )
        return Response(
            success=True,
            data={
                "config": copy.deepcopy(self._config),
                "sources": copy.deepcopy(SOURCES),
                "media_types": copy.deepcopy(MEDIA_TYPES),
                "last_result": self.get_data("last_result") or {},
                "history_count": len(history),
                "subscribed_count": subscribed,
                "failed_count": failed,
            },
        )

    def api_history(
        self, _: User = Depends(get_current_admin)
    ) -> Response:
        """返回最近 300 条订阅处理结果。"""
        return Response(success=True, data=self.load_history()[:300])

    def api_clear_history(
        self, _: User = Depends(get_current_admin)
    ) -> Response:
        """清空插件历史记录。"""
        with self._lock:
            self.save_data("history", [])
            self.save_data("last_result", {})
        return Response(success=True, message="榜单订阅历史已清空")

    def run_auto_subscribe(self) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """按配置读取全部目标榜单并执行自动订阅。"""
        if not self._lock.acquire(blocking=False):
            return None, "已有订阅任务正在运行，请稍后再试"
        try:
            auto_types = list(self._config.get("auto_types") or [])
            if not auto_types:
                return None, "尚未选择自动订阅的媒体类型"
            allowed_sources = set(self._config.get("auto_sources") or [])
            if not allowed_sources:
                return None, "尚未选择自动订阅的榜单来源"
            all_items: List[Dict[str, Any]] = []
            seen_keys: set[str] = set()
            for media_type in auto_types:
                try:
                    items = self.fetch_type_items(
                        media_type=media_type,
                        source="all",
                        limit=self._config["rank_limit"],
                    )
                except Exception as error:
                    logger.warning("读取自动订阅榜单 %s 失败：%s", media_type, error)
                    continue
                for item in items:
                    if str(item.get("source") or "") not in allowed_sources:
                        continue
                    key = self.rank_key(item)
                    if key not in seen_keys:
                        seen_keys.add(key)
                        all_items.append(item)
            if not all_items:
                return None, "没有读取到可处理的榜单条目"

            summary = self.process_items(
                items=all_items,
                history=self.load_history(),
                skip_seen=True,
                dry_run=bool(self._config.get("dry_run")),
                min_score=float(self._config.get("min_score") or 0),
                max_items=int(self._config.get("max_new_per_run") or 40),
            )
            summary["finished_at"] = _now_text()
            self.save_data("last_result", summary)
            logger.info("榜单自动订阅完成：%s", self.summary_message(summary))
            if self._config.get("notify"):
                self.post_message(
                    title="榜单自动订阅完成",
                    text=self.summary_message(summary),
                )
            return summary, None
        except Exception as error:
            logger.error("榜单自动订阅执行失败：%s", error, exc_info=True)
            return None, f"自动订阅执行失败：{error}"
        finally:
            self._lock.release()

    def process_items(
        self,
        items: List[Dict[str, Any]],
        history: List[Dict[str, Any]],
        skip_seen: bool,
        dry_run: bool,
        min_score: float,
        max_items: int,
    ) -> Dict[str, Any]:
        """按顺序处理一组榜单条目并保存处理结果。"""
        started_at = _now_text()
        successful_keys = {
            str(item.get("key"))
            for item in history
            if item.get("status") in SUCCESS_STATUSES
        }
        results: List[Dict[str, Any]] = []
        attempted = 0
        skipped = 0
        for raw_item in items:
            if attempted >= max_items:
                break
            item = self.decorate_item(raw_item)
            key = self.rank_key(item)
            if skip_seen and key in successful_keys:
                skipped += 1
                continue
            score = item.get("score")
            if min_score and (score is None or float(score) < min_score):
                skipped += 1
                continue
            attempted += 1
            result = self.subscribe_item(
                item=item,
                history=history,
                skip_seen=False,
                dry_run=dry_run,
                enforce_score=False,
            )
            history = self.record_history(result, history=history, persist=False)
            results.append(result)
            if result.get("status") in SUCCESS_STATUSES:
                successful_keys.add(key)
        self.save_data("history", history[:500])
        return {
            "attempted": attempted,
            "skipped": skipped,
            "subscribed": sum(1 for item in results if item.get("status") == "subscribed"),
            "existing": sum(1 for item in results if item.get("status") == "exists"),
            "in_library": sum(1 for item in results if item.get("status") == "library"),
            "dry_run": sum(1 for item in results if item.get("status") == "dry_run"),
            "failed": sum(
                1
                for item in results
                if item.get("status") not in SUCCESS_STATUSES | {"dry_run", "filtered"}
            ),
            "results": results,
            "started_at": started_at,
            "finished_at": _now_text(),
        }

    def subscribe_item(
        self,
        item: Dict[str, Any],
        history: List[Dict[str, Any]],
        skip_seen: bool,
        dry_run: bool,
        enforce_score: bool,
    ) -> Dict[str, Any]:
        """识别单个榜单条目并创建 MoviePilot 订阅。"""
        item = self.decorate_item(item)
        key = self.rank_key(item)
        if skip_seen and any(
            entry.get("key") == key and entry.get("status") in SUCCESS_STATUSES
            for entry in history
        ):
            return self.make_result(
                item,
                "exists",
                "该条目此前已处理，跳过重复识别",
            )
        if enforce_score:
            score = item.get("score")
            threshold = float(self._config.get("min_score") or 0)
            if threshold and (score is None or float(score) < threshold):
                return self.make_result(item, "filtered", "评分低于自动订阅阈值")

        media_type = (
            MediaType.MOVIE if item["media_type"] == "movie" else MediaType.TV
        )
        meta = MetaInfo(str(item.get("title") or ""))
        meta.type = media_type
        if item.get("year"):
            meta.year = str(item["year"])
        season = None
        if media_type == MediaType.TV:
            season = meta.begin_season or 1

        try:
            mediainfo = self.recognize_item(item=item, meta=meta)
        except Exception as error:
            logger.warning(
                "识别榜单影片失败：%s/%s %s",
                item.get("source"),
                item.get("media_type"),
                item.get("title"),
                exc_info=True,
            )
            return self.make_result(item, "error", f"识别失败：{error}")
        if not mediainfo:
            return self.make_result(item, "unrecognized", "MoviePilot 未匹配到影片")

        meta.name = mediainfo.title or meta.name
        if mediainfo.year:
            meta.year = str(mediainfo.year)
        if media_type == MediaType.TV:
            season = season or meta.begin_season or 1

        if self._config.get("skip_existing_library"):
            try:
                exists_flag, _ = self._downloadchain.get_no_exists_info(
                    meta=meta, mediainfo=mediainfo
                )
                if exists_flag:
                    return self.make_result(
                        item,
                        "library",
                        f"{mediainfo.title_year} 已在媒体库中",
                        mediainfo=mediainfo,
                    )
            except Exception as error:
                logger.warning("检查媒体库条目失败，将继续检查订阅：%s", error)

        try:
            already_exists = bool(
                self._subscribechain.exists(mediainfo=mediainfo, meta=meta)
            )
        except Exception as error:
            logger.warning("检查重复订阅失败，将尝试幂等新增：%s", error)
            already_exists = False
        if already_exists:
            return self.make_result(
                item,
                "exists",
                f"{mediainfo.title_year} 已存在订阅",
                mediainfo=mediainfo,
            )

        if dry_run:
            return self.make_result(
                item,
                "dry_run",
                f"演练通过：将订阅 {mediainfo.title_year}",
                mediainfo=mediainfo,
            )

        try:
            added = self._subscribechain.add(
                title=mediainfo.title,
                year=mediainfo.year,
                mtype=mediainfo.type,
                media_source=mediainfo.media_source,
                media_id=mediainfo.media_id,
                season=season,
                exist_ok=True,
                username=str(self._config.get("username") or "榜单自动订阅"),
            )
            if isinstance(added, tuple) and len(added) >= 2 and not added[0]:
                raise RuntimeError(str(added[1] or "MoviePilot 未创建订阅"))
        except Exception as error:
            logger.error(
                "创建榜单订阅失败：%s %s",
                mediainfo.title_year,
                error,
                exc_info=True,
            )
            return self.make_result(
                item,
                "error",
                f"创建订阅失败：{error}",
                mediainfo=mediainfo,
            )
        return self.make_result(
            item,
            "subscribed",
            f"已订阅 {mediainfo.title_year}",
            mediainfo=mediainfo,
        )

    def recognize_item(
        self,
        item: Dict[str, Any],
        meta: MetaInfo,
    ) -> Optional[MediaInfo]:
        """按榜单来源选择最可靠的 MoviePilot 媒体识别方式。"""
        source = item.get("source")
        source_id = str(item.get("source_id") or "")
        explicit_source: Optional[MediaSource] = None
        if source == "tmdb" and source_id:
            explicit_source = MediaSource.TMDB
        elif source == "douban" and source_id:
            explicit_source = MediaSource.Douban

        if explicit_source == MediaSource.Douban:
            recognize_source = str(
                getattr(settings, "RECOGNIZE_SOURCE", "themoviedb") or ""
            ).lower()
            if recognize_source == "themoviedb":
                try:
                    converted = self._mediachain.convert_media_identity(
                        target_source=MediaSource.TMDB,
                        media_source=MediaSource.Douban,
                        media_id=source_id,
                        mtype=meta.type,
                    )
                except Exception as error:
                    logger.info("豆瓣榜单条目转换 TMDB 失败：%s", error)
                    converted = None
                if converted and converted.get("id"):
                    converted_type = converted.get("media_type")
                    if converted_type in {"movie", "tv"}:
                        meta.type = (
                            MediaType.MOVIE
                            if converted_type == "movie"
                            else MediaType.TV
                        )
                    return self.chain.recognize_media(
                        meta=meta,
                        media_source=MediaSource.TMDB,
                        media_id=str(converted["id"]),
                    )

        if explicit_source and source_id:
            mediainfo = self.chain.recognize_media(
                meta=meta,
                media_source=explicit_source,
                media_id=source_id,
            )
            if mediainfo:
                return mediainfo
        return self.chain.recognize_media(meta=meta)

    def fetch_type_items(
        self,
        media_type: str,
        source: str,
        limit: int,
    ) -> List[Dict[str, Any]]:
        """读取单来源或全部来源的某一种媒体榜单。"""
        if source == "all":
            payload = self.fetch_all_rankings(media_type=media_type, limit=limit)
            sources = payload.get("sources") or {}
            items: List[Dict[str, Any]] = []
            for source_item in SOURCES:
                section = sources.get(source_item["id"]) or {}
                if section.get("success"):
                    items.extend(section.get("items") or [])
            return [self.decorate_item(item) for item in items]
        payload = self.fetch_ranking(
            source=source,
            media_type=media_type,
            page=1,
            limit=limit,
        )
        return [self.decorate_item(item) for item in payload.get("items") or []]

    def find_rank_item(
        self,
        source: str,
        media_type: str,
        source_id: str,
        title: str,
    ) -> Optional[Dict[str, Any]]:
        """在榜单前 50 条中按来源 ID 或标题查找影片。"""
        payload = self.fetch_ranking(
            source=source,
            media_type=media_type,
            page=1,
            limit=50,
        )
        for item in payload.get("items") or []:
            if str(item.get("source_id") or "") == str(source_id):
                return self.decorate_item(item)
        normalized_title = str(title or "").strip().casefold()
        for item in payload.get("items") or []:
            if str(item.get("title") or "").strip().casefold() == normalized_title:
                return self.decorate_item(item)
        return None

    def fetch_ranking(
        self,
        source: str,
        media_type: str,
        page: int,
        limit: int,
    ) -> Dict[str, Any]:
        """按每页条数组合上游分页，返回连续且不跳号的榜单。"""
        self.validate_source_type(source, media_type)
        path = f"api/v1/rankings/{quote(source, safe='')}"
        offset = max(0, (page - 1) * limit)
        provider_page_size = 20
        provider_page = offset // provider_page_size + 1
        skip = offset % provider_page_size
        target = limit
        collected: List[Dict[str, Any]] = []
        first_payload: Optional[Dict[str, Any]] = None

        while len(collected) < target and provider_page <= 50:
            payload = self.request_json(
                path=path,
                params={
                    "type": media_type,
                    "page": str(provider_page),
                    "limit": str(provider_page_size),
                },
            )
            if first_payload is None:
                first_payload = payload
            chunk = list(payload.get("items") or [])
            available = chunk[skip:] if skip else chunk
            skip = 0
            collected.extend(available)
            if len(chunk) < provider_page_size:
                break
            provider_page += 1

        result = copy.deepcopy(first_payload or {"success": True})
        result["page"] = page
        result["limit"] = limit
        result["items"] = [
            self.decorate_item(item) for item in collected[:target]
        ]
        result["count"] = len(result["items"])
        return result

    def fetch_all_rankings(
        self,
        media_type: str,
        limit: int,
    ) -> Dict[str, Any]:
        """通过聚合接口一次读取一个媒体类型的全部来源。"""
        if media_type not in MEDIA_TYPE_NAMES:
            raise ValueError("不支持的媒体类型")
        return self.request_json(
            path="api/v1/rankings/all",
            params={"type": media_type, "limit": str(limit)},
        )

    def request_json(
        self,
        path: str,
        params: Dict[str, str],
    ) -> Dict[str, Any]:
        """请求榜单 API，并缓存五分钟内的相同查询。"""
        base = str(self._config.get("api_base") or "").rstrip("/")
        cache_key = f"{base}|{path}|{tuple(sorted(params.items()))}"
        now = time.monotonic()
        with self._cache_lock:
            cached = self._ranking_cache.get(cache_key)
            if cached and now - cached[0] < 300:
                return copy.deepcopy(cached[1])
        parsed = urlparse(base)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("榜单 API 地址必须是有效的 http(s) 地址")
        url = f"{base}/{path.lstrip('/')}"
        response = requests.get(
            url,
            params=params,
            headers={
                "Accept": "application/json",
                "User-Agent": "MoviePilot-RankingSubscribe/1.0",
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict) or not data.get("success"):
            raise RuntimeError(
                str((data or {}).get("error") or "榜单 API 返回失败结果")
            )
        with self._cache_lock:
            self._ranking_cache[cache_key] = (now, copy.deepcopy(data))
        return data

    def decorate_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """补充海报代理和稳定去重键。"""
        decorated = copy.deepcopy(item)
        source = str(decorated.get("source") or "")
        media_type = str(decorated.get("media_type") or "")
        if not decorated.get("source_name"):
            decorated["source_name"] = SOURCE_NAMES.get(source, source)
        if not decorated.get("media_type_name"):
            decorated["media_type_name"] = MEDIA_TYPE_NAMES.get(media_type, media_type)
        source_id = str(decorated.get("source_id") or "").strip()
        title = str(decorated.get("title") or "").strip()
        rank = decorated.get("rank")
        seed = "|".join(
            [
                source,
                media_type,
                source_id or str(rank or ""),
                title,
                str(decorated.get("year") or ""),
            ]
        )
        decorated["key"] = hashlib.sha1(seed.encode("utf-8")).hexdigest()[:20]
        poster = str(decorated.get("poster") or "").strip()
        if poster:
            base = str(self._config.get("api_base") or "").rstrip("/")
            decorated["poster_proxy"] = (
                f"{base}/api/v1/image?url={quote(poster, safe='')}"
            )
        return decorated

    @staticmethod
    def normalize_rank_item(
        payload: Dict[str, Any],
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """校验前端提交的单条榜单数据。"""
        if not isinstance(payload, dict):
            return None, "请求格式不正确"
        source = str(payload.get("source") or "").strip()
        media_type = str(payload.get("media_type") or "").strip()
        source_id = str(payload.get("source_id") or "").strip()
        title = str(payload.get("title") or "").strip()
        if source not in SOURCE_NAMES:
            return None, "不支持的榜单来源"
        if media_type not in MEDIA_TYPE_NAMES:
            return None, "不支持的媒体类型"
        if not source_id or len(source_id) > 160:
            return None, "榜单条目缺少有效来源 ID"
        if not title or len(title) > 300:
            return None, "榜单条目标题无效"
        year = payload.get("year")
        try:
            year = int(year) if year not in (None, "") else None
        except (TypeError, ValueError):
            year = None
        if year is not None and not 1888 <= year <= 2100:
            year = None
        try:
            score = float(payload["score"]) if payload.get("score") is not None else None
        except (TypeError, ValueError):
            score = None
        return {
            "source": source,
            "source_name": SOURCE_NAMES[source],
            "media_type": media_type,
            "source_id": source_id,
            "title": title,
            "year": year,
            "score": score,
            "rank": _clamp_int(payload.get("rank"), 999, 1, 9999),
            "poster": str(payload.get("poster") or "")[:2000],
        }, None

    @staticmethod
    def validate_source_type(source: str, media_type: str) -> None:
        """校验榜单来源和媒体类型。"""
        if source not in SOURCE_NAMES:
            raise ValueError("不支持的榜单来源")
        if media_type not in MEDIA_TYPE_NAMES:
            raise ValueError("不支持的媒体类型")

    @staticmethod
    def rank_key(item: Dict[str, Any]) -> str:
        """返回条目的稳定去重键。"""
        if item.get("key"):
            return str(item["key"])
        return hashlib.sha1(
            "|".join(
                [
                    str(item.get("source") or ""),
                    str(item.get("media_type") or ""),
                    str(item.get("source_id") or ""),
                    str(item.get("title") or ""),
                    str(item.get("year") or ""),
                ]
            ).encode("utf-8")
        ).hexdigest()[:20]

    def make_result(
        self,
        item: Dict[str, Any],
        status: str,
        message: str,
        mediainfo: Optional[MediaInfo] = None,
    ) -> Dict[str, Any]:
        """构造并返回统一的单条处理结果。"""
        return {
            "key": self.rank_key(item),
            "source": item.get("source"),
            "source_name": item.get("source_name")
            or SOURCE_NAMES.get(str(item.get("source") or ""), ""),
            "media_type": item.get("media_type"),
            "media_type_name": item.get("media_type_name")
            or MEDIA_TYPE_NAMES.get(str(item.get("media_type") or ""), ""),
            "source_id": str(item.get("source_id") or ""),
            "rank": item.get("rank"),
            "title": item.get("title"),
            "year": item.get("year"),
            "score": item.get("score"),
            "poster": item.get("poster_proxy") or item.get("poster"),
            "recognized_title": getattr(mediainfo, "title", None),
            "recognized_year": getattr(mediainfo, "year", None),
            "tmdb_id": getattr(mediainfo, "tmdb_id", None),
            "media_source": str(
                getattr(mediainfo, "media_source", "") or ""
            ),
            "media_id": str(getattr(mediainfo, "media_id", "") or ""),
            "status": status,
            "message": message,
            "time": _now_text(),
        }

    def record_history(
        self,
        result: Dict[str, Any],
        history: Optional[List[Dict[str, Any]]] = None,
        persist: bool = True,
    ) -> List[Dict[str, Any]]:
        """按条目键更新历史记录并限制总条数。"""
        records = list(history if history is not None else self.load_history())
        key = result.get("key")
        records = [item for item in records if item.get("key") != key]
        records.insert(0, result)
        records = records[:500]
        if persist:
            self.save_data("history", records)
        return records

    def load_history(self) -> List[Dict[str, Any]]:
        """读取并规范化插件历史记录。"""
        history = self.get_data("history")
        if not isinstance(history, list):
            return []
        return [item for item in history if isinstance(item, dict)]

    @staticmethod
    def summary_message(summary: Dict[str, Any]) -> str:
        """把一次批量执行结果转换为简洁中文摘要。"""
        if not summary:
            return "没有可显示的运行结果"
        return (
            f"处理 {summary.get('attempted', 0)} 部，"
            f"新订阅 {summary.get('subscribed', 0)} 部，"
            f"已有订阅 {summary.get('existing', 0)} 部，"
            f"库中已有 {summary.get('in_library', 0)} 部，"
            f"失败 {summary.get('failed', 0)} 部，"
            f"跳过 {summary.get('skipped', 0)} 部"
        )

    @staticmethod
    def _normalize_config(config: Dict[str, Any]) -> Dict[str, Any]:
        """把任意配置字典规范化为可持久化配置。"""
        merged = copy.deepcopy(DEFAULT_CONFIG)
        if isinstance(config, dict):
            merged.update(config)
        merged["enabled"] = bool(merged.get("enabled"))
        merged["dry_run"] = bool(merged.get("dry_run"))
        merged["notify"] = bool(merged.get("notify"))
        merged["skip_existing_library"] = bool(
            merged.get("skip_existing_library", True)
        )
        merged["cron"] = str(merged.get("cron") or DEFAULT_CONFIG["cron"]).strip()
        base = str(merged.get("api_base") or DEFAULT_CONFIG["api_base"]).strip().rstrip("/")
        merged["api_base"] = base or DEFAULT_CONFIG["api_base"]
        merged["auto_sources"] = _unique_strings(
            merged.get("auto_sources"), set(SOURCE_NAMES)
        )
        merged["auto_types"] = _unique_strings(
            merged.get("auto_types"), set(MEDIA_TYPE_NAMES)
        )
        merged["rank_limit"] = _clamp_int(merged.get("rank_limit"), 20, 1, 50)
        merged["min_score"] = _clamp_float(merged.get("min_score"), 0.0, 0.0, 10.0)
        merged["max_new_per_run"] = _clamp_int(
            merged.get("max_new_per_run"), 40, 1, 200
        )
        username = str(merged.get("username") or "榜单自动订阅").strip()
        merged["username"] = username[:50] or "榜单自动订阅"
        return merged
