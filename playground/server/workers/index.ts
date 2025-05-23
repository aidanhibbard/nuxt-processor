import type { Job } from 'bullmq'
import defineWorker from 'nuxt-workers'

export default defineWorker('test', async (job: Job) => {
  return job
})
