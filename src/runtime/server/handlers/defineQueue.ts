import type { Queue, QueueOptions, JobsOptions } from '../utils/workers'
import { $workers } from '../utils/workers'

type DefineQueueArgs = {
  name: Queue['name']
  options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions }
}

export function defineQueue({ name, options }: DefineQueueArgs): Queue {
  const { createQueue } = $workers()
  return createQueue(name, options)
}

export default defineQueue
