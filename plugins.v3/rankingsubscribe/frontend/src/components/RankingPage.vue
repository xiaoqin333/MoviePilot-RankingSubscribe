<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import Config from './Config.vue'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'RankingSubscribe' },
  navKey: { type: String, default: 'main' },
  config: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['action', 'switch', 'close'])
const hostToast = inject('moviepilot:toast', null)

const fallbackSources = [
  { id: 'tmdb', name: 'TMDB' },
  { id: 'douban', name: '豆瓣' },
  { id: 'iqiyi', name: '爱奇艺' },
  { id: 'tencent', name: '腾讯视频' },
  { id: 'youku', name: '优酷' },
  { id: 'mango', name: '芒果TV' },
]

const fallbackTypes = [
  { id: 'movie', name: '电影' },
  { id: 'tv', name: '电视剧' },
  { id: 'variety', name: '综艺' },
  { id: 'anime', name: '动漫' },
]

const pluginId = computed(() => props.pluginId || 'RankingSubscribe')
const sources = ref(fallbackSources)
const mediaTypes = ref(fallbackTypes)
const source = ref('tmdb')
const mediaType = ref('movie')
const items = ref([])
const query = ref('')
const minScore = ref(0)
const page = ref(1)
const pageSize = ref(30)
const hasNextPage = ref(false)
const loading = ref(false)
const configLoading = ref(false)
const batchLoading = ref(false)
const autoRunning = ref(false)
const settingsDialog = ref(false)
const historyDialog = ref(false)
const batchDialog = ref(false)
const history = ref([])
const status = ref({})
const configData = ref({})
const batchAction = ref(null)
const busyKeys = reactive(new Set())
const selectedMap = reactive(new Map())
const snackbar = reactive({ show: false, text: '', color: 'success' })
const pageSizeOptions = [12, 20, 30, 50]

const typeCounts = computed(() =>
  Object.fromEntries(
    mediaTypes.value.map(type => [
      type.id,
      history.value.filter(item => item.media_type === type.id).length,
    ]),
  ),
)

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase('zh-CN')
  return items.value.filter(item => {
    if (keyword && !String(item.title || '').toLocaleLowerCase('zh-CN').includes(keyword)) return false
    if (minScore.value > 0 && (item.score == null || Number(item.score) < minScore.value)) return false
    return true
  })
})

const currentSourceName = computed(
  () => sources.value.find(item => item.id === source.value)?.name || source.value,
)
const currentTypeName = computed(
  () => mediaTypes.value.find(item => item.id === mediaType.value)?.name || mediaType.value,
)
const subscribedCount = computed(
  () => new Set(history.value.filter(item => ['subscribed', 'exists'].includes(item.status)).map(item => item.key)).size,
)
const failedCount = computed(
  () => history.value.filter(item => ['error', 'unrecognized', 'not_found'].includes(item.status)).length,
)
const selectedCount = computed(() => selectedMap.size)
const visibleSelectedCount = computed(
  () => filteredItems.value.filter(item => selectedMap.has(item.key)).length,
)
const allVisibleSelected = computed(
  () =>
    filteredItems.value.length > 0 &&
    filteredItems.value.every(item => selectedMap.has(item.key)),
)

function notify(message, color = 'success') {
  snackbar.text = message || '操作完成'
  snackbar.color = color
  snackbar.show = true
  if (color === 'error') hostToast?.error?.(message)
  else if (color === 'warning') hostToast?.warning?.(message)
  else if (color === 'info') hostToast?.info?.(message)
  else hostToast?.success?.(message)
}

function errorMessage(error) {
  return error?.response?.data?.message || error?.message || '请求失败，请查看 MoviePilot 日志'
}

async function loadStatus() {
  if (!props.api?.get) return
  try {
    const response = await props.api.get(`plugin/${pluginId.value}/status`)
    if (response?.success && response.data) {
      status.value = response.data
      configData.value = response.data.config || {}
      if (Array.isArray(response.data.sources) && response.data.sources.length) {
        sources.value = response.data.sources
      }
      if (Array.isArray(response.data.media_types) && response.data.media_types.length) {
        mediaTypes.value = response.data.media_types
      }
    }
  } catch (error) {
    notify(errorMessage(error), 'error')
  }
}

