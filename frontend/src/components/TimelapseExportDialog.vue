<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('timelapse.exportDialogTitle')"
    width="520px"
    @close="onClose"
  >
    <el-alert
      v-if="errorText"
      type="error"
      :title="errorText"
      show-icon
      :closable="false"
      style="margin-bottom: 12px"
    />

    <el-form label-width="180px" :model="form" :disabled="loading || submitting">
      <el-form-item :label="t('timelapse.uid')">
        <el-input :model-value="uid" readonly />
      </el-form-item>
      <el-form-item :label="t('timelapse.fps')">
        <el-input-number v-model="form.fps" :min="1" :step="1" />
      </el-form-item>
      <el-form-item :label="t('timelapse.enableVisualGuide')">
        <el-switch v-model="form.enableVisualGuide" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="onClose">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">{{ t('timelapse.startExport') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { fetchConfig, patchConfig } from '../api/config'
import { createTimelapseExportJob } from '../api/timelapse'

const props = defineProps<{
  modelValue: boolean
  uid: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const { t } = useI18n()

const loading = ref(false)
const submitting = ref(false)
const errorText = ref('')

const form = reactive({
  fps: 30,
  enableVisualGuide: false,
})

async function loadDefaults() {
  if (!props.modelValue) return
  loading.value = true
  errorText.value = ''
  try {
    const res = await fetchConfig()
    form.fps = Math.max(1, Math.trunc(Number(res.config.timelapse?.defaultFps) || 30))
    form.enableVisualGuide = !!res.config.timelapse?.enableVisualGuide
  } catch (err: any) {
    errorText.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function onClose() {
  emit('update:modelValue', false)
}

async function onSubmit() {
  if (!props.uid) return

  const fps = Math.max(1, Math.trunc(Number(form.fps) || 30))
  const enableVisualGuide = !!form.enableVisualGuide

  submitting.value = true
  errorText.value = ''
  try {
    await patchConfig({
      timelapse: {
        defaultFps: fps,
        enableVisualGuide,
      },
    })
    await createTimelapseExportJob(props.uid, {
      fps,
      enableVisualGuide,
    })
    ElMessage.success('OK')
    emit('success')
    emit('update:modelValue', false)
  } catch (err: any) {
    errorText.value = err?.message || '操作失败'
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      loadDefaults()
    } else {
      errorText.value = ''
    }
  }
)
</script>
