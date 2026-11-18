import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import Config, { _ as _export_sfc } from './__federation_expose_Config-Kjy3qDAL.js';

const {resolveComponent:_resolveComponent,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,createVNode:_createVNode,createElementVNode:_createElementVNode,createTextVNode:_createTextVNode,withCtx:_withCtx,toDisplayString:_toDisplayString,renderList:_renderList,Fragment:_Fragment,createElementBlock:_createElementBlock,normalizeClass:_normalizeClass,withModifiers:_withModifiers} = await importShared('vue');


const _hoisted_1 = { class: "ranking-page" };
const _hoisted_2 = { class: "rank-hero" };
const _hoisted_3 = { class: "rank-hero__identity" };
const _hoisted_4 = { class: "rank-hero__icon" };
const _hoisted_5 = { class: "rank-hero__actions" };
const _hoisted_6 = { class: "metric-strip" };
const _hoisted_7 = { class: "metric-card__icon metric-card__icon--primary" };
const _hoisted_8 = { class: "metric-card__icon metric-card__icon--warning" };
const _hoisted_9 = { class: "metric-card__icon metric-card__icon--info" };
const _hoisted_10 = { class: "metric-card__icon metric-card__icon--success" };
const _hoisted_11 = { class: "ranking-panel" };
const _hoisted_12 = { class: "source-row" };
const _hoisted_13 = { class: "choice-row" };
const _hoisted_14 = ["onClick"];
const _hoisted_15 = { class: "source-row" };
const _hoisted_16 = { class: "choice-row" };
const _hoisted_17 = ["onClick"];
const _hoisted_18 = {
  key: 0,
  class: "choice-count"
};
const _hoisted_19 = { class: "toolbar-row" };
const _hoisted_20 = { class: "ranking-title" };
const _hoisted_21 = { class: "toolbar-actions" };
const _hoisted_22 = { class: "selection-bar" };
const _hoisted_23 = { class: "selection-actions" };
const _hoisted_24 = {
  key: 0,
  class: "selection-note"
};
const _hoisted_25 = { class: "pager" };
const _hoisted_26 = { class: "page-number" };
const _hoisted_27 = {
  key: 1,
  class: "empty-panel"
};
const _hoisted_28 = {
  key: 2,
  class: "poster-grid"
};
const _hoisted_29 = { class: "rank-card__poster-wrap" };
const _hoisted_30 = ["src", "alt"];
const _hoisted_31 = { class: "rank-card__fallback" };
const _hoisted_32 = { class: "rank-card__rank" };
const _hoisted_33 = { class: "rank-card__source" };
const _hoisted_34 = ["aria-pressed", "title", "onClick"];
const _hoisted_35 = { class: "rank-card__copy" };
const _hoisted_36 = ["title"];
const _hoisted_37 = { class: "rank-card__body" };
const _hoisted_38 = { class: "rank-card__meta" };
const _hoisted_39 = { key: 0 };
const _hoisted_40 = {
  key: 1,
  class: "score"
};
const _hoisted_41 = { class: "media-type" };
const _hoisted_42 = { class: "page-footer" };
const _hoisted_43 = { class: "batch-copy__icon" };
const _hoisted_44 = {
  key: 1,
  class: "history-list"
};
const _hoisted_45 = { class: "history-item__main" };

const {computed,inject,onMounted,reactive,ref} = await importShared('vue');


const _sfc_main = {
  __name: 'RankingPage',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'RankingSubscribe' },
  navKey: { type: String, default: 'main' },
  config: { type: Object, default: () => ({}) },
},
  emits: ['action', 'switch', 'close'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;
const hostToast = inject('moviepilot:toast', null);

const fallbackSources = [
  { id: 'tmdb', name: 'TMDB' },
  { id: 'douban', name: '豆瓣' },
  { id: 'iqiyi', name: '爱奇艺' },
  { id: 'tencent', name: '腾讯视频' },
  { id: 'youku', name: '优酷' },
  { id: 'mango', name: '芒果TV' },
];

const fallbackTypes = [
  { id: 'movie', name: '电影' },
  { id: 'tv', name: '电视剧' },
  { id: 'variety', name: '综艺' },
  { id: 'anime', name: '动漫' },
];

const pluginId = computed(() => props.pluginId || 'RankingSubscribe');
const sources = ref(fallbackSources);
const mediaTypes = ref(fallbackTypes);
const source = ref('tmdb');
const mediaType = ref('movie');
const items = ref([]);
const query = ref('');
const minScore = ref(0);
const page = ref(1);
const pageSize = ref(30);
const hasNextPage = ref(false);
const loading = ref(false);
const configLoading = ref(false);
const batchLoading = ref(false);
const autoRunning = ref(false);
const settingsDialog = ref(false);
const historyDialog = ref(false);
const batchDialog = ref(false);
const history = ref([]);
const status = ref({});
const configData = ref({});
const batchAction = ref(null);
const busyKeys = reactive(new Set());
const selectedMap = reactive(new Map());
const snackbar = reactive({ show: false, text: '', color: 'success' });
const pageSizeOptions = [12, 20, 30, 50];

const typeCounts = computed(() =>
  Object.fromEntries(
    mediaTypes.value.map(type => [
      type.id,
      history.value.filter(item => item.media_type === type.id).length,
    ]),
  ),
);

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase('zh-CN');
  return items.value.filter(item => {
    if (keyword && !String(item.title || '').toLocaleLowerCase('zh-CN').includes(keyword)) return false
    if (minScore.value > 0 && (item.score == null || Number(item.score) < minScore.value)) return false
    return true
  })
});