async function loadConfig() {
  if (!props.api?.get) return
  configLoading.value = true
  try {
    const response = await props.api.get(`plugin/${pluginId.value}/config`)
    if (response?.success && response.data) configData.value = response.data
  } catch (error) {
    notify(errorMessage(error), 'error')
  } finally {
    configLoading.value = false
  }
}

async function saveConfig(nextConfig) {
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/config`, nextConfig)
    if (!response?.success) throw new Error(response?.message || '配置保存失败')
    configData.value = response.data || nextConfig
    settingsDialog.value = false
    notify(response.message || '配置已保存')
    await loadStatus()
    emit('action')
  } catch (error) {
    notify(errorMessage(error), 'error')
  }
}

async function loadRanking() {
  if (!props.api?.get) return
  loading.value = true
  try {
    const response = await props.api.get(`plugin/${pluginId.value}/rankings`, {
      params: {
        source: source.value,
        media_type: mediaType.value,
        page: page.value,
        limit: pageSize.value,
      },
    })
    if (!response?.success) throw new Error(response?.message || '读取榜单失败')
    const nextItems = (response.data?.items || []).map(item => ({ ...item, _localStatus: '' }))
    if (!nextItems.length && page.value > 1) {
      page.value -= 1
      await loadRanking()
      return
    }
    items.value = nextItems
    hasNextPage.value = nextItems.length >= pageSize.value
  } catch (error) {
    items.value = []
    notify(errorMessage(error), 'error')
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  if (!props.api?.get) return
  try {
    const response = await props.api.get(`plugin/${pluginId.value}/history`)
    if (response?.success) history.value = response.data || []
  } catch (error) {
    notify(errorMessage(error), 'error')
  }
}

async function refreshAll() {
  await Promise.all([loadStatus(), loadConfig(), loadHistory()])
  await loadRanking()
}

function selectSource(nextSource) {
  if (source.value === nextSource) return
  source.value = nextSource
  page.value = 1
  selectedMap.clear()
  loadRanking()
}

function selectType(nextType) {
  if (mediaType.value === nextType) return
  mediaType.value = nextType
  page.value = 1
  selectedMap.clear()
  loadRanking()
}

function changePage(nextPage) {
  if (nextPage < 1 || (nextPage > page.value && !hasNextPage.value)) return
  page.value = nextPage
  loadRanking()
}

function changePageSize(nextSize) {
  const value = Number(nextSize)
  if (!pageSizeOptions.includes(value) || value === pageSize.value) return
  pageSize.value = value
  page.value = 1
  loadRanking()
}

function isSelected(item) {
  return selectedMap.has(item.key)
}

function toggleSelection(item) {
  if (selectedMap.has(item.key)) selectedMap.delete(item.key)
  else selectedMap.set(item.key, item)
}

function toggleSelectVisible() {
  if (allVisibleSelected.value) {
    filteredItems.value.forEach(item => selectedMap.delete(item.key))
    return
  }
  filteredItems.value.forEach(item => selectedMap.set(item.key, item))
}

function clearSelection() {
  selectedMap.clear()
}

function resultStatus(item) {
  if (item._localStatus) return item._localStatus
  const match = history.value.find(entry => entry.key === item.key)
  return match?.status || ''
}

function statusLabel(item) {
  const value = resultStatus(item)
  if (['subscribed', 'exists'].includes(value)) return '已订阅'
  if (value === 'library') return '已入库'
  if (value === 'dry_run') return '演练通过'
  if (value === 'filtered') return '已过滤'
  if (['error', 'unrecognized'].includes(value)) return '待重试'
  return ''
}

function statusColor(item) {
  const value = resultStatus(item)
  if (['subscribed', 'exists'].includes(value)) return 'success'
  if (value === 'library') return 'info'
  if (['error', 'unrecognized'].includes(value)) return 'warning'
  return 'primary'
}

async function subscribeOne(item) {
  if (!props.api?.post || busyKeys.has(item.key)) return
  busyKeys.add(item.key)
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/subscribe`, item)
    const result = response?.data?.result
    if (result) {
      item._localStatus = result.status
      history.value = [result, ...history.value.filter(entry => entry.key !== result.key)]
    }
    if (response?.success) {
      notify(response.message || `已订阅 ${item.title}`)
      emit('action')
    } else {
      notify(response?.message || '未能创建订阅', 'warning')
    }
  } catch (error) {
    notify(errorMessage(error), 'error')
  } finally {
    busyKeys.delete(item.key)
  }
}

