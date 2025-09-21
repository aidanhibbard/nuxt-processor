import { defineWorker } from '#processor'

export default defineWorker({
  name: 'basic',
  async processor(job) {
    return { ok: true, received: job.data }
  },
})


