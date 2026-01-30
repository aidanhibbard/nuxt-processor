import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'pathe'
import { createMain, defineCommand } from 'citty'

import ensureNuxtProject from './utils/ensure-nuxt-project'
import { ensureProcessorDevScript } from './utils/ensure-processor-dev-script'
import { version, name, description } from '../package.json'
import { logger } from './utils/logger'

export const main = createMain({
  meta: {
    name,
    description,
    version,
  },
  subCommands: {
    dev: defineCommand({
      meta: {
        name: 'dev',
        description: 'Run workers with HMR from .nuxt/dev/workers/index.mjs',
      },
      args: {
        dir: {
          type: 'positional',
          default: '.',
        },
        nodeArgs: {
          type: 'string',
          description: 'Extra Node args (e.g. --inspect)',
        },
        workers: {
          type: 'string',
          description: 'Workers to run, comma-separated; use --workers=name1,name2 (default: all)',
        },
      },
      async run({ args }) {
        const dirArg = typeof args.dir === 'string' ? args.dir : '.'
        await ensureNuxtProject({ global: false, dir: dirArg })

        const projectRoot = resolve(dirArg)
        const indexFile = resolve(projectRoot, '.nuxt/dev/workers/index.mjs')
        const watchDir = resolve(projectRoot, '.nuxt/dev/workers')

        const scriptEnsured = await ensureProcessorDevScript(projectRoot)

        if (!existsSync(indexFile)) {
          logger.error('No entry file found at .nuxt/dev/workers/index.mjs')
          logger.info('Please start your Nuxt dev server (e.g. `npm run dev`).')
          logger.info('After it starts, run `npx nuxt-processor dev` again to start the processor.')
          process.exit(1)
        }

        if (!scriptEnsured) {
          logger.error('Could not ensure processor:dev script in package.json.')
          process.exit(1)
        }

        const nodeBin = process.execPath
        const nodeArgsInput = Array.isArray(args.nodeArgs)
          ? args.nodeArgs
          : (typeof args.nodeArgs === 'string' ? args.nodeArgs.split(' ') : [])
        const extraArgs = nodeArgsInput.filter(Boolean) as string[]
        const workersValue = typeof args.workers === 'string' ? args.workers.trim() : ''
        const workersFlag = workersValue ? `--workers=${workersValue}` : null
        const nodeArgs = [
          ...extraArgs,
          '--watch',
          '--watch-path',
          watchDir,
          indexFile,
          ...(workersFlag ? [workersFlag] : []),
        ]

        logger.info(`Running watcher for processor`)
        const child = spawn(nodeBin, nodeArgs, {
          stdio: 'inherit',
          cwd: projectRoot,
          env: process.env,
        })

        const onSignal = (signal: NodeJS.Signals) => {
          if (!child.killed) {
            child.kill(signal)
          }
        }

        process.on('SIGINT', onSignal)
        process.on('SIGTERM', onSignal)

        child.on('exit', (code) => {
          process.exit(code ?? 0)
        })
      },
    }),
  },
})
