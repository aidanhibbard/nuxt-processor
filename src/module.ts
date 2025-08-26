import { defineNuxtModule, createResolver, addTemplate, useLogger } from '@nuxt/kit'
import { name, version, configKey, compatibility } from '../package.json'
import type { RedisOptions } from 'bullmq'
import { mkdir, readdir, writeFile } from 'node:fs/promises'

// Module options TypeScript interface definition
export interface ModuleOptions {
  redis: RedisOptions
  queues: string[]
  workers: string[]
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
    },
    queues: [],
    workers: [],
  },
  setup(_options, _nuxt) {
    const logger = useLogger(name)
    const { resolve } = createResolver(import.meta.url)

    const rootDir = _nuxt.options.rootDir
    const buildDir = _nuxt.options.buildDir
    const srcDir = _nuxt.options.srcDir

    // Helper: scan directories for worker/queue files
    const allowedExtensions = new Set(['.ts', '.js', '.mjs', '.mts', '.cjs', '.cts'])
    interface SimpleDirent {
      name: string
      isDirectory: () => boolean
    }
    async function collectFiles(fromDir: string): Promise<string[]> {
      const results: string[] = []
      async function walk(dir: string) {
        let entries: SimpleDirent[] = []
        try {
          entries = (await readdir(dir, { withFileTypes: true }))
        }
        catch {
          return
        }
        await Promise.all(entries.map(async (entry) => {
          const fullPath = resolve(dir, entry.name)
          if (entry.isDirectory()) {
            await walk(fullPath)
          }
          else {
            const dotIndex = fullPath.lastIndexOf('.')
            const ext = dotIndex >= 0 ? fullPath.slice(dotIndex) : ''
            if (allowedExtensions.has(ext)) {
              results.push(fullPath)
            }
          }
        }))
      }
      await walk(fromDir)
      return results
    }

    function generateWorkersEntryContent(_workerFiles: string[], _queueFiles: string[]): string {
      const redisInline = JSON.stringify(_options.redis ?? {})
      const workersGlob = '/server/workers/**/*.{js,ts,mjs,mts,cjs,cts}'
      const queuesGlob = '/server/queues/**/*.{js,ts,mjs,mts,cjs,cts}'
      return `
import { fileURLToPath } from 'node:url'
import { consola } from 'consola'
import { $workers } from '#workers-utils'

export interface StartedWorkersApp {
  stop: () => Promise<void>
}

export async function createWorkersApp(): Promise<StartedWorkersApp> {
  const api = $workers()
  api.setConnection(${redisInline} as any)
  // Avoid EPIPE when stdout/stderr are closed by terminal (e.g., Ctrl+C piping)
  const handleStreamError = (err: unknown) => {
    if (typeof err === 'object' && err && 'code' in (err as any) && (err as any).code === 'EPIPE') return
    throw err as any
  }
  try { process.stdout?.on?.('error', handleStreamError) } catch {}
  try { process.stderr?.on?.('error', handleStreamError) } catch {}
  const modules = {
    ...import.meta.glob(${JSON.stringify(workersGlob)}),
    ...import.meta.glob(${JSON.stringify(queuesGlob)}),
  }
  for (const loader of Object.values(modules)) {
    await loader()
  }
  const logger = consola.create({}).withTag('nuxt-workers')
  try {
    // Attach error listeners to all workers
    for (const w of api.workers) {
      w.on('error', (err: unknown) => logger.error('worker error', err))
    }
    logger.success('workers started: ' + api.workers.length + ', queues: ' + api.queues.length)
  } catch (err) {
    logger.error('failed to initialize workers', err)
  }
  return { stop: api.stopAll }
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const logger = consola.create({}).withTag('nuxt-workers')
  const appPromise = createWorkersApp().catch((err) => {
    logger.error('failed to start workers', err)
    process.exit(1)
  }) as Promise<StartedWorkersApp>
  const shutdown = async () => {
    try { logger.info('closing workers...') } catch {}
    try { const app = await appPromise; await app.stop(); try { logger.success('workers closed') } catch {} }
    finally { process.exit(0) }
  }
  ;['SIGINT','SIGTERM','SIGQUIT'].forEach(sig => process.on(sig as NodeJS.Signals, shutdown))
  process.on('beforeExit', shutdown)
}

export default { createWorkersApp }
`
    }

    // Create persistent templates under .nuxt
    const workersEntryPath = addTemplate({
      filename: 'nuxt-workers/entry.mts',
      write: true,
      getContents: () => generateWorkersEntryContent([], []),
    }).dst

    // VFS handlers alias (constructor-style DX)
    const { resolve: r } = createResolver(import.meta.url)

    // Alias inside the app to the identity API so user imports resolve at build-time
    _nuxt.options.alias = _nuxt.options.alias || {}
    _nuxt.options.alias['nuxt-workers'] = r('./runtime/server/handlers')
    _nuxt.options.alias['#workers'] = r('./runtime/server/handlers')
    _nuxt.options.alias['#workers-utils'] = r('./runtime/server/utils/workers')
    // Allow swapping BullMQ implementation allowing for bullmq pro (default to 'bullmq')
    if (!_nuxt.options.alias['#bullmq']) {
      _nuxt.options.alias['#bullmq'] = 'bullmq'
    }

    // Provide TypeScript declarations for the alias so IDE/type-check recognizes named exports
    const typesDtsPath = addTemplate({
      filename: 'types/nuxt-workers.d.ts',
      write: true,
      getContents: () => `
declare module 'nuxt-workers' {
  export { defineQueue } from '${r('./runtime/server/handlers/defineQueue')}'
  export { defineWorker } from '${r('./runtime/server/handlers/defineWorker')}'
}

declare module '#workers' {
  export { defineQueue } from '${r('./runtime/server/handlers/defineQueue')}'
  export { defineWorker } from '${r('./runtime/server/handlers/defineWorker')}'
}

declare module '#workers-utils' {
  export { $workers } from '${r('./runtime/server/utils/workers')}'
}

declare module '#bullmq' {
  export * from 'bullmq'
}
`,
    }).dst

    _nuxt.hooks.hook('prepare:types', (opts) => {
      // Ensure our generated d.ts is included in the TS config
      // so "import { defineWorker } from 'nuxt-workers'" type-checks
      // across IDE and build.
      // Nuxt merges this into .nuxt/tsconfig.json
      if (!opts.tsConfig.include) opts.tsConfig.include = []
      opts.tsConfig.include.push(resolve(buildDir, typesDtsPath))
    })

    async function buildWorkersBundle(outDir: string) {
      const entry = resolve(buildDir, workersEntryPath)
      // Regenerate the entry with current discovered files
      const workerFiles = await collectFiles(resolve(srcDir, 'server/workers'))
      const queueFiles = await collectFiles(resolve(srcDir, 'server/queues'))
      if (workerFiles.length === 0 && queueFiles.length === 0) {
        logger.info('No workers or queues found. Skipping workers bundle.')
        return
      }
      const contents = generateWorkersEntryContent(workerFiles, queueFiles)
      await mkdir(resolve(buildDir, 'nuxt-workers'), { recursive: true })
      await writeFile(entry, contents, 'utf8')
      const viteModuleName = 'vite'
      const { build } = await import(viteModuleName)
      logger.info(`Building workers bundle → ${outDir}`)
      await build({
        root: rootDir,
        logLevel: 'error',
        ssr: { noExternal: true },
        resolve: {
          alias: _nuxt.options.alias ?? {},
        },
        build: {
          ssr: true,
          outDir,
          emptyOutDir: true,
          rollupOptions: {
            input: entry,
            output: {
              format: 'esm',
              entryFileNames: 'index.mjs',
              chunkFileNames: 'chunks/[name]-[hash].mjs',
            },
          },
        },
      })
      logger.success(`Workers bundle built at ${outDir}`)
    }

    // DEV: watch and rebuild on HMR
    _nuxt.hooks.hook('vite:serverCreated', (server) => {
      const devOutDir = resolve(buildDir, 'workers')
      const watchGlobs = [
        resolve(srcDir, 'server/workers'),
        resolve(srcDir, 'server/queues'),
      ]
      server.watcher.add(watchGlobs)
      const debounce = (fn: () => void, ms: number) => {
        let t: NodeJS.Timeout | undefined
        return () => {
          if (t) clearTimeout(t)
          t = setTimeout(fn, ms)
        }
      }
      const run = debounce(() => {
        buildWorkersBundle(devOutDir).catch((err: unknown) => logger.error(String(err)))
      }, 150)
      server.watcher.on('add', run)
      server.watcher.on('change', run)
      server.watcher.on('unlink', run)
      // initial build
      buildWorkersBundle(devOutDir).catch((err: unknown) => logger.error(String(err)))
    })

    // PROD: after Nitro compiles, emit alongside its server output
    _nuxt.hooks.hook('nitro:init', (nitro) => {
      nitro.hooks.hook('compiled', async () => {
        const outDir = resolve(nitro.options.output?.dir ?? resolve(rootDir, '.output'), 'workers')
        await mkdir(outDir, { recursive: true })
        await buildWorkersBundle(outDir)
      })
    })
  },
})
