import { NextRequest, NextResponse } from 'next/server'
import { ingestUpload } from '@/lib/course-manager/service'
import { classifyResource } from '@/lib/course-manager/classification'
import { addBatchFile, createUploadBatch, getUploadBatch, recomputeBatchStatus, updateBatchFileStatus, upsertCourse } from '@/lib/app-state/service'
import { appendLog } from '@/lib/logging'
import { requireAuthCookie } from '@/lib/api-auth'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import {
  uploadFileToStorage,
  persistUploadMetadata,
  persistDocumentChunks,
  upsertCloudUnit
} from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const authError = requireAuthCookie(request)
  if (authError) return authError

  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
  }

  try {
    await appendLog('uploads', '[UPLOAD] request received', { route: '/api/course-manager/upload' })
    const form = await request.formData()
    await appendLog('uploads', '[UPLOAD] form parsed', {
      hasSingleFile: form.has('file'),
      multiFileCount: form.getAll('files').length
    })

    const singleFile = form.get('file')
    const multipleFiles = form.getAll('files')
    const files = [...multipleFiles, singleFile].filter((value): value is File => value instanceof File)

    if (!files.length) {
      return NextResponse.json({ error: 'at least one file is required' }, { status: 400 })
    }

    const forceNewCurriculum = String(form.get('forceNewCurriculum') || '').toLowerCase() === 'true'
    const courseCode = String(form.get('courseCode') || '').trim() || undefined
    const courseName = String(form.get('courseName') || '').trim() || undefined
    const semester = String(form.get('semester') || '').trim() || undefined
    const university = String(form.get('university') || '').trim() || undefined
    const batchName = String(form.get('batchName') || '').trim() || undefined
    const batchIdFromClient = String(form.get('batchId') || '').trim() || undefined
    const rawFileMetadata = String(form.get('fileMetadata') || '').trim()

    let fileMetadata: Array<{
      fileName: string
      relativePath?: string
      unit?: string
      resourceType?: string
      topic?: string
      week?: number
      semester?: string
      academicYear?: number
      duplicateStrategy?: 'skip' | 'replace' | 'keep_both'
    }> = []

    if (rawFileMetadata) {
      try {
        fileMetadata = JSON.parse(rawFileMetadata)
      } catch (error: any) {
        await appendLog('uploads', '[UPLOAD ERROR]', {
          stage: 'file_metadata_parse',
          error: error?.message || String(error)
        })
        return NextResponse.json({ ok: false, error: 'Invalid fileMetadata JSON', details: error?.message || 'Malformed file metadata' }, { status: 400 })
      }
    }

    const targetCourseCode = (courseCode || fileMetadata[0]?.unit || 'UNCLASSIFIED').toUpperCase()
    const course = upsertCourse({
      courseCode: targetCourseCode,
      courseName,
      semester,
      university,
      source: 'batch_upload',
      userId: user.id
    })

    const totalBytes = files.reduce((acc, file) => acc + file.size, 0)
    const batch = batchIdFromClient
      ? getUploadBatch(batchIdFromClient) || createUploadBatch({
          userId: user.id,
          courseId: course.id,
          name: batchName || `${targetCourseCode} · ${new Date().toISOString().slice(0, 10)} · ${files.length} files`,
          totalFiles: files.length,
          totalBytes
        })
      : createUploadBatch({
          userId: user.id,
          courseId: course.id,
          name: batchName || `${targetCourseCode} · ${new Date().toISOString().slice(0, 10)} · ${files.length} files`,
          totalFiles: files.length,
          totalBytes
        })

    await appendLog('uploads', '[UPLOAD] batch created', {
      batchId: batch.id,
      fileCount: files.length,
      courseCode: targetCourseCode
    })

    const batchId = batch.id as string

    const createdFiles = files.map((file) => {
      const metadata = fileMetadata.find((entry) => entry.fileName === file.name)
      const classified = classifyResource({
        fileName: file.name,
        relativePath: metadata?.relativePath
      })

      return addBatchFile({
        batchId,
        userId: user.id,
        courseId: course.id,
        originalFilename: file.name,
        displayName: file.name,
        relativePath: metadata?.relativePath,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        resourceType: metadata?.resourceType || classified.resourceType,
        week: metadata?.week ?? classified.week,
        topic: metadata?.topic ?? classified.topic,
        semester: metadata?.semester ?? classified.semester,
        academicYear: metadata?.academicYear ?? classified.academicYear,
        duplicateStrategy: metadata?.duplicateStrategy || 'skip'
      })
    })

    const results: Array<Record<string, unknown>> = []
    for (let index = 0; index < files.length; index++) {
      const file = files[index]
      const batchFile = createdFiles[index]
      const metadata = fileMetadata.find((entry) => entry.fileName === file.name)
      const classified = classifyResource({
        fileName: file.name,
        relativePath: metadata?.relativePath
      })

      try {
        updateBatchFileStatus({ batchFileId: batchFile.id, status: 'UPLOADING' })
        const buffer = Buffer.from(await file.arrayBuffer())

        updateBatchFileStatus({ batchFileId: batchFile.id, status: 'PROCESSING' })
        const upload = await ingestUpload({
          userId: user.id,
          fileName: file.name,
          originalFilename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          content: buffer,
          forceNewCurriculum,
          batchId,
          batchFileId: batchFile.id,
          relativePath: metadata?.relativePath,
          metadata: {
            courseCode: (metadata?.unit || courseCode || targetCourseCode).toUpperCase(),
            courseName,
            semester: metadata?.semester || semester,
            university
          },
          classification: {
            resourceType: metadata?.resourceType || classified.resourceType,
            topic: metadata?.topic || classified.topic,
            week: metadata?.week ?? classified.week,
            semester: metadata?.semester || classified.semester,
            academicYear: metadata?.academicYear ?? classified.academicYear
          }
        })

        updateBatchFileStatus({
          batchFileId: batchFile.id,
          status: upload.duplicated ? 'DUPLICATE_SKIPPED' : 'READY',
          documentId: String(upload.documentId || ''),
          fileHash: typeof upload.fileHash === 'string' ? upload.fileHash : undefined,
          version: typeof upload.version === 'number' ? upload.version : undefined
        })

        // Persist to Supabase Storage + Postgres (non-blocking; local SQLite already written above)
        if (!upload.duplicated && upload.documentId) {
          void (async () => {
            try {
              const storagePath = await uploadFileToStorage(user.id, String(upload.documentId), file.name, buffer, file.type || 'application/octet-stream')
              await upsertCloudUnit(user.id, upload.courseCode || targetCourseCode, courseName || upload.courseCode || targetCourseCode, semester)
              const uploadId = await persistUploadMetadata(user.id, String(upload.documentId), storagePath ?? `pending/${upload.documentId}/${file.name}`, {
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                sizeBytes: file.size,
                courseCode: upload.courseCode || targetCourseCode,
                fileHash: typeof upload.fileHash === 'string' ? upload.fileHash : '',
                chunkCount: upload.chunks ?? 0,
                documentType: upload.documentType,
                week: metadata?.week ?? undefined,
                resourceType: metadata?.resourceType ?? undefined
              })
              if (upload.chunkData && upload.chunkData.length > 0) {
                await persistDocumentChunks(user.id, uploadId, String(upload.documentId), upload.courseCode || targetCourseCode, upload.chunkData)
              }
            } catch (cloudErr) {
              console.error('[Upload] Cloud persistence failed (non-fatal):', cloudErr)
            }
          })()
        }

        results.push({
          fileName: file.name,
          batchFileId: batchFile.id,
          ok: true,
          duplicated: Boolean(upload.duplicated),
          documentId: upload.documentId,
          chunks: upload.chunks,
          courseCode: upload.courseCode
        })
      } catch (fileError: any) {
        updateBatchFileStatus({
          batchFileId: batchFile.id,
          status: 'FAILED',
          errorMessage: fileError?.message || 'Processing failed'
        })

        results.push({
          fileName: file.name,
          batchFileId: batchFile.id,
          ok: false,
          error: fileError?.message || 'Processing failed'
        })
      }
    }

    recomputeBatchStatus(batchId)
    const refreshed = getUploadBatch(batchId)

    await appendLog('uploads', '[UPLOAD] response returned', {
      batchId,
      total: results.length,
      succeeded: results.filter((entry) => entry.ok).length,
      failed: results.filter((entry) => !entry.ok).length
    })

    return NextResponse.json({
      ok: true,
      batchId,
      batch: refreshed,
      summary: {
        total: results.length,
        succeeded: results.filter((entry) => entry.ok).length,
        failed: results.filter((entry) => !entry.ok).length,
        duplicated: results.filter((entry) => entry.duplicated).length
      },
      results
    })
  } catch (error: any) {
    await appendLog('uploads', '[UPLOAD ERROR]', {
      stage: 'route',
      error: error?.message || String(error)
    })
    return NextResponse.json({ ok: false, error: error.message || 'upload failed' }, { status: 500 })
  }
}
