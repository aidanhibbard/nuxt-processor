import { defineWorker } from '#processor'

type HelloName = 'hello'
type HelloData = { message: string, ts: number }
type HelloResult = { echoed: string, processedAt: number }

export default defineWorker<HelloName, HelloData, HelloResult>({
  name: 'hello',
  async processor(job) {
    const { message, ts } = job.data
    return { echoed: message, processedAt: ts }
  },
  options: {},
})
