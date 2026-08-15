import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'

async function getPrisma() {
  if (!process.env.DATABASE_URL) return null
  try {
    const { prisma } = await import('@/lib/prisma')
    return prisma
  } catch {
    return null
  }
}

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME)
const LOG_FILE = IS_SERVERLESS
  ? path.join('/tmp', 'muksbooks', 'logs', 'error-reports.jsonl')
  : path.join(process.cwd(), 'logs', 'error-reports.jsonl')

async function readBackupReports() {
  try {
    const raw = await fs.readFile(LOG_FILE, 'utf8')
    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean)
    return lines
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter((entry): entry is Record<string, any> => !!entry)
      .reverse()
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const severity = searchParams.get('severity')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const skip = (page - 1) * limit

  try {
    const prismaClient = await getPrisma()
    if (!prismaClient) throw new Error('DATABASE_URL not configured')

    const where: any = {}
    if (severity) {
      where.severity = severity
    }

    const [reports, total] = await Promise.all([
      prismaClient.errorReport.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prismaClient.errorReport.count({ where })
    ])

    return NextResponse.json({
      ok: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    const message = String(error?.message || error)
    if (message.includes("Can't reach database server") || message.includes('PrismaClientInitializationError')) {
      console.warn('[ErrorReport] Database unavailable; loading backup reports instead.')
    } else {
      console.error('[ErrorReport] Failed to fetch reports:', message)
    }

    const backupReports = await readBackupReports()
    const filtered = severity ? backupReports.filter((report) => report.severity === severity) : backupReports
    const pageData = filtered.slice(skip, skip + limit).map((report) => ({
      ...report,
      reviewed: false,
      reviewNotes: report.reviewNotes || null
    }))

    return NextResponse.json({
      ok: true,
      data: pageData,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit)
      },
      source: 'backup-file'
    })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, reviewed, reviewNotes } = body

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Report ID is required' }, { status: 400 })
    }

    const prismaClient = await getPrisma()
    if (!prismaClient) {
      return NextResponse.json({ ok: false, error: 'Database is not configured' }, { status: 503 })
    }

    const updated = await prismaClient.errorReport.update({
      where: { id },
      data: {
        reviewed: reviewed !== undefined ? reviewed : undefined,
        reviewNotes: reviewNotes !== undefined ? reviewNotes : undefined,
        reviewedAt: reviewed ? new Date() : undefined
      }
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (error: any) {
    console.error('[ErrorReport] Failed to update report:', error?.message || error)
    return NextResponse.json({ ok: false, error: 'Failed to update report' }, { status: 500 })
  }
}