function requestBatch(nextSource, nextType) {
  const sourceName =
    nextSource === 'all'
      ? '全部来源'
      : sources.value.find(item => item.id === nextSource)?.name || nextSource
  const typeName = mediaTypes.value.find(item => item.id === nextType)?.name || nextType
  batchAction.value = {
    source: nextSource,
    media_type: nextType,
    label: nextSource === 'all' ? `全部来源的${typeName}` : `${sourceName} · ${typeName}`,
  }
  batchDialog.value = true
}

async function executeBatch() {
  if (!batchAction.value || !props.api?.post) return
  batchLoading.value = true
  const action = batchAction.value
  batchDialog.value = false
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/subscribe-batch`, {
      ...action,
      limit: 30,
      max_items: 100,
      min_score: minScore.value,
    })
    if (response?.success) notify(response.message || '批量订阅完成')
    else notify(response?.message || '批量订阅没有新增动作', 'warning')
    await loadHistory()
    if (response?.data?.results) {
      const resultMap = new Map(response.data.results.map(item => [item.key, item.status]))
      items.value = items.value.map(item => ({
        ...item,
        _localStatus: resultMap.get(item.key) || item._localStatus,
      }))
    }
    emit('action')
  } catch (error) {
    notify(errorMessage(error), 'error')
  } finally {
    batchLoading.value = false
  }
}

async function subscribeSelected() {
  if (!props.api?.post || !selectedMap.size || batchLoading.value) return
  batchLoading.value = true
  const chosen = Array.from(selectedMap.values())
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/subscribe-selected`, {
      items: chosen,
    })
    if (response?.success) notify(response.message || '多选订阅完成')
    else notify(response?.message || '多选订阅没有新增动作', 'warning')
    if (response?.data?.results) {
      const resultMap = new Map(response.data.results.map(item => [item.key, item.status]))
      items.value = items.value.map(item => ({
        ...item,
        _localStatus: resultMap.get(item.key) || item._localStatus,
      }))
      chosen.forEach(item => {
        if (resultMap.has(item.key)) selectedMap.delete(item.key)
      })
    }
    await loadHistory()
    emit('action')
  } catch (error) {
    notify(errorMessage(error), 'error')
  } finally {
    batchLoading.value = false
  }
}

async function runAuto() {
  if (!props.api?.post || autoRunning.value) return
  autoRunning.value = true
  try {
    const response = await props.api.post(`plugin/${pluginId.value}/run`, {})
    if (response?.success) notify(response.message || '自动订阅任务完成')
    else notify(response?.message || '自动订阅没有产生新动作', 'warning')
    await Promise.all([loadStatus(), loadHistory()])
    emit('action')
  } catch (error) {
    notify(errorMessage(error), 'error')
  } finally {
    autoRunning.value = false
  }
}

function onPosterError(event) {
  event.target.style.display = 'none'
}

function historyText(item) {
  return item.recognized_title
    ? `${item.recognized_title}${item.recognized_year ? ` (${item.recognized_year})` : ''}`
    : item.title
}

