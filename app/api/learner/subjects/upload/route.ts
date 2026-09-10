import { NextRequest, NextResponse } from 'next/server'
import { learnerSubjectContainer, resolveLearnerSubject } from '@/lib/academic-context'
import { getCurriculumSubject } from '@/lib/learner/curriculum-registry'
import { proposeSubjectTopics, proposeUnmappedTopicHeadings } from '@/lib/learner/subject-context'
import { normalizeLearnerProfile } from '@/lib/learner/store'
import { ingestUpload } from '@/lib/course-manager/service'
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { persistDocumentChunks, persistUploadMetadata, uploadFileToStorage } from '@/lib/supabase/documents-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    const client = createSupabaseServerClient()
    if (!client) return NextResponse.json({ ok: false, error: 'Cloud storage is unavailable.' }, { status: 503 })

    const form = await request.formData()
    const subjectId = String(form.get('subjectId') || '').trim()
    const file = form.get('file')
    if (!subjectId || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'subjectId and file are required.' }, { status: 400 })
    }

    const { data: settings, error: profileError } = await client
      .from('user_settings')
      .select('learner_profile')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profileError) throw new Error(profileError.message)
    const profile = normalizeLearnerProfile(settings?.learner_profile)
    const subject = resolveLearnerSubject(profile, subjectId)
    if (!subject) return NextResponse.json({ ok: false, error: 'Subject not found.' }, { status: 404 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const upload = await ingestUpload({
      userId: user.id,
      fileName: file.name,
      originalFilename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      content: buffer,
      domain: 'academic',
      metadata: { courseCode: 'UNCLASSIFIED', documentType: 'School subject material' },
      classification: { resourceType: 'Subject material' }
    })
    const documentId = String(upload.documentId || '')
    if (!documentId) throw new Error('The upload could not be indexed.')

    const storagePath = await uploadFileToStorage(user.id, documentId, file.name, buffer, file.type || 'application/octet-stream')
    if (!storagePath) return NextResponse.json({ ok: false, error: 'The file could not be stored in cloud storage.' }, { status: 503 })
    const container = learnerSubjectContainer(profile, subject)
    const uploadId = await persistUploadMetadata(user.id, documentId, storagePath, {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      courseCode: '',
      fileHash: String(upload.fileHash || ''),
      chunkCount: upload.chunks || 0,
      documentType: 'School subject material',
      resourceType: 'Subject material',
      domain: 'academic',
      container
    })
    if (!uploadId) return NextResponse.json({ ok: false, error: 'The subject link could not be saved.' }, { status: 503 })
    if (upload.chunkData?.length) await persistDocumentChunks(user.id, uploadId, documentId, '', upload.chunkData)

    const extractedText = (upload.chunkData || []).map((chunk) => chunk.text).join('\n')
    const catalogueSubject = subject.curriculumSubjectCode
      ? getCurriculumSubject(subject.curriculumId || profile.curriculum, subject.curriculumSubjectCode)
      : undefined
    const proposals = catalogueSubject
      ? proposeSubjectTopics(extractedText, catalogueSubject)
      : proposeUnmappedTopicHeadings(extractedText)

    return NextResponse.json({
      ok: true,
      upload: { documentId, fileName: file.name, subjectId: subject.id },
      proposals,
      confirmationRequired: true
    })
  } catch (error) {
    console.error('[Learner subject upload] Failed:', error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 500 })
  }
}