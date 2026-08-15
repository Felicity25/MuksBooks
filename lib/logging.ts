import { promises as fs } from 'fs'
import path from 'path'

const LOG_ROOT = path.join(process.cwd(), 'Knowledge', 'logs')

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
