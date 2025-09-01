---
title: Define Worker
---

# Define Worker

`defineWorker` registers a BullMQ worker bound to your Redis connection configured via the module. Workers run in a dedicated Node process.

## Usage

Create `server/workers/index.ts`:

```ts
import { defineWorker } from '#processor'
import type { Job } from '#bullmq'

export default defineWorker({
  name: 'hello',
  async processor(job: Job) {
    // do work
    console.log('processed', job.name, job.data)
    return job.data
  },
  options: {},
})
```

## API

```ts
type DefineWorkerArgs = {
  name: string
  processor: Processor
  options?: Omit<WorkerOptions, 'connection'>
}
```

The `options` are forwarded to BullMQ's `Worker` constructor, except `connection` which is managed by the module.


