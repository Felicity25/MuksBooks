// scripts/collect-news.ts
import { collectNews } from '../lib/news/pipeline.ts'

async function main() {
  console.log('Starting news collection...')
  const result = await collectNews()
  if (result && typeof result === 'object') {
    console.log(`Collected ${result.collected} articles; stored: ${result.stored}`)
    if (Array.isArray(result.logs)) {
      console.log('Logs:')
      result.logs.forEach(l => console.log(' -', l))
    }
  } else {
    console.log(`Collected ${result} new articles.`)
  }
}

main().catch(console.error)