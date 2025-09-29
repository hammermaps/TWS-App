import { setupWorker } from 'msw'
import { handlers } from './handlers'

// This worker intercepts requests during development in the browser
export const worker = setupWorker(...handlers)

