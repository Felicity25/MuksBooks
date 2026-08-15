import crypto from 'crypto'
import OpenAI from 'openai'

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

function pseudoEmbedding(text: string, dims = 256) {
  const digest = crypto.createHash('sha256').update(text).digest()
  const vec = new Array<number>(dims).fill(0)
  for (let i = 0; i < dims; i++) {
    const b = digest[i % digest.length]
    vec[i] = (b / 255) * 2 - 1
  }
  return vec
}

export async function embedText(text: string) {
  if (!client) return pseudoEmbedding(text)

  try {
    const response = await client.embeddings.create({
      model: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
      input: text.slice(0, 8000)
    })
    return response.data[0]?.embedding || pseudoEmbedding(text)
  } catch {
    return pseudoEmbedding(text)
  }
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
