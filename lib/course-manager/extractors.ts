import path from 'path'
import { appendLog } from '@/lib/logging'

export interface ExtractedPageText {
  pageNumber: number
  text: string
}

export interface ExtractedUploadText {
  text: string
  pages: ExtractedPageText[]
}

function stripXmlTags(text: string) {
  return text
    .replace(/<w:tab\/?\s*>/g, ' ')
    .replace(/<a:br\s*\/?\s*>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
}

function decodeBuffer(content: Buffer) {
  return content.toString('utf8')
}

function normalizeLines(raw: string) {
  const lines = raw
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())

  const frequency = new Map<string, number>()
  lines.forEach((line) => {
    if (line.length >= 4 && line.length <= 120) {
      frequency.set(line, (frequency.get(line) || 0) + 1)
    }
  })

  // Likely repeated headers/footers or watermarks.
  const repeated = new Set(
    Array.from(frequency.entries())
      .filter(([, count]) => count >= 4)
      .map(([line]) => line)
  )

  return lines
    .filter((line) => line)
    .filter((line) => !repeated.has(line))
    .filter((line) => !/^page\s*\d+(\s*of\s*\d+)?$/i.test(line))
    .filter((line) => !/^\d+$/.test(line))
    .join('\n')
}

export function cleanExtractedText(raw: string) {
  const normalized = normalizeLines(raw)
  return normalized
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

async function extractFromPdf(content: Buffer): Promise<ExtractedUploadText> {
  const pdfModule = await import('pdf-parse')
  const pdfParse = (pdfModule as any).default || (pdfModule as any)
  let pageCounter = 0
  const pages: ExtractedPageText[] = []

  const parsed = await pdfParse(content, {
    pagerender: async (pageData: any) => {
      pageCounter += 1
      const textContent = await pageData.getTextContent({ normalizeWhitespace: true })
      const pageText = (textContent?.items || [])
        .map((item: any) => String(item?.str || '').trim())
        .filter(Boolean)
        .join(' ')
      const cleaned = cleanExtractedText(pageText)
      if (cleaned) {
        pages.push({ pageNumber: pageCounter, text: cleaned })
      }
      return pageText
    }
  })

  const fallbackText = cleanExtractedText(parsed?.text || '')
  const combined = pages.length ? pages.map((page) => page.text).join('\n\n') : fallbackText
  return {
    text: combined,
    pages
  }
}

async function extractFromDocx(content: Buffer) {
  const mammoth = await import('mammoth')
  const parsed = await mammoth.extractRawText({ buffer: content })
  return parsed.value || ''
}

async function extractFromPptx(content: Buffer) {
  const jszipModule = await import('jszip')
  const JSZip = jszipModule.default || jszipModule
  const zip = await JSZip.loadAsync(content)

  const slidePaths = Object.keys(zip.files)
    .filter((file) => /^ppt\/slides\/slide\d+\.xml$/i.test(file))
    .sort((a, b) => {
      const an = Number(a.match(/slide(\d+)\.xml/i)?.[1] || '0')
      const bn = Number(b.match(/slide(\d+)\.xml/i)?.[1] || '0')
      return an - bn
    })

  const texts: string[] = []
  for (const slidePath of slidePaths) {
    const xml = await zip.files[slidePath].async('string')
    const slideText = stripXmlTags(xml)
      .replace(/\s+/g, ' ')
      .trim()
    if (slideText) texts.push(slideText)
  }

  return texts.join('\n\n')
}

async function extractWithOcr(content: Buffer) {
  const tesseractModule = await import('tesseract.js')
  const Tesseract = (tesseractModule as any).default || (tesseractModule as any)
  const result = await Tesseract.recognize(content, 'eng')
  return result?.data?.text || ''
}

function extension(fileName: string) {
  return path.extname(fileName).toLowerCase()
}

function isImage(mimeType: string, ext: string) {
  return mimeType.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'].includes(ext)
}

export async function extractTextFromUpload(params: { fileName: string; mimeType: string; content: Buffer }) {
  const detailed = await extractTextFromUploadDetailed(params)
  return detailed.text
}

export async function extractTextFromUploadDetailed(params: { fileName: string; mimeType: string; content: Buffer }): Promise<ExtractedUploadText> {
  const { fileName, mimeType, content } = params
  const ext = extension(fileName)

  try {
    let raw = ''
    let pages: ExtractedPageText[] = []

    if (mimeType === 'application/pdf' || ext === '.pdf') {
      const extracted = await extractFromPdf(content)
      raw = extracted.text
      pages = extracted.pages
    } else if (mimeType.includes('wordprocessingml') || ext === '.docx') {
      raw = await extractFromDocx(content)
    } else if (mimeType.includes('presentationml') || ext === '.pptx') {
      raw = await extractFromPptx(content)
    } else if (isImage(mimeType, ext)) {
      raw = await extractWithOcr(content)
    } else {
      raw = decodeBuffer(content)
    }

    const cleaned = cleanExtractedText(raw)
    await appendLog('uploads', 'Text extracted from upload', {
      fileName,
      mimeType,
      extension: ext,
      extractedLength: cleaned.length,
      extractedPages: pages.length
    })

    return {
      text: cleaned,
      pages
    }
  } catch (error: any) {
    await appendLog('errors', 'Extractor failed; fallback to utf8 decode', {
      fileName,
      mimeType,
      error: error?.message || String(error)
    })

    return {
      text: cleanExtractedText(decodeBuffer(content)),
      pages: []
    }
  }
}
