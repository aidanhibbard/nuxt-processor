import { createConsola } from 'consola'
import { name } from '../../package.json'

export const logger = createConsola({}).withTag(name)
