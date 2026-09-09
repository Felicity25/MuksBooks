'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Bookmark, ClipboardList, GitCompareArrows } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'
import { resolveApplicationRoute } from '@/lib/universities/application-domain'
import { createApplication, universityStorage } from '@/lib/universities/storage'

export function ProgrammeActions({ programmeId, institutionId, compact = false }: { programmeId: string; institutionId: string; compact?: boolean }) {
  const { isGuest, settings, saveSettings } = useAuth()
  const [shortlisted, setShortlisted] = useState(false)
  const [compared, setCompared] = useState(false)
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    setShortlisted((isGuest ? universityStorage.getShortlist() : settings.universityShortlist).includes(programmeId))
    setCompared((isGuest ? universityStorage.getCompare() : settings.universityCompare).includes(programmeId))
    setTracked((isGuest ? universityStorage.getApplications() : settings.universityApplications).some((application) => application.programmeId === programmeId))
  }, [isGuest, programmeId, settings.universityApplications, settings.universityCompare, settings.universityShortlist])

  const toggleShortlist = () => {
    const current = isGuest ? universityStorage.getShortlist() : settings.universityShortlist
    const next = current.includes(programmeId) ? current.filter((id) => id !== programmeId) : [...current, programmeId]
    if (isGuest) universityStorage.saveShortlist(next)
    else void saveSettings({ universityShortlist: next })
    setShortlisted(next.includes(programmeId))
  }

  const toggleCompare = () => {
    const current = isGuest ? universityStorage.getCompare() : settings.universityCompare
    const next = current.includes(programmeId) ? current.filter((id) => id !== programmeId) : [...current, programmeId].slice(-4)
    if (isGuest) universityStorage.saveCompare(next)
    else void saveSettings({ universityCompare: next })
    setCompared(next.includes(programmeId))
  }

  const addApplication = () => {
    const current = isGuest ? universityStorage.getApplications() : settings.universityApplications
    if (current.some((application) => application.programmeId === programmeId)) return
    const application = createApplication(programmeId, institutionId)
    const programme = getProgramme(programmeId)
    const institution = getInstitution(institutionId)
    if (programme && institution) {
      const route = resolveApplicationRoute(programme, institution, 'UNCERTAIN')
      application.applicationMethod = route.method
      application.applicationPortalUrl = route.url
    }
    const next = [...current, application]
    if (isGuest) universityStorage.saveApplications(next)
    else void saveSettings({ universityApplications: next })
    setTracked(true)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={shortlisted ? 'default' : 'outline'} size="sm" onClick={toggleShortlist} aria-pressed={shortlisted} className="gap-2">
        <Bookmark className="h-4 w-4" /> {shortlisted ? 'Shortlisted' : 'Shortlist'}
      </Button>
      <Button type="button" variant={compared ? 'secondary' : 'outline'} size="sm" onClick={toggleCompare} aria-pressed={compared} className="gap-2">
        <GitCompareArrows className="h-4 w-4" /> {compared ? 'Comparing' : 'Compare'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={addApplication} disabled={tracked} className="gap-2">
        <ClipboardList className="h-4 w-4" /> {tracked ? 'Application started' : 'Start application'}
      </Button>
      {tracked ? <Link href="/universities/applications"><Button type="button" variant="ghost" size="sm" className="gap-2">Open applications <ArrowRight className="h-4 w-4" /></Button></Link> : null}
      {!compact ? <Link href={`/universities/${institutionId}/${programmeId}`}><Button type="button" size="sm">View course</Button></Link> : null}
    </div>
  )
}
