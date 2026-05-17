import { defineQueue } from '#processor'

type HelloName = 'hello'
type HelloData = { message: string, ts: number }
type HelloResult = { echoed: string, processedAt: number }

const queue = defineQueue<HelloData, HelloResult, HelloName>({
  name: 'hello',
})

export default queue
