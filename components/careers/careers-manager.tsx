'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import { emitAppStateUpdate } from '@/lib/app-state/client-events'

type TabKey = 'discover' | 'following' | 'saved' | 'applications' | 'assessments' | 'cv' | 'settings'

interface CareerState {
  mode: 'guest' | 'authenticated'
  discover: any[]
  companies: any[]
  following: any[]
  savedRoles: any[]
  applications: any[]
  assessments: any[]
  cvDocuments: any[]
  settings: {
    timezone: string
    timezoneConfirmed: boolean
    autoAddDeadlinesToPlanner: boolean
  } | null
  careerPulse: {
    activeApplications: number
    outstandingAssessments: number
    interviews: number
    needsAttention: Array<{ title: string; deadlineAtUtc: string }>
  } | null
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'discover', label: 'Discover' },
  { key: 'following', label: 'Following' },
  { key: 'saved', label: 'Saved Roles' },
  { key: 'applications', label: 'My Applications' },
  { key: 'assessments', label: 'Assessments' },
  { key: 'cv', label: 'CV & Career Profile' },
  { key: 'settings', label: 'Career Settings' }
]

const ROLE_TYPES = ['Graduate', 'Internship', 'Vacation Program', 'Entry Level', 'Analyst', 'Actuarial Analyst']
const DISCIPLINES = ['Actuarial', 'Insurance', 'Risk', 'Investments', 'Consulting', 'Superannuation', 'Finance', 'Data', 'Quantitative', 'Reinsurance']
const COUNTRIES = ['Australia', 'South Africa', 'United Kingdom', 'International']
const CAREER_AREAS = ['All', 'Actuarial', 'Banking', 'Technology']
const OTHER_COMPANY_VALUE = '__other__'
const APPLICATION_STAGES = [
  'Interested', 'Preparing', 'Ready to Apply', 'Applied', 'Online Assessment', 'Video Interview', 'Phone Interview', 'Interview',
  'Assessment Centre', 'Final Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn', 'Closed'
]

function formatDateTime(value?: string | null, timezone?: string) {
  if (!value) return 'Not set'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone || undefined
  })
}

