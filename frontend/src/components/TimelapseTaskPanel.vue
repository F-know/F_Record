<template>
  <el-card shadow="never" class="card">
    <template #header>
      <div class="cardHeader">
        <div class="cardTitle">{{ t('timelapse.title') }}</div>
        <div class="cardHeaderRight">
          <el-button :loading="loading" @click="reload">{{ t('timelapse.refresh') }}</el-button>
        </div>
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

    <el-empty v-if="items.length === 0 && !loading" :description="t('timelapse.empty')" />

    <el-table v-else :data="items" size="small" style="width: 100%" :loading="loading">
      <el-table-column prop="uid" :label="t('timelapse.uid')" width="220" />
      <el-table-column :label="t('timelapse.status')" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" effect="plain">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="t('timelapse.phase')" width="150">
        <template #default="{ row }">
          <el-tag type="info" effect="plain">{{ phaseText(row.phase) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="fps" :label="t('timelapse.fps')" width="80" />
      <el-table-column :label="t('timelapse.visualGuide')" width="120">
        <template #default="{ row }">{{ row.visualGuideEnabled ? t('common.yes') : t('common.no') }}</template>
      </el-table-column>
      <el-table-column prop="frameCount" :label="t('timelapse.frameCount')" width="100" />
      <el-table-column :label="t('timelapse.outputSize')" width="120">
        <template #default="{ row }">{{ row.outputWidth && row.outputHeight ? `${row.outputWidth}x${row.outputHeight}` : '-' }}</template>
      </el-table-column>
      <el-table-column prop="deletedBrokenFrameCount" :label="t('timelapse.deletedBrokenFrameCount')" width="130" />
      <el-table-column prop="guideSegmentCount" :label="t('timelapse.guideSegmentCount')" width="120" />
      <el-table-column :label="t('timelapse.progress')" width="180">
        <template #default="{ row }">
          <el-progress :percentage="Math.round((row.progressRatio || 0) * 100)" :stroke-width="14" />
        </template>
      </el-table-column>
      <el-table-column prop="outputFilePath" :label="t('timelapse.outputFilePath')" min-width="320" show-overflow-tooltip />
      <el-table-column :label="t('timelapse.createdTime')" width="190">
        <template #default="{ row }">{{ formatTime(row.createdTime) }}</template>
      </el-table-column>
      <el-table-column :label="t('timelapse.finishedTime')" width="190">
        <template #default="{ row }">{{ formatTime(row.finishedTime) }}</template>
      </el-table-column>
      <el-table-column :label="t('timelapse.errorMessage')" min-width="260" show-overflow-tooltip>
        <template #default="{ row }">{{ row.errorMessage || '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('timelapse.actions')" width="170" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            :disabled="row.status !== 'success'"
            @click="onOpenOutputFolder(row.id)"
          >
            {{ t('timelapse.openOutputFolder') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-collapse v-if="items.length > 0" style="margin-top: 12px">
      <el-collapse-item v-for="item in items" :key="item.id" :title="`${item.uid} | ${statusText(item.status)}`" :name="item.id">
        <div class="jobLogBlockTitle">{{ t('timelapse.recentLogs') }}</div>
        <pre class="jobLogBlock">{{ item.logLines && item.logLines.length ? item.logLines.join('\n') : '-' }}</pre>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TimelapseJob } from '../api/timelapse'
import { fetchTimelapseJobs, openTimelapseOutputFolder } from '../api/timelapse'

const { t } = useI18n()

const loading = ref(false)
const errorText = ref('')
const items = ref<TimelapseJob[]>([])
let timer: number | null = null

function formatTime(ts?: number | null) {
  if (!ts) return '-'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function statusText(status: TimelapseJob['status']) {
  return t(`timelapse.${status}`)
}

function statusTagType(status: TimelapseJob['status']) {
  if (status === 'success') return 'success'
  if (status === 'failed' || status === 'cancelled') return 'danger'
  if (status === 'running') return 'warning'
  return 'info'
}

function phaseText(phase: TimelapseJob['phase']) {
  const phaseMap: Record<TimelapseJob['phase'], string> = {
    queued: t('timelapse.phaseQueued'),
    scanningFrames: t('timelapse.phaseScanningFrames'),
    planningVisualGuide: t('timelapse.phasePlanningVisualGuide'),
    encoding: t('timelapse.phaseEncoding'),
    success: t('timelapse.phaseSuccess'),
    failed: t('timelapse.phaseFailed'),
    cancelled: t('timelapse.phaseCancelled'),
  }
  return phaseMap[phase] || phase
}

async function reload() {
  if (loading.value) return
  loading.value = true
  errorText.value = ''
  try {
    const res = await fetchTimelapseJobs()
    items.value = res.items || []
  } catch (err: any) {
    errorText.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onOpenOutputFolder(jobId: string) {
  try {
    await openTimelapseOutputFolder(jobId)
    ElMessage.success('OK')
  } catch (err: any) {
    errorText.value = err?.message || '操作失败'
  }
}

onMounted(() => {
  reload()
  timer = window.setInterval(() => {
    reload()
  }, 2000)
})

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
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
}

.cardTitle {
  font-weight: 700;
}

.jobLogBlockTitle {
  font-weight: 600;
  margin-bottom: 8px;
}

.jobLogBlock {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: #111827;
  color: #e5e7eb;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: Consolas, 'Courier New', monospace;
}
</style>

