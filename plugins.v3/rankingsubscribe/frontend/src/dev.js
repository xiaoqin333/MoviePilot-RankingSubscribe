import { createApp } from 'vue'
import RankingPage from './components/RankingPage.vue'

createApp(RankingPage, {
  api: {
    get: async () => ({ success: false, message: '开发预览未连接 MoviePilot' }),
    post: async () => ({ success: false, message: '开发预览未连接 MoviePilot' }),
    delete: async () => ({ success: false, message: '开发预览未连接 MoviePilot' }),
  },
  pluginId: 'RankingSubscribe',
}).mount('#app')
