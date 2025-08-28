---
title: Getting Started
---

# Getting Started

## Install

```bash
npm i -D nuxt-processor
```

Add the module in `nuxt.config.ts` and set your Redis connection.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  workers: {
    redis: {
      host: process.env.NUXT_REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.NUXT_REDIS_PORT ?? 6379),
      password: process.env.NUXT_REDIS_PASSWORD ?? '',
    },
  },
})
```

## Define a queue and enqueue from your app

Create `server/queues/index.ts`:

```ts
import { defineQueue } from '#workers'

export default defineQueue({
  name: 'hello',
})
```

## Define a worker

Create `server/workers/index.ts`:

```ts
import { defineWorker } from '#workers'
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

## Running

- Start your Nuxt app normally (dev or build). This module generates a dedicated workers entry.
- Start workers explicitly in a separate terminal:

```bash
nuxi build
node .output/server/workers/index.mjs
```

## Bull Board

[Bull Board](https://github.com/felixmosh/bull-board) is an excellent UI for watching your queues.

- [Server handler](../playground/server/handlers/bull-board.ts)
- [Route: `playground/server/routes/bull-board.ts`](../playground/server/routes/bull-board.ts)
- [Route: `playground/server/routes/bull-board/[...].ts`](../playground/server/routes/bull-board/%5B...%5D.ts)

Special thanks to [@genu](https://github.com/genu) for creating the H3 adapter.

For more help getting set up, see this Bull Board H3 adapter comment: <https://github.com/felixmosh/bull-board/pull/669#issuecomment-1883997968>.


