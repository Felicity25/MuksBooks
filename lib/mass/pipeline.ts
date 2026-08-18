import crypto from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { MASS_SOURCES } from './sources'
import type { MassCandidate, MassCategory, MassPulseItem, MassSourceDefinition } from './types'

const USER_AGENT = 'MuksBooksMASSBot/1.0 (+https://muksbooks.vercel.app)'
const FETCH_TIMEOUT_MS = 15_000

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
}

function hash(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function text(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}

function canonicalUrl(value: string, base: string) {
  try {
    const url = new URL(value, base)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    ;['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_id'].forEach((key) => url.searchParams.delete(key))
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function classify(title: string, url: string): MassCategory {
  const value = `${title} ${url}`.toLowerCase()
  if (/mass projects|project application|case competition|coding|hackathon|innovation challenge/.test(value)) return 'MASS Projects'
  if (/intern|graduate|career|job|employer|consulting|trading|site visit|networking|professional|sponsor/.test(value)) return 'Careers'
  if (/workshop|revision|tutorial|unit guide|education|actuar|scholarship|r workshop|python|exemption/.test(value)) return 'Education'
  if (/night|event|poker|games|ticket|humanitix|eventbrite|register/.test(value)) return 'Events'
  return 'Community'
}

function relevantAreas(title: string) {
  const value = title.toLowerCase()
  return [
    /\br\b|python|coding|ai|machine learning/.test(value) ? 'Technical skills' : null,
    /actuar|insurance|risk/.test(value) ? 'Actuarial careers' : null,
    /finance|trading|quant/.test(value) ? 'Quantitative finance' : null,
    /intern|graduate|career|employer|network/.test(value) ? 'Career development' : null,
    /unit|revision|tutorial|workshop|exemption/.test(value) ? 'Academic development' : null
  ].filter(Boolean) as string[]
}

function whyRelevant(title: string, category: MassCategory, areas: string[]) {
  if (areas.length) return `This relates to ${areas.slice(0, 2).join(' and ').toLowerCase()}.`
  if (category === 'MASS Projects') return 'This can build practical project experience alongside actuarial study.'
  if (category === 'Careers') return 'This may support actuarial career exploration and applications.'
  return `${title} is a public MASS opportunity for the Monash actuarial community.`
}

function dateFromUrl(url: string) {
  const match = url.match(/(?:event|night|workshop|talk|visit|competition)[^/]*(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)/i)
  if (!match) return null
  const parsed = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+10:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function extractLinks(html: string, source: MassSourceDefinition) {
  const links: Array<{ title: string; url: string }> = []
  const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchor.exec(html))) {
    const url = canonicalUrl(match[1], source.url)
    const title = text(match[2])
    if (!url || !title || title.length < 3) continue
    if (/^(home|events|awards program|sponsor logos|our sponsors|careers guide publication|networking guide|professional development|networking events)$/i.test(title)) continue
    if (/privacy|cookie|report|about|committee|contact|facebook|instagram|linkedin/i.test(title)) continue
    links.push({ title: title.slice(0, 180), url })
  }
  return links
}

function candidate(link: { title: string; url: string }, source: MassSourceDefinition): MassCandidate {
  const category = classify(link.title, link.url)
  const areas = relevantAreas(link.title)
  const isMassProjects = category === 'MASS Projects' || /mass projects/i.test(link.title)
  return {
    externalId: hash(link.url),
    title: link.title,
    url: link.url,
    sourceId: source.id,
    sourceName: source.name,
    sourceUrl: source.url,
    sourceType: source.type,
    contentHash: hash(`${link.title}|${link.url}`),
    category,
    description: category === 'Careers' ? 'A public career or professional-development opportunity shared by MASS.' : category === 'Education' ? 'A public academic or skills-development opportunity shared by MASS.' : 'A public update or opportunity shared by MASS.',
    startsAt: dateFromUrl(link.url),
    organisation: 'Monash Actuarial Students Society',
    relevantAreas: areas,
    isMassProjects,
    whyRelevant: whyRelevant(link.title, category, areas)
  }
}

async function fetchSource(source: MassSourceDefinition) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(source.url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }, redirect: 'follow', signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const html = await response.text()
    return { sourceHash: hash(html), candidates: extractLinks(html, source).map((link) => candidate(link, source)) }
  } finally {
    clearTimeout(timer)
  }
}

