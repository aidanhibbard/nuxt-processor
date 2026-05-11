import { defineWorker } from '#processor'
import { consola } from 'consola'

type HelloName = 'hello'
type HelloData = { message: string, ts: number }
type HelloResult = { echoed: string, processedAt: number }

const logger = consola.withTag('hello-worker')

export default defineWorker<HelloName, HelloData, HelloResult>({
  name: 'hello',
  async processor(job) {
    const { message, ts } = job.data
    logger.info('processed hello job', job.id)
    return { echoed: message, processedAt: ts }
  },
  options: {},
})
