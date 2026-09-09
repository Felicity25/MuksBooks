import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, GraduationCap, Languages, MapPin } from 'lucide-react'
import { notFound } from 'next/navigation'
import { PersonalMatchPanel } from '@/components/universities/personal-match-panel'
import { ProgrammeActions } from '@/components/universities/programme-actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getInstitution, getProgramme } from '@/lib/universities/catalog'

export default function ProgrammePage({ params }: { params: { institutionId: string; programmeId: string } }) {
  const institution = getInstitution(params.institutionId)
  const programme = getProgramme(params.programmeId)
  if (!institution || !programme || programme.institutionId !== institution.id) notFound()

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/universities/${institution.id}`} className="inline-flex items-center gap-2 text-sm font-medium text-sky-700"><ArrowLeft className="h-4 w-4" />Back to {institution.name}</Link>
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-semibold text-sky-700">{institution.name}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{programme.name}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{programme.campus ?? institution.city}, {institution.country}</span>
          <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" />{programme.degreeType}</span>
          {programme.duration ? <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{programme.duration}</span> : null}
        </div>
        <div className="mt-5"><ProgrammeActions programmeId={programme.id} institutionId={institution.id} compact /></div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card className="p-5"><h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950"><BookOpen className="h-5 w-5 text-sky-700" />Overview</h2><p className="mt-3 text-sm text-slate-600">{programme.faculty}{programme.department ? ` • ${programme.department}` : ''}</p><div className="mt-3 flex flex-wrap gap-2">{programme.studyAreas.map((area) => <span key={area} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{area}</span>)}</div></Card>
          <Card className="p-5"><h2 className="text-xl font-semibold text-slate-950">Entry requirements</h2>{programme.requirements?.length ? <div className="mt-3 space-y-3">{programme.requirements.map((requirement) => <div key={`${requirement.curriculum}-${requirement.admissionsCycle ?? ''}`} className="border-l-2 border-sky-600 pl-3 text-sm text-slate-700"><p className="font-semibold">{requirement.curriculum}{requirement.admissionsCycle ? ` • ${requirement.admissionsCycle}` : ''}</p><p>{requirement.minimumOverall !== undefined ? `Published minimum overall: ${requirement.minimumOverall}` : requirement.notes ?? 'See official requirements.'}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-600">Check official course requirements. MuksBooks has not yet structured a current curriculum-specific threshold for this programme.</p>}</Card>
          <Card className="p-5"><h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950"><Languages className="h-5 w-5 text-sky-700" />English language</h2>{programme.englishRequirements?.length ? <div className="mt-3 space-y-2 text-sm text-slate-700">{programme.englishRequirements.map((requirement) => <p key={requirement.test}><strong>{requirement.test}</strong>{requirement.overall ? `: ${requirement.overall} overall` : ''}{requirement.minimumComponents ? `, ${requirement.minimumComponents} minimum per component` : ''}</p>)}</div> : <p className="mt-3 text-sm text-slate-600">English-language requirement has not been assessed. Check the official policy for your curriculum and education history.</p>}</Card>
          <Card className="p-5"><h2 className="text-xl font-semibold text-slate-950">Application information</h2><p className="mt-3 text-sm text-slate-600">{programme.applicationInformation ?? programme.applicationMetadata ?? 'Use the official programme and admissions pages for the current application cycle and deadlines.'}</p><a href={programme.officialProgrammeUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block"><Button type="button" className="gap-2">Official course page <ArrowUpRight className="h-4 w-4" /></Button></a></Card>
          <p className="text-xs text-slate-500">Source: <a href={programme.sourceUrl} className="underline" target="_blank" rel="noreferrer">official source</a> • Last verified {programme.lastVerifiedAt}{programme.admissionsCycle ? ` • ${programme.admissionsCycle}` : ''}</p>
        </div>
        <aside><PersonalMatchPanel institution={institution} programme={programme} /></aside>
      </div>
    </main>
  )
}
