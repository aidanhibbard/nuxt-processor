import type { Processor } from 'bullmq'
import { Worker } from 'bullmq'

const config = useRuntimeConfig()

export default (
  name: string,
  processor?: string | URL | null | Processor,
  opts?: Omit<WorkerOptions, 'connection'>,
) => new Worker(name, processor, {
  ...opts,
  // Workers sare started in run script
  autorun: false,
  connection: {
    ...config.workers.redis,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  },
})
