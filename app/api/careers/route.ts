import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'
import {
  addAssessmentToPlanner,
  createApplicationFromJob,
  createAssessment,
  deleteApplication,
  followCompany,
  getCareerPulse,
  getCareerSettings,
  getCompanyDetails,
  listApplications,
  listAssessments,
  listCompanies,
  listCvDocuments,
  listDiscoverJobs,
  listFollowing,
  listSavedRoles,
  registerCvDocument,
  runCvMatch,
  saveRole,
  setCompanyJobMode,
  setPrimaryCv,
  unfollowCompany,
  unsaveRole,
  updateApplication,
  updateAssessment,
  updateCareerSettings
} from '@/lib/careers/service'
import {
  addAssessmentToPlannerSupabase,
  createApplicationFromJobSupabase,
  createAssessmentSupabase,
  deleteApplicationSupabase,
  followCompanySupabase,
  getCareerPulseSupabase,
  getCareerSettingsSupabase,
  getCompanyDetailsSupabase,
  isCareersCloudReady,
  listApplicationsSupabase,
  listAssessmentsSupabase,
  listCompaniesSupabase,
  listCvDocumentsSupabase,
  listDiscoverJobsSupabase,
  listFollowingSupabase,
  listSavedRolesSupabase,
  registerCvDocumentSupabase,
  runCvMatchSupabase,
  saveRoleSupabase,
  setPrimaryCvSupabase,
  unfollowCompanySupabase,
  unsaveRoleSupabase,
  updateApplicationSupabase,
  updateAssessmentSupabase,
  updateCareerSettingsSupabase
} from '@/lib/careers/supabase-service'

export const runtime = 'nodejs'

function parseCsv(input: string | null) {
  if (!input) return []
  return input.split(',').map((value) => value.trim()).filter(Boolean)
}

