import { defineNitroPlugin } from 'nitropack/runtime'

import basicQueue from '../queues/basic'
import helloQueue from '../queues'

export default defineNitroPlugin(() => {
  setInterval(async () => {
    await basicQueue.add('basic', { now: Date.now() })
  }, 10000)

  setInterval(async () => {
    await helloQueue.add('hello', { message: 'hello', ts: Date.now() })
  }, 5000)
})
