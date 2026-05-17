import { defineNitroPlugin } from 'nitropack/runtime'

import basicQueue from '../queues/basic'
import helloQueue from '../queues'

export default defineNitroPlugin((nitroApp) => {
  const basicInterval = setInterval(async () => {
    await basicQueue.add('basic', { now: Date.now() })
  }, 10_000)

  const helloInterval = setInterval(async () => {
    await helloQueue.add('hello', { message: 'hello', ts: Date.now() })
  }, 5_000)

  nitroApp.hooks.hook('close', () => {
    clearInterval(basicInterval)
    clearInterval(helloInterval)
  })
})
