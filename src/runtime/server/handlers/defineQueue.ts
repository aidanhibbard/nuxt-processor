import type { Queue, QueueOptions, JobsOptions } from '../utils/workers'
import { $workers } from '../utils/workers'

type DefineQueueArgs<DefaultNameType extends string = string> = {
  name: DefaultNameType
  options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions }
}

export function defineQueue<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DataTypeOrJob = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DefaultResultType = any,
  DefaultNameType extends string = string,
>({ name, options }: DefineQueueArgs<DefaultNameType>): Queue<DataTypeOrJob, DefaultResultType, DefaultNameType> {
  const { createQueue } = $workers()
  return createQueue<DataTypeOrJob, DefaultResultType, DefaultNameType>(name, options)
}

export default defineQueue