function timeText(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

onMounted(refreshAll)
</script>

<template>
  <div class="ranking-page">
    <v-progress-linear v-if="loading || batchLoading || autoRunning" indeterminate color="primary" class="top-progress" />

    <header class="rank-hero">
      <div class="rank-hero__identity">
        <div class="rank-hero__icon">
          <v-icon icon="mdi-trophy-variant-outline" size="30" />
        </div>
        <div>
          <div class="rank-hero__eyebrow">RANKING TO SUBSCRIPTION</div>
          <h1>榜单自动订阅</h1>
          <p>实时榜单直接变成 MoviePilot 订阅，支持单部、本榜、全来源和定时自动任务。</p>
        </div>
      </div>
      <div class="rank-hero__actions">
        <v-btn variant="text" icon="mdi-refresh" :loading="loading" title="刷新榜单" @click="refreshAll" />
        <v-btn variant="tonal" prepend-icon="mdi-history" @click="historyDialog = true">处理记录</v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-tune-variant" :loading="configLoading" @click="settingsDialog = true">
          自动规则
        </v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-play" :loading="autoRunning" @click="runAuto">
          立即自动订阅
        </v-btn>
      </div>
    </header>

    <section class="metric-strip">
      <button class="metric-card" type="button" @click="historyDialog = true">
        <span class="metric-card__icon metric-card__icon--primary"><v-icon icon="mdi-check-decagram-outline" /></span>
        <span><strong>{{ subscribedCount }}</strong><small>已订阅条目</small></span>
      </button>
      <button class="metric-card" type="button" @click="historyDialog = true">
        <span class="metric-card__icon metric-card__icon--warning"><v-icon icon="mdi-alert-circle-outline" /></span>
        <span><strong>{{ failedCount }}</strong><small>待重试条目</small></span>
      </button>
      <button class="metric-card" type="button" @click="settingsDialog = true">
        <span class="metric-card__icon metric-card__icon--info"><v-icon icon="mdi-clock-outline" /></span>
        <span><strong>{{ configData.enabled ? '已启用' : '未启用' }}</strong><small>{{ configData.cron || '0 */6 * * *' }}</small></span>
      </button>
      <button class="metric-card" type="button" @click="settingsDialog = true">
        <span class="metric-card__icon metric-card__icon--success"><v-icon icon="mdi-filter-variant" /></span>
        <span><strong>{{ (configData.auto_types || []).length }}</strong><small>自动订阅类型</small></span>
      </button>
    </section>

    <section class="ranking-panel">
      <div class="source-row">
        <span class="row-label">来源</span>
        <div class="choice-row">
          <button
            v-for="item in sources"
            :key="item.id"
            type="button"
            class="choice-pill"
            :class="{ active: source === item.id }"
            @click="selectSource(item.id)"
          >
            {{ item.name }}
          </button>
        </div>
      </div>
      <div class="source-row">
        <span class="row-label">类型</span>
        <div class="choice-row">
          <button
            v-for="item in mediaTypes"
            :key="item.id"
            type="button"
            class="choice-pill choice-pill--type"
            :class="{ active: mediaType === item.id }"
            @click="selectType(item.id)"
          >
            {{ item.name }}
            <span v-if="typeCounts[item.id]" class="choice-count">{{ typeCounts[item.id] }}</span>
          </button>
        </div>
      </div>
      <div class="toolbar-row">
        <div class="ranking-title">
          <span>{{ currentSourceName }}</span>
          <v-icon icon="mdi-chevron-right" size="18" />
          <strong>{{ currentTypeName }}</strong>
          <v-chip size="small" variant="tonal" color="primary">{{ items.length }} 部</v-chip>
        </div>
        <div class="toolbar-actions">
          <v-text-field
            v-model="query"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
            placeholder="筛选片名"
            class="search-field"
          />
          <v-text-field
            v-model.number="minScore"
            density="compact"
            variant="outlined"
            hide-details
            type="number"
            min="0"
            max="10"
            step="0.1"
            label="最低分"
            class="score-field"
          />
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-playlist-plus"
            :loading="batchLoading"
            :disabled="!items.length"
            @click="requestBatch(source, mediaType)"
          >
            订阅本榜
          </v-btn>
          <v-btn
            variant="outlined"
            prepend-icon="mdi-server-plus"
            :loading="batchLoading"
            @click="requestBatch('all', mediaType)"
          >
            全部来源
          </v-btn>
        </div>
      </div>
      <div class="selection-bar">
        <div class="selection-actions">
          <v-btn
            size="small"
            variant="tonal"
            :prepend-icon="allVisibleSelected ? 'mdi-checkbox-multiple-marked' : 'mdi-checkbox-multiple-blank-outline'"
            :disabled="!filteredItems.length"
            @click="toggleSelectVisible"
          >
            {{ allVisibleSelected ? '取消全选' : '全选当前筛选' }}
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            :disabled="!selectedCount"
            @click="clearSelection"
          >
            清空选择
          </v-btn>
          <v-btn
            size="small"
            color="success"
            variant="flat"
            prepend-icon="mdi-playlist-check"
            :disabled="!selectedCount"
            :loading="batchLoading"
            @click="subscribeSelected"
          >
            订阅已选 {{ selectedCount ? `(${selectedCount})` : '' }}
          </v-btn>
          <span v-if="selectedCount" class="selection-note">
            当前筛选已选 {{ visibleSelectedCount }} 部，选择可跨页保留
          </span>
        </div>
        <div class="pager">
          <v-select
            :model-value="pageSize"
            :items="pageSizeOptions"
            density="compact"
            variant="outlined"
            hide-details
            label="每页"
            class="page-size-select"
            @update:model-value="changePageSize"
          />
          <v-btn
            size="small"
            variant="outlined"
            icon="mdi-chevron-left"
            :disabled="page <= 1 || loading"
            title="上一页"
            @click="changePage(page - 1)"
          />
          <span class="page-number">第 {{ page }} 页</span>
          <v-btn
            size="small"
            variant="outlined"
            icon="mdi-chevron-right"
            :disabled="!hasNextPage || loading"
            title="下一页"
            @click="changePage(page + 1)"
          />
        </div>
      </div>
    </section>

    <div v-if="!loading && !filteredItems.length" class="empty-panel">
      <v-icon icon="mdi-movie-off-outline" size="44" />
      <h3>没有匹配的榜单条目</h3>
      <p>尝试切换来源、类型或清空筛选条件。</p>
    </div>

    <div v-else class="poster-grid">
      <article
        v-for="item in filteredItems"
        :key="item.key"
        class="rank-card"
        :class="{ 'is-selected': isSelected(item) }"
      >
        <div class="rank-card__poster-wrap">
          <img
            v-if="item.poster_proxy || item.poster"
            :src="item.poster_proxy || item.poster"
            :alt="item.title"
            class="rank-card__poster"
            loading="lazy"
            @error="onPosterError"
          />
          <div class="rank-card__fallback">{{ item.title }}</div>
          <div class="rank-card__shade" />
          <span class="rank-card__rank">#{{ item.rank }}</span>
          <span class="rank-card__source">{{ item.source_name }}</span>
          <v-chip
            v-if="statusLabel(item)"
            :color="statusColor(item)"
            size="x-small"
            class="rank-card__status"
            variant="flat"
          >
            {{ statusLabel(item) }}
          </v-chip>
          <button
            type="button"
            class="rank-card__select"
            :class="{ active: isSelected(item) }"
            :aria-pressed="isSelected(item)"
            :title="isSelected(item) ? '取消选择' : '选择此片'"
            @click.stop="toggleSelection(item)"
          >
            <v-icon :icon="isSelected(item) ? 'mdi-checkbox-marked-circle' : 'mdi-checkbox-blank-circle-outline'" />
            <span>{{ isSelected(item) ? '已选' : '选择' }}</span>
          </button>
          <div class="rank-card__copy">
            <h2 :title="item.title">{{ item.title }}</h2>
            <p>{{ item.description || '暂无简介' }}</p>
          </div>
        </div>
        <div class="rank-card__body">
          <div class="rank-card__meta">
            <span v-if="item.year">{{ item.year }}</span>
            <span v-if="item.score != null" class="score">
              <v-icon size="15" icon="mdi-star" />{{ Number(item.score).toFixed(1) }}
            </span>
            <span class="media-type">{{ item.media_type_name }}</span>
          </div>
          <v-btn
            block
            :color="['subscribed', 'exists', 'library'].includes(resultStatus(item)) ? 'success' : 'primary'"
            :variant="['subscribed', 'exists', 'library'].includes(resultStatus(item)) ? 'tonal' : 'flat'"
            :prepend-icon="['subscribed', 'exists', 'library'].includes(resultStatus(item)) ? 'mdi-check' : 'mdi-plus'"
            :loading="busyKeys.has(item.key)"
            :disabled="busyKeys.has(item.key)"
            @click.stop="subscribeOne(item)"
          >
            {{ ['subscribed', 'exists', 'library'].includes(resultStatus(item)) ? '已加入' : '订阅此片' }}
          </v-btn>
        </div>
      </article>
    </div>

    <footer class="page-footer">
      <span>数据源：{{ configData.api_base || 'https://pan.qbb365.xyz/rank-api' }}</span>
      <span>手动点击会立即调用 MoviePilot 订阅；自动任务按设置周期运行。</span>
    </footer>

    <v-dialog v-model="settingsDialog" max-width="1080" scrollable>
      <v-card class="ranking-dialog">
        <v-card-title class="dialog-title">
          <span><v-icon class="mr-2" icon="mdi-tune-variant" />榜单自动订阅配置</span>
          <v-btn icon="mdi-close" variant="text" @click="settingsDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="dialog-body">
          <Config
            :initial-config="configData"
            :api="props.api"
            @save="saveConfig"
            @close="settingsDialog = false"
            @switch="settingsDialog = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="batchDialog" max-width="500">
      <v-card class="ranking-dialog">
        <v-card-title class="dialog-title">批量订阅确认</v-card-title>
        <v-card-text class="batch-copy">
          <div class="batch-copy__icon"><v-icon icon="mdi-playlist-plus" size="30" /></div>
          <div>
            <strong>{{ batchAction?.label }}</strong>
            <p>将按当前榜单顺序处理，已订阅和媒体库已有条目会自动跳过。首次运行可能触发多次 TMDB/豆瓣识别，请耐心等待。</p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="batchDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" :loading="batchLoading" @click="executeBatch">开始批量订阅</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="historyDialog" max-width="980" scrollable>
      <v-card class="ranking-dialog">
        <v-card-title class="dialog-title">
          <span><v-icon class="mr-2" icon="mdi-history" />最近处理记录</span>
          <v-btn icon="mdi-close" variant="text" @click="historyDialog = false" />
        </v-card-title>
        <v-divider />
        <v-card-text class="dialog-body">
          <v-alert v-if="!history.length" type="info" variant="tonal">还没有订阅处理记录。</v-alert>
          <div v-else class="history-list">
            <div v-for="item in history.slice(0, 120)" :key="`${item.key}-${item.time}`" class="history-item">
              <div class="history-item__mark" :class="`is-${item.status}`">
                <v-icon
                  :icon="
                    ['subscribed', 'exists'].includes(item.status)
                      ? 'mdi-check'
                      : item.status === 'library'
                        ? 'mdi-database-check'
                        : ['error', 'unrecognized'].includes(item.status)
                          ? 'mdi-alert-outline'
                          : 'mdi-information-outline'
                  "
                />
              </div>
              <div class="history-item__main">
                <strong>{{ historyText(item) }}</strong>
                <span>{{ item.source_name }} · {{ item.media_type_name }} · #{{ item.rank }}</span>
                <small>{{ item.message }}</small>
              </div>
              <time>{{ timeText(item.time) }}</time>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3600">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.ranking-page {
  --rank-ink: rgb(var(--v-theme-on-background));
  max-width: 1720px;
  margin: 0 auto;
  padding: 20px;
  color: var(--rank-ink);
}

