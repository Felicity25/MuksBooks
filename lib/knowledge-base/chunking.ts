export interface SemanticBlock {
  title?: string
  text: string
}

function cleanText(raw: string) {
  return raw
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/gm, '')
    .replace(/^[ \t]*\d+[ \t]*$/gm, '')
    .replace(/\u0000/g, '')
    .trim()
}

function splitByHeadings(text: string): SemanticBlock[] {
  const lines = text.split('\n')
  const blocks: SemanticBlock[] = []
  let currentTitle: string | undefined
  let currentLines: string[] = []

  const flush = () => {
    const chunk = currentLines.join('\n').trim()
    if (chunk) {
      blocks.push({ title: currentTitle, text: chunk })
    }
    currentLines = []
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(week\s*\d+|lecture\s*\d+|tutorial\s*\d+|definition|theorem|proof|example|worked example|algorithm|section)\b[:\-]?/i)
    if (headingMatch) {
      flush()
      currentTitle = line.trim()
      continue
    }
    currentLines.push(line)
  }
  flush()

  return blocks.length ? blocks : [{ text }]
}

export function semanticChunk(rawText: string, minWords = 400, maxWords = 800, overlapWords = 120): SemanticBlock[] {
  const cleaned = cleanText(rawText)
  const sections = splitByHeadings(cleaned)
  const output: SemanticBlock[] = []

  for (const section of sections) {
    const words = section.text.split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) {
      output.push(section)
      continue
    }

    let start = 0
    while (start < words.length) {
      const end = Math.min(words.length, start + maxWords)
      const windowWords = words.slice(start, end)
      if (windowWords.length < minWords && end !== words.length && output.length > 0) {
        output[output.length - 1].text += ` ${windowWords.join(' ')}`
      } else {
        output.push({ title: section.title, text: windowWords.join(' ') })
      }
      if (end === words.length) break
      start = Math.max(0, end - overlapWords)
    }
  }

  return output
}

export function extractKeywords(text: string, max = 10) {
  const stop = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'then', 'there', 'have', 'has', 'were', 'will', 'your'])
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w))

  const counts = new Map<string, number>()
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word)
}
