<template>
  <el-container class="appRoot">
    <el-header class="appHeader">
      <div class="headerLeft">
        <div class="title">{{ t('app.title') }}</div>
        <el-tag :type="statusTagType" effect="dark">{{ statusText }}</el-tag>
      </div>
      <div class="headerRight">
        <el-button @click="logPanelVisible = true">
          <span class="logButtonContent">
            <span class="logButtonIcon" aria-hidden="true"></span>
            <span>{{ t('logs.title') }}</span>
          </span>
        </el-button>
        <el-tag type="info" effect="plain">API: /api</el-tag>
      </div>
    </el-header>

    <el-main>
      <el-row :gutter="12">
        <el-col :xs="24" :lg="12">
          <ConfigPanel />
        </el-col>
        <el-col :xs="24" :lg="12">
          <CurrentDocumentPanel />
        </el-col>
      </el-row>

      <div style="margin-top: 12px">
        <DocumentListPanel />
      </div>

      <div style="margin-top: 12px">
        <TimelapseTaskPanel />
      </div>

    </el-main>
  </el-container>

  <el-dialog v-model="logPanelVisible" :title="t('logs.title')" width="90%" top="4vh" destroy-on-close>
    <LogPanel :show-header="false" />
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfigPanel from './components/ConfigPanel.vue'
import CurrentDocumentPanel from './components/CurrentDocumentPanel.vue'
import DocumentListPanel from './components/DocumentListPanel.vue'
import LogPanel from './components/LogPanel.vue'
import TimelapseTaskPanel from './components/TimelapseTaskPanel.vue'

const { t } = useI18n()

const POLL_INTERVAL_MS = 5000
const HEALTH_TIMEOUT_MS = 2500

type PluginStatus = 'unknown' | 'running' | 'disconnected'
const pluginStatus = ref<PluginStatus>('unknown')
const logPanelVisible = ref(false)
let timer: number | null = null
let hasNotifiedDisconnected = false
let titleBlinkTimer: number | null = null
let initialTitle = ''
let hasNotifiedReconnected = false

const statusText = computed(() => {
  if (pluginStatus.value === 'running') return t('app.pluginStatusRunning')
  if (pluginStatus.value === 'disconnected') return t('app.pluginStatusDisconnected')
  return '...'
})

const statusTagType = computed(() => {
  if (pluginStatus.value === 'running') return 'success'
  if (pluginStatus.value === 'disconnected') return 'danger'
  return 'info'
})

function startTitleBlink() {
  if (titleBlinkTimer) return
  const a = `[${t('app.pluginStatusDisconnected')}] ${initialTitle || t('app.title')}`
  const b = `${initialTitle || t('app.title')}`
  let flip = false
  titleBlinkTimer = window.setInterval(() => {
    flip = !flip
    document.title = flip ? a : b
  }, 1000)
}

function stopTitleBlink() {
  if (!titleBlinkTimer) return
  window.clearInterval(titleBlinkTimer)
  titleBlinkTimer = null
  document.title = initialTitle || t('app.title')
}

async function notifySystemDisconnectedOnce() {
  // 系统通知（Windows 会在任务栏/通知中心体现），需要用户授权
  const n: any = (window as any).Notification
  if (!n) return

  if (n.permission === 'default') {
    // 某些浏览器可能要求“用户手势”才能弹授权框；失败就静默降级
    try {
      await n.requestPermission()
    } catch {
      return
    }
  }

  if (n.permission !== 'granted') return

  try {
    new n(t('app.pluginDisconnectedTitle'), { body: t('app.pluginDisconnectedMessage') })
  } catch {
    // ignore
  }
}

async function notifySystemReconnectedOnce() {
  const n: any = (window as any).Notification
  if (!n) return
  if (n.permission !== 'granted') return
  try {
    new n(t('app.pluginReconnectedTitle'), { body: t('app.pluginReconnectedMessage') })
  } catch {
    // ignore
  }
}

async function checkHealthOnce(): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
  try {
    const res = await fetch('/health', { method: 'GET', cache: 'no-store', signal: controller.signal })
    if (!res.ok) return false
    const data = await res.json().catch(() => null)
    return !!(data && data.ok === true)
  } catch {
    return false
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function pollHealth() {
  const ok = await checkHealthOnce()
  const prev = pluginStatus.value

  if (ok) {
    pluginStatus.value = 'running'
    stopTitleBlink()
    if (prev === 'disconnected' && !hasNotifiedReconnected) {
      hasNotifiedReconnected = true
      notifySystemReconnectedOnce()
    }
    hasNotifiedDisconnected = false
    return
  }

  pluginStatus.value = 'disconnected'
  startTitleBlink()
  if (!hasNotifiedDisconnected && prev !== 'disconnected') {
    hasNotifiedDisconnected = true
    hasNotifiedReconnected = false
    notifySystemDisconnectedOnce()
  }
}

onMounted(() => {
  initialTitle = document.title || t('app.title')
  pollHealth()
  timer = window.setInterval(() => {
    pollHealth()
  }, POLL_INTERVAL_MS)

  window.addEventListener('focus', stopTitleBlink)
})

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
  stopTitleBlink()
  window.removeEventListener('focus', stopTitleBlink)
})
</script>

<style scoped>
.appRoot {
  min-height: 100vh;
}

.appHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
}

.headerLeft {
  display: flex;
  gap: 8px;
  align-items: center;
}

.title {
  font-weight: 700;
}

.headerRight {
  display: flex;
  gap: 8px;
  align-items: center;
}

.logButtonContent {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.logButtonIcon {
  width: 14px;
  height: 14px;
  display: inline-block;
  border: 1px solid currentColor;
  border-radius: 2px;
  position: relative;
  box-sizing: border-box;
}

.logButtonIcon::before,
.logButtonIcon::after {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  height: 1px;
  background: currentColor;
}

.logButtonIcon::before {
  top: 4px;
}

.logButtonIcon::after {
  top: 8px;
}
</style>