.top-progress {
  position: fixed;
  z-index: 30;
  inset: 0 0 auto;
}

.rank-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 24px;
  border: 1px solid rgba(var(--v-theme-primary), 0.18);
  border-radius: 22px;
  background:
    radial-gradient(circle at 92% 6%, rgba(var(--v-theme-info), 0.18), transparent 30%),
    linear-gradient(125deg, rgba(var(--v-theme-primary), 0.17), rgba(var(--v-theme-surface), 0.92) 58%);
  box-shadow: 0 14px 45px rgba(var(--v-theme-on-surface), 0.06);
  gap: 24px;
}

.rank-hero__identity,
.rank-hero__actions,
.ranking-title,
.toolbar-actions,
.rank-card__meta {
  display: flex;
  align-items: center;
}

.rank-hero__identity {
  min-width: 0;
  gap: 15px;
}

.rank-hero__icon {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  border-radius: 18px;
  background: linear-gradient(145deg, rgb(var(--v-theme-primary)), rgba(var(--v-theme-primary), 0.72));
  color: white;
  box-shadow: 0 12px 28px rgba(var(--v-theme-primary), 0.25);
  place-items: center;
}

.rank-hero__eyebrow {
  margin-bottom: 3px;
  color: rgb(var(--v-theme-primary));
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.15em;
}

