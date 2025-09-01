import { defineQueue } from '#processor'

const queue = defineQueue({
  name: 'hello',
})

setInterval(async () => {
  await queue.add('hello', { message: 'hello', ts: Date.now() })
}, 5000)

export default queue
