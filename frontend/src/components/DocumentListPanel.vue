<template>
  <el-card shadow="never" class="card">
    <template #header>
      <div class="cardHeader">
        <div class="cardTitle">{{ t('list.title') }}</div>
        <div class="cardHeaderRight">
          <el-tag type="info" effect="plain">{{ t('list.total') }}: {{ total }}</el-tag>
          <el-button :loading="loading" @click="onRefresh">{{ t('common.refresh') }}</el-button>
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

    <el-form :inline="true" :model="query" class="queryForm">
      <el-form-item :label="t('list.filePathLike')">
        <el-input v-model="query.filePathLike" :placeholder="t('list.fuzzyFilePath')" style="width: 240px" />
      </el-form-item>
      <el-form-item :label="t('list.uid')">
        <el-input v-model="query.uid" placeholder="uid" style="width: 240px" />
      </el-form-item>
      <el-form-item :label="t('list.sort')">
        <el-select v-model="query.orderBy" style="width: 240px">
          <el-option :label="t('list.updatedAt')" value="lastChangedTime" />
          <el-option :label="t('list.createdAt')" value="creationTime" />
          <el-option :label="t('list.filePath')" value="filePath" />
          <el-option :label="t('list.processImageCount')" value="processImageCount" />
          <el-option :label="t('list.timeSpent')" value="timeSpent" />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('list.dir')">
        <el-select v-model="query.orderDir" style="width: 120px">
          <el-option label="DESC" value="DESC" />
          <el-option label="ASC" value="ASC" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" @click="onSearch">{{ t('common.search') }}</el-button>
        <el-button :disabled="loading" @click="onReset">{{ t('common.reset') }}</el-button>
      </el-form-item>
    </el-form>

    <el-collapse style="margin-bottom: 12px">
      <el-collapse-item title="Range filters" name="range">
        <el-form :inline="true" :model="query" class="queryForm">
          <el-form-item label="creationTimeFrom">
            <el-input-number v-model="query.creationTimeFrom" :step="1" />
          </el-form-item>
          <el-form-item label="creationTimeTo">
            <el-input-number v-model="query.creationTimeTo" :step="1" />
          </el-form-item>
          <el-form-item label="lastChangedTimeFrom">
            <el-input-number v-model="query.lastChangedTimeFrom" :step="1" />
          </el-form-item>
          <el-form-item label="lastChangedTimeTo">
            <el-input-number v-model="query.lastChangedTimeTo" :step="1" />
          </el-form-item>
          <el-form-item label="processImageCountFrom">
            <el-input-number v-model="query.processImageCountFrom" :step="1" />
          </el-form-item>
          <el-form-item label="processImageCountTo">
            <el-input-number v-model="query.processImageCountTo" :step="1" />
          </el-form-item>
          <el-form-item label="timeSpentFrom">
            <el-input-number v-model="query.timeSpentFrom" :step="1" />
          </el-form-item>
          <el-form-item label="timeSpentTo">
            <el-input-number v-model="query.timeSpentTo" :step="1" />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>

    <el-table :data="items" size="small" style="width: 100%" :loading="loading">
      <el-table-column prop="uid" :label="t('list.uid')" width="220" />
      <el-table-column prop="filePath" :label="t('list.filePath')" min-width="300" show-overflow-tooltip />
      <el-table-column prop="processImageCount" :label="t('list.processImageCount')" width="170" />
      <el-table-column prop="timeSpent" :label="t('list.timeSpent')" width="150" />
      <el-table-column :label="t('list.createdAt')" width="190">
        <template #default="{ row }">{{ formatTime(row.creationTime) }}</template>
      </el-table-column>
      <el-table-column :label="t('list.updatedAt')" width="190">
        <template #default="{ row }">{{ formatTime(row.lastChangedTime) }}</template>
      </el-table-column>
      <el-table-column :label="t('list.actions')" width="220" fixed="right">
        <template #default="{ row }">
          <div class="actionButtons">
            <el-button link type="primary" @click="onOpenProcessImageFolder(row.uid)">
              {{ t('list.openProcessImageFolder') }}
            </el-button>
            <el-button link type="primary" @click="onExportTimelapse(row.uid)">
              {{ t('list.exportTimelapse') }}
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div class="paginationRow">
      <el-pagination
        background
        layout="prev, pager, next, sizes, total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        @current-change="onPageChange"
        @size-change="onPageSizeChange"
      />
    </div>
  </el-card>
  <TimelapseExportDialog
    v-model="exportDialogVisible"
    :uid="exportDialogUid"
    @success="errorText = ''"
  />
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DocumentInfoListQuery, DocumentInfoListResponse } from '../api/document'
import { fetchDocumentInfoList, openDocumentProcessImageFolder } from '../api/document'
import TimelapseExportDialog from './TimelapseExportDialog.vue'

const { t } = useI18n()

const loading = ref(false)
const errorText = ref('')
const items = ref<DocumentInfoListResponse['items']>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const exportDialogVisible = ref(false)
const exportDialogUid = ref('')

const query = reactive<DocumentInfoListQuery>({
  uid: '',
  filePathLike: '',
  orderBy: 'lastChangedTime',
  orderDir: 'DESC',
})

function formatTime(ts?: number | null) {
  if (!ts) return '-'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function reload() {
  await reloadWithQuery(query)
}

async function reloadWithQuery(q: DocumentInfoListQuery) {
  if (loading.value) return
  loading.value = true
  errorText.value = ''
  try {
    const res = await fetchDocumentInfoList({
      ...q,
      uid: q.uid ? String(q.uid).trim() : undefined,
      filePathLike: q.filePathLike ? String(q.filePathLike).trim() : undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    items.value = res.items
    total.value = res.total
  } catch (err: any) {
    errorText.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function onRefresh() {
  page.value = 1
  reloadWithQuery({})
}

function onSearch() {
  page.value = 1
  reload()
}

function onReset() {
  query.uid = ''
  query.filePathLike = ''
  query.orderBy = 'lastChangedTime'
  query.orderDir = 'DESC'
  query.creationTimeFrom = undefined
  query.creationTimeTo = undefined
  query.lastChangedTimeFrom = undefined
  query.lastChangedTimeTo = undefined
  query.processImageCountFrom = undefined
  query.processImageCountTo = undefined
  query.timeSpentFrom = undefined
  query.timeSpentTo = undefined
  page.value = 1
  pageSize.value = 20
  reload()
}

function onPageChange(next: number) {
  page.value = next
  reload()
}

function onPageSizeChange(next: number) {
  pageSize.value = next
  page.value = 1
  reload()
}

async function onOpenProcessImageFolder(uid: string) {
  try {
    await openDocumentProcessImageFolder(uid)
    ElMessage.success('OK')
  } catch (err: any) {
    errorText.value = err?.message || '操作失败'
  }
}

function onExportTimelapse(uid: string) {
  exportDialogUid.value = uid
  exportDialogVisible.value = true
}

onMounted(() => {
  reload()
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

.paginationRow {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.queryForm {
  margin-bottom: 12px;
}

.actionButtons {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.4;
}
</style>

