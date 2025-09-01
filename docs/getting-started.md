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
  processor: {
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
import { defineQueue } from '#processor'

export default defineQueue({
  name: 'hello',
})
```

## Define a worker

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

## Running

- Start your Nuxt app normally. This module generates a dedicated workers entry.
- In development, run workers from `.nuxt/dev/workers/index.mjs` in a separate terminal:

```bash
nuxi dev
node .nuxt/dev/workers/index.mjs
```

### CLI (recommended in development)

Use the CLI to run workers with file watching and restarts:

```bash
npx nuxt-processor dev
```

Notes:
- If `.nuxt/dev/workers/index.mjs` does not exist yet, the CLI will ask you to start your Nuxt dev server first and exit.
- If your `package.json` does not have a `processor:dev` script, the CLI will offer to add:

```json
{
  "scripts": {
    "processor:dev": "nuxt-processor dev"
  }
}
```

Then you can run:

```bash
npm run processor:dev
```

- After building for production, run workers from `.output/server/workers/index.mjs`:

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


