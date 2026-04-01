export type BusinessConfig = {
  isEnabled: boolean
  processImageFolderPath: string
  ignoredLayerNamePattern: string
  processImageResolution: number
  processImageQuality: number
  minSaveIntervalSeconds: number
  idleTimeout: number
  language: string
  openUi: boolean
  timelapse?: {
    defaultFps: number
    enableVisualGuide: boolean
  }
}

type GetConfigResponse = {
  config: BusinessConfig
  version: number
  configPath: string
}

import { requestJson } from './http'

export async function fetchConfig(): Promise<GetConfigResponse> {
  return requestJson<GetConfigResponse>(`/api/config`, { method: 'GET' })
}

export async function putConfig(config: BusinessConfig): Promise<BusinessConfig> {
  const res = await requestJson<{ ok: boolean; config: BusinessConfig }>(`/api/config`, {
    method: 'PUT',
    body: JSON.stringify(config),
  })
  return res.config
}

export async function patchConfig(patch: Partial<BusinessConfig>): Promise<BusinessConfig> {
  const res = await requestJson<{ ok: boolean; config: BusinessConfig }>(`/api/config`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.config
}

export async function setConfigByPath(path: keyof BusinessConfig | string, value: unknown): Promise<BusinessConfig> {
  const res = await requestJson<{ ok: boolean; config: BusinessConfig }>(`/api/config/set`, {
    method: 'POST',
    body: JSON.stringify({ path, value }),
  })
  return res.config
}