function findEventJson(value: unknown): Record<string, any> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEventJson(item)
      if (found) return found
    }
    return null
  }
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, any>
  const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']]
  if (types.some((type) => /event/i.test(String(type || '')))) return record
  return findEventJson(record['@graph'])
}

async function enrichStructuredEvent(item: MassCandidate): Promise<MassCandidate> {
  const hostname = new URL(item.url).hostname.toLowerCase()
  if (!/eventbrite\.|humanitix\./.test(hostname)) return item
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(item.url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' }, redirect: 'follow', signal: controller.signal })
    if (!response.ok) return item
    const html = await response.text()
    const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    for (const script of scripts) {
      try {
        const event = findEventJson(JSON.parse(script[1]))
        if (!event) continue
        const location = typeof event.location === 'string' ? event.location : event.location?.name || event.location?.address?.streetAddress || null
        return {
          ...item,
          title: text(String(event.name || item.title)).slice(0, 180),
          description: text(String(event.description || item.description)).slice(0, 500),
          startsAt: event.startDate || item.startsAt || null,
          endsAt: event.endDate || null,
          location
        }
      } catch {
        // Ignore malformed third-party metadata and retain Linktree information.
      }
    }
    return item
  } catch {
    return item
  } finally {
    clearTimeout(timer)
  }
}

export async function previewMassSources() {
  const results: Array<{ source: string; sourceHash: string; candidates: MassCandidate[]; error?: string }> = []
  for (const source of MASS_SOURCES) {
    try {
      const result = await fetchSource(source)
      results.push({ source: source.name, ...result })
    } catch (error) {
      results.push({ source: source.name, sourceHash: '', candidates: [], error: error instanceof Error ? error.message : String(error) })
    }
  }
  return results
}

function duplicateKey(item: MassCandidate) {
  return `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${item.startsAt?.slice(0, 10) || ''}`
}

