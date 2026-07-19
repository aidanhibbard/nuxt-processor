---
title: API
---

# API

Reference for module options, runtime config, helpers, and the CLI. Each section lists **examples first**, then type signatures.

## Imports

| Alias | Exports |
| --- | --- |
| `#processor` | `defineQueue`, `defineWorker`, `defineFlowProducer` |
| `#processor-utils` | `useProcessor`, BullMQ types (`Queue`, `Worker`, `FlowProducer`, `Processor`, …) |
| `#bullmq` | Re-exports from `bullmq` (override via `nuxt.config` alias if needed) |

```ts
import { defineQueue, defineWorker, defineFlowProducer } from '#processor'
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

Exclude co-located test files with a custom pattern ([micromatch extglob](https://github.com/micromatch/micromatch#extglob)):

```ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  processor: {
    workers: 'server/workers',
    workersPattern: '**/!(*.test|*.spec).{ts,js,mjs}',
  },
})
```

`workers` is the path to the workers directory (resolved from the project root). Globs belong in `workersPattern`, which is relative to that directory.

Long-running jobs may need a longer graceful shutdown window in the workers process:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-processor'],
  processor: {
    shutdown: {
      timeoutMs: 120_000,
    },
  },
})
```

`shutdown.timeoutMs` only affects the standalone workers entry (`workers/index.mjs`), not Nitro server shutdown.

```ts
interface ModuleOptions {
  /**
   * Path to the workers directory, relative to the project root.
   * @default 'server/workers'
   */
  workers: string
  /**
   * Glob pattern relative to `workers`.
   * @default '**/*.{ts,js,mjs}'
   */
  workersPattern?: string
  /**
   * Workers process shutdown settings.
   */
  shutdown?: {
    /**
     * Graceful shutdown timeout for the workers process (ms).
     * After this duration, workers are force-closed.
     * @default 25000
     */
    timeoutMs?: number
  }
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

## `defineFlowProducer`

Registers a BullMQ `FlowProducer` for parent/child job trees. `connection` is set from runtime config; other `options` are passed to BullMQ. See the [Define Flow Producer guide](/define-flow-producer) for flow semantics (`getChildrenValues`, `waiting-children`, failed-child options, cleanup).

### Example

```ts
import { defineFlowProducer } from '#processor'

export default defineFlowProducer({
  options: {
    prefix: 'bull',
  },
})
```

### Usage

```ts
import flowProducer from '~/server/flows/panel'

await flowProducer.add({
  name: 'questionnaire-run',
  queueName: 'questionnaire-run',
  data: { flowId: 'abc' },
  children: [
    {
      name: 'panel-response-shard',
      queueName: 'panel-response-shard',
      data: { shardIndex: 0 },
      opts: { jobId: 'shard-0' },
    },
  ],
})
```

### Signature

```ts
type DefineFlowProducerArgs = {
  options?: Omit<QueueBaseOptions, 'connection'>
}

function defineFlowProducer(args?: DefineFlowProducerArgs): FlowProducer
```

`FlowProducer.add()` and `FlowProducer.addBulk()` use BullMQ's native `FlowJob` types. Type job data per queue with `defineQueue` / `defineWorker` generics on each `queueName` in the tree.

---

## `useProcessor`

Low-level registry used by `defineQueue` / `defineWorker` / `defineFlowProducer` and the generated workers bundle. Prefer the helpers unless you need programmatic control.

### Example

```ts
import { useProcessor } from '#processor-utils'

const { createQueue, createWorker, createFlowProducer, stopAll } = useProcessor()

const queue = createQueue('emails')
const worker = createWorker('emails', async job => {
  // ...
})

// later
const { ok, errors } = await stopAll()
if (!ok) {
  console.error('Failed to close some BullMQ resources', errors)
}

// force-close workers (e.g. after shutdown timeout in the workers process)
await stopAll({ force: true })
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

  createFlowProducer(
    options?: Omit<QueueBaseOptions, 'connection'>,
  ): FlowProducer

  stopAll(options?: StopAllOptions): Promise<StopAllResult>

  readonly queues: Queue[]
  readonly workers: Worker[]
  readonly flowProducers: FlowProducer[]
}

interface StopAllOptions {
  /** Passed to `worker.close(force)` when shutting down workers (BullMQ graceful shutdown). */
  force?: boolean
}

interface StopAllResult {
  ok: boolean
  errors: Error[]
}
```

Queues and flow producers created via `createQueue` / `createFlowProducer` use `enableOfflineQueue: false` on the Redis connection so producers fail fast when Redis is unavailable ([BullMQ failing fast pattern](https://docs.bullmq.io/patterns/failing-fast-when-redis-is-down)). Queue, worker, and flow producer `error` events are logged with the `nuxt-processor` tag.

The module registers a Nitro plugin that calls `stopAll()` on server `close`, so queues and flow producers opened in the Nuxt app process are closed on shutdown.

Workers created via `createWorker` use `autorun: false`. The generated workers entry calls `.run()` on each worker. Worker shutdown uses a 25s graceful timeout by default (override with `processor.shutdown.timeoutMs`), then `stopAll({ force: true })` if needed.

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
  stop(options?: StopAllOptions): Promise<StopAllResult>
}>
```

---

## Re-exported BullMQ types

From `#processor-utils` / `#bullmq`:

`Queue`, `Worker`, `FlowProducer`, `Processor`, `QueueOptions`, `QueueBaseOptions`, `WorkerOptions`, `JobsOptions`, `Job`, `FlowJob`, `FlowChildJob`, `FlowOpts`, `FlowQueuesOpts`, `JobNode`

See [BullMQ documentation](https://docs.bullmq.io/) for queue/worker option details.
