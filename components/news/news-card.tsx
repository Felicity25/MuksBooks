'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { NewsItem } from '@/lib/news/types'

const CATEGORY_LABELS: Record<string, string> = {
  INSURANCE: 'Insurance',
  RISK_MANAGEMENT: 'Risk Management',
  FINANCIAL_MARKETS: 'Financial Markets',
  AI: 'AI',
  REGULATION: 'Regulation',
  SUPERANNUATION_PENSIONS: 'Superannuation & Pensions',
  CLIMATE_RISK: 'Climate Risk',
  CAREERS: 'Careers',
  RESEARCH: 'Research'
}

const IMPORTANCE_BADGE: Record<string, string> = {
  MAJOR: '🔴 Major',
  IMPORTANT: '🟠 Important',
  NORMAL: ''
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 60) return `Checked: ${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Checked: ${hours}h ago`
  return `Checked: ${Math.round(hours / 24)}d ago`
}

export function NewsCard({
  item,
  saved,
  onToggleSave,
  onSelectConcept
}: {
  item: NewsItem
  saved: boolean
  onToggleSave: (id: string) => void
  onSelectConcept: (concept: string) => void
}) {
  const isRegulation = item.category === 'REGULATION'
  const isResearch = item.category === 'RESEARCH'
  const categoryBadge = item.category === 'RESEARCH' ? '🔵 Research' : item.category === 'REGULATION' ? '🟣 Regulatory' : null
  const importanceBadge = IMPORTANCE_BADGE[item.importance]

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{CATEGORY_LABELS[item.category] || item.category}</span>
        <span>·</span>
        <span>{item.country.replace('_', ' ')}</span>
        <span>·</span>
        <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Undated'}</span>
        {categoryBadge && <Badge variant="outline">{categoryBadge}</Badge>}
        {importanceBadge && <Badge variant="outline">{importanceBadge}</Badge>}
      </div>

      {isResearch ? (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
          {item.researchAuthors && item.researchAuthors.length > 0 && (
            <p className="text-sm text-slate-600">Authors: {item.researchAuthors.join(', ')}</p>
          )}
          <p className="text-sm text-slate-600">Institution / Source: {item.researchInstitution || item.sourceName}</p>
          <div>
            <p className="text-sm font-semibold text-slate-800">Research question</p>
            <p className="text-sm text-slate-700">{item.researchQuestion}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Key finding</p>
            <p className="text-sm text-slate-700">{item.researchKeyFinding}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Why actuaries should care</p>
            <p className="text-sm text-slate-700">{item.whyItMatters}</p>
          </div>
          {item.researchDifficulty && <Badge variant="secondary">{item.researchDifficulty}</Badge>}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
          <p className="text-slate-700">{item.summary}</p>
          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Why this matters</p>
            <p>{item.whyItMatters}</p>
            {item.actuarialImpact && <p className="mt-1 text-slate-600">{item.actuarialImpact}</p>}
          </div>

          {isRegulation && (item.status || item.effectiveDate || item.consultationCloseDate) && (
            <div className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 space-y-1">
              {item.status && <p><span className="font-semibold">Status:</span> {item.status === 'CONSULTATION' ? 'Consultation' : 'Released'}</p>}
              {item.effectiveDate && <p><span className="font-semibold">Effective:</span> {item.effectiveDate}</p>}
              {item.consultationCloseDate && <p><span className="font-semibold">Submissions close:</span> {item.consultationCloseDate}</p>}
            </div>
          )}
        </div>
      )}

      {(item.actuarialConcepts.length > 0 || item.practiceAreas.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {item.actuarialConcepts.map((concept) => (
            <Badge key={concept} variant="outline" className="cursor-pointer" onClick={() => onSelectConcept(concept)}>
              {concept}
            </Badge>
          ))}
          {item.practiceAreas.map((area) => (
            <Badge key={area} variant="secondary">
              {area}
            </Badge>
          ))}
        </div>
      )}

      {item.supportingSources.length > 0 && (
        <p className="text-xs text-slate-500">
          Also covered by: {item.supportingSources.map((s) => s.name).join(', ')}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="text-xs text-slate-500">
          <p>Source: {item.sourceName}</p>
          <p>{timeAgo(item.lastCheckedAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleSave(item.id)}
            className="text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            {saved ? '★ Saved' : '☆ Save'}
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {isResearch ? 'Read paper →' : 'Read source →'}
          </a>
        </div>
      </div>
    </Card>
  )
}
