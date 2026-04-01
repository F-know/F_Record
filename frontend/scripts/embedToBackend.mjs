import fs from 'node:fs/promises'
import path from 'node:path'

const frontendDir = path.resolve(process.cwd())
const srcDist = path.join(frontendDir, 'dist')
const backendDir = path.resolve(frontendDir, '..', 'backend')
const targetDist = path.join(backendDir, 'frontend-dist')

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await exists(srcDist))) {
    throw new Error(`未找到前端构建产物：${srcDist}，请先运行 npm run build`)
  }

  await fs.rm(targetDist, { recursive: true, force: true })
  await fs.mkdir(targetDist, { recursive: true })
  await fs.cp(srcDist, targetDist, { recursive: true })

  const indexHtml = path.join(targetDist, 'index.html')
  if (!(await exists(indexHtml))) {
    throw new Error(`复制后未找到 index.html：${indexHtml}`)
  }

  console.log(`[embed] copied ${srcDist} -> ${targetDist}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

