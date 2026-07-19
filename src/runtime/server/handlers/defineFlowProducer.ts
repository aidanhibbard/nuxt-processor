import type { FlowProducer, QueueBaseOptions } from '../utils/workers'
import { useProcessor } from '../utils/workers'

type DefineFlowProducerArgs = {
  options?: Omit<QueueBaseOptions, 'connection'>
}

export function defineFlowProducer(args: DefineFlowProducerArgs = {}): FlowProducer {
  const { createFlowProducer } = useProcessor()
  return createFlowProducer(args.options)
}

export default defineFlowProducer
