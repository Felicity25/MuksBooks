'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { NewsCard } from '@/components/news/news-card'
import { useAuth } from '@/components/auth-provider'
import type { BriefItem, NewsItem, SavedNewsItem } from '@/lib/news/types'

function buildMuksBrief(stories: NewsItem[], academicMode?: string, degree?: string) {
  if (!stories.length) {
    return {
      title: 'Select stories to create a MuksBrief',
      sections: [
        {
          heading: 'What happened',
          body: 'Choose one or more articles from the feed to build a short briefing grounded in the selected stories.'
        }
      ],
      sources: []
    }
  }

  const primary = stories[0]
  const context = academicMode === 'LEARNER'
    ? 'This is useful for current affairs and classroom connections.'
    : degree
      ? `This is relevant to ${degree} and professional practice.`
      : 'This is relevant to university-level practice and professional understanding.'

  const sectionBodies = [
    {
      heading: 'What happened',
      body: stories.length === 1
        ? `The key story is ${primary.title}. Based on the selected source, it focuses on ${primary.summary || 'developments in the relevant sector'}.`
        : `The selected stories cover ${stories.map((story) => story.title).join('; ')}. Together they show a cluster of developments across the sector, with the strongest common theme being ${stories[0].title}.`
    },
    {
      heading: 'Why it matters',
      body: `These developments matter because they affect the same decision-makers, markets, and risks that shape actuarial and professional work. ${context}`
    },
    {
      heading: 'How these stories connect',
      body: stories.length === 1
        ? `${primary.title} is significant because it interacts with broader policy, pricing, risk, and market conditions. The main takeaway is that this item deserves attention for its operational and strategic implications.`
        : `What connects these stories is that they are all part of a wider pattern: policy change, market pressure, and professional adaptation are moving together. When read together, they show how a sector response is emerging rather than isolated events.`
    },
    {
      heading: 'What to watch next',
      body: 'The next step is to monitor how firms, regulators, and markets respond. Watch for timing, implementation detail, firm guidance, and whether the issue becomes broader or settles into a narrower policy change.'
    }
  ]

  return {
    title: stories.length === 1 ? 'MuksBrief' : 'MuksBrief',
    sections: sectionBodies,
    sources: stories.map((story) => ({
      label: story.sourceName,
      url: story.url,
      title: story.title
    }))
  }
}

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
  const { user, settings, isLoading: authLoading, requireAuth } = useAuth()
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [briefOpen, setBriefOpen] = useState(false)
  const [briefMode, setBriefMode] = useState<'READ' | 'LISTEN'>('READ')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null)

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
  const selectedStories = useMemo(() => data.items.filter((item) => selectedIds.includes(item.id)), [data.items, selectedIds])
  const briefSummary = useMemo(() => buildMuksBrief(selectedStories, settings.academicMode, settings.degree), [selectedStories, settings.academicMode, settings.degree])

  const toggleSelection = useCallback((article: NewsItem) => {
    setSelectedIds((previous) => previous.includes(article.id) ? previous.filter((id) => id !== article.id) : [...previous, article.id])
  }, [])

  const handleListen = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const text = briefSummary.sections.map((section) => `${section.heading}. ${section.body}`).join(' ')
    if (!text.trim()) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    const cleanText = text.replace(/\s+/g, ' ').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)
    speechRef.current = utterance

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }, [briefSummary, isSpeaking])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

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

      {category !== 'Saved' && (
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 space-y-3">
          <button type="button" onClick={() => setBriefOpen((value) => !value)} className="flex w-full items-center justify-between text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">✨ MuksBrief</p>
              <p className="text-xs text-sky-600">{selectedStories.length ? `${selectedStories.length} story${selectedStories.length === 1 ? '' : 'ies'} selected` : 'Select articles to build a briefing'}</p>
            </div>
            <span className="text-sm font-medium text-sky-700">{briefOpen ? 'Hide' : 'Open'}</span>
          </button>

          {briefOpen && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setBriefMode('READ')} className={briefMode === 'READ' ? 'rounded-full bg-sky-700 px-3 py-1.5 text-sm font-medium text-white' : 'rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sm font-medium text-sky-700'}>READ</button>
                <button type="button" onClick={() => setBriefMode('LISTEN')} className={briefMode === 'LISTEN' ? 'rounded-full bg-sky-700 px-3 py-1.5 text-sm font-medium text-white' : 'rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sm font-medium text-sky-700'}>LISTEN</button>
              </div>

              {selectedStories.length > 0 ? (
                <>
                  {briefMode === 'READ' ? (
                    <div className="space-y-4 rounded-2xl border border-sky-100 bg-white p-4">
                      <h3 className="text-base font-semibold text-slate-900">{briefSummary.title}</h3>
                      {briefSummary.sections.map((section) => (
                        <div key={section.heading} className="space-y-1">
                          <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">{section.heading}</p>
                          <p className="text-sm leading-6 text-slate-700">{section.body}</p>
                        </div>
                      ))}
                      <div className="space-y-2 border-t border-slate-200 pt-3">
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">Sources</p>
                        <ul className="space-y-1 text-sm text-slate-700">
                          {briefSummary.sources.map((source) => (
                            <li key={`${source.title}-${source.url}`}>
                              <a href={source.url} target="_blank" rel="noreferrer" className="text-sky-700 underline">{source.title}</a>
                              <span className="text-slate-500"> · {source.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 rounded-2xl border border-sky-100 bg-white p-4">
                      <p className="text-sm text-slate-700">The briefing is read aloud from the selected stories only. No audio plays automatically.</p>
                      <button type="button" onClick={handleListen} className="rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white">
                        {isSpeaking ? 'Pause' : 'Listen'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-2xl border border-dashed border-sky-200 bg-white p-4 text-sm text-slate-600">Select one or more articles below to generate a briefing that connects the main developments.</p>
              )}
            </div>
          )}
        </div>
      )}

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
              selected={selectedIds.includes(item.id)}
              onToggleSave={toggleSave}
              onToggleSelect={toggleSelection}
              onSelectConcept={(selectedConcept) => setConcept(concept === selectedConcept ? null : selectedConcept)}
            />
          ))}
        </div>
      )}
    </div>
  )
}