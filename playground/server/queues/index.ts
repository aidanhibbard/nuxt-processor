import { defineQueue } from '#workers'

const queue = defineQueue({
  name: 'hello',
})

setInterval(() => {
  queue.add('hello', { message: 'hello', ts: Date.now() })
}, 5000)

export default queue
