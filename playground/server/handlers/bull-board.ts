import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { H3Adapter } from '@bull-board/h3'
import type { H3Event } from 'h3'
import HelloQueue from '../queues'
import BasicQueue from '../queues/basic'

const serverHandler = new H3Adapter()
serverHandler.setBasePath('/bull-board')

createBullBoard({
  queues: [
    new BullMQAdapter(HelloQueue),
    new BullMQAdapter(BasicQueue),
  ],
  serverAdapter: serverHandler,
})

const uiHandler = serverHandler.registerHandlers()

export const redirectToBullboard = async (event: H3Event) => await uiHandler.handler(event)
