import { defineNuxtModule, createResolver, addTypeTemplate } from '@nuxt/kit'
import { name, version, configKey, compatibility } from '../package.json'
import type { RedisOptions as BullRedisOptions } from 'bullmq'
import type { Plugin } from 'rollup'
import { relative } from 'node:path'
import scanFolder from './utils/scan-folder'
import { generateWorkersEntryContent } from './utils/generate-workers-entry-content'

export interface ModuleOptions {
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
  defaults: {
    workers: 'server/workers',
  },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const runtimeConfig = nuxt.options.runtimeConfig as typeof nuxt.options.runtimeConfig & {
      redis?: BullRedisOptions & { url?: string }
    }
    runtimeConfig.redis = {
      host: '127.0.0.1',
      port: 6379,
      password: '',
      db: 0,
      url: '',
      ...(runtimeConfig.redis ?? {}),
    }

    nuxt.options.alias = nuxt.options.alias ?? {}
    nuxt.options.alias['nuxt-processor'] = resolve('./runtime/server/handlers')
    nuxt.options.alias['#processor'] = resolve('./runtime/server/handlers')
    nuxt.options.alias['#processor-utils'] = resolve('./runtime/server/utils')
    if (!nuxt.options.alias['#bullmq']) {
      nuxt.options.alias['#bullmq'] = 'bullmq'
    }

    addTypeTemplate({
      filename: 'types/nuxt-processor.d.ts',
      getContents: () => `
import type { RedisOptions } from 'bullmq'

declare module 'nuxt-processor' {
  export { defineQueue } from '${resolve('./runtime/server/handlers/defineQueue')}'
  export { defineWorker } from '${resolve('./runtime/server/handlers/defineWorker')}'
}

declare module '#processor' {
  export { defineQueue } from '${resolve('./runtime/server/handlers/defineQueue')}'
  export { defineWorker } from '${resolve('./runtime/server/handlers/defineWorker')}'
}

declare module '#bullmq' {
  export * from 'bullmq'
}

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    redis: RedisOptions & { url?: string }
  }
}
`,
    })

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
  },
})
