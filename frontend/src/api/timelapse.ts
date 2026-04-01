import { requestJson } from './http'

export type TimelapseJob = {
  id: string
  uid: string
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled'
  phase: 'queued' | 'scanningFrames' | 'planningVisualGuide' | 'encoding' | 'success' | 'failed' | 'cancelled'
  createdTime: number
  startedTime: number | null
  finishedTime: number | null
  fps: number
  visualGuideEnabled: boolean
  frameCount: number
  progressFrames: number
  progressRatio: number
  inputDir: string
  outputFilePath: string
  outputWidth: number | null
  outputHeight: number | null
  deletedBrokenFrameCount: number
  guideSegmentCount: number
  errorMessage: string | null
  logLines: string[]
  pid: number | null
}

export type TimelapseExportOptions = {
  fps: number
  enableVisualGuide: boolean
}

export async function createTimelapseExportJob(uid: string, options: TimelapseExportOptions): Promise<{ ok: boolean; job: TimelapseJob }> {
  return requestJson<{ ok: boolean; job: TimelapseJob }>(`/api/timelapse/export`, {
    method: 'POST',
    body: JSON.stringify({ uid, options }),
  })
}

export async function fetchTimelapseJobs(): Promise<{ items: TimelapseJob[] }> {
  return requestJson<{ items: TimelapseJob[] }>(`/api/timelapse/jobs`, { method: 'GET' })
}

export async function openTimelapseOutputFolder(jobId: string): Promise<{ ok: boolean; path: string }> {
  return requestJson<{ ok: boolean; path: string }>(`/api/timelapse/openOutputFolder`, {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  })
}

