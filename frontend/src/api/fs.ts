import { requestJson } from './http'

export type FsRoot = {
  name: string
  path: string
}

export type FsDirEntry = {
  name: string
  path: string
}

export async function fetchFsRoots(): Promise<{ roots: FsRoot[] }> {
  return await requestJson<{ roots: FsRoot[] }>('/api/fs/roots')
}

export async function fetchFsList(path: string): Promise<{ path: string; dirs: FsDirEntry[] }> {
  const q = new URLSearchParams({ path })
  return await requestJson<{ path: string; dirs: FsDirEntry[] }>(`/api/fs/list?${q.toString()}`)
}

