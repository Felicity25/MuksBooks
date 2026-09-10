'use client'

import { useCurriculum, type ViewingCurriculum } from './curriculum-context'
import { SUPPORTED_CURRICULA } from '@/lib/learner/curriculum-registry'

export function CurriculumSelector({ showLevel = true }: { showLevel?: boolean }) {
  const { profile, viewingCurriculum, curriculum, selectedLevelId, setViewingCurriculum, setSelectedLevelId } = useCurriculum()
  const hasSupportedProfile = SUPPORTED_CURRICULA.some((item) => item.id === profile.curriculum)

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <label className="min-w-[180px] flex-1 text-xs font-semibold text-slate-600">
        Viewing curriculum
        <select
          value={viewingCurriculum}
          onChange={(event) => setViewingCurriculum(event.target.value as ViewingCurriculum)}
          className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
        >
          <option value="MY" disabled={!hasSupportedProfile}>My curriculum{hasSupportedProfile ? ` (${profile.curriculumLabel || profile.curriculum})` : ' (not set)'}</option>
          {SUPPORTED_CURRICULA.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
        </select>
      </label>
      {showLevel ? (
        <label className="min-w-[150px] flex-1 text-xs font-semibold text-slate-600">
          {curriculum.terminology.level}
          <select
            value={selectedLevelId}
            onChange={(event) => setSelectedLevelId(event.target.value)}
            className="mt-1 block h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
          >
            {curriculum.levels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
          </select>
        </label>
      ) : null}
      <div className="min-w-[150px] flex-1 pb-1 text-xs text-slate-500">
        <span className="block font-semibold text-slate-800">{curriculum.authority}</span>
        Temporary viewing choice
      </div>
    </div>
  )
}
