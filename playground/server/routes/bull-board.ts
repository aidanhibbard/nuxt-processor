import { defineEventHandler } from 'h3'
import { redirectToBullboard } from '../handlers/bull-board'

export default defineEventHandler(redirectToBullboard)
