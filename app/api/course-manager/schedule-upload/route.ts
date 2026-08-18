import { NextRequest, NextResponse } from 'next/server'
import { requireAuthCookie } from '@/lib/api-auth'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { ingestUpload } from '@/lib/course-manager/service'
import { extractTextFromUpload } from '@/lib/course-manager/extractors'
import { extractScheduleFromText, type ExtractedScheduleEntry } from '@/lib/course-manager/schedule-extractor'
import { appendLog } from '@/lib/logging'
import { getCloudUnit, uploadFileToStorage, persistUploadMetadata } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

interface PreviewEntry extends ExtractedScheduleEntry {
  sourceUploadId: string | null
}

/**
 * Upload one or more unit-guide/schedule documents for a specific unit, extract the weekly
 * schedule from each, and return an editable preview. Nothing is written to
 * unit_schedule_entries yet — the student must review and POST /api/app-state/unit-schedule
 * to save it. The source documents are still ingested into Uploads as usual.
 */
export async function POST(request: NextRequest) {
  const authError = requireAuthCookie(request)
  if (authError) return authError

  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const unitId = String(form.get('unitId') || '').trim()
    if (!unitId) {
      return NextResponse.json({ ok: false, error: 'unitId is required' }, { status: 400 })
    }

    const unit = await getCloudUnit(user.id, unitId)
    if (!unit) {
      return NextResponse.json({ ok: false, error: 'Unit not found' }, { status: 404 })
    }

    const singleFile = form.get('file')
    const multipleFiles = form.getAll('files')
    const files = [...multipleFiles, singleFile].filter((value): value is File => value instanceof File)

    if (!files.length) {
      return NextResponse.json({ ok: false, error: 'At least one file is required' }, { status: 400 })
    }

    const mergedByWeek = new Map<number, PreviewEntry>()
    const fileSummaries: Array<{ fileName: string; ok: boolean; weeksFound: number; error?: string }> = []
    let anySucceeded = false

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const extractedText = await extractTextFromUpload({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          content: buffer
        })

        const upload = await ingestUpload({
          userId: user.id,
          fileName: file.name,
          originalFilename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          content: buffer,
          textContent: extractedText,
          metadata: { courseCode: unit.code as string, courseName: unit.name as string },
          classification: { resourceType: 'Unit guide' }
        })

        let cloudUploadId: string | null = null
        if (!upload.duplicated && upload.documentId) {
          try {
            const storagePath = await uploadFileToStorage(user.id, String(upload.documentId), file.name, buffer, file.type || 'application/octet-stream')
            cloudUploadId = await persistUploadMetadata(user.id, String(upload.documentId), storagePath ?? `pending/${upload.documentId}/${file.name}`, {
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
              courseCode: unit.code as string,
              fileHash: typeof upload.fileHash === 'string' ? upload.fileHash : '',
              chunkCount: upload.chunks ?? 0,
              documentType: 'Unit guide',
              processingStatus: 'tutor_ready'
            })
          } catch (cloudErr) {
            console.error('[Schedule upload] Cloud persistence failed (non-fatal):', cloudErr)
          }
        }

        const result = extractScheduleFromText(file.name, extractedText)

        for (const entry of result.entries) {
          const existing = mergedByWeek.get(entry.weekNumber)
          if (!existing) {
            mergedByWeek.set(entry.weekNumber, { ...entry, sourceUploadId: cloudUploadId })
          } else {
            existing.additionalTopics.push(entry.topic, ...entry.additionalTopics)
            existing.confidence = Math.max(existing.confidence, entry.confidence)
          }
        }

        fileSummaries.push({ fileName: file.name, ok: true, weeksFound: result.entries.length })
        anySucceeded = true
      } catch (fileError: any) {
        await appendLog('errors', 'Schedule upload extraction failed', {
          fileName: file.name,
          error: fileError?.message || String(fileError)
        })
        fileSummaries.push({ fileName: file.name, ok: false, weeksFound: 0, error: fileError?.message || 'Extraction failed' })
      }
    }

    const entries = Array.from(mergedByWeek.values()).sort((a, b) => a.weekNumber - b.weekNumber)

    if (!anySucceeded) {
      return NextResponse.json({
        ok: false,
        error: 'Could not process any of the uploaded files. The document was kept in Uploads — you can retry analysis or enter the schedule manually.',
        files: fileSummaries
      }, { status: 422 })
    }

    if (entries.length === 0) {
      return NextResponse.json({
        ok: true,
        partial: true,
        entries: [],
        files: fileSummaries,
        message: 'The document was uploaded but no weekly schedule could be detected. You can add weeks manually below.'
      })
    }

    return NextResponse.json({
      ok: true,
      partial: entries.length < 8,
      unit: { id: unit.id, code: unit.code, name: unit.name },
      entries,
      files: fileSummaries
    })
  } catch (error: any) {
    await appendLog('errors', 'Schedule upload route failed', { error: error?.message || String(error) })
    return NextResponse.json({ ok: false, error: error?.message || 'Failed to process schedule upload' }, { status: 500 })
  }
}
