---
title: API
---

# API

Reference for module options, runtime config, helpers, and the CLI. Each section lists **examples first**, then type signatures.

## Imports

| Alias | Exports |
| --- | --- |
| `#processor` | `defineQueue`, `defineWorker` |
| `#processor-utils` | `useProcessor`, BullMQ types (`Queue`, `Worker`, `Processor`, …) |
| `#bullmq` | Re-exports from `bullmq` (override via `nuxt.config` alias if needed) |

```ts
import { defineQueue, defineWorker } from '#processor'
import type { Job } from '#bullmq'
```

## Module options

Configure under `processor` in `nuxt.config`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  processor: {
    workers: 'server/workers',
  },
})
```

```ts
interface ModuleOptions {
  /**
   * Folder scanned for worker files ({ts,js,mjs}).
   * @default 'server/workers'
   */
  workers: string
}
```

## Runtime config

Redis connection settings live on `useRuntimeConfig().redis`. See [Redis configuration](/redis) for `REDIS_*` (dev/build) vs `NUXT_REDIS_*` (runtime). Nuxt requires the [`NUXT_` prefix at runtime](https://nuxt.com/docs/4.x/guide/going-further/runtime-config#environment-variables); [the .env file is not loaded in production](https://nuxt.com/docs/4.x/directory-structure/env#production) — use `NUXT_REDIS_*` in Docker `environment:` on both app and workers services.

```ts
interface RuntimeConfig {
  redis: RedisOptions & { url?: string }
}
```

The module registers `url`, `host`, `port`, `password`, `db`, `username`, `lazyConnect`, and `connectTimeout`, seeds them from `REDIS_*` at dev/build, and allows `NUXT_REDIS_*` overrides at runtime. See [Redis configuration](/redis).

---

## `defineQueue`

Registers a BullMQ queue. `connection` is set from runtime config; other `options` are passed to BullMQ.

### Example

```ts
import { defineQueue } from '#processor'

export default defineQueue({
  name: 'hello',
  options: {
    defaultJobOptions: { attempts: 3 },
  },
})
```

### Typed example

```ts
import { defineQueue } from '#processor'

type HelloName = 'hello'
type HelloData = { message: string, ts: number }
type HelloResult = { echoed: string, processedAt: number }

const queue = defineQueue<HelloData, HelloResult, HelloName>({
  name: 'hello',
})

await queue.add('hello', { message: 'hi', ts: Date.now() })
```

### Signature

```ts
type DefineQueueArgs<DefaultNameType extends string = string> = {
  name: DefaultNameType
  options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions }
}

function defineQueue<
  DataTypeOrJob = any,
  DefaultResultType = any,
  DefaultNameType extends string = string,
>(args: DefineQueueArgs<DefaultNameType>): Queue<DataTypeOrJob, DefaultResultType, DefaultNameType>
```

---

## `defineWorker`

Registers a BullMQ worker. Workers are started from the generated workers entry (`autorun: false` in the registry; the entry calls `.run()`). `connection` is set from runtime config.

### Example

```ts
import { defineWorker } from '#processor'
import type { Job } from '#bullmq'

export default defineWorker({
  name: 'hello',
  async processor(job: Job) {
    return job.data
  },
  options: { concurrency: 2 },
})
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

### Signature

```ts
type DefineWorkerArgs<
  NameType extends string = string,
  DataType = any,
  ResultType = any,
> = {
  name: NameType
  processor: Processor<DataType, ResultType, NameType>
  options?: Omit<WorkerOptions, 'connection'>
}

function defineWorker<
  NameType extends string = string,
  DataType = any,
  ResultType = any,
>(args: DefineWorkerArgs<NameType, DataType, ResultType>): Worker<DataType, ResultType, NameType>
```

---

## `useProcessor`

Low-level registry used by `defineQueue` / `defineWorker` and the generated workers bundle. Prefer the helpers unless you need programmatic control.

### Example

```ts
import { useProcessor } from '#processor-utils'

const { createQueue, createWorker, stopAll } = useProcessor()

const queue = createQueue('emails')
const worker = createWorker('emails', async job => {
  // ...
})

// later
await stopAll()
```

### Signature

```ts
function useProcessor(): {
  createQueue<
    DataTypeOrJob = any,
    DefaultResultType = any,
    DefaultNameType extends string = string,
  >(
    name: DefaultNameType,
    options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions },
  ): Queue<DataTypeOrJob, DefaultResultType, DefaultNameType>

  createWorker<
    DataType = any,
    ResultType = any,
    NameType extends string = string,
  >(
    name: NameType,
    processor: Processor<DataType, ResultType, NameType>,
    options?: Omit<WorkerOptions, 'connection'>,
  ): Worker<DataType, ResultType, NameType>

  stopAll(): Promise<void>

  readonly queues: Queue[]
  readonly workers: Worker[]
}
```

Workers created via `createWorker` use `autorun: false`. The generated workers entry calls `.run()` on each worker.

---

## Workers entry

Build output includes `.output/server/workers/index.mjs`, which loads `server/workers/**` and runs registered workers.

### CLI

```bash
npx nuxt-processor dev
npx nuxt-processor dev --workers=basic,hello
```

| Argument | Description |
| --- | --- |
| `--workers=name1,name2` | Run only workers with matching queue names (default: all) |

Equivalent direct invocation:

```bash
node .output/server/workers/index.mjs
node .output/server/workers/index.mjs --workers=basic,hello
```

### `createWorkersApp`

Emitted inside the workers bundle (not imported from the package directly):

```ts
function createWorkersApp(): Promise<{
  workers: Worker[]
  stop(): Promise<void>
}>
```

---

## Re-exported BullMQ types

From `#processor-utils` / `#bullmq`:

`Queue`, `Worker`, `Processor`, `QueueOptions`, `WorkerOptions`, `JobsOptions`, `Job`

See [BullMQ documentation](https://docs.bullmq.io/) for queue/worker option details.
