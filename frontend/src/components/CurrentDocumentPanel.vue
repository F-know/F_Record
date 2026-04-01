<template>
  <el-card shadow="never" class="card">
    <template #header>
      <div class="cardHeader">
        <div class="cardTitle">{{ t('currentDoc.title') }}</div>
        <div class="cardHeaderRight"></div>
      </div>
    </template>

    <el-alert
      v-if="errorText"
      type="error"
      :title="errorText"
      show-icon
      :closable="false"
      style="margin-bottom: 12px"
    />

    <el-empty v-if="!info || info.currentDocumentId === null" :description="t('currentDoc.noDocumentOpen')" />

    <el-descriptions v-else :column="1" border>
      <el-descriptions-item :label="t('currentDoc.currentDocumentId')">{{ info.currentDocumentId }}</el-descriptions-item>
      <el-descriptions-item :label="t('currentDoc.currentDocumentUid')">{{ info.currentDocumentUid }}</el-descriptions-item>
      <el-descriptions-item :label="t('currentDoc.pendingTimeSpentSeconds')">{{ info.pendingTimeSpentSeconds ?? 0 }}</el-descriptions-item>
      <el-descriptions-item :label="t('currentDoc.filePath')">{{ info.document?.filePath ?? '-' }}</el-descriptions-item>
      <el-descriptions-item :label="t('currentDoc.processImageCount')">{{ info.document?.processImageCount ?? 0 }}</el-descriptions-item>
      <el-descriptions-item :label="t('currentDoc.timeSpentMinutes')">{{ info.document?.timeSpent ?? 0 }}</el-descriptions-item>
      <el-descriptions-item :label="t('currentDoc.creationTime')">{{ formatTime(info.document?.creationTime) }}</el-descriptions-item>
      <el-descriptions-item :label="t('currentDoc.lastChangedTime')">{{ formatTime(info.document?.lastChangedTime) }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CurrentDocumentInfoResponse } from '../api/document'
import { fetchCurrentDocumentInfo } from '../api/document'

const { t } = useI18n()

const POLL_INTERVAL_MS = 1000

const loading = ref(false)
const errorText = ref('')
const info = ref<CurrentDocumentInfoResponse | null>(null)
let timer: number | null = null

function formatTime(ts?: number | null) {
  if (!ts) return '-'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function reload() {
  if (loading.value) return
  loading.value = true
  errorText.value = ''
  try {
    info.value = await fetchCurrentDocumentInfo()
  } catch (err: any) {
    errorText.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function startPolling() {
  stopPolling()
  timer = window.setInterval(() => {
    reload()
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

onMounted(async () => {
  await reload()
  startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
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
}

.cardTitle {
  font-weight: 700;
}
</style>