.rank-hero h1 {
  margin: 0;
  font-size: clamp(25px, 3vw, 36px);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.rank-hero p {
  margin: 7px 0 0;
  max-width: 720px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 13px;
  line-height: 1.6;
}

.rank-hero__actions,
.toolbar-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.metric-strip {
  display: grid;
  margin: 16px 0;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-card {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.075);
  border-radius: 16px;
  background: rgba(var(--v-theme-surface), 0.85);
  color: inherit;
  cursor: pointer;
  font: inherit;
  gap: 12px;
  text-align: start;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}

.metric-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.22);
  box-shadow: 0 10px 26px rgba(var(--v-theme-on-surface), 0.07);
  transform: translateY(-1px);
}

.metric-card__icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 12px;
  place-items: center;
}

.metric-card__icon--primary { background: rgba(var(--v-theme-primary), 0.12); color: rgb(var(--v-theme-primary)); }
.metric-card__icon--warning { background: rgba(var(--v-theme-warning), 0.12); color: rgb(var(--v-theme-warning)); }
.metric-card__icon--info { background: rgba(var(--v-theme-info), 0.12); color: rgb(var(--v-theme-info)); }
.metric-card__icon--success { background: rgba(var(--v-theme-success), 0.12); color: rgb(var(--v-theme-success)); }

