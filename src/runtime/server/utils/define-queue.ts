import type { QueueOptions } from 'bullmq'
import { Queue } from 'bullmq'

const config = useRuntimeConfig()

export default (
  name: string,
  opts?: Omit<QueueOptions, 'connection'>,
) => new Queue(name, {
  ...opts,
  connection: {
    ...config.workers.redis,
    maxRetriesPerRequest: null,
  },
})
