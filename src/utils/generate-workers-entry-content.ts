export function generateWorkersEntryContent(workerFiles: string[], redisInline: string): string {
  const toImportArray = workerFiles.map(id => `() => import(${JSON.stringify(id)})`).join(',\n    ')
  return `
import { fileURLToPath } from 'node:url'
import { resolve as resolvePath } from 'node:path'
import { consola } from 'consola'
import { $workers } from '#processor-utils'

// Initialize connection as early as possible so any imports that register
// workers/queues have a valid connection available.
const api = $workers()
api.setConnection(${redisInline})

export async function createWorkersApp() {
// Avoid EPIPE when stdout/stderr are closed by terminal (e.g., Ctrl+C piping)
const handleStreamError = (err) => {
try {
  const code = (typeof err === 'object' && err && 'code' in err) ? err.code : null
  if (code === 'EPIPE') return
} catch (e) { console.warn?.('nuxt-processor: stream error inspection failed', e) }
throw err
}
try { process.stdout?.on?.('error', handleStreamError) } catch (err) { console.warn('nuxt-processor: failed to attach stdout error handler', err) }
try { process.stderr?.on?.('error', handleStreamError) } catch (err) { console.warn('nuxt-processor: failed to attach stderr error handler', err) }
const modules = [
${toImportArray}
]
for (const loader of modules) {
await loader()
}
// Parse --workers flag (e.g. --workers=basic,hello)
const workersArg = process.argv.find(a => typeof a === 'string' && a.startsWith('--workers='))
const selectedWorkers = workersArg
  ? workersArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
  : null
const workersToRun = selectedWorkers
  ? (Array.isArray(api.workers) ? api.workers.filter(w => w && selectedWorkers.includes(w.name)) : [])
  : (Array.isArray(api.workers) ? api.workers : [])
const logger = consola.create({}).withTag('nuxt-processor')
try {
const workerNames = workersToRun.map(w => w && w.name).filter(Boolean)
logger.info('starting workers:\\n' + workerNames.map(n => ' - ' + n).join('\\n'))
for (const w of workersToRun) {
  w.on('error', (err) => logger.error('worker error', err))
}
// Explicitly start workers since autorun is disabled
for (const w of workersToRun) {
  try {
    // run() returns a promise that resolves when the worker stops; do not await to avoid blocking
    // eslint-disable-next-line promise/catch-or-return
    w.run().catch((err) => logger.error('worker run error', err))
  }
  catch (err) {
    logger.error('failed to start worker', err)
  }
}
logger.success('workers started')
} catch (err) {
logger.error('failed to initialize workers', err)
}
const stopOnlyRunning = async () => {
  await Promise.allSettled(workersToRun.map(w => w.close()))
  await Promise.allSettled(api.queues.map(q => q.close()))
}
return { stop: stopOnlyRunning, workers: workersToRun }
}

const isMain = (() => {
try {
if (typeof process === 'undefined' || !process.argv || !process.argv[1]) return false
const argvPath = resolvePath(process.cwd?.() || '.', process.argv[1])
const filePath = fileURLToPath(import.meta.url)
return filePath === argvPath
} catch {
return false
}
})()
if (isMain) {
const logger = consola.create({}).withTag('nuxt-processor')
const appPromise = createWorkersApp().catch((err) => {
logger.error('failed to start workers', err)
process.exit(1)
})
const shutdown = async () => {
try { logger.info('closing workers...') } catch (err) { console.warn('nuxt-processor: failed to log shutdown start', err) }
try {
  const app = await appPromise
  try {
    const names = (app?.workers || []).map(w => w && w.name).filter(Boolean)
    logger.info('closing workers:\\n' + names.map(n => ' - ' + n).join('\\n'))
  } catch (eL) { console.warn('nuxt-processor: failed to log workers list on shutdown', eL) }
  await app.stop()
  try { logger.success('workers closed') } catch (err2) { console.warn('nuxt-processor: failed to log shutdown complete', err2) }
}
finally { process.exit(0) }
}
;['SIGINT','SIGTERM','SIGQUIT'].forEach(sig => process.on(sig, shutdown))
process.on('beforeExit', shutdown)
}

export default { createWorkersApp }
`
}
