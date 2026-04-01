import { requestJson } from './http'

export type DocumentRow = {
  uid: string
  filePath: string | null
  processImageCount: number
  lastChangedTime: number | null
  creationTime: number | null
  timeSpent: number
}

export type CurrentDocumentInfoResponse = {
  currentDocumentId: number | null
  currentDocumentUid: string | null
  pendingTimeSpentSeconds: number
  document: DocumentRow | null
}

export type DocumentInfoListResponse = {
  items: DocumentRow[]
  total: number
  page: number
  pageSize: number
}

export type DocumentInfoListQuery = {
  page?: number
  pageSize?: number
  orderBy?: 'creationTime' | 'lastChangedTime' | 'filePath' | 'processImageCount' | 'timeSpent' | 'uid'
  orderDir?: 'ASC' | 'DESC'

  uid?: string
  filePath?: string

  creationTimeFrom?: number
  creationTimeTo?: number
  lastChangedTimeFrom?: number
  lastChangedTimeTo?: number
  processImageCountFrom?: number
  processImageCountTo?: number
  timeSpentFrom?: number
  timeSpentTo?: number

  filePathLike?: string
}

function addQueryParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return
  const v = String(value)
  if (v === '') return
  params.set(key, v)
}

export async function fetchCurrentDocumentInfo(): Promise<CurrentDocumentInfoResponse> {
  return requestJson<CurrentDocumentInfoResponse>(`/api/currentDocumentInfo`, { method: 'GET' })
}

export async function fetchDocumentInfoList(query: DocumentInfoListQuery): Promise<DocumentInfoListResponse> {
  const params = new URLSearchParams()
  addQueryParam(params, 'page', query.page)
  addQueryParam(params, 'pageSize', query.pageSize)
  addQueryParam(params, 'orderBy', query.orderBy)
  addQueryParam(params, 'orderDir', query.orderDir)
  addQueryParam(params, 'uid', query.uid)
  addQueryParam(params, 'filePath', query.filePath)

  addQueryParam(params, 'creationTimeFrom', query.creationTimeFrom)
  addQueryParam(params, 'creationTimeTo', query.creationTimeTo)
  addQueryParam(params, 'lastChangedTimeFrom', query.lastChangedTimeFrom)
  addQueryParam(params, 'lastChangedTimeTo', query.lastChangedTimeTo)
  addQueryParam(params, 'processImageCountFrom', query.processImageCountFrom)
  addQueryParam(params, 'processImageCountTo', query.processImageCountTo)
  addQueryParam(params, 'timeSpentFrom', query.timeSpentFrom)
  addQueryParam(params, 'timeSpentTo', query.timeSpentTo)
  addQueryParam(params, 'filePathLike', query.filePathLike)

  const qs = params.toString()
  return requestJson<DocumentInfoListResponse>(`/api/documentInfoList${qs ? `?${qs}` : ''}`, { method: 'GET' })
}

export async function openDocumentProcessImageFolder(uid: string): Promise<{ ok: boolean; path: string }> {
  return requestJson<{ ok: boolean; path: string }>(`/api/document/openProcessImageFolder`, {
    method: 'POST',
    body: JSON.stringify({ uid }),
  })
}

