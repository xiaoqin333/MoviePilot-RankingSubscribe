<script setup>
import RankingPage from './RankingPage.vue'

defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'RankingSubscribe' },
  navKey: { type: String, default: 'main' },
  config: { type: Object, default: () => ({}) },
})

defineEmits(['action', 'switch', 'close'])
</script>

<template>
  <RankingPage
    :api="api"
    :plugin-id="pluginId"
    :nav-key="navKey"
    :config="config"
    @action="$emit('action')"
    @switch="$emit('switch')"
    @close="$emit('close')"
  />
</template>
