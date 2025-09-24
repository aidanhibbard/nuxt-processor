import { defineQueue } from '#processor'

const queue = defineQueue({ name: 'basic' })

setInterval(async () => {
  await queue.add('basic', { now: Date.now() })
}, 10000)

export default queue
