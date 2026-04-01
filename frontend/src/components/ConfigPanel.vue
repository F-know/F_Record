<template>
  <el-card shadow="never" class="card">
    <template #header>
      <div class="cardHeader">
        <div class="cardTitle">{{ t('config.title') }}</div>
        <div class="cardHeaderRight">
          <el-tag v-if="configPath" type="info" effect="plain">{{ t('config.configPath') }}：{{ configPath }}</el-tag>
          <el-tag v-if="version !== null" type="success" effect="plain">{{ t('config.version') }}：v{{ version }}</el-tag>
          <el-tag v-if="updating" type="warning" effect="plain">{{ t('common.updating') }}</el-tag>
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

    <el-form label-width="220px" :model="form" :disabled="loading || updating">
      <el-form-item :label="t('config.isEnabled')">
        <el-switch v-model="form.isEnabled" @change="(v: boolean) => onFieldChange('isEnabled', v)" />
      </el-form-item>

      <el-form-item :label="t('config.processImageFolderPath')">
        <div class="rowGap">
          <el-input v-model="form.processImageFolderPath" placeholder="processImageFolderPath" readonly style="width: 520px" />
          <el-button :disabled="loading || updating" @click="openFolderPicker">{{ t('config.selectFolder') }}</el-button>
        </div>
      </el-form-item>

      <el-form-item :label="t('config.ignoredLayerNamePattern')">
        <el-input
          v-model="form.ignoredLayerNamePattern"
          placeholder="ignoredLayerNamePattern"
          style="width: 520px"
          @change="(v: string) => onFieldChange('ignoredLayerNamePattern', v)"
        />
      </el-form-item>

      <el-form-item :label="t('config.processImageResolution')">
        <el-input-number
          v-model="form.processImageResolution"
          :min="1"
          :step="1"
          @change="(v: number) => onFieldChange('processImageResolution', v)"
        />
      </el-form-item>

      <el-form-item :label="t('config.processImageQuality')">
        <el-input-number
          v-model="form.processImageQuality"
          :min="1"
          :max="100"
          :step="1"
          @change="(v: number) => onFieldChange('processImageQuality', v)"
        />
      </el-form-item>

      <el-form-item :label="t('config.minSaveIntervalSeconds')">
        <el-input-number
          v-model="form.minSaveIntervalSeconds"
          :min="0"
          :step="1"
          @change="(v: number) => onFieldChange('minSaveIntervalSeconds', v)"
        />
      </el-form-item>

      <el-form-item :label="t('config.idleTimeoutMinutes')">
        <el-input-number v-model="form.idleTimeout" :min="0" :step="1" @change="(v: number) => onFieldChange('idleTimeout', v)" />
      </el-form-item>

      <el-form-item :label="t('config.language')">
        <el-select v-model="uiLocale" style="width: 220px" @change="onLocaleChange">
          <el-option :label="t('language.en')" value="en" />
          <el-option :label="t('language.zh')" value="zh" />
          <el-option :label="t('language.ja')" value="ja" />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('config.openUi')">
        <el-switch v-model="form.openUi" @change="(v: boolean) => onFieldChange('openUi', v)" />
        <el-text type="info" style="margin-left: 8px">{{ t('config.openUiHint') }}</el-text>
      </el-form-item>
    </el-form>

    <el-dialog v-model="folderPickerVisible" :title="t('config.folderPickerTitle')" width="720px">
      <el-alert
        type="info"
        :title="t('config.processImageFolderPath') + '：' + (browsePath || t('config.roots'))"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />

      <div style="display: flex; gap: 8px; margin-bottom: 12px">
        <el-button :disabled="!browsePath || folderLoading" @click="goUpOneLevel">{{ t('config.upOneLevel') }}</el-button>
        <el-button type="primary" :disabled="!browsePath || folderLoading" @click="chooseCurrentFolder">
          {{ t('config.chooseCurrentFolder') }}
        </el-button>
      </div>

      <el-table :data="browseItems" size="small" style="width: 100%" :loading="folderLoading" @row-click="onRowClick">
        <el-table-column prop="name" label="name" min-width="240" />
        <el-table-column prop="path" label="path" min-width="360" show-overflow-tooltip />
      </el-table>

      <template #footer>
        <el-button @click="folderPickerVisible = false">{{ t('common.cancel') }}</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { BusinessConfig } from '../api/config'
