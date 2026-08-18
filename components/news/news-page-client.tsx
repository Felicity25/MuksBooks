'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { NewsCard } from '@/components/news/news-card'
import { useAuth } from '@/components/auth-provider'
import type { BriefItem, NewsItem, SavedNewsItem } from '@/lib/news/types'

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
  'Research',
  'Saved'
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
  success?: boolean
  reason?: string
  message?: string
  error?: string
  articles?: NewsItem[]
  items: NewsItem[]
  brief: BriefItem[]
  sinceYesterday: string[]
  concepts: Array<{ name: string; count: number }>
  savedIds: string[]
  updatedAt?: string
  sourcesChecked?: number
}

export function NewsPageClient() {
  const { user, isLoading: authLoading, requireAuth } = useAuth()
  const [data, setData] = useState<NewsResponse>({ items: [], brief: [], sinceYesterday: [], concepts: [], savedIds: [] })
  const [savedItems, setSavedItems] = useState<SavedNewsItem[]>([])
  const [savedUrls, setSavedUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [category, setCategory] = useState('All')
  const [country, setCountry] = useState<string | null>(null)
  const [range, setRange] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [concept, setConcept] = useState<string | null>(null)
  const [showSinceYesterday, setShowSinceYesterday] = useState(false)

  const loadSaved = useCallback(async () => {
    if (!user) {
      setSavedItems([])
      setSavedUrls([])
      return
    }

    const response = await fetch('/api/news/saved', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || 'Saved articles could not be loaded.')
    setSavedItems(payload.items || [])
    setSavedUrls(payload.savedUrls || [])
  }, [user])

  useEffect(() => {
    if (!authLoading) void loadSaved().catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Saved articles could not be loaded.'))
  }, [authLoading, loadSaved])

  const parseNewsResponse = async (res: Response) => {
    const rawBody = await res.text()

    if (!rawBody.trim()) {
      throw new Error(`News API returned ${res.status} with an empty response.`)
    }

    try {
      return JSON.parse(rawBody) as NewsResponse
    } catch {
      throw new Error(`News API returned ${res.status} with non-JSON content.`)
    }
  }

  const load = useCallback(() => {
    if (category === 'Saved') {
      setLoading(false)
      setErrorMessage(null)
      return
    }

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
        const payload = await parseNewsResponse(res)
        const items = payload.items || payload.articles || []

        if (!res.ok || payload.success === false || payload.ok === false) {
          const message = payload.error || payload.message || 'News could not be loaded right now.'
          throw new Error(message)
        }

        return {
          ...payload,
          items,
          articles: payload.articles || items,
          savedIds: payload.savedIds || [],
          brief: payload.brief || [],
          sinceYesterday: payload.sinceYesterday || [],
          concepts: payload.concepts || []
        } as NewsResponse
      })
      .then((payload: NewsResponse) => {
        setData({
          ...payload,
          items: payload.items || payload.articles || [],
          savedIds: payload.savedIds || [],
          brief: payload.brief || [],
          sinceYesterday: payload.sinceYesterday || [],
          concepts: payload.concepts || []
        })
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

  const savedSet = useMemo(() => new Set(savedUrls), [savedUrls])

  const toggleSave = async (article: NewsItem) => {
    if (requireAuth('Sign in or create a MuksBooks account to keep articles in your personal Saved collection.', '/news')) return

    const isSaved = savedSet.has(article.url)
    setSavedUrls((previous) => isSaved ? previous.filter((url) => url !== article.url) : [...previous, article.url])
    if (isSaved) setSavedItems((previous) => previous.filter((item) => item.url !== article.url))

    const response = await fetch('/api/news/saved', {
      method: isSaved ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isSaved ? { url: article.url } : { article })
    }).catch(() => null)

    if (!response?.ok) {
      const payload = await response?.json().catch(() => null)
      await loadSaved().catch(() => undefined)
      setErrorMessage(payload?.error || (isSaved ? 'The article could not be removed from Saved.' : 'The article could not be saved.'))
      return
    }

    await loadSaved().catch(() => undefined)
  }

  const displayedItems = category === 'Saved' ? savedItems : data.items
  const savedGroups = useMemo(() => {
    if (category !== 'Saved') return []
    const groups = new Map<string, SavedNewsItem[]>()
    savedItems.forEach((item) => {
      const sortDate = item.publishedAt && !Number.isNaN(new Date(item.publishedAt).getTime()) ? item.publishedAt : item.savedAt
      const label = new Date(sortDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
      groups.set(label, [...(groups.get(label) || []), item])
    })
    return Array.from(groups.entries())
  }, [category, savedItems])

  return (
    <div className="space-y-6 lg:col-span-2">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <Badge key={item} variant={category === item ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCategory(item)}>
            {item}
          </Badge>
        ))}
      </div>

      {category !== 'Saved' && data.brief.length > 0 && (
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Today&apos;s Actuarial Brief</p>
          <p className="text-xs text-sky-600">{data.brief.length} developments worth knowing</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {data.brief.map((briefItem) => (
              <li key={briefItem.id}>{briefItem.summary}</li>
            ))}
          </ol>
        </div>
      )}

      {category !== 'Saved' && <div className="flex flex-wrap items-center gap-4">
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
      </div>}

      {category !== 'Saved' && showSinceYesterday && (
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

      {category !== 'Saved' && <input
        type="search"
        placeholder="Search company, regulator, topic, actuarial concept, country..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm"
      />}

      {errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">News could not be fully loaded right now.</p>
          <p className="mt-1">{errorMessage}</p>
          <button className="mt-3 text-sm font-medium text-amber-900 underline" onClick={() => category === 'Saved' ? void loadSaved() : load()}>Retry</button>
        </div>
      )}

      {category !== 'Saved' && data.concepts.length > 0 && (
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

      {category === 'Saved' && !user && !authLoading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-semibold text-slate-900">Your saved articles will appear here.</p>
          <p className="mt-1 text-sm text-slate-500">Sign in to save actuarial news and build your personal reading library.</p>
          <button className="mt-4 text-sm font-semibold text-sky-700 hover:text-sky-900" onClick={() => requireAuth('Sign in to view your personal Saved collection.', '/news')}>Sign In</button>
        </div>
      ) : loading || authLoading ? (
        <div className="text-center">Finding the latest actuarial news...</div>
      ) : displayedItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          <p>{category === 'Saved' ? 'Save an article to start your personal reading library.' : 'No relevant articles were found. Try refreshing or broadening the category.'}</p>
          {category !== 'Saved' && <button className="mt-3 text-sm font-medium text-slate-700 underline" onClick={load}>Retry</button>}
        </div>
      ) : category === 'Saved' ? (
        <div className="space-y-8">
          {savedGroups.map(([date, items]) => (
            <section key={date} className="space-y-4">
              <h2 className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700">{date}</h2>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => <NewsCard key={item.url} item={item} saved onToggleSave={toggleSave} onSelectConcept={setConcept} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              saved={savedSet.has(item.url)}
              onToggleSave={toggleSave}
              onSelectConcept={(selectedConcept) => setConcept(concept === selectedConcept ? null : selectedConcept)}
            />
          ))}
        </div>
      )}
    </div>
  )
}