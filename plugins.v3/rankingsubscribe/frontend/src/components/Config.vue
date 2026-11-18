<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['save', 'close', 'switch'])

const sourceItems = [
  { title: 'TMDB', value: 'tmdb' },
  { title: '豆瓣', value: 'douban' },
  { title: '爱奇艺', value: 'iqiyi' },
  { title: '腾讯视频', value: 'tencent' },
  { title: '优酷', value: 'youku' },
  { title: '芒果TV', value: 'mango' },
]

const typeItems = [
  { title: '电影', value: 'movie' },
  { title: '电视剧', value: 'tv' },
  { title: '综艺', value: 'variety' },
  { title: '动漫', value: 'anime' },
]

const form = reactive({
  enabled: false,
  dry_run: false,
  notify: false,
  skip_existing_library: true,
  cron: '0 */6 * * *',
  api_base: 'https://pan.qbb365.xyz/rank-api',
  auto_sources: [],
  auto_types: ['variety', 'anime'],
  rank_limit: 20,
  min_score: 0,
  max_new_per_run: 40,
  username: '榜单自动订阅',
})

function applyConfig(next) {
  const data = next || {}
  form.enabled = Boolean(data.enabled)
  form.dry_run = Boolean(data.dry_run)
  form.notify = Boolean(data.notify)
  form.skip_existing_library = data.skip_existing_library !== false
  form.cron = data.cron || '0 */6 * * *'
  form.api_base = data.api_base || 'https://pan.qbb365.xyz/rank-api'
  form.auto_sources = Array.isArray(data.auto_sources)
    ? [...data.auto_sources]
    : sourceItems.map(item => item.value)
  form.auto_types = Array.isArray(data.auto_types)
    ? [...data.auto_types]
    : ['variety', 'anime']
  form.rank_limit = Number(data.rank_limit || 20)
  form.min_score = Number(data.min_score || 0)
  form.max_new_per_run = Number(data.max_new_per_run || 40)
  form.username = data.username || '榜单自动订阅'
}

watch(
  () => props.initialConfig,
  next => applyConfig(next),
  { immediate: true, deep: true },
)

function save() {
  emit('save', {
    enabled: form.enabled,
    dry_run: form.dry_run,
    notify: form.notify,
    skip_existing_library: form.skip_existing_library,
    cron: form.cron.trim(),
    api_base: form.api_base.trim(),
    auto_sources: [...form.auto_sources],
    auto_types: [...form.auto_types],
    rank_limit: Number(form.rank_limit),
    min_score: Number(form.min_score),
    max_new_per_run: Number(form.max_new_per_run),
    username: form.username.trim(),
  })
}
</script>

<template>
  <div class="rank-config">
    <section class="config-intro">
      <div class="config-intro__icon">
        <v-icon icon="mdi-tune-variant" size="25" />
      </div>
      <div>
        <h3>自动订阅规则</h3>
        <p>定时读取榜单，逐条识别并调用 MoviePilot 原生订阅；已订阅和已入库条目会自动跳过。</p>
      </div>
    </section>

    <v-row dense>
      <v-col cols="12" md="6">
        <v-switch v-model="form.enabled" color="primary" label="启用定时自动订阅" hide-details />
      </v-col>
      <v-col cols="12" md="6">
        <v-switch v-model="form.dry_run" color="info" label="自动任务只演练，不真正创建订阅" hide-details />
      </v-col>
      <v-col cols="12" md="6">
        <v-switch v-model="form.skip_existing_library" color="primary" label="跳过媒体库中已有的影片" hide-details />
      </v-col>
      <v-col cols="12" md="6">
        <v-switch v-model="form.notify" color="primary" label="运行完成后发送 MoviePilot 通知" hide-details />
      </v-col>
    </v-row>

    <v-text-field
      v-model="form.api_base"
      label="榜单 API 地址"
      variant="outlined"
      density="comfortable"
      prepend-inner-icon="mdi-api"
      hint="填写到 /rank-api 这一层，插件会自动请求 /api/v1 下的 JSON 接口"
      persistent-hint
    />

    <v-select
      v-model="form.auto_sources"
      :items="sourceItems"
      item-title="title"
      item-value="value"
      label="自动订阅来源"
      chips
      multiple
      closable-chips
      variant="outlined"
      density="comfortable"
      hint="留空会停用自动订阅；建议保留全部来源，同一影片会在 MP 内自动去重"
      persistent-hint
    />

    <v-select
      v-model="form.auto_types"
      :items="typeItems"
      item-title="title"
      item-value="value"
      label="自动订阅类型"
      chips
      multiple
      closable-chips
      variant="outlined"
      density="comfortable"
    />

    <v-row dense>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="form.cron"
          label="执行周期"
          variant="outlined"
          density="compact"
          placeholder="0 */6 * * *"
          hint="5 位 Cron；默认每 6 小时"
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="form.rank_limit"
          type="number"
          min="1"
          max="50"
          label="每个来源取前 N 部"
          variant="outlined"
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="form.max_new_per_run"
          type="number"
          min="1"
          max="200"
          label="每次最多处理 N 部"
          variant="outlined"
          density="compact"
          hint="避免首次运行同时触发大量 TMDB 查询"
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model.number="form.min_score"
          type="number"
          min="0"
          max="10"
          step="0.1"
          label="最低榜单评分"
          variant="outlined"
          density="compact"
          hint="0 表示不限；无评分条目在设置阈值后会被跳过"
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="8">
        <v-text-field
          v-model="form.username"
          label="订阅归属名称"
          variant="outlined"
          density="compact"
          hint="写入 MoviePilot 订阅的 username 字段，便于筛选来源"
          persistent-hint
        />
      </v-col>
    </v-row>

    <v-alert type="info" variant="tonal" density="compact" class="mt-3">
      自动任务会先按评分筛选，再通过 TMDB/豆瓣身份或标题识别；同一影片即使出现在多个榜单，也只会保留一条 MoviePilot
      订阅。手动点击始终执行真实订阅，不受“仅演练”开关影响。
    </v-alert>

    <div class="config-actions">
      <v-btn variant="text" @click="emit('close')">关闭</v-btn>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save" @click="save">保存配置</v-btn>
    </div>
  </div>
</template>

<style scoped>
.rank-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-intro {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-primary), 0.14);
  border-radius: 16px;
  background: linear-gradient(120deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-surface), 0.82));
  gap: 12px;
}

.config-intro__icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 13px;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  place-items: center;
}

.config-intro h3,
.config-intro p {
  margin: 0;
}

.config-intro h3 {
  font-size: 16px;
  font-weight: 700;
}

.config-intro p {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 12px;
  line-height: 1.6;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