import { fetchConfig, setConfigByPath } from '../api/config'
import { configLanguageFromUiLocale, uiLocaleFromConfigLanguage, type UiLocale } from '../i18n'
import type { FsDirEntry, FsRoot } from '../api/fs'
import { fetchFsList, fetchFsRoots } from '../api/fs'

const { t, locale } = useI18n()

const loading = ref(false)
const updating = ref(false)
const errorText = ref('')
const configPath = ref('')
const version = ref<number | null>(null)
const lastServerConfig = ref<BusinessConfig | null>(null)

const uiLocale = ref<UiLocale>('en')

const folderPickerVisible = ref(false)
const folderLoading = ref(false)
const browsePath = ref<string | null>(null)
const browseItems = ref<Array<FsRoot | FsDirEntry>>([])

const form = reactive<BusinessConfig>({
  isEnabled: false,
  processImageFolderPath: '',
  ignoredLayerNamePattern: '-ignore$',
  processImageResolution: 1080,
  processImageQuality: 70,
  minSaveIntervalSeconds: 0,
  idleTimeout: 1,
  language: 'en',
  openUi: true,
  timelapse: {
    defaultFps: 30,
    enableVisualGuide: false,
  },
})

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

async function reload() {
  loading.value = true
  errorText.value = ''
  try {
    const res = await fetchConfig()
    configPath.value = res.configPath
    version.value = res.version
    Object.assign(form, res.config)
    lastServerConfig.value = cloneJson(res.config)

    uiLocale.value = uiLocaleFromConfigLanguage(res.config.language)
    locale.value = uiLocale.value
  } catch (err: any) {
    errorText.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onFieldChange<K extends keyof BusinessConfig>(key: K, value: BusinessConfig[K]) {
  const snapshot = lastServerConfig.value
  if (snapshot && snapshot[key] === value) return

  updating.value = true
  errorText.value = ''
  try {
    const next = await setConfigByPath(key, value)
    Object.assign(form, next)
    lastServerConfig.value = cloneJson(next)
    ElMessage.success('OK')
  } catch (err: any) {
    errorText.value = err?.message || '更新失败'
    if (snapshot) Object.assign(form, snapshot)
  } finally {
    updating.value = false
  }
}

async function onLocaleChange(next: UiLocale) {
  locale.value = next
  const configLang = configLanguageFromUiLocale(next)
  form.language = configLang
  await onFieldChange('language', configLang)
}

async function loadRoots() {
  folderLoading.value = true
  try {
    browsePath.value = null
    const res = await fetchFsRoots()
    browseItems.value = res.roots || []
  } finally {
    folderLoading.value = false
  }
}

async function loadDirs(p: string) {
  folderLoading.value = true
  try {
    const res = await fetchFsList(p)
    browsePath.value = res.path
    browseItems.value = res.dirs || []
  } finally {
    folderLoading.value = false
  }
}

function openFolderPicker() {
  folderPickerVisible.value = true
  loadRoots()
}

function onRowClick(row: any) {
  if (!row || !row.path) return
  loadDirs(String(row.path))
}

function goUpOneLevel() {
  const p = browsePath.value
  if (!p) return
  const normalized = String(p).replace(/[\\/]+$/, '')
  const idx = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  if (idx <= 0) return loadRoots()
  const parent = normalized.slice(0, idx + 1)
  loadDirs(parent)
}

async function chooseCurrentFolder() {
  const p = browsePath.value
  if (!p) return
  folderPickerVisible.value = false
  await onFieldChange('processImageFolderPath', p)
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

.rowGap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

