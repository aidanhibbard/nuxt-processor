import type { FlowProducer, FlowProducerOptions } from '../utils/workers'
import { useProcessor } from '../utils/workers'

type DefineFlowProducerArgs = {
  options?: Omit<FlowProducerOptions, 'connection'>
}

export function defineFlowProducer(args: DefineFlowProducerArgs = {}): FlowProducer {
  const { createFlowProducer } = useProcessor()
  return createFlowProducer(args.options)
}

export default defineFlowProducer
