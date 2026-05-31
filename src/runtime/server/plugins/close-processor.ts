import { defineNitroPlugin } from 'nitropack/runtime'
import { consola } from 'consola'
import { useProcessor } from '../utils/workers'

const logger = consola.create({}).withTag('nuxt-processor')

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    const { stopAll } = useProcessor()
    const { ok, errors } = await stopAll()
    if (!ok) {
      for (const error of errors) {
        logger.error('Failed to close processor resource on Nitro shutdown', error)
      }
    }
  })
})