const currentSourceName = computed(
  () => sources.value.find(item => item.id === source.value)?.name || source.value,
);
const currentTypeName = computed(
  () => mediaTypes.value.find(item => item.id === mediaType.value)?.name || mediaType.value,
);
const subscribedCount = computed(
  () => new Set(history.value.filter(item => ['subscribed', 'exists'].includes(item.status)).map(item => item.key)).size,
);
const failedCount = computed(
  () => history.value.filter(item => ['error', 'unrecognized', 'not_found'].includes(item.status)).length,
);
const selectedCount = computed(() => selectedMap.size);
const visibleSelectedCount = computed(
  () => filteredItems.value.filter(item => selectedMap.has(item.key)).length,
);
const allVisibleSelected = computed(
  () =>
    filteredItems.value.length > 0 &&
    filteredItems.value.every(item => selectedMap.has(item.key)),
);

function notify(message, color = 'success') {
  snackbar.text = message || '操作完成';
  snackbar.color = color;
  snackbar.show = true;
  if (color === 'error') hostToast?.error?.(message);
  else if (color === 'warning') hostToast?.warning?.(message);
  else if (color === 'info') hostToast?.info?.(message);
  else hostToast?.success?.(message);
}

function errorMessage(error) {
  return error?.response?.data?.message || error?.message || '请求失败，请查看 MoviePilot 日志'
}

async function loadStatus() {
  if (!props.api?.get) return
  try {
    const response = await props.api.get(`plugin/${pluginId.value}/status`);
    if (response?.success && response.data) {
      status.value = response.data;
      configData.value = response.data.config || {};
      if (Array.isArray(response.data.sources) && response.data.sources.length) {
        sources.value = response.data.sources;
      }
      if (Array.isArray(response.data.media_types) && response.data.media_types.length) {
        mediaTypes.value = response.data.media_types;
      }
    }
  } catch (error) {
    notify(errorMessage(error), 'error');
  }
}

async function loadConfig() {
  if (!props.api?.get) return
  configLoading.value = true;
  try {
    const response = await props.api.get(`plugin/${pluginId.value}/config`);
    if (response?.success && response.data) configData.value = response.data;
  } catch (error) {
    notify(errorMessage(error), 'error');
  } finally {
    configLoading.value = false;
  }
}

