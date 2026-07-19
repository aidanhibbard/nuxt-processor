---
title: Define Flow Producer
---

# Define Flow Producer

`defineFlowProducer` registers a BullMQ `FlowProducer` using the Redis connection from `useRuntimeConfig().redis` (see [Redis configuration](/redis)). Use it to add parent/child job trees atomically across one or more queues.

This is a BullMQ-compatible primitive — not an application workflow engine. For queue/worker setup, see [Define Queue](/define-queue) and [Define Worker](/define-worker).

Create `server/flows/panel.ts`:

```ts
import { defineFlowProducer } from '#processor'

export default defineFlowProducer()
```

`options` are forwarded to BullMQ's `FlowProducer` constructor except `connection`, which the module sets from runtime config. Pass [telemetry](https://docs.bullmq.io/guide/telemetry/traces) via `options.telemetry` if you instrument queues and workers.

## Adding flows

Each node in a flow specifies `name` (job name), `queueName`, optional `data`, `opts`, and nested `children`. Parent and child jobs can live on different queues.

```ts
import flowProducer from '~/server/flows/panel'

const tree = await flowProducer.add({
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
    {
      name: 'panel-response-shard',
      queueName: 'panel-response-shard',
      data: { shardIndex: 1 },
      opts: { jobId: 'shard-1' },
    },
  ],
})
```

The call is atomic: either the entire tree is added or none of it is. `add()` returns a `JobNode` tree with `Job` instances for every node.

### Per-queue defaults

Pass a second argument to `add()` with `queuesOptions` to set per-queue defaults (for example `defaultJobOptions`) for jobs created in that flow:

```ts
await flowProducer.add(
  { name: 'parent', queueName: 'parent-queue', children: [/* ... */] },
  {
    queuesOptions: {
      'parent-queue': { defaultJobOptions: { removeOnComplete: true } },
    },
  },
)
```

## `addBulk()`

Add multiple independent flow trees atomically:

```ts
await flowProducer.addBulk([
  { name: 'root-1', queueName: 'queue-a', children: [/* ... */] },
  { name: 'root-2', queueName: 'queue-b' },
])
```

See [Adding flows in bulk](https://docs.bullmq.io/guide/flows/adding-bulks) in the BullMQ docs.

## Parent workers and `getChildrenValues()`

A parent job is not processed until all its children complete successfully. In the parent worker, read child return values with `job.getChildrenValues()`:

```ts
import { defineWorker } from '#processor'

export default defineWorker({
  name: 'questionnaire-run',
  async processor(job) {
    const childrenValues = await job.getChildrenValues()
    // keys are fully-qualified job keys; values are child return values
    return { shards: Object.values(childrenValues) }
  },
})
```

See [BullMQ flows](https://docs.bullmq.io/guide/flows#get-children-values).

## `waiting-children` state

While children are still running, the parent job is in the `waiting-children` state. Inspect it with:

```ts
const state = await job.getState()
// 'waiting-children' until all children succeed
```

Parents in this state are not picked up by workers until dependencies are satisfied.

## Failed-child behavior

By default, a parent waits for children to complete successfully. Configure child job `opts` to change that:

| Option | Effect |
| --- | --- |
| `failParentOnFailure` | Parent is marked failed when this child fails (can propagate up the tree) |
| `continueParentOnFailure` | Parent starts as soon as this child fails |
| `ignoreDependencyOnFailure` | Parent completes without waiting for this failed child |
| `removeDependencyOnFailure` | Removes the dependency so the parent can complete without this child |

See BullMQ guides: [Fail Parent](https://docs.bullmq.io/guide/flows/fail-parent), [Continue Parent](https://docs.bullmq.io/guide/flows/continue-parent), [Ignore Dependency](https://docs.bullmq.io/guide/flows/ignore-dependency), [Remove Dependency](https://docs.bullmq.io/guide/flows/remove-dependency).

## Cleanup

When removing jobs that are part of a flow:

1. Removing a parent removes all its children.
2. Removing a child removes the parent's dependency on that child; if it was the last child, the parent may complete.
3. A job can be both parent and child; removal applies both rules.
4. If any job to be removed is locked, removal fails and no jobs are removed.

Use `job.remove()` or `queue.remove(job.id)`. See [Jobs removal](https://docs.bullmq.io/guide/flows#jobs-removal) in the BullMQ docs.

## Progressive results (caveat)

Flows block the parent until children finish. They are not a streaming API. If you need partial child results while work is still in progress (for example broadcasting shard answers as they complete), poll child state with `job.getDependencies()` or similar — flows alone will not push incremental updates to the parent processor.

## Shutdown

`defineFlowProducer` registers the instance with `useProcessor()`. `stopAll()` closes flow producers after workers and queues. The Nitro `close` plugin calls `stopAll()` automatically when the Nuxt server shuts down.

For full signatures, see the [API reference](/api#defineflowproducer).
