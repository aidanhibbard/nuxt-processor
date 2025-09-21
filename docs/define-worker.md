---
title: Define Worker
---

# Define Worker

`defineWorker` registers a BullMQ worker bound to your Redis connection configured via the module. Workers run in a dedicated Node process.

## Usage

Create `server/workers/index.ts`:

The `options` are forwarded to BullMQ's `Worker` constructor, except `connection` which is managed by the module.

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
type DefineWorkerArgs<NameType extends string = string, DataType = unknown, ResultType = unknown> = {
  name: NameType
  processor: Processor<DataType, ResultType, NameType>
  options?: Omit<WorkerOptions, 'connection'>
}

declare function defineWorker<
  NameType extends string = string,
  DataType = unknown,
  ResultType = unknown,
>(args: DefineWorkerArgs<NameType, DataType, ResultType>): Worker<DataType, ResultType, NameType>
```

### Typed example

```ts
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
})
```
