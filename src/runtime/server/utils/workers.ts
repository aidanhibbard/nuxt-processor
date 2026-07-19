import type {
  Job,
  JobsOptions,
  QueueOptions,
  QueueBaseOptions,
  WorkerOptions,
  Processor,
  ConnectionOptions,
  FlowProducer,
  FlowJob,
  FlowChildJob,
  FlowOpts,
  FlowQueuesOpts,
  JobNode,
} from 'bullmq'
import { Queue, Worker, FlowProducer as FlowProducerClass } from 'bullmq'
import { consola } from 'consola'
import { useRuntimeConfig } from 'nitropack/runtime'
import { normalizeRedisConnectionEntry } from './normalize-redis-connection'

const logger = consola.create({}).withTag('nuxt-processor')

export interface StopAllOptions {
  force?: boolean
}

export interface StopAllResult {
  ok: boolean
  errors: Error[]
}

function resolveConnection(type: 'queue' | 'worker'): ConnectionOptions {
  const { redis } = useRuntimeConfig()
  const connection: Record<string, unknown> = {}

  if (redis) {
    for (const [key, value] of Object.entries(redis)) {
      const normalized = normalizeRedisConnectionEntry(key, value)
      if (normalized === undefined) {
        continue
      }
      connection[key] = normalized
    }
  }

  if (type === 'queue') {
    connection.enableOfflineQueue = false
  }
  else if (type === 'worker') {
    connection.maxRetriesPerRequest = null
  }

  return connection as ConnectionOptions
}

interface WorkersRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queues: Array<Queue<any, any, any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workers: Array<Worker<any, any, any>>
  flowProducers: Array<FlowProducer>
}

interface ProcessorState {
  registry?: WorkersRegistry
}

/** Nitro may bundle top-level defineQueue() before module-level bindings here; use only globals inside this function. */
function getProcessorState(): ProcessorState {
  const key = Symbol.for('nuxt-processor.state')
  const g = globalThis as typeof globalThis & { [key: symbol]: ProcessorState | undefined }
  if (!g[key]) {
    g[key] = {}
  }
  return g[key]
}

function getRegistry(): WorkersRegistry {
  const state = getProcessorState()
  if (!state.registry) {
    state.registry = {
      queues: [],
      workers: [],
      flowProducers: [],
    }
  }
  return state.registry
}

function clearRegistry(): void {
  getProcessorState().registry = undefined
}

function collectCloseErrors(
  results: PromiseSettledResult<void>[],
  kind: 'worker' | 'queue' | 'flowProducer',
  errors: Error[],
): void {
  for (const result of results) {
    if (result.status === 'rejected') {
      const error = result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason))
      errors.push(error)
      logger.error(`Failed to close ${kind}`, error)
    }
  }
}

export function useProcessor() {
  function createQueue<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DataTypeOrJob = any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DefaultResultType = any,
    DefaultNameType extends string = string,
  >(
    name: DefaultNameType,
    options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions },
  ): Queue<DataTypeOrJob, DefaultResultType, DefaultNameType> {
    const queue = new Queue<DataTypeOrJob, DefaultResultType, DefaultNameType>(name, {
      connection: resolveConnection('queue'),
      ...options,
    })
    queue.on('error', (error: Error) => {
      logger.error('Queue error', error)
    })
    getRegistry().queues.push(queue)
    return queue
  }

  function createWorker<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DataType = any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ResultType = any,
    NameType extends string = string,
  >(
    name: NameType,
    processor: Processor<DataType, ResultType, NameType>,
    options?: Omit<WorkerOptions, 'connection'>,
  ): Worker<DataType, ResultType, NameType> {
    const worker = new Worker<DataType, ResultType, NameType>(name, processor, {
      connection: resolveConnection('worker'),
      ...options,
      autorun: false,
    })
    worker.on('error', (error: Error) => {
      logger.error('Worker error', error)
    })
    getRegistry().workers.push(worker)
    return worker
  }

  function createFlowProducer(
    options?: Omit<QueueBaseOptions, 'connection'>,
  ): FlowProducer {
    const flowProducer = new FlowProducerClass({
      connection: resolveConnection('queue'),
      ...options,
    })
    flowProducer.on('error', (error: Error) => {
      logger.error('FlowProducer error', error)
    })
    getRegistry().flowProducers.push(flowProducer)
    return flowProducer
  }

  async function stopAll(options?: StopAllOptions): Promise<StopAllResult> {
    const state = getRegistry()
    const force = options?.force ?? false
    const errors: Error[] = []

    const workerResults = await Promise.allSettled(
      state.workers.map(worker => worker.close(force)),
    )
    collectCloseErrors(workerResults, 'worker', errors)

    const queueResults = await Promise.allSettled(
      state.queues.map(queue => queue.close()),
    )
    collectCloseErrors(queueResults, 'queue', errors)

    const flowProducerResults = await Promise.allSettled(
      state.flowProducers.map(flowProducer => flowProducer.close()),
    )
    collectCloseErrors(flowProducerResults, 'flowProducer', errors)

    clearRegistry()

    return { ok: errors.length === 0, errors }
  }

  return {
    createQueue,
    createWorker,
    createFlowProducer,
    stopAll,
    get queues() { return getRegistry().queues },
    get workers() { return getRegistry().workers },
    get flowProducers() { return getRegistry().flowProducers },
  }
}

export type {
  Queue,
  Worker,
  FlowProducer,
  Processor,
  QueueOptions,
  QueueBaseOptions,
  WorkerOptions,
  JobsOptions,
  Job,
  FlowJob,
  FlowChildJob,
  FlowOpts,
  FlowQueuesOpts,
  JobNode,
}
