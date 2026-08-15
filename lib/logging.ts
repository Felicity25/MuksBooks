import { promises as fs } from 'fs'
import path from 'path'

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME)
const LOG_ROOT = IS_SERVERLESS
  ? path.join('/tmp', 'muksbooks', 'logs')
  : path.join(process.cwd(), 'Knowledge', 'logs')

function nowIso() {
  return new Date().toISOString()
}

export async function appendLog(channel: string, message: string, details?: Record<string, unknown>) {
  await fs.mkdir(LOG_ROOT, { recursive: true })
  const line = JSON.stringify({
    at: nowIso(),
    channel,
    message,
    details: details || {}
  })
  const file = path.join(LOG_ROOT, `${channel}.log`)
  await fs.appendFile(file, `${line}\n`, 'utf8')
}