async function upsertCandidate(client: SupabaseClient, item: MassCandidate, now: string) {
  const { data: urlMatch } = await client.from('mass_items').select('id, source_urls').eq('canonical_url', item.url).maybeSingle()
  const { data: titleMatch } = urlMatch ? { data: null } : await client.from('mass_items').select('id, source_urls').eq('dedupe_key', duplicateKey(item)).maybeSingle()
  const existing = urlMatch || titleMatch
  const id = existing?.id || crypto.randomUUID()
  const provenance = Array.isArray(existing?.source_urls) ? existing.source_urls : []
  const sourceUrls = [...provenance.filter((entry: any) => entry?.url !== item.sourceUrl), { name: item.sourceName, url: item.sourceUrl }]
  const payload = {
    id,
    external_id: item.externalId,
    canonical_url: item.url,
    title: item.title,
    organisation: item.organisation,
    category: item.category,
    description: item.description,
    starts_at: item.startsAt || null,
    ends_at: item.endsAt || null,
    registration_deadline: item.registrationDeadline || null,
    location: item.location || null,
    relevant_areas: item.relevantAreas,
    is_mass_projects: item.isMassProjects,
    why_relevant: item.whyRelevant,
    content_hash: item.contentHash,
    dedupe_key: duplicateKey(item),
    source_urls: sourceUrls,
    last_seen_at: now,
    retrieved_at: now
  }
  const { error } = await client.from('mass_items').upsert(payload, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  return !existing
}

async function passCareerToVerification(client: SupabaseClient, item: MassCandidate, now: string) {
  if (item.category !== 'Careers') return false
  const host = new URL(item.url).hostname.toLowerCase()
  const officialEmployerSource = /myworkdayjobs\.com|janestreet\.com|actuaries\.asn\.au|monash\.edu/.test(host)
  if (!officialEmployerSource) return false
  const companyName = /mercer/i.test(item.title) ? 'Mercer' : /jane street/i.test(item.title) ? 'Jane Street' : /actuaries institute/i.test(item.title) ? 'Actuaries Institute' : 'Monash University'
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const companyId = crypto.randomUUID()
  const { data: existingCompany } = await client.from('career_companies').select('id').eq('slug', slug).maybeSingle()
  const resolvedCompanyId = existingCompany?.id || companyId
  if (!existingCompany) await client.from('career_companies').insert({ id: companyId, name: companyName, slug, official_careers_url: `https://${host}`, source_type: 'MASS_DISCOVERY', profile_created: true })
  const externalJobId = `mass-${item.externalId}`
  const { data: existingJob } = await client.from('career_jobs').select('id').eq('company_id', resolvedCompanyId).eq('external_job_id', externalJobId).maybeSingle()
  const { error } = await client.from('career_jobs').upsert({
    id: existingJob?.id || crypto.randomUUID(), company_id: resolvedCompanyId, external_job_id: externalJobId, job_title: item.title,
    location: 'Australia', country: 'Australia', role_type: 'Opportunity', discipline: 'Actuarial', career_area: 'Actuarial',
    description: item.description, application_url: item.url, source_url: item.sourceUrl, source_type: 'MASS_DISCOVERY',
    date_found: now, last_verified: now, is_active: true
  }, { onConflict: 'company_id,external_job_id' })
  return !error
}

export async function syncMassPulse(mode: 'full' | 'delta') {
  const client = serviceClient()
  if (!client) throw new Error('MASS sync requires SUPABASE_SERVICE_ROLE_KEY.')
  const now = new Date().toISOString()
  let changedSources = 0
  let newItems = 0
  let careersForwarded = 0
  const failures: string[] = []

  for (const source of MASS_SOURCES) {
    try {
      const result = await fetchSource(source)
      const { data: previous } = await client.from('mass_sources').select('content_hash').eq('id', source.id).maybeSingle()
      await client.from('mass_sources').upsert({ id: source.id, name: source.name, source_url: source.url, source_type: source.type, content_hash: result.sourceHash, last_checked_at: now, last_successful_at: now }, { onConflict: 'id' })
      if (previous?.content_hash === result.sourceHash) continue
      changedSources += 1
      for (const item of result.candidates) {
        const { data: existingItem } = await client.from('mass_items').select('id, content_hash').eq('canonical_url', item.url).maybeSingle()
        if (existingItem?.content_hash === item.contentHash) {
          await client.from('mass_items').update({ last_seen_at: now, retrieved_at: now }).eq('id', existingItem.id)
          continue
        }
        const enriched = await enrichStructuredEvent(item)
        const created = await upsertCandidate(client, enriched, now)
        if (created) {
          newItems += 1
          if (await passCareerToVerification(client, enriched, now)) careersForwarded += 1
        }
      }
    } catch (error) {
      failures.push(`${source.name}: ${error instanceof Error ? error.message : String(error)}`)
      await client.from('mass_sources').upsert({ id: source.id, name: source.name, source_url: source.url, source_type: source.type, last_checked_at: now, last_error: failures.at(-1) }, { onConflict: 'id' })
    }
  }
  await client.from('mass_sync_runs').insert({ mode, started_at: now, completed_at: new Date().toISOString(), changed_sources: changedSources, new_items: newItems, careers_forwarded: careersForwarded, failures })
  return { mode, changedSources, newItems, careersForwarded, failures }
}

export async function listMassPulse(client: SupabaseClient): Promise<MassPulseItem[]> {
  const now = new Date()
  const startsAtCutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
  const { data, error } = await client.from('mass_items').select('*').or(`ends_at.gte.${now.toISOString()},and(ends_at.is.null,or(starts_at.is.null,starts_at.gte.${startsAtCutoff}))`).order('starts_at', { ascending: true, nullsFirst: false }).order('first_seen_at', { ascending: false }).limit(50)
  if (error) throw new Error(error.message)
  return (data || []).map((row: any) => ({ id: row.id, externalId: row.external_id, title: row.title, url: row.canonical_url, sourceId: '', sourceName: '', sourceUrl: '', sourceType: '', contentHash: row.content_hash, category: row.category, description: row.description, startsAt: row.starts_at, endsAt: row.ends_at, registrationDeadline: row.registration_deadline, location: row.location, organisation: row.organisation, relevantAreas: row.relevant_areas || [], isMassProjects: Boolean(row.is_mass_projects), whyRelevant: row.why_relevant, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at, retrievedAt: row.retrieved_at, publishedAt: row.published_at, sources: row.source_urls || [] }))
}