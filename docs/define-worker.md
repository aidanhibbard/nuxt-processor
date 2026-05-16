---
title: Define Worker
---

# Define Worker

`defineWorker` registers a BullMQ worker using the Redis connection from `useRuntimeConfig().redis` (see [Redis configuration](/redis)). Workers run in a dedicated Node process.

Create `server/workers/index.ts`:

```ts
import { defineWorker } from '#processor'
import type { Job } from '#bullmq'

export default defineWorker({
  name: 'hello',
  async processor(job: Job) {
    console.log('processed', job.name, job.data)
    return job.data
  },
  options: {},
})
```

`options` are forwarded to BullMQ's `Worker` constructor except `connection`, which the module sets from runtime config.

For typed usage and full signatures, see the [API reference](/api#defineworker).
