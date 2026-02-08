import { defineNuxtModule, createResolver, addTypeTemplate, addServerPlugin, addTemplate } from '@nuxt/kit'
import { name, version, configKey, compatibility } from '../package.json'
import type { RedisOptions as BullRedisOptions } from 'bullmq'
import type { Plugin } from 'rollup'
import { relative } from 'node:path'
import scanFolder from './utils/scan-folder'
import { generateWorkersEntryContent } from './utils/generate-workers-entry-content'
import { generateRedisConnectionExpr } from './utils/generate-redis-connection-expr'

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
      lazyConnect: process.env.NUXT_REDIS_LAZY_CONNECT === 'true' ? true : undefined,
      connectTimeout: process.env.NUXT_REDIS_CONNECT_TIMEOUT ? Number(process.env.NUXT_REDIS_CONNECT_TIMEOUT) : undefined,
      url: process.env.NUXT_REDIS_URL ?? undefined,
    } as ModuleRedisOptions,
    workers: 'server/workers',
  },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const staticRedis = JSON.stringify(_options.redis ?? {})
    const redisConnectionExpr = generateRedisConnectionExpr(staticRedis)

    const nitroPlugin = `
    import { defineNitroPlugin } from '#imports'
    import { $workers } from '#processor-utils'

    export default defineNitroPlugin(() => {
      $workers().setConnection(${redisConnectionExpr})
    })
    `

    const tpl = addTemplate({
      filename: '0.processor-nuxt-plugin.ts',
      write: true,
      getContents: () => nitroPlugin,
    })

    addServerPlugin(tpl.dst)

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
          virtualCode = generateWorkersEntryContent(workerFiles, redisConnectionExpr)
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
