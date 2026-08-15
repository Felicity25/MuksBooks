'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { NewsCard } from '@/components/news/news-card'
import type { BriefItem, NewsItem } from '@/lib/news/types'

const CATEGORIES = [
  'All',
  'Insurance',
  'Risk Management',
  'Financial Markets',
  'AI',
  'Regulation',
  'Pensions',
  'Climate Risk',
  'Careers',
  'Research'
]

const CATEGORY_TO_VALUE: Record<string, string> = {
  All: 'All',
  Insurance: 'INSURANCE',
  'Risk Management': 'RISK_MANAGEMENT',
  'Financial Markets': 'FINANCIAL_MARKETS',
  AI: 'AI',
  Regulation: 'REGULATION',
  Pensions: 'SUPERANNUATION_PENSIONS',
  'Climate Risk': 'CLIMATE_RISK',
  Careers: 'CAREERS',
  Research: 'RESEARCH'
}

const COUNTRIES = ['Australia', 'South Africa', 'International']
const RANGES: Array<{ label: string; value: string }> = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' }
]

interface NewsResponse {
  ok?: boolean
  reason?: string
  message?: string
  items: NewsItem[]
  brief: BriefItem[]
  sinceYesterday: string[]
  concepts: Array<{ name: string; count: number }>
  savedIds: string[]
}

export function NewsPageClient() {
  const [data, setData] = useState<NewsResponse>({ items: [], brief: [], sinceYesterday: [], concepts: [], savedIds: [] })
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [category, setCategory] = useState('All')
  const [country, setCountry] = useState<string | null>(null)
  const [range, setRange] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [concept, setConcept] = useState<string | null>(null)
  const [showSinceYesterday, setShowSinceYesterday] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setErrorMessage(null)

    const params = new URLSearchParams()
    params.set('category', CATEGORY_TO_VALUE[category] || 'All')
    if (country) params.set('country', country.toUpperCase().replace(' ', '_'))
    if (range) params.set('range', range)
    if (query) params.set('q', query)
    if (concept) params.set('concept', concept)

    fetch(`/api/news?${params.toString()}`)
      .then(async (res) => {
        const payload: NewsResponse = await res.json()
        if (!res.ok) {
          throw new Error(payload.message || 'News could not be loaded right now.')
        }
        return payload
      })
      .then((payload: NewsResponse) => {
        setData(payload)
        if (payload.ok === false && payload.message) {
          setErrorMessage(payload.message)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch news:', err)
        setData({ items: [], brief: [], sinceYesterday: [], concepts: [], savedIds: [] })
        setErrorMessage(err instanceof Error ? err.message : 'News could not be loaded right now.')
        setLoading(false)
      })
  }, [category, country, range, query, concept])

  useEffect(() => {
    const timeout = setTimeout(load, query ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [load, query])

  const savedSet = useMemo(() => new Set(data.savedIds), [data.savedIds])

  const toggleSave = async (newsId: string) => {
    setData((prev) => {
      const isSaved = prev.savedIds.includes(newsId)
      return { ...prev, savedIds: isSaved ? prev.savedIds.filter((id) => id !== newsId) : [...prev.savedIds, newsId] }
    })

    await fetch('/api/news/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newsId })
    }).catch((err) => console.error('Failed to save article:', err))
  }

  return (
    <div className="space-y-6 lg:col-span-2">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <Badge key={item} variant={category === item ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCategory(item)}>
            {item}
          </Badge>
        ))}
      </div>

      {data.brief.length > 0 && (
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Today's Actuarial Brief</p>
          <p className="text-xs text-sky-600">{data.brief.length} developments worth knowing</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {data.brief.map((briefItem) => (
              <li key={briefItem.id}>{briefItem.summary}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((item) => (
            <Badge key={item} variant={country === item ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCountry(country === item ? null : item)}>
              {item}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((item) => (
            <Badge key={item.value} variant={range === item.value ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setRange(range === item.value ? null : item.value)}>
              {item.label}
            </Badge>
          ))}
        </div>
        <button className="text-sm font-medium text-sky-700 hover:text-sky-900" onClick={() => setShowSinceYesterday((value) => !value)}>
          {showSinceYesterday ? 'Hide' : 'Show'} since yesterday
        </button>
      </div>

      {showSinceYesterday && (
        <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 space-y-1">
          <p className="font-semibold text-slate-800">Since yesterday</p>
          {data.sinceYesterday.length === 0 ? (
            <p className="text-slate-500">No new items discovered in the last 24 hours.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {data.sinceYesterday.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <input
        type="search"
        placeholder="Search company, regulator, topic, actuarial concept, country..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm"
      />

      {errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">News could not be fully loaded right now.</p>
          <p className="mt-1">{errorMessage}</p>
          <button className="mt-3 text-sm font-medium text-amber-900 underline" onClick={load}>Retry</button>
        </div>
      )}

      {data.concepts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.concepts.map((item) => (
            <Badge
              key={item.name}
              variant={concept === item.name ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setConcept(concept === item.name ? null : item.name)}
            >
              {item.name} ({item.count})
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center">Finding the latest actuarial news...</div>
      ) : data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          <p>No relevant articles were found. Try refreshing or broadening the category.</p>
          <button className="mt-3 text-sm font-medium text-slate-700 underline" onClick={load}>Retry</button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              saved={savedSet.has(item.id)}
              onToggleSave={toggleSave}
              onSelectConcept={(selectedConcept) => setConcept(concept === selectedConcept ? null : selectedConcept)}
            />
          ))}
        </div>
      )}
    </div>
  )
}