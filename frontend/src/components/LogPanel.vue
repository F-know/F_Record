<template>
  <el-card shadow="never" class="card">
    <template v-if="showHeader" #header>
      <div class="cardHeader">
        <div class="cardTitle">{{ t('logs.title') }}</div>
        <div class="cardHeaderRight">
          <el-tag :type="connectionStatus === 'connected' ? 'success' : 'danger'" effect="plain">
            {{ connectionStatus === 'connected' ? t('logs.connectionConnected') : t('logs.connectionDisconnected') }}
          </el-tag>
          <el-tag v-if="logFilePath" type="info" effect="plain">{{ t('logs.logFilePath') }}：{{ logFilePath }}</el-tag>
          <el-select v-model="levelFilter" style="width: 140px">
            <el-option :label="t('logs.all')" value="all" />
            <el-option label="INFO" value="info" />
            <el-option label="WARN" value="warn" />
            <el-option label="ERROR" value="error" />
          </el-select>
          <el-switch v-model="autoScroll" :active-text="t('logs.autoScroll')" />
          <el-button :loading="loadingHistory" @click="loadHistory">{{ t('logs.reloadHistory') }}</el-button>
          <el-button @click="clearView">{{ t('logs.clearView') }}</el-button>
        </div>
      </div>
    </template>

    <div ref="listRef" class="logList">
      <div v-if="filteredItems.length === 0" class="emptyText">{{ t('logs.empty') }}</div>
      <div v-for="item in filteredItems" :key="item.seq" class="logItem" :class="`level-${item.level}`">
        <div class="logMeta">
          <span>{{ formatTime(item.time) }}</span>
          <span class="logLevel">{{ item.level.toUpperCase() }}</span>
          <span class="logTag">{{ item.tag }}</span>
        </div>
        <pre class="logMessage">{{ item.message }}</pre>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LogEntry, LogLevel } from '../api/log'
import { createLogsEventSource, fetchLogs } from '../api/log'

withDefaults(
  defineProps<{
    showHeader?: boolean
  }>(),
  {
    showHeader: true,
  },
)

const { t } = useI18n()

const MAX_VISIBLE_LOGS = 500

const loadingHistory = ref(false)
const connectionStatus = ref<'connected' | 'disconnected'>('disconnected')
const autoScroll = ref(true)
const levelFilter = ref<'all' | LogLevel>('all')
const items = ref<LogEntry[]>([])
const logFilePath = ref('')
const listRef = ref<HTMLElement | null>(null)

let eventSource: EventSource | null = null
let lastSeq = 0

const filteredItems = computed(() => {
  if (levelFilter.value === 'all') return items.value
  return items.value.filter((item) => item.level === levelFilter.value)
})

function formatTime(ts: number) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function appendEntries(nextItems: LogEntry[]) {
  if (!nextItems.length) return

  const merged = items.value.slice()
  for (let i = 0; i < nextItems.length; i += 1) {
    const item = nextItems[i]
    if (item.seq <= lastSeq) continue
    merged.push(item)
    lastSeq = item.seq
  }

  if (merged.length > MAX_VISIBLE_LOGS) {
    merged.splice(0, merged.length - MAX_VISIBLE_LOGS)
  }
  items.value = merged
  scrollToBottomIfNeeded()
}

function scrollToBottomIfNeeded() {
  if (!autoScroll.value) return
  nextTick(() => {
    const el = listRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  })
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    const res = await fetchLogs(200)
    items.value = res.items || []
    logFilePath.value = res.logFilePath || ''
    lastSeq = items.value.length ? items.value[items.value.length - 1].seq : res.nextSeq - 1
    scrollToBottomIfNeeded()
    reconnectStream()
  } finally {
    loadingHistory.value = false
  }
}

function clearView() {
  items.value = []
}

function reconnectStream() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }

  eventSource = createLogsEventSource(lastSeq)
  eventSource.addEventListener('log', (event) => {
    const payload = JSON.parse((event as MessageEvent).data) as LogEntry
    connectionStatus.value = 'connected'
    appendEntries([payload])
  })
  eventSource.onopen = () => {
    connectionStatus.value = 'connected'
  }
  eventSource.onerror = () => {
    connectionStatus.value = 'disconnected'
  }
}

onMounted(() => {
  loadHistory()
})

onBeforeUnmount(() => {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
})
</script>

<style scoped>
.card {
  border-radius: 10px;
}

.cardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cardHeaderRight {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cardTitle {
  font-weight: 700;
}

.logList {
  max-height: 420px;
  overflow: auto;
  background: #111827;
  color: #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  font-family: Consolas, 'Courier New', monospace;
}

.logItem + .logItem {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.logMeta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.logLevel {
  font-weight: 700;
}

.logTag {
  color: #93c5fd;
}

.logMessage {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

.level-info .logLevel {
  color: #93c5fd;
}

.level-warn .logLevel {
  color: #fbbf24;
}

.level-error .logLevel {
  color: #f87171;
}

.emptyText {
  color: rgba(255, 255, 255, 0.7);
}
</style>

