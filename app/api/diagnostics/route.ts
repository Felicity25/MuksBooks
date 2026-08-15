import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    nodeVersion: process.version,
    platform: process.platform,
    env: {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV
    }
  }

  // Test 1: Can we write to /tmp?
  try {
    const fs = await import('fs')
    const path = await import('path')
    const tmpDir = path.join('/tmp', 'muksbooks-diag')
    fs.default.mkdirSync(tmpDir, { recursive: true })
    fs.default.writeFileSync(path.join(tmpDir, 'test.txt'), 'ok')
    diagnostics.tmpWritable = true
    diagnostics.tmpDir = tmpDir
  } catch (e: any) {
    diagnostics.tmpWritable = false
    diagnostics.tmpError = e.message
  }

  // Test 2: Can we import node:sqlite?
  try {
    const sqlite = eval('require')('node:sqlite')
    diagnostics.sqliteAvailable = true
    diagnostics.sqliteKeys = Object.keys(sqlite)
  } catch (e: any) {
    diagnostics.sqliteAvailable = false
    diagnostics.sqliteError = e.message
  }

  // Test 3: Can we create a SQLite DB in /tmp?
  if (diagnostics.tmpWritable && diagnostics.sqliteAvailable) {
    try {
      const { DatabaseSync } = eval('require')('node:sqlite')
      const db = new DatabaseSync('/tmp/muksbooks-diag/test.db')
      db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, val TEXT)')
      db.prepare('INSERT INTO test VALUES (?, ?)').run(1, 'hello')
      const row = db.prepare('SELECT val FROM test WHERE id = 1').get()
      diagnostics.sqliteWorking = true
      diagnostics.sqliteTestResult = row
      db.close()
    } catch (e: any) {
      diagnostics.sqliteWorking = false
      diagnostics.sqliteDbError = e.message
    }
  }

  return NextResponse.json({ ok: true, diagnostics })
}