.metric-card span:last-child {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.metric-card strong {
  font-size: 20px;
  line-height: 1.25;
}

.metric-card small {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-panel {
  overflow: hidden;
  padding: 4px 20px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.075);
  border-radius: 19px;
  background: rgba(var(--v-theme-surface), 0.88);
}

.source-row {
  display: grid;
  align-items: center;
  min-height: 52px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.055);
  gap: 14px;
  grid-template-columns: 58px minmax(0, 1fr);
}

.row-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 12px;
  font-weight: 700;
}

.choice-row {
  display: flex;
  overflow-x: auto;
  padding: 8px 0;
  gap: 7px;
  scrollbar-width: none;
}

.choice-row::-webkit-scrollbar { display: none; }

.choice-pill {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 32px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: rgba(var(--v-theme-on-surface), 0.045);
  color: rgba(var(--v-theme-on-surface), 0.72);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  gap: 7px;
  transition: all 150ms ease;
}

.choice-pill:hover {
  background: rgba(var(--v-theme-on-surface), 0.075);
}

.choice-pill.active {
  border-color: rgba(var(--v-theme-primary), 0.12);
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.choice-pill--type.active {
  background: rgba(var(--v-theme-primary), 0.14);
}

.choice-count {
  display: grid;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.12);
  font-size: 9px;
  place-items: center;
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 15px;
  gap: 18px;
  flex-wrap: wrap;
}

.selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-theme-primary), 0.1);
  border-radius: 13px;
  background: rgba(var(--v-theme-primary), 0.045);
  gap: 12px;
  flex-wrap: wrap;
}

.selection-actions,
.pager {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.selection-note,
.page-number {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 11px;
}

.page-size-select {
  width: 92px;
}

.ranking-title {
  min-width: 0;
  gap: 5px;
  font-size: 15px;
}

.ranking-title strong {
  font-size: 18px;
}

.ranking-title .v-chip {
  margin-left: 4px;
}

.search-field {
  width: 190px;
}

.score-field {
  width: 98px;
}

.poster-grid {
  display: grid;
  margin-top: 16px;
  gap: 14px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.rank-card {
  overflow: hidden;
  min-width: 0;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.075);
  border-radius: 18px;
  background: rgba(var(--v-theme-surface), 0.92);
  box-shadow: 0 8px 26px rgba(var(--v-theme-on-surface), 0.04);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.rank-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.24);
  box-shadow: 0 16px 38px rgba(var(--v-theme-on-surface), 0.11);
  transform: translateY(-3px);
}

.rank-card.is-selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.16), 0 16px 38px rgba(var(--v-theme-on-surface), 0.11);
}

.rank-card__poster-wrap {
  position: relative;
  overflow: hidden;
  aspect-ratio: 2 / 2.95;
  background:
    linear-gradient(145deg, rgba(var(--v-theme-primary), 0.18), rgba(var(--v-theme-info), 0.08)),
    rgba(var(--v-theme-on-surface), 0.06);
}

.rank-card__poster {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  inset: 0;
  transition: transform 280ms ease;
}

.rank-card:hover .rank-card__poster {
  transform: scale(1.035);
}

.rank-card__fallback {
  position: absolute;
  display: grid;
  padding: 28px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 18px;
  font-weight: 750;
  inset: 0;
  place-items: center;
  text-align: center;
}

.rank-card__shade {
  position: absolute;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 20%, transparent 48%, rgba(0, 0, 0, 0.87));
  inset: 0;
}

.rank-card__rank,
.rank-card__source {
  position: absolute;
  top: 11px;
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(10, 12, 18, 0.7);
  color: white;
  font-size: 10px;
  font-weight: 700;
  backdrop-filter: blur(8px);
}

.rank-card__rank { left: 11px; }
.rank-card__source { right: 11px; }

.rank-card__status {
  position: absolute;
  top: 45px;
  right: 11px;
}

.rank-card__select {
  position: absolute;
  top: 44px;
  left: 11px;
  display: inline-flex;
  align-items: center;
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(10, 12, 18, 0.7);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  font-weight: 650;
  gap: 4px;
  backdrop-filter: blur(8px);
}

