import { defineNuxtModule, createResolver, addTypeTemplate, addServerPlugin, addTemplate } from '@nuxt/kit'
import { name, version, configKey, compatibility } from '../package.json'
import type { RedisOptions as BullRedisOptions } from 'bullmq'
import type { Plugin } from 'rollup'
import { relative } from 'node:path'
import scanFolder from './utils/scan-folder'

// Module options TypeScript interface definition
type ModuleRedisOptions = BullRedisOptions & { url?: string }

export interface ModuleOptions {
  redis: ModuleRedisOptions
  /**
   * The folder containing the worker files
   * Scans for {ts,js,mjs}
   * @default 'server/workers'
   */
  workers: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    compatibility,
    configKey,
  },
  // Default configuration options of the Nuxt module
  defaults: {
    redis: {
      host: process.env.NUXT_REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.NUXT_REDIS_PORT ?? 6379),
      password: process.env.NUXT_REDIS_PASSWORD ?? '',
      username: process.env.NUXT_REDIS_USERNAME ?? undefined, // needs Redis >= 6
      db: Number(process.env.NUXT_REDIS_DB ?? 0), // Defaults to 0 on ioredis
      url: process.env.NUXT_REDIS_URL ?? undefined,
    } as ModuleRedisOptions,
    workers: 'server/workers',
  },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const redisInline = JSON.stringify(_options.redis ?? {})

    const nitroPlugin = `
    import { defineNitroPlugin } from '#imports'
    import { $workers } from '#processor-utils'

    export default defineNitroPlugin(() => {
      $workers().setConnection(${redisInline})
    })
    `

    const tpl = addTemplate({
      filename: '0.processor-nuxt-plugin.ts',
      write: true,
      getContents: () => nitroPlugin,
    })

    addServerPlugin(tpl.dst)

    function generateWorkersEntryContent(workerFiles: string[]): string {
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
  const logger = consola.create({}).withTag('nuxt-processor')
  try {
    const workerNames = Array.isArray(api.workers) ? api.workers.map(w => w && w.name).filter(Boolean) : []
    logger.info('starting workers:\\n' + workerNames.map(n => ' - ' + n).join('\\n'))
    for (const w of api.workers) {
      w.on('error', (err) => logger.error('worker error', err))
    }
    // Explicitly start workers since autorun is disabled
    for (const w of api.workers) {
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
  return { stop: api.stopAll, workers: api.workers }
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

    // Alias inside the app to the identity API so user imports resolve at build-time
    nuxt.options.alias = nuxt.options.alias ?? {}
    nuxt.options.alias['nuxt-processor'] = resolve('./runtime/server/handlers')
    nuxt.options.alias['#processor'] = resolve('./runtime/server/handlers')
    nuxt.options.alias['#processor-utils'] = resolve('./runtime/server/utils/workers')
    // Allow swapping BullMQ implementation allowing for bullmq pro (default to 'bullmq')
    if (!nuxt.options.alias['#bullmq']) {
      nuxt.options.alias['#bullmq'] = 'bullmq'
    }

    // Provide TypeScript declarations for the alias so IDE/type-check recognizes named exports
    addTypeTemplate({
      filename: 'types/nuxt-processor.d.ts',
      getContents: () => `
declare module 'nuxt-processor' {
  export { defineQueue } from '${resolve('./runtime/server/handlers/defineQueue')}'
  export { defineWorker } from '${resolve('./runtime/server/handlers/defineWorker')}'
}

declare module '#processor' {
  export { defineQueue } from '${resolve('./runtime/server/handlers/defineQueue')}'
  export { defineWorker } from '${resolve('./runtime/server/handlers/defineWorker')}'
}

declare module '#processor-utils' {
  export { $workers } from '${resolve('./runtime/server/utils/workers')}'
}

declare module '#bullmq' {
  export * from 'bullmq'
}
`,
    })

    // Create a Rollup plugin that emits a virtual workers chunk into Nitro's output
    function createWorkersRollupPlugin(): Plugin {
      const VIRTUAL_ID = '\u0000nuxt-processor-entry'
      let virtualCode = ''
      let entryRefId: string | null = null
      return {
        name: 'nuxt-processor-emit',
        async buildStart() {
          const workerFiles = await scanFolder(_options.workers)
          if (workerFiles.length === 0) {
            virtualCode = ''
            return
          }
          virtualCode = generateWorkersEntryContent(workerFiles)
          for (const id of workerFiles) {
            this.addWatchFile(id)
          }
          // Emit the virtual workers entry as its own chunk early in the build
          entryRefId = this.emitFile({ type: 'chunk', id: VIRTUAL_ID, fileName: 'workers/_entry.mjs' })
        },
        resolveId(id: string) {
          if (id === VIRTUAL_ID) return VIRTUAL_ID
        },
        load(id: string) {
          if (id === VIRTUAL_ID) return virtualCode ?? 'export {}\n'
        },
        generateBundle() {
          if (!virtualCode || !entryRefId) return
          const entryFile = this.getFileName(entryRefId)
          const fromDir = 'workers'
          const rel = './' + relative(fromDir, entryFile).split('\\').join('/')
          const wrapper = `import { createWorkersApp } from '${rel}'\n`
            + `import { consola } from 'consola'\n`
            + `const logger = consola.create({}).withTag('nuxt-processor')\n`
            + `const appPromise = createWorkersApp().catch((err) => { logger.error('failed to start workers', err); process.exit(1) })\n`
            + `let shuttingDown = false\n`
            + `const shutdown = async (signal) => { if (shuttingDown) return; shuttingDown = true; try { logger.info('closing workers' + (signal ? ' ('+signal+')' : '') + '...') } catch (e) { console.warn('nuxt-processor: failed to log shutdown start', e) } ; try { const app = await appPromise; try { const names = (app?.workers || []).map(w => w && w.name).filter(Boolean); logger.info('closing workers:\\n' + names.map(n => ' - ' + n).join('\\n')) } catch (eL) { console.warn('nuxt-processor: failed to log workers list on shutdown', eL) } await app.stop(); try { logger.success('workers closed') } catch (e2) { console.warn('nuxt-processor: failed to log shutdown complete', e2) } } catch (err) { try { logger.error('shutdown error', err) } catch (e3) { console.warn('nuxt-processor: failed to log shutdown error', e3) } } finally { setTimeout(() => process.exit(0), 0) } }\n`
            + `[ 'SIGINT','SIGTERM','SIGQUIT' ].forEach(sig => process.on(sig, () => shutdown(sig)))\n`
            + `process.on('beforeExit', () => shutdown('beforeExit'))\n`
          this.emitFile({ type: 'asset', fileName: 'workers/index.mjs', source: wrapper })
        },
      }
    }

    // Inject our Rollup plugin into Nitro so it emits the workers chunk without a separate build
    nuxt.hooks.hook('nitro:config', (nitroConfig) => {
      nitroConfig.rollupConfig = nitroConfig.rollupConfig ?? {}
      const plugin = createWorkersRollupPlugin()
      const current = nitroConfig.rollupConfig.plugins
      if (Array.isArray(current)) {
        nitroConfig.rollupConfig.plugins = [...current, plugin]
      }
      else if (current) {
        nitroConfig.rollupConfig.plugins = [current, plugin]
      }
      else {
        nitroConfig.rollupConfig.plugins = [plugin]
      }
    })

    // The workers chunk will be emitted to Nitro's output as workers/index.mjs
  },
})