async function saveConfig(nextConfig) {
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/config`, nextConfig);
    if (!response?.success) throw new Error(response?.message || '配置保存失败')
    configData.value = response.data || nextConfig;
    settingsDialog.value = false;
    notify(response.message || '配置已保存');
    await loadStatus();
    emit('action');
  } catch (error) {
    notify(errorMessage(error), 'error');
  }
}

async function loadRanking() {
  if (!props.api?.get) return
  loading.value = true;
  try {
    const response = await props.api.get(`plugin/${pluginId.value}/rankings`, {
      params: {
        source: source.value,
        media_type: mediaType.value,
        page: page.value,
        limit: pageSize.value,
      },
    });
    if (!response?.success) throw new Error(response?.message || '读取榜单失败')
    const nextItems = (response.data?.items || []).map(item => ({ ...item, _localStatus: '' }));
    if (!nextItems.length && page.value > 1) {
      page.value -= 1;
      await loadRanking();
      return
    }
    items.value = nextItems;
    hasNextPage.value = nextItems.length >= pageSize.value;
  } catch (error) {
    items.value = [];
    notify(errorMessage(error), 'error');
  } finally {
    loading.value = false;
  }
}

async function loadHistory() {
  if (!props.api?.get) return
  try {
    const response = await props.api.get(`plugin/${pluginId.value}/history`);
    if (response?.success) history.value = response.data || [];
  } catch (error) {
    notify(errorMessage(error), 'error');
  }
}

async function refreshAll() {
  await Promise.all([loadStatus(), loadConfig(), loadHistory()]);
  await loadRanking();
}

function selectSource(nextSource) {
  if (source.value === nextSource) return
  source.value = nextSource;
  page.value = 1;
  selectedMap.clear();
  loadRanking();
}

function selectType(nextType) {
  if (mediaType.value === nextType) return
  mediaType.value = nextType;
  page.value = 1;
  selectedMap.clear();
  loadRanking();
}

function changePage(nextPage) {
  if (nextPage < 1 || (nextPage > page.value && !hasNextPage.value)) return
  page.value = nextPage;
  loadRanking();
}

function changePageSize(nextSize) {
  const value = Number(nextSize);
  if (!pageSizeOptions.includes(value) || value === pageSize.value) return
  pageSize.value = value;
  page.value = 1;
  loadRanking();
}

function isSelected(item) {
  return selectedMap.has(item.key)
}

function toggleSelection(item) {
  if (selectedMap.has(item.key)) selectedMap.delete(item.key);
  else selectedMap.set(item.key, item);
}

function toggleSelectVisible() {
  if (allVisibleSelected.value) {
    filteredItems.value.forEach(item => selectedMap.delete(item.key));
    return
  }
  filteredItems.value.forEach(item => selectedMap.set(item.key, item));
}

function clearSelection() {
  selectedMap.clear();
}

function resultStatus(item) {
  if (item._localStatus) return item._localStatus
  const match = history.value.find(entry => entry.key === item.key);
  return match?.status || ''
}

function statusLabel(item) {
  const value = resultStatus(item);
  if (['subscribed', 'exists'].includes(value)) return '已订阅'
  if (value === 'library') return '已入库'
  if (value === 'dry_run') return '演练通过'
  if (value === 'filtered') return '已过滤'
  if (['error', 'unrecognized'].includes(value)) return '待重试'
  return ''
}

function statusColor(item) {
  const value = resultStatus(item);
  if (['subscribed', 'exists'].includes(value)) return 'success'
  if (value === 'library') return 'info'
  if (['error', 'unrecognized'].includes(value)) return 'warning'
  return 'primary'
}

async function subscribeOne(item) {
  if (!props.api?.post || busyKeys.has(item.key)) return
  busyKeys.add(item.key);
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/subscribe`, item);
    const result = response?.data?.result;
    if (result) {
      item._localStatus = result.status;
      history.value = [result, ...history.value.filter(entry => entry.key !== result.key)];
    }
    if (response?.success) {
      notify(response.message || `已订阅 ${item.title}`);
      emit('action');
    } else {
      notify(response?.message || '未能创建订阅', 'warning');
    }
  } catch (error) {
    notify(errorMessage(error), 'error');
  } finally {
    busyKeys.delete(item.key);
  }
}

function requestBatch(nextSource, nextType) {
  const sourceName =
    nextSource === 'all'
      ? '全部来源'
      : sources.value.find(item => item.id === nextSource)?.name || nextSource;
  const typeName = mediaTypes.value.find(item => item.id === nextType)?.name || nextType;
  batchAction.value = {
    source: nextSource,
    media_type: nextType,
    label: nextSource === 'all' ? `全部来源的${typeName}` : `${sourceName} · ${typeName}`,
  };
  batchDialog.value = true;
}

async function executeBatch() {
  if (!batchAction.value || !props.api?.post) return
  batchLoading.value = true;
  const action = batchAction.value;
  batchDialog.value = false;
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/subscribe-batch`, {
      ...action,
      limit: 30,
      max_items: 100,
      min_score: minScore.value,
    });
    if (response?.success) notify(response.message || '批量订阅完成');
    else notify(response?.message || '批量订阅没有新增动作', 'warning');
    await loadHistory();
    if (response?.data?.results) {
      const resultMap = new Map(response.data.results.map(item => [item.key, item.status]));
      items.value = items.value.map(item => ({
        ...item,
        _localStatus: resultMap.get(item.key) || item._localStatus,
      }));
    }
    emit('action');
  } catch (error) {
    notify(errorMessage(error), 'error');
  } finally {
    batchLoading.value = false;
  }
}

async function subscribeSelected() {
  if (!props.api?.post || !selectedMap.size || batchLoading.value) return
  batchLoading.value = true;
  const chosen = Array.from(selectedMap.values());
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/subscribe-selected`, {
      items: chosen,
    });
    if (response?.success) notify(response.message || '多选订阅完成');
    else notify(response?.message || '多选订阅没有新增动作', 'warning');
    if (response?.data?.results) {
      const resultMap = new Map(response.data.results.map(item => [item.key, item.status]));
      items.value = items.value.map(item => ({
        ...item,
        _localStatus: resultMap.get(item.key) || item._localStatus,
      }));
      chosen.forEach(item => {
        if (resultMap.has(item.key)) selectedMap.delete(item.key);
      });
    }
    await loadHistory();
    emit('action');
  } catch (error) {
    notify(errorMessage(error), 'error');
  } finally {
    batchLoading.value = false;
  }
}