async function getCloudClient() {
  const client = createSupabaseServerClient()
  if (!client) return null
  const ready = await isCareersCloudReady(client)
  if (!ready) return null
  return client
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const cloudClient = await getCloudClient()
    const { searchParams } = new URL(request.url)

    const companyId = searchParams.get('companyId')
    const q = searchParams.get('q') || ''
    const roleTypes = parseCsv(searchParams.get('roleTypes'))
    const disciplines = parseCsv(searchParams.get('disciplines'))
    const countries = parseCsv(searchParams.get('countries'))
    const companies = parseCsv(searchParams.get('companies'))
    const careerAreas = parseCsv(searchParams.get('careerAreas'))

    const discover = cloudClient
      ? await listDiscoverJobsSupabase(cloudClient, { q, roleTypes, disciplines, countries, companies, careerAreas })
      : listDiscoverJobs({ q, roleTypes, disciplines, countries, companies, careerAreas })
    const companyList = cloudClient
      ? await listCompaniesSupabase(cloudClient)
      : listCompanies()

    if (!user) {
      return NextResponse.json({
        ok: true,
        mode: 'guest',
        discover,
        companies: companyList,
        company: companyId
          ? (cloudClient ? await getCompanyDetailsSupabase(cloudClient, companyId) : getCompanyDetails(companyId))
          : null,
        following: [],
        savedRoles: [],
        applications: [],
        assessments: [],
        cvDocuments: [],
        settings: null,
        careerPulse: null
      })
    }

    const userId = user.id
    const localCvDocuments = listCvDocuments(userId)

    if (cloudClient) {
      return NextResponse.json({
        ok: true,
        mode: 'authenticated',
        discover,
        companies: companyList,
        company: companyId ? await getCompanyDetailsSupabase(cloudClient, companyId, userId) : null,
        following: await listFollowingSupabase(cloudClient, userId),
        savedRoles: await listSavedRolesSupabase(cloudClient, userId),
        applications: await listApplicationsSupabase(cloudClient, userId),
        assessments: await listAssessmentsSupabase(cloudClient, userId),
        cvDocuments: await listCvDocumentsSupabase(cloudClient, userId, localCvDocuments),
        settings: await getCareerSettingsSupabase(cloudClient, userId),
        careerPulse: await getCareerPulseSupabase(cloudClient, userId)
      })
    }

    return NextResponse.json({
      ok: true,
      mode: 'authenticated',
      discover,
      companies: companyList,
      company: companyId ? getCompanyDetails(companyId, userId) : null,
      following: listFollowing(userId),
      savedRoles: listSavedRoles(userId),
      applications: listApplications(userId),
      assessments: listAssessments(userId),
      cvDocuments: listCvDocuments(userId),
      settings: getCareerSettings(userId),
      careerPulse: getCareerPulse(userId)
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load careers state.'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const cloudClient = await getCloudClient()
    const body = await request.json()
    const action = body?.action as string | undefined

    if (!action) {
      return NextResponse.json({ ok: false, error: 'action is required' }, { status: 400 })
    }

    if (!user && action !== 'discover') {
      return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const userId = user?.id || null

    if (action === 'follow-company') {
      if (cloudClient) {
        await followCompanySupabase(cloudClient, userId!, {
          companyId: body.companyId,
          roleTypes: Array.isArray(body.roleTypes) ? body.roleTypes : [],
          disciplines: Array.isArray(body.disciplines) ? body.disciplines : [],
          countries: Array.isArray(body.countries) ? body.countries : []
        })
        return NextResponse.json({ ok: true })
      }
      followCompany(userId!, {
        companyId: body.companyId,
        roleTypes: Array.isArray(body.roleTypes) ? body.roleTypes : [],
        disciplines: Array.isArray(body.disciplines) ? body.disciplines : [],
        countries: Array.isArray(body.countries) ? body.countries : []
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'save-role') {
      if (cloudClient) {
        await saveRoleSupabase(cloudClient, userId!, body.jobId)
        return NextResponse.json({ ok: true })
      }
      saveRole(userId!, body.jobId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'track-application') {
      if (cloudClient) {
        const applicationId = await createApplicationFromJobSupabase(cloudClient, userId!, {
          jobId: body.jobId,
          stage: body.stage,
          notes: body.notes,
          appliedAtUtc: body.appliedAtUtc
        })
        return NextResponse.json({ ok: true, applicationId })
      }
      const applicationId = createApplicationFromJob(userId!, {
        jobId: body.jobId,
        stage: body.stage,
        notes: body.notes,
        appliedAtUtc: body.appliedAtUtc
      })
      return NextResponse.json({ ok: true, applicationId })
    }

    if (action === 'create-assessment') {
      if (cloudClient) {
        const assessmentId = await createAssessmentSupabase(cloudClient, userId!, {
          applicationId: body.applicationId || null,
          companyId: body.companyId || null,
          customCompanyName: body.customCompanyName || null,
          assessmentType: body.assessmentType || 'Online Assessment',
          title: body.title,
          invitationReceivedAtUtc: body.invitationReceivedAtUtc || null,
          deadlineRuleHours: Number.isFinite(Number(body.deadlineRuleHours)) ? Number(body.deadlineRuleHours) : null,
          deadlineAtUtc: body.deadlineAtUtc || null,
          deadlineDateOnly: body.deadlineDateOnly || null,
          deadlineHasExactTime: Boolean(body.deadlineHasExactTime),
          employerDeadlineLabel: body.employerDeadlineLabel || null,
          employerTimezone: body.employerTimezone || null,
          assessmentUrl: body.assessmentUrl || null,
          notes: body.notes || null
        })
        return NextResponse.json({ ok: true, assessmentId })
      }
      const assessmentId = createAssessment(userId!, {
        applicationId: body.applicationId || null,
        companyId: body.companyId || null,
        customCompanyName: body.customCompanyName || null,
        assessmentType: body.assessmentType || 'Online Assessment',
        title: body.title,
        invitationReceivedAtUtc: body.invitationReceivedAtUtc || null,
        deadlineRuleHours: Number.isFinite(Number(body.deadlineRuleHours)) ? Number(body.deadlineRuleHours) : null,
        deadlineAtUtc: body.deadlineAtUtc || null,
        deadlineDateOnly: body.deadlineDateOnly || null,
        deadlineHasExactTime: Boolean(body.deadlineHasExactTime),
        employerDeadlineLabel: body.employerDeadlineLabel || null,
        employerTimezone: body.employerTimezone || null,
        assessmentUrl: body.assessmentUrl || null,
        notes: body.notes || null
      })
      return NextResponse.json({ ok: true, assessmentId })
    }

    if (action === 'set-primary-cv') {
      if (cloudClient) {
        const localDocument = listCvDocuments(userId!).find((item) => item.documentId === body.documentId) || null
        await setPrimaryCvSupabase(cloudClient, userId!, {
          documentId: body.documentId,
          label: body.label,
          localDocument
        })
        return NextResponse.json({ ok: true })
      }
      setPrimaryCv(userId!, {
        documentId: body.documentId,
        label: body.label
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'register-cv') {
      if (cloudClient) {
        const localDocument = listCvDocuments(userId!).find((item) => item.documentId === body.documentId) || null
        const result = await registerCvDocumentSupabase(cloudClient, userId!, {
          documentId: body.documentId,
          label: body.label,
          localDocument
        })
        return NextResponse.json({ ok: true, ...result })
      }
      const result = registerCvDocument(userId!, {
        documentId: body.documentId,
        label: body.label
      })
      return NextResponse.json({ ok: true, ...result })
    }

    if (action === 'run-cv-match') {
      if (cloudClient) {
        const result = await runCvMatchSupabase(cloudClient, userId!, {
          jobId: body.jobId,
          cvDocumentId: body.cvDocumentId || null,
          localDocuments: listCvDocuments(userId!)
        })
        return NextResponse.json({ ok: true, result })
      }
      const result = runCvMatch(userId!, {
        jobId: body.jobId,
        cvDocumentId: body.cvDocumentId || null
      })
      return NextResponse.json({ ok: true, result })
    }

    if (action === 'set-career-settings') {
      if (cloudClient) {
        const settings = await updateCareerSettingsSupabase(cloudClient, userId!, {
          timezone: body.timezone,
          timezoneConfirmed: body.timezoneConfirmed,
          autoAddDeadlinesToPlanner: body.autoAddDeadlinesToPlanner
        })
        return NextResponse.json({ ok: true, settings })
      }
      const settings = updateCareerSettings(userId!, {
        timezone: body.timezone,
        timezoneConfirmed: body.timezoneConfirmed,
        autoAddDeadlinesToPlanner: body.autoAddDeadlinesToPlanner
      })
      return NextResponse.json({ ok: true, settings })
    }

    if (action === 'add-assessment-to-planner') {
      if (cloudClient) {
        const plannerTaskId = await addAssessmentToPlannerSupabase(cloudClient, userId!, body.assessmentId)
        return NextResponse.json({ ok: true, plannerTaskId })
      }
      const plannerTaskId = addAssessmentToPlanner(userId!, body.assessmentId)
      return NextResponse.json({ ok: true, plannerTaskId })
    }

    if (action === 'simulate-company-mode') {
      setCompanyJobMode(body.companyId, body.mode)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Careers action failed.'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const cloudClient = await getCloudClient()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const body = await request.json()
    const action = body?.action as string | undefined

    if (action === 'update-application') {
      if (cloudClient) {
        await updateApplicationSupabase(cloudClient, user.id, body.applicationId, {
          stage: body.stage,
          notes: body.notes,
          outstandingActions: Array.isArray(body.outstandingActions) ? body.outstandingActions : undefined,
          checklist: Array.isArray(body.checklist) ? body.checklist : undefined,
          cvDocumentId: body.cvDocumentId
        })
        return NextResponse.json({ ok: true })
      }
      updateApplication(user.id, body.applicationId, {
        stage: body.stage,
        notes: body.notes,
        outstandingActions: Array.isArray(body.outstandingActions) ? body.outstandingActions : undefined,
        checklist: Array.isArray(body.checklist) ? body.checklist : undefined,
        cvDocumentId: body.cvDocumentId
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'update-assessment') {
      if (cloudClient) {
        await updateAssessmentSupabase(cloudClient, user.id, body.assessmentId, {
          status: body.status,
          deadlineAtUtc: body.deadlineAtUtc,
          deadlineDateOnly: body.deadlineDateOnly,
          deadlineHasExactTime: body.deadlineHasExactTime,
          notes: body.notes
        })
        return NextResponse.json({ ok: true })
      }
      updateAssessment(user.id, body.assessmentId, {
        status: body.status,
        deadlineAtUtc: body.deadlineAtUtc,
        deadlineDateOnly: body.deadlineDateOnly,
        deadlineHasExactTime: body.deadlineHasExactTime,
        notes: body.notes
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'follow-company') {
      if (cloudClient) {
        await followCompanySupabase(cloudClient, user.id, {
          companyId: body.companyId,
          roleTypes: Array.isArray(body.roleTypes) ? body.roleTypes : [],
          disciplines: Array.isArray(body.disciplines) ? body.disciplines : [],
          countries: Array.isArray(body.countries) ? body.countries : []
        })
        return NextResponse.json({ ok: true })
      }
      followCompany(user.id, {
        companyId: body.companyId,
        roleTypes: Array.isArray(body.roleTypes) ? body.roleTypes : [],
        disciplines: Array.isArray(body.disciplines) ? body.disciplines : [],
        countries: Array.isArray(body.countries) ? body.countries : []
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Careers update failed.'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const cloudClient = await getCloudClient()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'unfollow-company') {
      const companyId = searchParams.get('companyId')
      if (!companyId) {
        return NextResponse.json({ ok: false, error: 'companyId is required' }, { status: 400 })
      }
      if (cloudClient) {
        await unfollowCompanySupabase(cloudClient, user.id, companyId)
        return NextResponse.json({ ok: true })
      }
      unfollowCompany(user.id, companyId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'unsave-role') {
      const jobId = searchParams.get('jobId')
      if (!jobId) {
        return NextResponse.json({ ok: false, error: 'jobId is required' }, { status: 400 })
      }
      if (cloudClient) {
        await unsaveRoleSupabase(cloudClient, user.id, jobId)
        return NextResponse.json({ ok: true })
      }
      unsaveRole(user.id, jobId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete-application') {
      const applicationId = searchParams.get('applicationId')
      if (!applicationId) {
        return NextResponse.json({ ok: false, error: 'applicationId is required' }, { status: 400 })
      }
      if (cloudClient) {
        await deleteApplicationSupabase(cloudClient, user.id, applicationId)
        return NextResponse.json({ ok: true })
      }
      deleteApplication(user.id, applicationId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Careers delete failed.'
    }, { status: 500 })
  }
}
