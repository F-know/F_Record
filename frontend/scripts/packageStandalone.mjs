import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDir = path.resolve(__dirname, '..')
const repoDir = path.resolve(frontendDir, '..')

const frontendDistDir = path.join(frontendDir, 'dist')
const backendDir = path.join(repoDir, 'backend')
const backendEnvExamplePath = path.join(backendDir, '.env.example')
const backendNpmCacheDir = path.join(backendDir, '.npm-cache')
const outputDir = path.join(repoDir, 'dist', 'F_Record4')
const outputFrontendDistDir = path.join(outputDir, 'frontend-dist')
const outputEnvPath = path.join(outputDir, '.env')

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function isExcludedBackendPath(sourcePath) {
  const relativePath = path.relative(backendDir, sourcePath)
  if (!relativePath) return false

  return relativePath === '.env' ||
    relativePath === '.env.example' ||
    relativePath === 'frontend-dist' ||
    relativePath.startsWith(`frontend-dist${path.sep}`)
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const commandToRun = process.platform === 'win32' ? 'cmd.exe' : command
    const commandArgs = process.platform === 'win32'
      ? ['/c', command, ...args]
      : args

    const child = spawn(commandToRun, commandArgs, {
      cwd,
      stdio: 'inherit',
      shell: false,
      env: process.env,
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`命令执行失败: ${command} ${args.join(' ')} (exit code ${code ?? 'unknown'})`))
    })
  })
}

async function readEnvTemplate() {
  if (await exists(backendEnvExamplePath)) {
    return fs.readFile(backendEnvExamplePath, 'utf8')
  }

  throw new Error(`未找到环境模板文件：${backendEnvExamplePath}`)
}

async function buildStandalonePackage() {
  if (!(await exists(frontendDistDir))) {
    throw new Error(`未找到前端构建产物：${frontendDistDir}，请先运行 npm run build`)
  }

  if (!(await exists(backendDir))) {
    throw new Error(`未找到后端目录：${backendDir}`)
  }

  console.log('[dist] running npm install in backend...')
  try {
    await runCommand('npm', ['install', '--cache', '.npm-cache'], backendDir)
  } finally {
    await fs.rm(backendNpmCacheDir, { recursive: true, force: true })
  }

  await fs.rm(outputDir, { recursive: true, force: true })
  await fs.mkdir(outputDir, { recursive: true })

  await fs.cp(backendDir, outputDir, {
    recursive: true,
    filter: (sourcePath) => !isExcludedBackendPath(sourcePath),
  })

  await fs.mkdir(outputFrontendDistDir, { recursive: true })
  await fs.cp(frontendDistDir, outputFrontendDistDir, { recursive: true })

  const envTemplate = await readEnvTemplate()
  await fs.writeFile(outputEnvPath, envTemplate, 'utf8')

  console.log(`[dist] packaged standalone plugin -> ${outputDir}`)
}

buildStandalonePackage().catch((error) => {
  console.error(error)
  process.exit(1)
})