async function runAuto() {
  if (!props.api?.post || autoRunning.value) return
  autoRunning.value = true;
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/run`, {});
    if (response?.success) notify(response.message || '自动订阅任务完成');
    else notify(response?.message || '自动订阅没有产生新动作', 'warning');
    await Promise.all([loadStatus(), loadHistory()]);
    emit('action');
  } catch (error) {
    notify(errorMessage(error), 'error');
  } finally {
    autoRunning.value = false;
  }
}

function onPosterError(event) {
  event.target.style.display = 'none';
}

function historyText(item) {
  return item.recognized_title
    ? `${item.recognized_title}${item.recognized_year ? ` (${item.recognized_year})` : ''}`
    : item.title
}

function timeText(value) {
  if (!value) return '-'
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

onMounted(refreshAll);

return (_ctx, _cache) => {
  const _component_v_progress_linear = _resolveComponent("v-progress-linear");
  const _component_v_icon = _resolveComponent("v-icon");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_text_field = _resolveComponent("v-text-field");
  const _component_v_select = _resolveComponent("v-select");
  const _component_v_card_title = _resolveComponent("v-card-title");
  const _component_v_divider = _resolveComponent("v-divider");
  const _component_v_card_text = _resolveComponent("v-card-text");
  const _component_v_card = _resolveComponent("v-card");
  const _component_v_dialog = _resolveComponent("v-dialog");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_card_actions = _resolveComponent("v-card-actions");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_snackbar = _resolveComponent("v-snackbar");

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    (loading.value || batchLoading.value || autoRunning.value)
      ? (_openBlock(), _createBlock(_component_v_progress_linear, {
          key: 0,
          indeterminate: "",
          color: "primary",
          class: "top-progress"
        }))
      : _createCommentVNode("", true),
    _createElementVNode("header", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("div", _hoisted_4, [
          _createVNode(_component_v_icon, {
            icon: "mdi-trophy-variant-outline",
            size: "30"
          })
        ]),
        _cache[21] || (_cache[21] = _createElementVNode("div", null, [
          _createElementVNode("div", { class: "rank-hero__eyebrow" }, "RANKING TO SUBSCRIPTION"),
          _createElementVNode("h1", null, "榜单自动订阅"),
          _createElementVNode("p", null, "实时榜单直接变成 MoviePilot 订阅，支持单部、本榜、全来源和定时自动任务。")
        ], -1))
      ]),
      _createElementVNode("div", _hoisted_5, [
        _createVNode(_component_v_btn, {
          variant: "text",
          icon: "mdi-refresh",
          loading: loading.value,
          title: "刷新榜单",
          onClick: refreshAll
        }, null, 8, ["loading"]),
        _createVNode(_component_v_btn, {
          variant: "tonal",
          "prepend-icon": "mdi-history",
          onClick: _cache[0] || (_cache[0] = $event => (historyDialog.value = true))
        }, {
          default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
            _createTextVNode("处理记录", -1)
          ]))]),
          _: 1
        }),
        _createVNode(_component_v_btn, {
          variant: "outlined",
          "prepend-icon": "mdi-tune-variant",
          loading: configLoading.value,
          onClick: _cache[1] || (_cache[1] = $event => (settingsDialog.value = true))
        }, {
          default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
            _createTextVNode(" 自动规则 ", -1)
          ]))]),
          _: 1
        }, 8, ["loading"]),
        _createVNode(_component_v_btn, {
          color: "primary",
          variant: "flat",
          "prepend-icon": "mdi-play",
          loading: autoRunning.value,
          onClick: runAuto
        }, {
          default: _withCtx(() => [...(_cache[24] || (_cache[24] = [
            _createTextVNode(" 立即自动订阅 ", -1)
          ]))]),
          _: 1
        }, 8, ["loading"])
      ])
    ]),
    _createElementVNode("section", _hoisted_6, [
      _createElementVNode("button", {
        class: "metric-card",
        type: "button",
        onClick: _cache[2] || (_cache[2] = $event => (historyDialog.value = true))
      }, [
        _createElementVNode("span", _hoisted_7, [
          _createVNode(_component_v_icon, { icon: "mdi-check-decagram-outline" })
        ]),
        _createElementVNode("span", null, [
          _createElementVNode("strong", null, _toDisplayString(subscribedCount.value), 1),
          _cache[25] || (_cache[25] = _createElementVNode("small", null, "已订阅条目", -1))
        ])
      ]),
      _createElementVNode("button", {
        class: "metric-card",
        type: "button",
        onClick: _cache[3] || (_cache[3] = $event => (historyDialog.value = true))
      }, [
        _createElementVNode("span", _hoisted_8, [
          _createVNode(_component_v_icon, { icon: "mdi-alert-circle-outline" })
        ]),
        _createElementVNode("span", null, [
          _createElementVNode("strong", null, _toDisplayString(failedCount.value), 1),
          _cache[26] || (_cache[26] = _createElementVNode("small", null, "待重试条目", -1))
        ])
      ]),
      _createElementVNode("button", {
        class: "metric-card",
        type: "button",
        onClick: _cache[4] || (_cache[4] = $event => (settingsDialog.value = true))
      }, [
        _createElementVNode("span", _hoisted_9, [
          _createVNode(_component_v_icon, { icon: "mdi-clock-outline" })
        ]),
        _createElementVNode("span", null, [
          _createElementVNode("strong", null, _toDisplayString(configData.value.enabled ? '已启用' : '未启用'), 1),
          _createElementVNode("small", null, _toDisplayString(configData.value.cron || '0 */6 * * *'), 1)
        ])
      ]),
      _createElementVNode("button", {
        class: "metric-card",
        type: "button",
        onClick: _cache[5] || (_cache[5] = $event => (settingsDialog.value = true))
      }, [
        _createElementVNode("span", _hoisted_10, [
          _createVNode(_component_v_icon, { icon: "mdi-filter-variant" })
        ]),
        _createElementVNode("span", null, [
          _createElementVNode("strong", null, _toDisplayString((configData.value.auto_types || []).length), 1),
          _cache[27] || (_cache[27] = _createElementVNode("small", null, "自动订阅类型", -1))
        ])
      ])
    ]),
    _createElementVNode("section", _hoisted_11, [
      _createElementVNode("div", _hoisted_12, [
        _cache[28] || (_cache[28] = _createElementVNode("span", { class: "row-label" }, "来源", -1)),
        _createElementVNode("div", _hoisted_13, [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(sources.value, (item) => {
            return (_openBlock(), _createElementBlock("button", {
              key: item.id,
              type: "button",
              class: _normalizeClass(["choice-pill", { active: source.value === item.id }]),
              onClick: $event => (selectSource(item.id))
            }, _toDisplayString(item.name), 11, _hoisted_14))
          }), 128))
        ])
      ]),
      _createElementVNode("div", _hoisted_15, [
        _cache[29] || (_cache[29] = _createElementVNode("span", { class: "row-label" }, "类型", -1)),
        _createElementVNode("div", _hoisted_16, [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(mediaTypes.value, (item) => {
            return (_openBlock(), _createElementBlock("button", {
              key: item.id,
              type: "button",
              class: _normalizeClass(["choice-pill choice-pill--type", { active: mediaType.value === item.id }]),
              onClick: $event => (selectType(item.id))
            }, [
              _createTextVNode(_toDisplayString(item.name) + " ", 1),
              (typeCounts.value[item.id])
                ? (_openBlock(), _createElementBlock("span", _hoisted_18, _toDisplayString(typeCounts.value[item.id]), 1))
                : _createCommentVNode("", true)
            ], 10, _hoisted_17))
          }), 128))
        ])
      ]),
      _createElementVNode("div", _hoisted_19, [
        _createElementVNode("div", _hoisted_20, [
          _createElementVNode("span", null, _toDisplayString(currentSourceName.value), 1),
          _createVNode(_component_v_icon, {
            icon: "mdi-chevron-right",
            size: "18"
          }),
          _createElementVNode("strong", null, _toDisplayString(currentTypeName.value), 1),
          _createVNode(_component_v_chip, {
            size: "small",
            variant: "tonal",
            color: "primary"
          }, {
            default: _withCtx(() => [
              _createTextVNode(_toDisplayString(items.value.length) + " 部", 1)
            ]),
            _: 1
          })
        ]),
        _createElementVNode("div", _hoisted_21, [
          _createVNode(_component_v_text_field, {
            modelValue: query.value,
            "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((query).value = $event)),
            density: "compact",
            variant: "outlined",
            "hide-details": "",
            clearable: "",
            "prepend-inner-icon": "mdi-magnify",
            placeholder: "筛选片名",
            class: "search-field"
          }, null, 8, ["modelValue"]),
          _createVNode(_component_v_text_field, {
            modelValue: minScore.value,
            "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((minScore).value = $event)),
            modelModifiers: { number: true },
            density: "compact",
            variant: "outlined",
            "hide-details": "",
            type: "number",
            min: "0",
            max: "10",
            step: "0.1",
            label: "最低分",
            class: "score-field"
          }, null, 8, ["modelValue"]),
          _createVNode(_component_v_btn, {
            color: "primary",
            variant: "tonal",
            "prepend-icon": "mdi-playlist-plus",
            loading: batchLoading.value,
            disabled: !items.value.length,
            onClick: _cache[8] || (_cache[8] = $event => (requestBatch(source.value, mediaType.value)))
          }, {
            default: _withCtx(() => [...(_cache[30] || (_cache[30] = [
              _createTextVNode(" 订阅本榜 ", -1)
            ]))]),
            _: 1
          }, 8, ["loading", "disabled"]),
          _createVNode(_component_v_btn, {
            variant: "outlined",
            "prepend-icon": "mdi-server-plus",
            loading: batchLoading.value,
            onClick: _cache[9] || (_cache[9] = $event => (requestBatch('all', mediaType.value)))
          }, {
            default: _withCtx(() => [...(_cache[31] || (_cache[31] = [
              _createTextVNode(" 全部来源 ", -1)
            ]))]),
            _: 1
          }, 8, ["loading"])
        ])
      ]),
      _createElementVNode("div", _hoisted_22, [
        _createElementVNode("div", _hoisted_23, [
          _createVNode(_component_v_btn, {
            size: "small",
            variant: "tonal",
            "prepend-icon": allVisibleSelected.value ? 'mdi-checkbox-multiple-marked' : 'mdi-checkbox-multiple-blank-outline',
            disabled: !filteredItems.value.length,
            onClick: toggleSelectVisible
          }, {
            default: _withCtx(() => [
              _createTextVNode(_toDisplayString(allVisibleSelected.value ? '取消全选' : '全选当前筛选'), 1)
            ]),
            _: 1
          }, 8, ["prepend-icon", "disabled"]),
          _createVNode(_component_v_btn, {
            size: "small",
            variant: "text",
            disabled: !selectedCount.value,
            onClick: clearSelection
          }, {
            default: _withCtx(() => [...(_cache[32] || (_cache[32] = [
              _createTextVNode(" 清空选择 ", -1)
            ]))]),
            _: 1
          }, 8, ["disabled"]),
          _createVNode(_component_v_btn, {
            size: "small",
            color: "success",
            variant: "flat",
            "prepend-icon": "mdi-playlist-check",
            disabled: !selectedCount.value,
            loading: batchLoading.value,
            onClick: subscribeSelected
          }, {
            default: _withCtx(() => [
              _createTextVNode(" 订阅已选 " + _toDisplayString(selectedCount.value ? `(${selectedCount.value})` : ''), 1)
            ]),
            _: 1
          }, 8, ["disabled", "loading"]),
          (selectedCount.value)
            ? (_openBlock(), _createElementBlock("span", _hoisted_24, " 当前筛选已选 " + _toDisplayString(visibleSelectedCount.value) + " 部，选择可跨页保留 ", 1))
            : _createCommentVNode("", true)
        ]),
        _createElementVNode("div", _hoisted_25, [
          _createVNode(_component_v_select, {
            "model-value": pageSize.value,
            items: pageSizeOptions,
            density: "compact",
            variant: "outlined",
            "hide-details": "",
            label: "每页",
            class: "page-size-select",
            "onUpdate:modelValue": changePageSize
          }, null, 8, ["model-value"]),
          _createVNode(_component_v_btn, {
            size: "small",
            variant: "outlined",
            icon: "mdi-chevron-left",
            disabled: page.value <= 1 || loading.value,
            title: "上一页",
            onClick: _cache[10] || (_cache[10] = $event => (changePage(page.value - 1)))
          }, null, 8, ["disabled"]),
          _createElementVNode("span", _hoisted_26, "第 " + _toDisplayString(page.value) + " 页", 1),
          _createVNode(_component_v_btn, {
            size: "small",
            variant: "outlined",
            icon: "mdi-chevron-right",
            disabled: !hasNextPage.value || loading.value,
            title: "下一页",
            onClick: _cache[11] || (_cache[11] = $event => (changePage(page.value + 1)))
          }, null, 8, ["disabled"])
        ])
      ])
    ]),
    (!loading.value && !filteredItems.value.length)
      ? (_openBlock(), _createElementBlock("div", _hoisted_27, [
          _createVNode(_component_v_icon, {
            icon: "mdi-movie-off-outline",
            size: "44"
          }),
          _cache[33] || (_cache[33] = _createElementVNode("h3", null, "没有匹配的榜单条目", -1)),
          _cache[34] || (_cache[34] = _createElementVNode("p", null, "尝试切换来源、类型或清空筛选条件。", -1))
        ]))
      : (_openBlock(), _createElementBlock("div", _hoisted_28, [
          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(filteredItems.value, (item) => {
            return (_openBlock(), _createElementBlock("article", {
              key: item.key,
              class: _normalizeClass(["rank-card", { 'is-selected': isSelected(item) }])
            }, [
              _createElementVNode("div", _hoisted_29, [
                (item.poster_proxy || item.poster)
                  ? (_openBlock(), _createElementBlock("img", {
                      key: 0,
                      src: item.poster_proxy || item.poster,
                      alt: item.title,
                      class: "rank-card__poster",
                      loading: "lazy",
                      onError: onPosterError
                    }, null, 40, _hoisted_30))
                  : _createCommentVNode("", true),
                _createElementVNode("div", _hoisted_31, _toDisplayString(item.title), 1),
                _cache[35] || (_cache[35] = _createElementVNode("div", { class: "rank-card__shade" }, null, -1)),
                _createElementVNode("span", _hoisted_32, "#" + _toDisplayString(item.rank), 1),
                _createElementVNode("span", _hoisted_33, _toDisplayString(item.source_name), 1),
                (statusLabel(item))
                  ? (_openBlock(), _createBlock(_component_v_chip, {
                      key: 1,
                      color: statusColor(item),
                      size: "x-small",
                      class: "rank-card__status",
                      variant: "flat"
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(statusLabel(item)), 1)
                      ]),
                      _: 2
                    }, 1032, ["color"]))
                  : _createCommentVNode("", true),
                _createElementVNode("button", {
                  type: "button",
                  class: _normalizeClass(["rank-card__select", { active: isSelected(item) }]),
                  "aria-pressed": isSelected(item),
                  title: isSelected(item) ? '取消选择' : '选择此片',
                  onClick: _withModifiers($event => (toggleSelection(item)), ["stop"])
                }, [
                  _createVNode(_component_v_icon, {
                    icon: isSelected(item) ? 'mdi-checkbox-marked-circle' : 'mdi-checkbox-blank-circle-outline'
                  }, null, 8, ["icon"]),
                  _createElementVNode("span", null, _toDisplayString(isSelected(item) ? '已选' : '选择'), 1)
                ], 10, _hoisted_34),
                _createElementVNode("div", _hoisted_35, [
                  _createElementVNode("h2", {
                    title: item.title
                  }, _toDisplayString(item.title), 9, _hoisted_36),
                  _createElementVNode("p", null, _toDisplayString(item.description || '暂无简介'), 1)
                ])
              ]),
              _createElementVNode("div", _hoisted_37, [
                _createElementVNode("div", _hoisted_38, [
                  (item.year)
                    ? (_openBlock(), _createElementBlock("span", _hoisted_39, _toDisplayString(item.year), 1))
                    : _createCommentVNode("", true),
                  (item.score != null)
                    ? (_openBlock(), _createElementBlock("span", _hoisted_40, [
                        _createVNode(_component_v_icon, {
                          size: "15",
                          icon: "mdi-star"
                        }),
                        _createTextVNode(_toDisplayString(Number(item.score).toFixed(1)), 1)
                      ]))
                    : _createCommentVNode("", true),
                  _createElementVNode("span", _hoisted_41, _toDisplayString(item.media_type_name), 1)
                ]),
                _createVNode(_component_v_btn, {
                  block: "",
                  color: ['subscribed', 'exists', 'library'].includes(resultStatus(item)) ? 'success' : 'primary',
                  variant: ['subscribed', 'exists', 'library'].includes(resultStatus(item)) ? 'tonal' : 'flat',
                  "prepend-icon": ['subscribed', 'exists', 'library'].includes(resultStatus(item)) ? 'mdi-check' : 'mdi-plus',
                  loading: busyKeys.has(item.key),
                  disabled: busyKeys.has(item.key),
                  onClick: _withModifiers($event => (subscribeOne(item)), ["stop"])
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(_toDisplayString(['subscribed', 'exists', 'library'].includes(resultStatus(item)) ? '已加入' : '订阅此片'), 1)
                  ]),
                  _: 2
                }, 1032, ["color", "variant", "prepend-icon", "loading", "disabled", "onClick"])
              ])
            ], 2))
          }), 128))
        ])),
    _createElementVNode("footer", _hoisted_42, [
      _createElementVNode("span", null, "数据源：" + _toDisplayString(configData.value.api_base || 'https://pan.qbb365.xyz/rank-api'), 1),
      _cache[36] || (_cache[36] = _createElementVNode("span", null, "手动点击会立即调用 MoviePilot 订阅；自动任务按设置周期运行。", -1))
    ]),
    _createVNode(_component_v_dialog, {
      modelValue: settingsDialog.value,
      "onUpdate:modelValue": _cache[15] || (_cache[15] = $event => ((settingsDialog).value = $event)),
      "max-width": "1080",
      scrollable: ""
    }, {
      default: _withCtx(() => [
        _createVNode(_component_v_card, { class: "ranking-dialog" }, {
          default: _withCtx(() => [
            _createVNode(_component_v_card_title, { class: "dialog-title" }, {
              default: _withCtx(() => [
                _createElementVNode("span", null, [
                  _createVNode(_component_v_icon, {
                    class: "mr-2",
                    icon: "mdi-tune-variant"
                  }),
                  _cache[37] || (_cache[37] = _createTextVNode("榜单自动订阅配置", -1))
                ]),
                _createVNode(_component_v_btn, {
                  icon: "mdi-close",
                  variant: "text",
                  onClick: _cache[12] || (_cache[12] = $event => (settingsDialog.value = false))
                })
              ]),
              _: 1
            }),
            _createVNode(_component_v_divider),
            _createVNode(_component_v_card_text, { class: "dialog-body" }, {
              default: _withCtx(() => [
                _createVNode(Config, {
                  "initial-config": configData.value,
                  api: props.api,
                  onSave: saveConfig,
                  onClose: _cache[13] || (_cache[13] = $event => (settingsDialog.value = false)),
                  onSwitch: _cache[14] || (_cache[14] = $event => (settingsDialog.value = false))
                }, null, 8, ["initial-config", "api"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_v_dialog, {
      modelValue: batchDialog.value,
      "onUpdate:modelValue": _cache[17] || (_cache[17] = $event => ((batchDialog).value = $event)),
      "max-width": "500"
    }, {
      default: _withCtx(() => [
        _createVNode(_component_v_card, { class: "ranking-dialog" }, {
          default: _withCtx(() => [
            _createVNode(_component_v_card_title, { class: "dialog-title" }, {
              default: _withCtx(() => [...(_cache[38] || (_cache[38] = [
                _createTextVNode("批量订阅确认", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_v_card_text, { class: "batch-copy" }, {
              default: _withCtx(() => [
                _createElementVNode("div", _hoisted_43, [
                  _createVNode(_component_v_icon, {
                    icon: "mdi-playlist-plus",
                    size: "30"
                  })
                ]),
                _createElementVNode("div", null, [
                  _createElementVNode("strong", null, _toDisplayString(batchAction.value?.label), 1),
                  _cache[39] || (_cache[39] = _createElementVNode("p", null, "将按当前榜单顺序处理，已订阅和媒体库已有条目会自动跳过。首次运行可能触发多次 TMDB/豆瓣识别，请耐心等待。", -1))
                ])
              ]),
              _: 1
            }),
            _createVNode(_component_v_card_actions, null, {
              default: _withCtx(() => [
                _createVNode(_component_v_spacer),
                _createVNode(_component_v_btn, {
                  variant: "text",
                  onClick: _cache[16] || (_cache[16] = $event => (batchDialog.value = false))
                }, {
                  default: _withCtx(() => [...(_cache[40] || (_cache[40] = [
                    _createTextVNode("取消", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode(_component_v_btn, {
                  color: "primary",
                  variant: "flat",
                  loading: batchLoading.value,
                  onClick: executeBatch
                }, {
                  default: _withCtx(() => [...(_cache[41] || (_cache[41] = [
                    _createTextVNode("开始批量订阅", -1)
                  ]))]),
                  _: 1
                }, 8, ["loading"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_v_dialog, {
      modelValue: historyDialog.value,
      "onUpdate:modelValue": _cache[19] || (_cache[19] = $event => ((historyDialog).value = $event)),
      "max-width": "980",
      scrollable: ""
    }, {
      default: _withCtx(() => [
        _createVNode(_component_v_card, { class: "ranking-dialog" }, {
          default: _withCtx(() => [
            _createVNode(_component_v_card_title, { class: "dialog-title" }, {
              default: _withCtx(() => [
                _createElementVNode("span", null, [
                  _createVNode(_component_v_icon, {
                    class: "mr-2",
                    icon: "mdi-history"
                  }),
                  _cache[42] || (_cache[42] = _createTextVNode("最近处理记录", -1))
                ]),
                _createVNode(_component_v_btn, {
                  icon: "mdi-close",
                  variant: "text",
                  onClick: _cache[18] || (_cache[18] = $event => (historyDialog.value = false))
                })
              ]),
              _: 1
            }),
            _createVNode(_component_v_divider),
            _createVNode(_component_v_card_text, { class: "dialog-body" }, {
              default: _withCtx(() => [
                (!history.value.length)
                  ? (_openBlock(), _createBlock(_component_v_alert, {
                      key: 0,
                      type: "info",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [...(_cache[43] || (_cache[43] = [
                        _createTextVNode("还没有订阅处理记录。", -1)
                      ]))]),
                      _: 1
                    }))
                  : (_openBlock(), _createElementBlock("div", _hoisted_44, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(history.value.slice(0, 120), (item) => {
                        return (_openBlock(), _createElementBlock("div", {
                          key: `${item.key}-${item.time}`,
                          class: "history-item"
                        }, [
                          _createElementVNode("div", {
                            class: _normalizeClass(["history-item__mark", `is-${item.status}`])
                          }, [
                            _createVNode(_component_v_icon, {
                              icon: 
                    ['subscribed', 'exists'].includes(item.status)
                      ? 'mdi-check'
                      : item.status === 'library'
                        ? 'mdi-database-check'
                        : ['error', 'unrecognized'].includes(item.status)
                          ? 'mdi-alert-outline'
                          : 'mdi-information-outline'
                  
                            }, null, 8, ["icon"])
                          ], 2),
                          _createElementVNode("div", _hoisted_45, [
                            _createElementVNode("strong", null, _toDisplayString(historyText(item)), 1),
                            _createElementVNode("span", null, _toDisplayString(item.source_name) + " · " + _toDisplayString(item.media_type_name) + " · #" + _toDisplayString(item.rank), 1),
                            _createElementVNode("small", null, _toDisplayString(item.message), 1)
                          ]),
                          _createElementVNode("time", null, _toDisplayString(timeText(item.time)), 1)
                        ]))
                      }), 128))
                    ]))
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_v_snackbar, {
      modelValue: snackbar.show,
      "onUpdate:modelValue": _cache[20] || (_cache[20] = $event => ((snackbar.show) = $event)),
      color: snackbar.color,
      timeout: "3600"
    }, {
      default: _withCtx(() => [
        _createTextVNode(_toDisplayString(snackbar.text), 1)
      ]),
      _: 1
    }, 8, ["modelValue", "color"])
  ]))
}
}

};
const RankingPage = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-02291ebf"]]);

export { RankingPage as R };