function formatDateOnly(value?: string | null) {
  if (!value) return 'Not set'
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatCountdown(deadlineUtc?: string | null) {
  if (!deadlineUtc) return null
  const deadline = new Date(deadlineUtc).getTime()
  if (!Number.isFinite(deadline)) return null
  const now = Date.now()
  const diff = deadline - now
  if (diff <= 0) return 'Deadline passed'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m remaining`
}

function useDefaultCareerState(): CareerState {
  return {
    mode: 'guest',
    discover: [],
    companies: [],
    following: [],
    savedRoles: [],
    applications: [],
    assessments: [],
    cvDocuments: [],
    settings: null,
    careerPulse: null
  }
}

export function CareersManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, requireAuth, isGuest } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>('discover')
  const [state, setState] = useState<CareerState>(useDefaultCareerState())
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedRoleTypes, setSelectedRoleTypes] = useState<string[]>([])
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [selectedCareerArea, setSelectedCareerArea] = useState<string>('All')
  const [assessmentForm, setAssessmentForm] = useState({
    companyId: '',
    customCompanyName: '',
    applicationId: '',
    title: '',
    assessmentType: 'Online Assessment',
    invitationReceivedAt: '',
    deadlineRuleHours: '48',
    deadlineAt: '',
    deadlineDateOnly: '',
    notes: ''
  })

  const qsFilters = useMemo(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (selectedRoleTypes.length) params.set('roleTypes', selectedRoleTypes.join(','))
    if (selectedDisciplines.length) params.set('disciplines', selectedDisciplines.join(','))
    if (selectedCountries.length) params.set('countries', selectedCountries.join(','))
    if (selectedCompanies.length) params.set('companies', selectedCompanies.join(','))
    if (selectedCareerArea !== 'All') params.set('careerAreas', selectedCareerArea)
    return params.toString()
  }, [query, selectedRoleTypes, selectedDisciplines, selectedCountries, selectedCompanies, selectedCareerArea])

  const loadCareers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/careers${qsFilters ? `?${qsFilters}` : ''}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Careers could not be loaded.')
      }
      setState(payload as CareerState)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Careers could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCareers()
  }, [qsFilters, user?.id])

  useEffect(() => {
    const intent = searchParams.get('intent')
    const jobId = searchParams.get('jobId')
    const companyId = searchParams.get('companyId')

    if (!user || !intent) return

    const runIntent = async () => {
      try {
        if (intent === 'save-role' && jobId) {
          await fetch('/api/careers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save-role', jobId })
          })
          setMessage('Role saved successfully.')
        }

        if (intent === 'follow-company' && companyId) {
          await fetch('/api/careers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'follow-company', companyId })
          })
          setMessage('Company followed successfully.')
        }
      } finally {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('intent')
        params.delete('jobId')
        params.delete('companyId')
        const next = params.toString()
        router.replace(next ? `/careers?${next}` : '/careers')
        await loadCareers()
      }
    }

    void runIntent()
  }, [searchParams, user, router])

  const toggleFilter = (
    value: string,
    selected: string[],
    setter: (values: string[]) => void
  ) => {
    if (selected.includes(value)) {
      setter(selected.filter((item) => item !== value))
      return
    }
    setter([...selected, value])
  }

  const runProtectedAction = async (
    reason: string,
    callback: () => Promise<void>,
    fallbackIntent?: { intent: string; jobId?: string; companyId?: string }
  ) => {
    if (isGuest) {
      const params = new URLSearchParams()
      if (fallbackIntent?.intent) params.set('intent', fallbackIntent.intent)
      if (fallbackIntent?.jobId) params.set('jobId', fallbackIntent.jobId)
      if (fallbackIntent?.companyId) params.set('companyId', fallbackIntent.companyId)
      const returnPath = params.toString() ? `/careers?${params.toString()}` : '/careers'
      if (requireAuth(reason, returnPath)) return
    }

    await callback()
    await loadCareers()
    emitAppStateUpdate('planner')
    emitAppStateUpdate('dashboard')
  }

  const handleSaveRole = async (jobId: string) => {
    await runProtectedAction(
      'Sign in to continue. Sign in or create an account to save jobs, follow companies and track your applications.',
      async () => {
        await fetch('/api/careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save-role', jobId })
        })
        setMessage('Role saved.')
      },
      { intent: 'save-role', jobId }
    )
  }

  const handleFollowCompany = async (companyId: string) => {
    await runProtectedAction(
      'Sign in to continue. Sign in or create an account to save jobs, follow companies and track your applications.',
      async () => {
        await fetch('/api/careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'follow-company',
            companyId,
            roleTypes: selectedRoleTypes,
            disciplines: selectedDisciplines,
            countries: selectedCountries
          })
        })
        setMessage('Company followed.')
      },
      { intent: 'follow-company', companyId }
    )
  }

  const handleTrackApplication = async (jobId: string) => {
    await runProtectedAction(
      'Sign in to continue. Sign in or create an account to save jobs, follow companies and track your applications.',
      async () => {
        await fetch('/api/careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'track-application', jobId, stage: 'Applied' })
        })
        setActiveTab('applications')
        setMessage('Application tracking started.')
      }
    )
  }

  const handleUpdateStage = async (applicationId: string, stage: string) => {
    await runProtectedAction('Sign in to update your application tracker.', async () => {
      await fetch('/api/careers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-application', applicationId, stage })
      })
      setMessage('Application stage updated.')
    })
  }

  const handleCreateAssessment = async (event: React.FormEvent) => {
    event.preventDefault()

    const invitationUtc = assessmentForm.invitationReceivedAt
      ? new Date(assessmentForm.invitationReceivedAt).toISOString()
      : null
    const deadlineUtc = assessmentForm.deadlineAt
      ? new Date(assessmentForm.deadlineAt).toISOString()
      : null

    const isOtherCompany = assessmentForm.companyId === OTHER_COMPANY_VALUE
    const trimmedCustomCompanyName = assessmentForm.customCompanyName.trim()
    if (isOtherCompany && !trimmedCustomCompanyName) {
      setMessage('Enter a company name for "Other".')
      return
    }

    await runProtectedAction('Sign in to track assessments and deadlines.', async () => {
      const response = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-assessment',
          companyId: isOtherCompany ? null : (assessmentForm.companyId || null),
          customCompanyName: isOtherCompany ? trimmedCustomCompanyName : null,
          applicationId: assessmentForm.applicationId || null,
          title: assessmentForm.title,
          assessmentType: assessmentForm.assessmentType,
          invitationReceivedAtUtc: invitationUtc,
          deadlineRuleHours: assessmentForm.deadlineRuleHours ? Number(assessmentForm.deadlineRuleHours) : null,
          deadlineAtUtc: deadlineUtc,
          deadlineDateOnly: assessmentForm.deadlineDateOnly || null,
          deadlineHasExactTime: Boolean(deadlineUtc),
          notes: assessmentForm.notes || null
        })
      })

      const payload = await response.json()
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Assessment could not be created.')
      }

      setAssessmentForm({
        companyId: '',
        customCompanyName: '',
        applicationId: '',
        title: '',
        assessmentType: 'Online Assessment',
        invitationReceivedAt: '',
        deadlineRuleHours: '48',
        deadlineAt: '',
        deadlineDateOnly: '',
        notes: ''
      })
      setMessage('Assessment created.')
    })
  }

  const handleCompleteAssessment = async (assessmentId: string, completed: boolean) => {
    await runProtectedAction('Sign in to manage your assessments.', async () => {
      await fetch('/api/careers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-assessment',
          assessmentId,
          status: completed ? 'Completed' : 'Incomplete'
        })
      })
      setMessage(completed ? 'Assessment completed.' : 'Assessment marked incomplete.')
    })
  }

  const handleAddAssessmentToPlanner = async (assessmentId: string) => {
    await runProtectedAction('Sign in to connect careers actions to Planner.', async () => {
      const response = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-assessment-to-planner', assessmentId })
      })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || 'Could not add assessment to Planner.')
      }
      setMessage('Assessment linked to Planner.')
    })
  }

  const handleSetPrimaryCv = async (documentId: string, label: string) => {
    await runProtectedAction('Sign in to manage your CV profile.', async () => {
      await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-primary-cv', documentId, label })
      })
      setMessage('Primary CV updated.')
    })
  }

  const handleCvMatch = async (jobId: string) => {
    await runProtectedAction('Sign in to run CV requirement matching.', async () => {
      const response = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-cv-match', jobId })
      })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'CV matching failed.')
      const checks = payload.result?.checks || []
      const lines = checks.slice(0, 5).map((item: any) => `${item.state}: ${item.requirement}`).join(' | ')
      setMessage(lines || 'CV matching complete.')
    })
  }

  const handleUpdateCareerSetting = async (updates: {
    timezone?: string
    timezoneConfirmed?: boolean
    autoAddDeadlinesToPlanner?: boolean
  }) => {
    await runProtectedAction('Sign in to manage your career preferences.', async () => {
      const response = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-career-settings', ...updates })
      })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Settings update failed.')
      setMessage('Career settings updated.')
    })
  }

  const timezoneToUse = state.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const followingEmpty = !isLoading && state.following.length === 0

  const discoverEmpty = !isLoading && state.discover.length === 0

  return (
    <div className="space-y-4 lg:col-span-2">
      {message && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{message}</div>
      )}

      {state.mode === 'authenticated' && state.settings && !state.settings.timezoneConfirmed && (
        <Card className="space-y-3 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Confirm your timezone</p>
          <p className="text-sm text-amber-800">
            We detected {Intl.DateTimeFormat().resolvedOptions().timeZone}. MuksBooks uses this to calculate assessment and application deadlines correctly.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleUpdateCareerSetting({
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                timezoneConfirmed: true
              })}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('settings')}
            >
              Change
            </Button>
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={activeTab === tab.key ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {activeTab === 'discover' && (
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Discover opportunities</p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Mercer graduate actuarial"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Career area</p>
            <div className="flex flex-wrap gap-2">
              {CAREER_AREAS.map((area) => (
                <Button key={area} size="sm" variant={selectedCareerArea === area ? 'default' : 'outline'} onClick={() => setSelectedCareerArea(area)}>{area}</Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Role type</p>
              <div className="flex flex-wrap gap-2">
                {ROLE_TYPES.map((role) => (
                  <Button key={role} size="sm" variant={selectedRoleTypes.includes(role) ? 'default' : 'outline'} onClick={() => toggleFilter(role, selectedRoleTypes, setSelectedRoleTypes)}>{role}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Discipline</p>
              <div className="flex flex-wrap gap-2">
                {DISCIPLINES.map((discipline) => (
                  <Button key={discipline} size="sm" variant={selectedDisciplines.includes(discipline) ? 'default' : 'outline'} onClick={() => toggleFilter(discipline, selectedDisciplines, setSelectedDisciplines)}>{discipline}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Country</p>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((country) => (
                  <Button key={country} size="sm" variant={selectedCountries.includes(country) ? 'default' : 'outline'} onClick={() => toggleFilter(country, selectedCountries, setSelectedCountries)}>{country}</Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading && <p className="text-sm text-slate-600">Loading opportunities...</p>}
            {discoverEmpty && <p className="text-sm text-slate-600">No matching opportunities found. Try adjusting your filters.</p>}
            {state.discover.map((job) => (
              <div key={job.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-950">{job.jobTitle}</p>
                    <p className="text-sm text-slate-600">{job.company} · {job.location || 'Location not stated'}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{job.roleType || 'Role not stated'} · {job.discipline || 'Discipline not stated'} · {job.country || 'Country not stated'}</p>
                    <p className="mt-2 text-sm text-slate-600">Work rights: {job.workRightsInformation || 'Not stated'}</p>
                    <p className="text-sm text-slate-600">International students: {job.internationalStudentInformation || 'Not stated'}</p>
                    <p className="text-xs text-slate-500">Last verified: {formatDateTime(job.lastVerified, timezoneToUse)}</p>
                    {!job.companyProfileAvailable && (
                      <p className="mt-2 text-sm text-amber-700">Limited careers information currently available.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.applicationUrl && <a href={job.applicationUrl} target="_blank" rel="noreferrer"><Button size="sm">Apply on Company Website</Button></a>}
                    <Button size="sm" variant="outline" onClick={() => handleSaveRole(job.id)}>Save Role</Button>
                    <Button size="sm" variant="outline" onClick={() => handleTrackApplication(job.id)}>I've Applied</Button>
                    <Button size="sm" variant="outline" onClick={() => handleFollowCompany(job.companyId)}>Follow Company</Button>
                    <Button size="sm" variant="outline" onClick={() => handleCvMatch(job.id)}>CV Match</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeTab === 'following' && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Following</p>
          {followingEmpty && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-base font-semibold text-slate-900">Follow companies you're interested in</p>
              <p className="mt-1 text-sm text-slate-600">Search employers such as Mercer, Aon, QBE or Deloitte and MuksBooks will keep their opportunities together here.</p>
              <Button className="mt-3" size="sm" onClick={() => setActiveTab('discover')}>Find Companies</Button>
            </div>
          )}

          {state.following.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-slate-950">{item.company}</p>
                  <p className="text-sm text-slate-600">{item.summary}</p>
                  {item.state === 'NO_OPENINGS' && <p className="text-sm text-slate-600">No current openings found.</p>}
                  {item.state === 'NO_MATCHING' && <p className="text-sm text-slate-600">{item.totalOpenings} current roles found, none match your selected preferences.</p>}
                  {item.state === 'SOURCE_UNAVAILABLE' && <p className="text-sm text-amber-700">We couldn't check listings right now.</p>}
                  <p className="text-xs text-slate-500">Last checked: {formatDateTime(item.lastCheckedAt, timezoneToUse)}</p>
                  {item.lastSuccessfulCheckAt && <p className="text-xs text-slate-500">Last successful check: {formatDateTime(item.lastSuccessfulCheckAt, timezoneToUse)}</p>}
                  <p className="text-xs text-slate-500">Following: {[...item.roleTypes, ...item.disciplines, ...item.countries].join(' · ') || 'All roles'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.officialCareersUrl && <a href={item.officialCareersUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">View Company</Button></a>}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runProtectedAction('Sign in to update follow preferences.', async () => {
                      await fetch('/api/careers', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'follow-company',
                          companyId: item.companyId,
                          roleTypes: selectedRoleTypes,
                          disciplines: selectedDisciplines,
                          countries: selectedCountries
                        })
                      })
                      setMessage('Follow preferences updated.')
                    })}
                  >
                    Edit Preferences
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runProtectedAction('Sign in to manage followed companies.', async () => {
                      await fetch(`/api/careers?action=unfollow-company&companyId=${encodeURIComponent(item.companyId)}`, { method: 'DELETE' })
                      setMessage('Company unfollowed.')
                    })}
                  >
                    Unfollow
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runProtectedAction('Sign in to refresh company checks.', async () => {
                      await fetch('/api/careers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'simulate-company-mode', companyId: item.companyId, mode: 'ACTIVE' })
                      })
                      setMessage('Company checked again.')
                    })}
                  >
                    Check Again
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'saved' && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Saved roles</p>
          {!isLoading && state.savedRoles.length === 0 && (
            <p className="text-sm text-slate-600">Save opportunities you're interested in and they will remain here even after the live feed changes.</p>
          )}
          {state.savedRoles.map((saved) => (
            <div key={saved.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-base font-semibold text-slate-950">{saved.snapshot?.jobTitle || 'Saved role'}</p>
              <p className="text-sm text-slate-600">{saved.snapshot?.company || 'Company not stated'} · {saved.snapshot?.location || 'Location not stated'}</p>
              <p className="mt-2 text-xs text-slate-500">Saved: {formatDateTime(saved.dateSaved, timezoneToUse)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {saved.snapshot?.applicationUrl && <a href={String(saved.snapshot.applicationUrl)} target="_blank" rel="noreferrer"><Button size="sm">Apply on Company Website</Button></a>}
                <Button size="sm" variant="outline" onClick={() => handleTrackApplication(saved.jobId)}>Track Application</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runProtectedAction('Sign in to manage saved roles.', async () => {
                    await fetch(`/api/careers?action=unsave-role&jobId=${encodeURIComponent(saved.jobId)}`, { method: 'DELETE' })
                    setMessage('Saved role removed.')
                  })}
                >
                  Remove Save
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'applications' && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">My applications</p>
          {!isLoading && state.applications.length === 0 && (
            <p className="text-sm text-slate-600">Track an application to start managing deadlines, assessments and recruitment stages.</p>
          )}
          {state.applications.map((application) => (
            <div key={application.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-slate-950">{application.title}</p>
                  <p className="text-sm text-slate-600">{application.company || 'Company not stated'} · Applied: {formatDateTime(application.appliedAtUtc, timezoneToUse)}</p>
                </div>
                <select
                  value={application.stage}
                  onChange={(event) => handleUpdateStage(application.id, event.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  {APPLICATION_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outstanding actions</p>
                {(application.outstandingActions || []).length > 0 ? (
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {(application.outstandingActions || []).map((item: string, idx: number) => <li key={idx}>• {item}</li>)}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">No outstanding actions yet.</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline</p>
                {(application.timeline || []).length > 0 ? (
                  <div className="mt-1 space-y-1 text-sm text-slate-700">
                    {application.timeline.map((event: any) => (
                      <p key={event.id}>{formatDateTime(event.eventTimeUtc, timezoneToUse)} · {event.title}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">No timeline events yet.</p>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'assessments' && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Assessments</p>

          <form onSubmit={handleCreateAssessment} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900">Add assessment manually</p>
            <div className="grid gap-3 md:grid-cols-2">
              <select value={assessmentForm.companyId} onChange={(event) => setAssessmentForm((current) => ({ ...current, companyId: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">Select company</option>
                {state.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                <option value={OTHER_COMPANY_VALUE}>Other</option>
              </select>
              {assessmentForm.companyId === OTHER_COMPANY_VALUE && (
                <input
                  value={assessmentForm.customCompanyName}
                  onChange={(event) => setAssessmentForm((current) => ({ ...current, customCompanyName: event.target.value }))}
                  required
                  placeholder="Company name"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              )}
              <select value={assessmentForm.applicationId} onChange={(event) => setAssessmentForm((current) => ({ ...current, applicationId: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="">Link application (optional)</option>
                {state.applications.map((application) => <option key={application.id} value={application.id}>{application.title}</option>)}
              </select>
              <input value={assessmentForm.title} onChange={(event) => setAssessmentForm((current) => ({ ...current, title: event.target.value }))} required placeholder="Assessment title" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input value={assessmentForm.assessmentType} onChange={(event) => setAssessmentForm((current) => ({ ...current, assessmentType: event.target.value }))} placeholder="Assessment type" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input type="datetime-local" value={assessmentForm.invitationReceivedAt} onChange={(event) => setAssessmentForm((current) => ({ ...current, invitationReceivedAt: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input value={assessmentForm.deadlineRuleHours} onChange={(event) => setAssessmentForm((current) => ({ ...current, deadlineRuleHours: event.target.value }))} placeholder="Deadline rule hours (e.g., 48)" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input type="datetime-local" value={assessmentForm.deadlineAt} onChange={(event) => setAssessmentForm((current) => ({ ...current, deadlineAt: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input type="date" value={assessmentForm.deadlineDateOnly} onChange={(event) => setAssessmentForm((current) => ({ ...current, deadlineDateOnly: event.target.value }))} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <textarea value={assessmentForm.notes} onChange={(event) => setAssessmentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <Button type="submit" size="sm">Save Assessment</Button>
          </form>

          {!isLoading && state.assessments.length === 0 && (
            <p className="text-sm text-slate-600">No outstanding assessments.</p>
          )}

          {state.assessments.map((assessment) => {
            const countdown = assessment.status !== 'Completed' ? formatCountdown(assessment.deadlineAtUtc) : null
            return (
              <div key={assessment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-950">{assessment.title}</p>
                    <p className="text-sm text-slate-600">{assessment.company || 'Company not set'} · {assessment.assessmentType}</p>
                    {assessment.deadlineHasExactTime && assessment.deadlineAtUtc ? (
                      <>
                        <p className="text-sm text-slate-700">Deadline: {formatDateTime(assessment.deadlineAtUtc, timezoneToUse)}</p>
                        {countdown && <p className="text-sm font-semibold text-amber-700">{countdown}</p>}
                      </>
                    ) : assessment.deadlineDateOnly ? (
                      <p className="text-sm text-slate-700">Deadline: {formatDateOnly(assessment.deadlineDateOnly)} - exact time not stated.</p>
                    ) : (
                      <p className="text-sm text-slate-700">Deadline not set.</p>
                    )}
                    {assessment.deadlineRuleHours && assessment.invitationReceivedAtUtc && (
                      <p className="text-xs text-slate-500">Rule: complete within {assessment.deadlineRuleHours} hours from invitation.</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleCompleteAssessment(assessment.id, assessment.status !== 'Completed')}>
                      {assessment.status === 'Completed' ? 'Mark Incomplete' : 'Mark Completed'}
                    </Button>
                    {!assessment.plannerTaskId && (
                      <Button size="sm" variant="outline" onClick={() => handleAddAssessmentToPlanner(assessment.id)}>
                        Add to Planner
                      </Button>
                    )}
                    {assessment.plannerTaskId && <p className="text-xs text-emerald-700 self-center">Linked to Planner</p>}
                  </div>
                </div>
                {!assessment.deadlineHasExactTime && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                    Assessment deadline detected. Add this to Planner?
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      )}

      {activeTab === 'cv' && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">CV & career profile</p>
          {!isLoading && state.cvDocuments.length === 0 && (
            <p className="text-sm text-slate-600">Upload or select a CV to compare your experience with job requirements.</p>
          )}

          {state.cvDocuments.map((cv) => (
            <div key={cv.documentId} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-slate-950">{cv.label || cv.filename}</p>
                  <p className="text-sm text-slate-600">Uploaded: {formatDateTime(cv.uploadDate, timezoneToUse)}</p>
                </div>
                <Button size="sm" variant={cv.isPrimary ? 'default' : 'outline'} onClick={() => handleSetPrimaryCv(cv.documentId, cv.label || cv.filename)}>
                  {cv.isPrimary ? 'Primary CV' : 'Set as Primary CV'}
                </Button>
              </div>
              {cv.extractedProfile && (
                <pre className="overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">{JSON.stringify(cv.extractedProfile, null, 2)}</pre>
              )}
            </div>
          ))}
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Career settings</p>

          {!state.settings ? (
            <p className="text-sm text-slate-600">Sign in to manage career settings.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Timezone</label>
                  <input
                    value={state.settings.timezone}
                    onChange={(event) => setState((current) => ({
                      ...current,
                      settings: current.settings ? { ...current.settings, timezone: event.target.value } : current.settings
                    }))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Australia/Melbourne"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Auto-add deadlines to Planner</label>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant={state.settings.autoAddDeadlinesToPlanner ? 'default' : 'outline'}
                      onClick={() => handleUpdateCareerSetting({ autoAddDeadlinesToPlanner: true })}
                    >
                      On
                    </Button>
                    <Button
                      size="sm"
                      variant={!state.settings.autoAddDeadlinesToPlanner ? 'default' : 'outline'}
                      onClick={() => handleUpdateCareerSetting({ autoAddDeadlinesToPlanner: false })}
                    >
                      Off
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700">Automatically add career assessments with confirmed date-and-time deadlines to your Planner.</p>
                <Button className="mt-3" size="sm" onClick={() => handleUpdateCareerSetting({ timezone: state.settings?.timezone, timezoneConfirmed: true })}>Save Career Settings</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Career pulse</p>
        {state.careerPulse ? (
          <>
            <p className="text-sm text-slate-700">{state.careerPulse.activeApplications} active applications · {state.careerPulse.outstandingAssessments} assessments · {state.careerPulse.interviews} interviews</p>
            <div className="space-y-1 text-sm text-slate-700">
              {state.careerPulse.needsAttention.length === 0 ? (
                <p>No urgent career deadlines right now.</p>
              ) : (
                state.careerPulse.needsAttention.map((item, index) => (
                  <p key={`${item.title}_${index}`}>{item.title} - {formatCountdown(item.deadlineAtUtc) || formatDateTime(item.deadlineAtUtc, timezoneToUse)}</p>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">Career pulse appears after you follow companies, save roles, or track applications.</p>
        )}
      </Card>
    </div>
  )
}
