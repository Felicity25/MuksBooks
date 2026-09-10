import assert from 'node:assert/strict'
import { TRUSTED_CURRICULUM_SOURCES, checkCurriculumSource, checkCurriculumSources } from './curriculum-source-monitor.ts'

const source = { id: 'test', url: 'https://www.ibo.org/programmes/', authority: 'International Baccalaureate Organization', expectedDomain: 'ibo.org' }
const response = (body: string, init: { status?: number; url?: string } = {}) => new Response(body, { status: init.status || 200 })

async function run() {
  const active = await checkCurriculumSource(source, async () => response('<html>Current curriculum</html>') as Response)
  assert.equal(active.check.status, 'ACTIVE')
  assert.equal(active.candidate, undefined)

  const changed = await checkCurriculumSource({ ...source, previousFingerprint: 'old' }, async () => response('<html>Changed curriculum</html>') as Response)
  assert.equal(changed.check.status, 'NEEDS_REVIEW')
  assert.equal(changed.candidate?.status, 'NEEDS_REVIEW')

  const broken = await checkCurriculumSource(source, async () => response('Not found', { status: 404 }) as Response)
  assert.equal(broken.check.status, 'BROKEN')

  const insecure = await checkCurriculumSource({ ...source, url: 'http://www.ibo.org/programmes/' }, async () => response('ignored') as Response)
  assert.equal(insecure.check.status, 'BROKEN')

  const redirected = await checkCurriculumSource(source, async () => ({ ok: true, status: 200, url: 'https://example.com/login', text: async () => 'Login' }) as Response)
  assert.equal(redirected.check.status, 'BROKEN')

  assert.equal(new Set(TRUSTED_CURRICULUM_SOURCES.map((item) => item.url)).size, TRUSTED_CURRICULUM_SOURCES.length)
  let activeRequests = 0
  let peakRequests = 0
  const sources = Array.from({ length: 8 }, (_, index) => ({ ...source, id: `source-${index}`, url: `https://www.ibo.org/programmes/${index}` }))
  const batch = await checkCurriculumSources(sources, async () => {
    activeRequests += 1
    peakRequests = Math.max(peakRequests, activeRequests)
    await Promise.resolve()
    activeRequests -= 1
    return response('Current curriculum') as Response
  })
  assert.equal(batch.checks.length, sources.length)
  assert.ok(peakRequests > 1 && peakRequests <= 6)
  console.log('✓ classifies curriculum source checks conservatively')
}

void run()