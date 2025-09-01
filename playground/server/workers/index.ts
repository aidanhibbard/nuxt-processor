import { defineWorker } from '#processor'
import type { Job } from 'bullmq'

export default defineWorker({
  name: 'hello',
  async processor(job: Job) {
    return job.data
  },
  options: {},
})
