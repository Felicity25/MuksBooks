'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { normalizeMathForSpeech, type MathSpeechDetail } from '@/lib/speech/math-speech'

type ReadAloudStatus = 'idle' | 'playing' | 'paused'

interface ReadAloudContextValue {
  status: ReadAloudStatus
  chunks: string[]
  currentChunkIndex: number
  currentChunk: string
  rate: number
  volume: number
  muted: boolean
  voiceURI: string
  mathDetail: MathSpeechDetail
  voices: SpeechSynthesisVoice[]
  speakText: (text: string) => void
  pause: () => void
  resume: () => void
  stop: () => void
  nextChunk: () => void
  previousChunk: () => void
  setRate: (value: number) => void
  setVolume: (value: number) => void
  setMuted: (value: boolean) => void
  setVoiceURI: (value: string) => void
  setMathDetail: (value: MathSpeechDetail) => void
  readSelection: () => void
}

const ReadAloudContext = createContext<ReadAloudContextValue | null>(null)

function chunkText(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const sentences = normalized.match(/[^.!?]+[.!?]?/g) || [normalized]
  const result: string[] = []
  let buffer = ''
  for (const sentence of sentences) {
    const next = `${buffer} ${sentence}`.trim()
    if (next.length > 260 && buffer) {
      result.push(buffer)
      buffer = sentence.trim()
    } else {
      buffer = next
    }
  }
  if (buffer) result.push(buffer)
  return result
}

export function ReadAloudProvider({ children }: { children: React.ReactNode }) {
  const { settings, saveSettings } = useAuth()
  const [status, setStatus] = useState<ReadAloudStatus>('idle')
  const [chunks, setChunks] = useState<string[]>([])
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [rate, setRateState] = useState(settings.speechRate ?? 1)
  const [volume, setVolumeState] = useState(settings.speechVolume ?? 0.85)
  const [muted, setMutedState] = useState(settings.speechMuted ?? false)
  const [voiceURI, setVoiceURIState] = useState(settings.speechVoiceURI ?? '')
  const [mathDetail, setMathDetailState] = useState<MathSpeechDetail>(settings.mathSpeechDetail ?? 'brief')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    utteranceRef.current = null
    setStatus('idle')
  }, [])

  const speakChunk = useCallback((index: number, currentChunks: string[]) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const chunk = currentChunks[index]
    if (!chunk) {
      setStatus('idle')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(chunk)
    utterance.rate = rate
    utterance.volume = muted ? 0 : volume
    if (voiceURI) {
      const selected = window.speechSynthesis.getVoices().find((voice) => voice.voiceURI === voiceURI)
      if (selected) utterance.voice = selected
    }
    utterance.onend = () => {
      const nextIndex = index + 1
      if (nextIndex >= currentChunks.length) {
        setStatus('idle')
        setCurrentChunkIndex(currentChunks.length - 1)
        return
      }
      setCurrentChunkIndex(nextIndex)
      speakChunk(nextIndex, currentChunks)
    }
    utterance.onerror = () => setStatus('idle')
    utteranceRef.current = utterance
    setCurrentChunkIndex(index)
    setStatus('playing')
    window.speechSynthesis.speak(utterance)
  }, [muted, rate, voiceURI, volume])

  const speakText = useCallback((text: string) => {
    const normalized = normalizeMathForSpeech(text, mathDetail)
    const nextChunks = chunkText(normalized)
    if (!nextChunks.length) return
    setChunks(nextChunks)
    speakChunk(0, nextChunks)
  }, [mathDetail, speakChunk])

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.pause()
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.resume()
    setStatus('playing')
  }, [])

  const nextChunk = useCallback(() => {
    if (!chunks.length) return
    const nextIndex = Math.min(currentChunkIndex + 1, chunks.length - 1)
    speakChunk(nextIndex, chunks)
  }, [chunks, currentChunkIndex, speakChunk])

  const previousChunk = useCallback(() => {
    if (!chunks.length) return
    const nextIndex = Math.max(currentChunkIndex - 1, 0)
    speakChunk(nextIndex, chunks)
  }, [chunks, currentChunkIndex, speakChunk])

  const persistSpeechPref = useCallback((updates: Record<string, unknown>) => {
    void saveSettings(updates as any)
  }, [saveSettings])

  const setRate = useCallback((value: number) => {
    setRateState(value)
    persistSpeechPref({ speechRate: value })
  }, [persistSpeechPref])

  const setVolume = useCallback((value: number) => {
    setVolumeState(value)
    persistSpeechPref({ speechVolume: value })
  }, [persistSpeechPref])

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value)
    persistSpeechPref({ speechMuted: value })
  }, [persistSpeechPref])

  const setVoiceURI = useCallback((value: string) => {
    setVoiceURIState(value)
    persistSpeechPref({ speechVoiceURI: value })
  }, [persistSpeechPref])

  const setMathDetail = useCallback((value: MathSpeechDetail) => {
    setMathDetailState(value)
    persistSpeechPref({ mathSpeechDetail: value })
  }, [persistSpeechPref])

  const readSelection = useCallback(() => {
    if (typeof window === 'undefined') return
    const selected = window.getSelection()?.toString().trim()
    if (selected) speakText(selected)
  }, [speakText])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices()
      setVoices(available)
      if (!voiceURI && available[0]) {
        setVoiceURIState(available[0].voiceURI)
      }
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis.cancel()
    }
  }, [voiceURI])

  const value = useMemo<ReadAloudContextValue>(() => ({
    status,
    chunks,
    currentChunkIndex,
    currentChunk: chunks[currentChunkIndex] || '',
    rate,
    volume,
    muted,
    voiceURI,
    mathDetail,
    voices,
    speakText,
    pause,
    resume,
    stop,
    nextChunk,
    previousChunk,
    setRate,
    setVolume,
    setMuted,
    setVoiceURI,
    setMathDetail,
    readSelection
  }), [chunks, currentChunkIndex, mathDetail, muted, nextChunk, pause, previousChunk, rate, readSelection, resume, setMathDetail, setMuted, setRate, setVoiceURI, setVolume, speakText, status, stop, voiceURI, voices, volume])

  return <ReadAloudContext.Provider value={value}>{children}</ReadAloudContext.Provider>
}

export function useReadAloud() {
  const context = useContext(ReadAloudContext)
  if (!context) throw new Error('useReadAloud must be used within ReadAloudProvider')
  return context
}
