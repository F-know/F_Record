import { requestJson } from './http'

export type LogLevel = 'info' | 'warn' | 'error'

export type LogEntry = {
  seq: number
  time: number
  level: LogLevel
  tag: string
  message: string
}

export type LogsResponse = {
  items: LogEntry[]
  nextSeq: number
  logFilePath?: string
}

export async function fetchLogs(limit = 200): Promise<LogsResponse> {
  const q = new URLSearchParams({ limit: String(limit) })
  return await requestJson<LogsResponse>(`/api/logs?${q.toString()}`)
}

export function createLogsEventSource(since?: number): EventSource {
  const q = new URLSearchParams()
  if (since !== undefined && Number.isFinite(since)) {
    q.set('since', String(since))
  }
  const suffix = q.toString() ? `?${q.toString()}` : ''
  return new EventSource(`/api/logs/stream${suffix}`)
}