.rank-card__select.active {
  border-color: rgba(255, 255, 255, 0.48);
  background: rgb(var(--v-theme-primary));
  color: white;
}

.rank-card__copy {
  position: absolute;
  right: 13px;
  bottom: 12px;
  left: 13px;
  color: white;
}

.rank-card__copy h2 {
  overflow: hidden;
  margin: 0;
  font-size: 16px;
  font-weight: 760;
  letter-spacing: -0.02em;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-card__copy p {
  display: -webkit-box;
  overflow: hidden;
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 10px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.rank-card__body {
  padding: 12px;
}

.rank-card__meta {
  min-height: 24px;
  margin-bottom: 9px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 11px;
  gap: 9px;
}

.rank-card__meta .score {
  display: inline-flex;
  align-items: center;
  color: #e7a400;
  font-weight: 700;
  gap: 2px;
}

.rank-card__meta .media-type {
  margin-left: auto;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.055);
}

.empty-panel {
  display: flex;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin-top: 16px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 20px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.empty-panel h3 { margin: 12px 0 4px; color: var(--rank-ink); }
.empty-panel p { margin: 0; font-size: 12px; }

.page-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 10px;
  gap: 12px;
}

.ranking-dialog {
  overflow: hidden;
  border-radius: 22px !important;
  background: rgb(var(--v-theme-surface));
}

.dialog-title {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  padding: 17px 20px !important;
  font-size: 17px !important;
  font-weight: 700;
}

.dialog-body {
  padding: 20px !important;
}

.batch-copy {
  display: flex;
  align-items: flex-start;
  padding: 22px !important;
  gap: 14px;
}

.batch-copy__icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  border-radius: 14px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
  place-items: center;
}

.batch-copy strong { font-size: 15px; }
.batch-copy p {
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 12px;
  line-height: 1.65;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  border-radius: 13px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  gap: 12px;
}

.history-item__mark {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  place-items: center;
}

.history-item__mark.is-subscribed,
.history-item__mark.is-exists { background: rgba(var(--v-theme-success), 0.1); color: rgb(var(--v-theme-success)); }
.history-item__mark.is-library { background: rgba(var(--v-theme-info), 0.1); color: rgb(var(--v-theme-info)); }
.history-item__mark.is-error,
.history-item__mark.is-unrecognized { background: rgba(var(--v-theme-warning), 0.12); color: rgb(var(--v-theme-warning)); }

.history-item__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.history-item__main strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item__main span,
.history-item__main small,
.history-item time {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 10px;
}

.history-item__main span { margin-top: 2px; }
.history-item__main small {
  overflow: hidden;
  margin-top: 3px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item time {
  flex: 0 0 auto;
  white-space: nowrap;
}

@media (max-width: 1400px) {
  .poster-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 1080px) {
  .metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .poster-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .rank-hero { align-items: flex-start; flex-direction: column; }
  .rank-hero__actions { justify-content: flex-start; }
}

@media (max-width: 760px) {
  .ranking-page { padding: 12px; }
  .rank-hero { padding: 18px; border-radius: 18px; }
  .rank-hero__icon { width: 49px; height: 49px; border-radius: 15px; }
  .rank-hero__actions { width: 100%; }
  .rank-hero__actions .v-btn:not(.v-btn--icon) { flex: 1 1 auto; }
  .metric-strip { gap: 8px; }
  .metric-card { padding: 11px; gap: 8px; }
  .metric-card__icon { width: 34px; height: 34px; border-radius: 10px; }
  .metric-card strong { font-size: 17px; }
  .ranking-panel { padding-inline: 13px; }
  .source-row { grid-template-columns: 42px minmax(0, 1fr); }
  .toolbar-row { align-items: stretch; flex-direction: column; }
  .toolbar-actions { justify-content: stretch; }
  .selection-bar { align-items: stretch; flex-direction: column; }
  .selection-actions, .pager { justify-content: space-between; }
  .search-field { width: 100%; }
  .score-field { width: 100px; }
  .poster-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
  .rank-card__copy p { display: none; }
  .rank-card__body { padding: 9px; }
  .page-footer { flex-direction: column; }
  .history-item { align-items: flex-start; }
  .history-item time { display: none; }
}

@media (max-width: 430px) {
  .metric-strip { grid-template-columns: 1fr 1fr; }
  .metric-card small { white-space: normal; }
  .toolbar-actions .v-btn { flex: 1 1 calc(50% - 8px); }
}
</style>
