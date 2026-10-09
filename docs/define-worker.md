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

## Nitro plugins in the workers process

The generated workers entry loads the Nitro runtime, so Nitro server plugins (`server/plugins/`) also run in the workers process in both development and production.

Skip app-only side effects (Socket.IO or WebSocket runtimes, `setInterval` loops, startup DDL or migrations) with [`isWorkersProcess()`](/api#isworkersprocess) from `#processor-utils`.

```ts
// server/plugins/realtime.ts
import { isWorkersProcess } from '#processor-utils'

export default defineNitroPlugin((nitroApp) => {
  if (isWorkersProcess()) return
  // app-only side effects
})
```

The workers entry (`node .../workers/index.mjs` and `nuxt-processor dev`) sets `NUXT_PROCESSOR_WORKER=1` before Nitro loads, so `isWorkersProcess()` is true there. The Nuxt server (`nuxi dev` and production) returns false as long as that variable is not set in its environment.

Nitro's `close` hook never fires in the workers process. That entry shuts down through `useProcessor().stopAll()`, so plugin cleanup registered on `close` does not run there.

Child processes spawned from the workers process inherit the marker, so `isWorkersProcess()` is true in them too.
