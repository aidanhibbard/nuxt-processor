import { defineNuxtModule, createResolver, addTypeTemplate, addServerPlugin } from '@nuxt/kit'
import { name, version, configKey, compatibility } from '../package.json'
import { buildRedisRuntimeConfig } from './utils/redis-runtime-config'
import type { Plugin } from 'rollup'
import { relative } from 'node:path'
import scanFolder from './utils/scan-folder'
import { generateWorkersEntryContent } from './utils/generate-workers-entry-content'
import { generateWorkersIndexWrapper } from './utils/generate-workers-index-wrapper'

export interface ModuleOptions {
  /**
   * Path to the directory containing worker files, relative to the project root.
   * @default 'server/workers'
   */
  workers: string
  /**
   * Glob pattern relative to `workers`.
   * @default '**\/*.{ts,js,mjs}'
   */
  workersPattern?: string
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
    workersPattern: '**/*.{ts,js,mjs}',
  },
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // Register keys for NUXT_REDIS_* at runtime; seed defaults from REDIS_* during dev/build.
    // Empty values are stripped in resolveConnection() so ioredis can use its own defaults.
    nuxt.options.runtimeConfig.redis = buildRedisRuntimeConfig(
      nuxt.options.runtimeConfig.redis as Record<string, unknown> | undefined,
    )

    nuxt.options.alias = nuxt.options.alias ?? {}
    nuxt.options.alias['nuxt-processor'] = resolve('./runtime/server/handlers')
    nuxt.options.alias['#processor'] = resolve('./runtime/server/handlers')
    nuxt.options.alias['#processor-utils'] = resolve('./runtime/server/utils')
    addServerPlugin(resolve('./runtime/server/plugins/close-processor'))
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
          const workerFiles = await scanFolder({
            path: _options.workers,
            pattern: _options.workersPattern,
          })
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
          const wrapper = generateWorkersIndexWrapper(rel)
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
