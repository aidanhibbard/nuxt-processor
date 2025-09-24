import { defineQueue } from '#processor'

type HelloName = 'hello'
type HelloData = { message: string, ts: number }
type HelloResult = { echoed: string, processedAt: number }

const queue = defineQueue<HelloData, HelloResult, HelloName>({
  name: 'hello',
})

setInterval(async () => {
  console.log('adding job to hello queue')
  await queue.add('hello', { message: 'hello', ts: Date.now() })
}, 5000)

export default queue
