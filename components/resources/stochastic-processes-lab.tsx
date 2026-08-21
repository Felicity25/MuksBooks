'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import katex from 'katex'
import { ChevronRight, Expand, Pause, Play, RotateCcw, Shuffle, StepForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STOCHASTIC_CONCEPTS, STOCHASTIC_CONCEPT_BY_ID } from '@/lib/resources/stochastic/concepts'
import {
  createTimeGrid,
  deterministicCurve,
  empiricalVariance,
  quadraticVariation,
  runningMean,
  sampleSeverity,
  simulateBrownianPaths,
  simulateCompoundPoisson,
  simulateDriftBrownianPaths,
  simulateGeometricBrownianPaths,
  simulatePoissonPath,
  simulateSimpleRandomWalk,
  type SeverityDistribution
} from '@/lib/resources/stochastic/simulations'
import { createRng } from '@/lib/resources/stochastic/random'
import type { ExplanationMode, LabConceptId, PathPoint } from '@/lib/resources/stochastic/types'

type PlotSeries = {
  id: string
  points: PathPoint[]
  color: string
  width?: number
  dashed?: boolean
  step?: boolean
  opacity?: number
}

interface PlotProps {
  title: string
  series: PlotSeries[]
  highlightIndex?: number | null
  showLegend?: boolean
  onPickIndex?: (index: number) => void
}

function MathFormula({ value, block = false, className = '' }: { value: string; block?: boolean; className?: string }) {
  const markup = useMemo(() => katex.renderToString(value, { throwOnError: false, strict: false, displayMode: block }), [value, block])
  const Tag = block ? 'div' : 'span'
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: markup }} />
}

function extent(values: number[]) {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (value < min) min = value
    if (value > max) max = value
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 }
  if (min === max) return { min: min - 1, max: max + 1 }
  return { min, max }
}

function seriesPath(points: PathPoint[], xScale: (v: number) => number, yScale: (v: number) => number, step = false) {
  if (!points.length) return ''
  const first = points[0]
  let path = `M ${xScale(first.t)} ${yScale(first.y)}`
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i]
    if (step) {
      path += ` L ${xScale(point.t)} ${yScale(points[i - 1].y)}`
    }
    path += ` L ${xScale(point.t)} ${yScale(point.y)}`
  }
  return path
}

function PathPlot({ title, series, highlightIndex = null, showLegend = true, onPickIndex }: PlotProps) {
  const width = 1100
  const height = 460
  const padding = { top: 28, right: 18, bottom: 38, left: 52 }
  const allPoints = series.flatMap((item) => item.points)
  const xStats = extent(allPoints.map((item) => item.t))
  const yStats = extent(allPoints.map((item) => item.y))
  const yPad = (yStats.max - yStats.min) * 0.1
  const yMin = yStats.min - yPad
  const yMax = yStats.max + yPad

  const xScale = (value: number) => padding.left + (value - xStats.min) / Math.max(1e-12, xStats.max - xStats.min) * (width - padding.left - padding.right)
  const yScale = (value: number) => height - padding.bottom - (value - yMin) / Math.max(1e-12, yMax - yMin) * (height - padding.top - padding.bottom)

  const highlightX = highlightIndex !== null && series[0]?.points[highlightIndex] ? xScale(series[0].points[highlightIndex].t) : null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {showLegend ? (
          <div className="flex flex-wrap gap-2">
            {series.slice(0, 6).map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color, opacity: item.opacity ?? 1 }} />
                {item.id}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
          className="block h-auto w-full min-w-[900px]"
          onClick={(event) => {
            if (!onPickIndex || !series[0]?.points.length) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const x = event.clientX - bounds.left
            const px = (x / bounds.width) * width
            const t = xStats.min + ((px - padding.left) / Math.max(1, width - padding.left - padding.right)) * (xStats.max - xStats.min)
            let best = 0
            let bestDist = Number.POSITIVE_INFINITY
            for (let i = 0; i < series[0].points.length; i += 1) {
              const dist = Math.abs(series[0].points[i].t - t)
              if (dist < bestDist) {
                best = i
                bestDist = dist
              }
            }
            onPickIndex(best)
          }}
        >
          <rect x={padding.left} y={padding.top} width={width - padding.left - padding.right} height={height - padding.top - padding.bottom} fill="#f8fafc" />
          <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#cbd5e1" />
          <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#cbd5e1" />

          {Array.from({ length: 6 }, (_, index) => {
            const ratio = index / 5
            const y = padding.top + ratio * (height - padding.top - padding.bottom)
            const value = yMax - ratio * (yMax - yMin)
            return (
              <g key={`grid-${index}`}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />
                <text x={8} y={y + 4} fontSize="12" fill="#64748b">{value.toFixed(2)}</text>
              </g>
            )
          })}

          {series.map((item) => (
            <path
              key={item.id}
              d={seriesPath(item.points, xScale, yScale, item.step)}
              fill="none"
              stroke={item.color}
              strokeWidth={item.width || 2}
              strokeDasharray={item.dashed ? '8 6' : undefined}
              opacity={item.opacity ?? 1}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {highlightX !== null ? <line x1={highlightX} x2={highlightX} y1={padding.top} y2={height - padding.bottom} stroke="#f97316" strokeWidth="2" /> : null}

          <text x={width - 10} y={height - 8} textAnchor="end" fontSize="12" fill="#64748b">t</text>
          <text x={12} y={16} fontSize="12" fill="#64748b">value</text>
        </svg>
      </div>
    </div>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

const LEARN_ORDER: LabConceptId[] = [
  'deterministic-vs-brownian',
  'random-walk-limit',
  'brownian-motion',
  'quadratic-variation',
  'ito-process',
  'ito-lemma',
  'poisson',
  'compound-poisson',
  'gbm',
  'martingale'
]

export function StochasticProcessesLab() {
  const [conceptId, setConceptId] = useState<LabConceptId>('deterministic-vs-brownian')
  const [mode, setMode] = useState<ExplanationMode>('intuition')
  const [learnInOrder, setLearnInOrder] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const [seed, setSeed] = useState(1234)
  const [steps, setSteps] = useState(320)
  const [horizon, setHorizon] = useState(2)
  const [pathCount, setPathCount] = useState(24)
  const [speed, setSpeed] = useState(30)
  const [playing, setPlaying] = useState(false)
  const [visibleStep, setVisibleStep] = useState(0)

  const [mu, setMu] = useState(0.4)
  const [sigma, setSigma] = useState(1)
  const [x0, setX0] = useState(0)
  const [s0, setS0] = useState(100)
  const [lambda, setLambda] = useState(3)
  const [partitionCount, setPartitionCount] = useState(24)
  const [severityDist, setSeverityDist] = useState<SeverityDistribution>('exponential')

  const [pickedIndex, setPickedIndex] = useState<number | null>(null)
  const [incrementStartIndex, setIncrementStartIndex] = useState(80)
  const [incrementEndIndex, setIncrementEndIndex] = useState(180)
  const [showDrift, setShowDrift] = useState(true)
  const [showDiffusion, setShowDiffusion] = useState(true)

  const concept = STOCHASTIC_CONCEPT_BY_ID[conceptId]

  const brownian = useMemo(() => simulateBrownianPaths(seed, steps, horizon, pathCount), [seed, steps, horizon, pathCount])
  const driftBrownian = useMemo(() => simulateDriftBrownianPaths(seed, steps, horizon, pathCount, mu, sigma, x0), [seed, steps, horizon, pathCount, mu, sigma, x0])
  const gbm = useMemo(() => simulateGeometricBrownianPaths(seed, steps, horizon, pathCount, s0, mu, sigma), [seed, steps, horizon, pathCount, s0, mu, sigma])
  const randomWalk = useMemo(() => simulateSimpleRandomWalk(seed, Math.max(20, Math.floor(steps)), pathCount), [seed, steps, pathCount])
  const poisson = useMemo(() => simulatePoissonPath(seed, Math.max(40, Math.floor(steps / 2)), horizon, lambda), [seed, steps, horizon, lambda])
  const compoundPoisson = useMemo(() => simulateCompoundPoisson(seed, Math.max(40, Math.floor(steps / 2)), horizon, lambda, severityDist, {
    rate: 1,
    shape: 2,
    mu: 0,
    sigma: 0.7,
    scale: 1,
    alpha: 2.2,
    xm: 1
  }), [seed, steps, horizon, lambda, severityDist])

  const smoothCurve = useMemo(() => deterministicCurve(steps, horizon), [steps, horizon])

  const focusPath = useMemo(() => {
    if (conceptId === 'gbm') return gbm.paths[0]
    if (conceptId === 'random-walk-limit') return randomWalk.paths[0]
    if (conceptId === 'poisson') return poisson.map((p) => p.y)
    if (conceptId === 'compound-poisson') return compoundPoisson.aggregate.map((p) => p.y)
    return driftBrownian.paths[0]
  }, [conceptId, gbm.paths, randomWalk.paths, poisson, compoundPoisson.aggregate, driftBrownian.paths])

  const focusTimes = useMemo(() => {
    if (conceptId === 'random-walk-limit') return randomWalk.times
    if (conceptId === 'poisson') return poisson.map((p) => p.t)
    if (conceptId === 'compound-poisson') return compoundPoisson.aggregate.map((p) => p.t)
    return driftBrownian.times
  }, [conceptId, randomWalk.times, poisson, compoundPoisson.aggregate, driftBrownian.times])

  useEffect(() => {
    setVisibleStep(0)
    setPlaying(false)
  }, [conceptId, seed, steps, horizon, pathCount, mu, sigma, s0, lambda, severityDist])

  useEffect(() => {
    if (!playing) return
    const maxIndex = Math.max(0, focusTimes.length - 1)
    const timer = window.setInterval(() => {
      setVisibleStep((prev) => {
        if (prev >= maxIndex) {
          window.clearInterval(timer)
          return maxIndex
        }
        return prev + 1
      })
    }, clamp(1100 - speed * 10, 30, 1000))
    return () => window.clearInterval(timer)
  }, [playing, speed, focusTimes.length])

  const cappedIndex = pickedIndex === null ? null : clamp(pickedIndex, 0, Math.max(0, focusTimes.length - 1))

  const sIndex = clamp(Math.min(incrementStartIndex, incrementEndIndex - 1), 0, Math.max(0, brownian.times.length - 2))
  const tIndex = clamp(Math.max(incrementStartIndex + 1, incrementEndIndex), 1, Math.max(1, brownian.times.length - 1))

  const incrementValue = brownian.paths[0][tIndex] - brownian.paths[0][sIndex]
  const incrementSpan = brownian.times[tIndex] - brownian.times[sIndex]

  const brownianQuadratic = quadraticVariation(brownian.paths[0], partitionCount)
  const smoothQuadratic = quadraticVariation(smoothCurve.map((p) => p.y), partitionCount)

  const expectedDrift = driftBrownian.times.map((t) => x0 + mu * t)
  const averageDrift = runningMean(driftBrownian.paths)

  const driftOnly = useMemo(() => {
    const times = createTimeGrid(steps, horizon)
    return times.map((t) => x0 + mu * t)
  }, [steps, horizon, x0, mu])

  const diffusionOnly = useMemo(() => {
    const w = simulateBrownianPaths(seed, steps, horizon, 1)
    return w.paths[0].map((value) => x0 + sigma * value)
  }, [seed, steps, horizon, sigma, x0])

  const combinedIto = useMemo(() => {
    return driftOnly.map((driftValue, idx) => driftValue + sigma * brownian.paths[0][idx])
  }, [driftOnly, sigma, brownian.paths])

  const branchSim = useMemo(() => {
    const branchAt = clamp(Math.floor(0.45 * brownian.times.length), 3, brownian.times.length - 3)
    const branchTime = brownian.times[branchAt]
    const branchValue = brownian.paths[0][branchAt]
    const futures = simulateBrownianPaths(seed + 31, Math.max(30, steps - branchAt), Math.max(0.4, horizon - branchTime), 120)
    const avgFuture = futures.paths.map((_, idx) => futures.paths.reduce((sum, p) => sum + p[idx], 0) / futures.paths.length)
    const shifted = futures.paths.map((path) => path.map((value) => value + branchValue))
    return { branchAt, branchTime, branchValue, times: futures.times.map((t) => t + branchTime), futures: shifted, avg: avgFuture.map((value) => value + branchValue) }
  }, [seed, steps, horizon, brownian])

  const displayedConcepts = learnInOrder
    ? LEARN_ORDER.map((id) => STOCHASTIC_CONCEPT_BY_ID[id]).filter(Boolean)
    : STOCHASTIC_CONCEPTS

  const whatChangedMessage = useMemo(() => {
    if (conceptId === 'brownian-drift' || conceptId === 'ito-process') {
      const oldSigma = Math.max(0.2, sigma / 2)
      const oldVar = oldSigma * oldSigma * horizon
      const newVar = sigma * sigma * horizon
      return `Increasing \\sigma increases diffusion variance from ${oldVar.toFixed(3)} to ${newVar.toFixed(3)} over horizon t=${horizon.toFixed(2)}.`
    }
    if (conceptId === 'poisson' || conceptId === 'compound-poisson') {
      return `With \\lambda=${lambda.toFixed(2)}, expected arrivals are E[N_t]=\\lambda t=${(lambda * horizon).toFixed(2)} over t=${horizon.toFixed(2)}.`
    }
    if (conceptId === 'gbm') {
      return `GBM uses multiplicative diffusion. Larger \\sigma widens path spread while preserving positivity in the exact exponential form.`
    }
    return `Reducing \\Delta t changes Brownian increments by \\sqrt{\\Delta t}, which drives the Itô correction and quadratic variation behaviour.`
  }, [conceptId, sigma, horizon, lambda])

  const inspectPoint = cappedIndex !== null
    ? {
        t: focusTimes[cappedIndex],
        y: focusPath[cappedIndex],
        mean: conceptId === 'brownian-motion' ? 0 : conceptId === 'brownian-drift' ? x0 + mu * focusTimes[cappedIndex] : null,
        variance: conceptId === 'brownian-motion' ? focusTimes[cappedIndex] : conceptId === 'brownian-drift' ? sigma * sigma * focusTimes[cappedIndex] : null,
        increment: cappedIndex > 0 ? focusPath[cappedIndex] - focusPath[cappedIndex - 1] : 0
      }
    : null

  const mainSeries = useMemo<PlotSeries[]>(() => {
    if (conceptId === 'random-walk-limit') {
      const expected = randomWalk.times.map(() => 0)
      return [
        ...randomWalk.paths.slice(0, Math.min(pathCount, 12)).map((path, idx) => ({
          id: `Walk ${idx + 1}`,
          points: randomWalk.times.map((t, i) => ({ t, y: path[i] })),
          color: '#0ea5e9',
          opacity: 0.25,
          width: 1.5
        })),
        { id: 'Empirical mean', points: randomWalk.times.map((t, i) => ({ t, y: runningMean(randomWalk.paths)[i] })), color: '#f97316', width: 2.8 },
        { id: 'Theoretical mean', points: randomWalk.times.map((t, i) => ({ t, y: expected[i] })), color: '#334155', dashed: true, width: 2 }
      ]
    }

    if (conceptId === 'poisson') {
      const expected = poisson.map((point) => ({ t: point.t, y: lambda * point.t }))
      return [
        { id: 'N_t sample path', points: poisson, color: '#0ea5e9', width: 2.6, step: true },
        { id: 'E[N_t]=lambda t', points: expected, color: '#f97316', width: 2.4, dashed: true }
      ]
    }

    if (conceptId === 'compound-poisson') {
      return [
        { id: 'Arrivals N_t', points: compoundPoisson.arrivals, color: '#0ea5e9', width: 2.2, step: true },
        { id: 'Aggregate S_t', points: compoundPoisson.aggregate, color: '#16a34a', width: 2.6, step: true }
      ]
    }

    if (conceptId === 'gbm') {
      const expected = gbm.times.map((t) => ({ t, y: s0 * Math.exp(mu * t) }))
      return [
        ...gbm.paths.slice(0, Math.min(pathCount, 15)).map((path, idx) => ({
          id: `GBM ${idx + 1}`,
          points: gbm.times.map((t, i) => ({ t, y: path[i] })),
          color: '#0ea5e9',
          opacity: 0.25,
          width: 1.4
        })),
        { id: 'E[S_t]', points: expected, color: '#f97316', width: 2.8, dashed: true }
      ]
    }

    if (conceptId === 'ito-process') {
      return [
        ...(showDrift ? [{ id: 'Drift only', points: driftBrownian.times.map((t, i) => ({ t, y: driftOnly[i] })), color: '#334155', width: 2.3, dashed: true } as PlotSeries] : []),
        ...(showDiffusion ? [{ id: 'Diffusion only', points: driftBrownian.times.map((t, i) => ({ t, y: diffusionOnly[i] })), color: '#0ea5e9', width: 1.8, opacity: 0.8 } as PlotSeries] : []),
        { id: 'Combined process', points: driftBrownian.times.map((t, i) => ({ t, y: combinedIto[i] })), color: '#16a34a', width: 2.6 }
      ]
    }

    if (conceptId === 'ito-lemma') {
      const w = brownian.paths[0]
      const w2MinusT = driftBrownian.times.map((t, i) => ({ t, y: w[i] * w[i] - t }))
      return [
        { id: 'W_t', points: driftBrownian.times.map((t, i) => ({ t, y: w[i] })), color: '#0ea5e9', width: 2 },
        { id: 'W_t^2 - t', points: w2MinusT, color: '#f97316', width: 2.6 }
      ]
    }

    if (conceptId === 'martingale') {
      return [
        { id: 'History path', points: brownian.times.slice(0, branchSim.branchAt + 1).map((t, i) => ({ t, y: brownian.paths[0][i] })), color: '#0f172a', width: 2.8 },
        ...branchSim.futures.slice(0, 40).map((path, idx) => ({
          id: `Future ${idx + 1}`,
          points: branchSim.times.map((t, i) => ({ t, y: path[i] })),
          color: '#0ea5e9',
          opacity: 0.18,
          width: 1.3
        })),
        { id: 'Branch conditional mean', points: branchSim.times.map((t, i) => ({ t, y: branchSim.avg[i] })), color: '#f97316', width: 2.8, dashed: true }
      ]
    }

    if (conceptId === 'deterministic-vs-brownian') {
      const deterministic = smoothCurve
      const brownianOne = brownian.times.map((t, i) => ({ t, y: brownian.paths[0][i] }))
      return [
        { id: 'Smooth deterministic curve', points: deterministic, color: '#16a34a', width: 2.8 },
        { id: 'Brownian sample path', points: brownianOne, color: '#0ea5e9', width: 2.2 }
      ]
    }

    const expected = driftBrownian.times.map((t) => ({ t, y: x0 + mu * t }))
    const pathSet = conceptId === 'brownian-motion' ? brownian : driftBrownian
    return [
      ...pathSet.paths.slice(0, Math.min(pathCount, 20)).map((path, idx) => ({
        id: `Path ${idx + 1}`,
        points: pathSet.times.map((t, i) => ({ t, y: path[i] })),
        color: '#0ea5e9',
        width: 1.4,
        opacity: 0.22
      })),
      { id: 'Empirical mean', points: pathSet.times.map((t, i) => ({ t, y: runningMean(pathSet.paths)[i] })), color: '#16a34a', width: 2.8 },
      ...(conceptId === 'brownian-motion'
        ? [{ id: 'Theoretical mean = 0', points: pathSet.times.map((t) => ({ t, y: 0 })), color: '#334155', width: 2.2, dashed: true } as PlotSeries]
        : [{ id: 'Theoretical mean', points: expected, color: '#f97316', width: 2.2, dashed: true } as PlotSeries])
    ]
  }, [
    conceptId,
    randomWalk,
    pathCount,
    poisson,
    lambda,
    compoundPoisson,
    gbm,
    s0,
    mu,
    showDrift,
    showDiffusion,
    driftBrownian,
    driftOnly,
    diffusionOnly,
    combinedIto,
    brownian,
    branchSim,
    smoothCurve,
    x0
  ])

  const visibleSeries = useMemo(() => {
    const maxT = focusTimes[Math.min(visibleStep, Math.max(0, focusTimes.length - 1))] ?? 0
    return mainSeries.map((item) => ({
      ...item,
      points: item.points.filter((point) => point.t <= maxT)
    }))
  }, [mainSeries, focusTimes, visibleStep])

  const formulaRows = [
    { label: 'Definition', value: concept.formulas.definition },
    concept.formulas.distribution ? { label: 'Distribution', value: concept.formulas.distribution } : null,
    concept.formulas.mean ? { label: 'Mean', value: concept.formulas.mean } : null,
    concept.formulas.variance ? { label: 'Variance', value: concept.formulas.variance } : null,
    concept.formulas.itoResult ? { label: 'Important Itô result', value: concept.formulas.itoResult } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const nowShown = displayedConcepts.find((entry) => entry.id === conceptId) || concept

  return (
    <section aria-labelledby="stochastic-lab-title" className="space-y-6 border-t border-slate-200 pt-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">ETC3520 Mathematical Processes</p>
          <h2 id="stochastic-lab-title" className="mt-2 text-3xl font-semibold text-slate-950">Stochastic Processes and Calculus Lab</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Interactive visual laboratory for process paths, stochastic scaling, quadratic variation, Itô correction and actuarial process models. Mathematical notation is rendered in KaTeX and simulations are generated client-side with deterministic seed control.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExpanded((prev) => !prev)}>
            <Expand className="mr-2 h-4 w-4" />
            {expanded ? 'Collapse visualisation' : 'Expand visualisation'}
          </Button>
          <Button variant={learnInOrder ? 'default' : 'outline'} onClick={() => setLearnInOrder((prev) => !prev)}>
            Learn in order
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-slate-900">Concept map</div>
        <div className="flex flex-wrap gap-2 text-xs">
          {LEARN_ORDER.map((id, index) => (
            <button
              key={id}
              type="button"
              onClick={() => setConceptId(id)}
              className={`rounded-full border px-3 py-1.5 ${conceptId === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
            >
              {STOCHASTIC_CONCEPT_BY_ID[id].title}
              {index < LEARN_ORDER.length - 1 ? <ChevronRight className="ml-1 inline h-3 w-3" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className={`space-y-5 ${expanded ? '' : ''}`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <label className="text-sm font-semibold text-slate-700">Explore concept</label>
              <select
                value={conceptId}
                onChange={(event) => setConceptId(event.target.value as LabConceptId)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                {(learnInOrder ? displayedConcepts : STOCHASTIC_CONCEPTS).map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.category} · {entry.title}</option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-600">{nowShown.shortDescription}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">Explanation mode</label>
              <div className="mt-2 flex gap-2">
                {(['intuition', 'formal', 'exam'] as ExplanationMode[]).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setMode(entry)}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase ${mode === entry ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
                  >
                    {entry}
                  </button>
                ))}
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {nowShown.explanation[mode].map((line, index) => <p key={index}>{line}</p>)}
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${expanded ? 'w-full' : ''}`}>
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Seed
              <input type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value) || 1)} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Time steps
              <input type="range" min={40} max={1200} step={10} value={steps} onChange={(event) => setSteps(Number(event.target.value))} className="mt-2 w-full" />
              <span className="text-xs text-slate-600">{steps}</span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Horizon T
              <input type="range" min={0.5} max={8} step={0.1} value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} className="mt-2 w-full" />
              <span className="text-xs text-slate-600">{horizon.toFixed(2)}</span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Paths
              <input type="range" min={1} max={100} step={1} value={pathCount} onChange={(event) => setPathCount(Number(event.target.value))} className="mt-2 w-full" />
              <span className="text-xs text-slate-600">{pathCount}</span>
            </label>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Drift mu
              <input type="range" min={-2} max={2} step={0.05} value={mu} onChange={(event) => setMu(Number(event.target.value))} className="mt-2 w-full" />
              <span className="text-xs text-slate-600">{mu.toFixed(2)}</span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Volatility sigma
              <input type="range" min={0} max={3} step={0.05} value={sigma} onChange={(event) => setSigma(Number(event.target.value))} className="mt-2 w-full" />
              <span className="text-xs text-slate-600">{sigma.toFixed(2)}</span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Poisson lambda
              <input type="range" min={0.1} max={12} step={0.1} value={lambda} onChange={(event) => setLambda(Number(event.target.value))} className="mt-2 w-full" />
              <span className="text-xs text-slate-600">{lambda.toFixed(2)}</span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">GBM S0
              <input type="number" min={1} step={1} value={s0} onChange={(event) => setS0(Math.max(1, Number(event.target.value) || 1))} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
            </label>
          </div>

          {conceptId === 'compound-poisson' ? (
            <div className="mt-3">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Claim severity distribution</label>
              <select value={severityDist} onChange={(event) => setSeverityDist(event.target.value as SeverityDistribution)} className="mt-1 h-9 rounded-md border border-slate-300 bg-white px-2 text-sm">
                <option value="exponential">Exponential</option>
                <option value="gamma">Gamma</option>
                <option value="lognormal">Lognormal</option>
                <option value="weibull">Weibull</option>
                <option value="pareto">Pareto</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Distribution infrastructure aligned with the Resources distribution library concept set.</p>
              <Link href="/resources#distribution-title" className="mt-1 inline-flex items-center text-xs font-semibold text-sky-700 hover:text-sky-900">Explore distribution details <ChevronRight className="ml-1 h-3 w-3" /></Link>
            </div>
          ) : null}

          {conceptId === 'brownian-motion' ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Increment start index s
                <input type="range" min={0} max={Math.max(2, brownian.times.length - 3)} step={1} value={incrementStartIndex} onChange={(event) => setIncrementStartIndex(Number(event.target.value))} className="mt-2 w-full" />
              </label>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Increment end index t
                <input type="range" min={1} max={Math.max(2, brownian.times.length - 2)} step={1} value={incrementEndIndex} onChange={(event) => setIncrementEndIndex(Number(event.target.value))} className="mt-2 w-full" />
              </label>
            </div>
          ) : null}

          {conceptId === 'quadratic-variation' ? (
            <div className="mt-3">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Partition count n
                <input type="range" min={5} max={180} step={1} value={partitionCount} onChange={(event) => setPartitionCount(Number(event.target.value))} className="mt-2 w-full" />
                <span className="text-xs text-slate-600">{partitionCount}</span>
              </label>
            </div>
          ) : null}

          {conceptId === 'ito-process' ? (
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showDrift} onChange={(event) => setShowDrift(event.target.checked)} /> Drift only layer</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={showDiffusion} onChange={(event) => setShowDiffusion(event.target.checked)} /> Diffusion only layer</label>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setSeed((prev) => prev + 1)}><Shuffle className="mr-2 h-4 w-4" /> New random simulation</Button>
            <Button size="sm" variant="outline" onClick={() => { setVisibleStep(0); setPlaying(false) }}><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
            <Button size="sm" variant="outline" onClick={() => setPlaying((prev) => !prev)}>{playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{playing ? 'Pause' : 'Play'}</Button>
            <Button size="sm" variant="outline" onClick={() => setVisibleStep((prev) => Math.min(focusTimes.length - 1, prev + 1))}><StepForward className="mr-2 h-4 w-4" /> Step forward</Button>
            <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-2 py-1 text-xs">Speed
              <input type="range" min={5} max={100} step={1} value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="w-28" />
            </label>
          </div>

          <div className="mt-4">
            <PathPlot
              title={concept.title}
              series={visibleSeries}
              highlightIndex={cappedIndex}
              onPickIndex={(index) => setPickedIndex(index)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Formula panel</h3>
            <div className="mt-3 space-y-3">
              {formulaRows.map((row) => (
                <div key={row.label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{row.label}</p>
                  <MathFormula value={row.value} block className="text-sm text-slate-900" />
                </div>
              ))}
              {concept.formulas.keyProperties?.length ? (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Key properties</p>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {concept.formulas.keyProperties.map((property, index) => <MathFormula key={index} value={property} block />)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {conceptId === 'brownian-motion' ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Selected increment</h3>
              <p className="mt-2 text-sm text-slate-700">At indices s={sIndex}, t={tIndex}, the realised increment is:</p>
              <MathFormula value={`W_t-W_s=${incrementValue.toFixed(4)}`} block className="mt-2 text-slate-900" />
              <p className="text-sm text-slate-700">Theoretical law for this selection:</p>
              <MathFormula value={`W_t-W_s\\sim N\\left(0,${incrementSpan.toFixed(4)}\\right)`} block className="mt-2 text-slate-900" />
            </div>
          ) : null}

          {conceptId === 'quadratic-variation' ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Quadratic variation diagnostics</h3>
              <MathFormula value={`\\sum_i(\\Delta W_i)^2\\approx ${brownianQuadratic.toFixed(4)},\quad t=${horizon.toFixed(2)}`} block className="mt-2" />
              <MathFormula value={`\\sum_i(\\Delta f_i)^2\\approx ${smoothQuadratic.toFixed(4)}\\to0\text{ for smooth }f`} block className="mt-2" />
              <MathFormula value={'(dW_t)^2=dt\text{ (It\^o differential notation from quadratic variation)}'} block className="mt-2" />
            </div>
          ) : null}

          {conceptId === 'ito-lemma' ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Ordinary chain rule vs It\^o</h3>
              <MathFormula value={'df=f_x\,dx+f_t\,dt'} block className="mt-2" />
              <MathFormula value={'df=f_tdt+f_xdX+\frac12f_{xx}(dX)^2'} block className="mt-2" />
              <MathFormula value={'d(W_t^2)=2W_t\,dW_t+dt,\quad W_t^2-t\text{ is a martingale}'} block className="mt-2" />
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">What changed?</h3>
            <p className="mt-2 text-sm text-slate-700">{whatChangedMessage}</p>
            {(conceptId === 'brownian-drift' || conceptId === 'ito-process') ? (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                <MathFormula value={`E[X_t]=X_0+\\mu t,\quad \\operatorname{Var}(X_t)=\\sigma^2 t`} block />
                <p className="mt-1">At t={horizon.toFixed(2)}, theoretical variance is {(sigma * sigma * horizon).toFixed(4)}.</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Inspect path point</h3>
            <p className="mt-2 text-xs text-slate-500">Click anywhere on the chart to inspect local process values.</p>
            {inspectPoint ? (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <MathFormula value={`t=${inspectPoint.t.toFixed(4)},\quad X_t=${inspectPoint.y.toFixed(4)}`} block />
                {inspectPoint.mean !== null ? <MathFormula value={`E[X_t]=${inspectPoint.mean.toFixed(4)}`} block /> : null}
                {inspectPoint.variance !== null ? <MathFormula value={`\\operatorname{Var}(X_t)=${inspectPoint.variance.toFixed(4)}`} block /> : null}
                <MathFormula value={`\\Delta X=${inspectPoint.increment.toFixed(4)}`} block />
                {conceptId === 'brownian-motion' ? <MathFormula value={`\\Delta W=\\sqrt{\\Delta t}Z,\quad Z\\sim N(0,1)`} block /> : null}
              </div>
            ) : <p className="mt-3 text-sm text-slate-500">No point selected yet.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Check your understanding</h3>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {concept.checks.slice(0, 3).map((question, index) => (
                <details key={index} className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer font-medium text-slate-800">{question}</summary>
                  <p className="mt-2 text-slate-600">Use the active controls and formulas in this panel to justify your answer with the current settings.</p>
                </details>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Why would an actuary care?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">{concept.actuarialWhy}</p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              <MathFormula value={'\text{Wiener process} \equiv \text{standard Brownian motion in standard actuarial probability usage}'} block />
            </div>
          </div>

          {(conceptId === 'brownian-motion' || conceptId === 'brownian-drift') ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Empirical vs theoretical moments</h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <MathFormula value={`\\text{Empirical mean at }t=T: ${runningMean(conceptId === 'brownian-motion' ? brownian.paths : driftBrownian.paths).at(-1)?.toFixed(4) ?? '0'}`} block />
                <MathFormula value={`\\text{Empirical variance at }t=T: ${empiricalVariance(conceptId === 'brownian-motion' ? brownian.paths : driftBrownian.paths, (conceptId === 'brownian-motion' ? brownian.times : driftBrownian.times).length - 1).toFixed(4)}`} block />
                {conceptId === 'brownian-motion' ? <MathFormula value={`\\text{Theoretical variance }=T=${horizon.toFixed(4)}`} block /> : <MathFormula value={`\\text{Theoretical variance }=\\sigma^2T=${(sigma * sigma * horizon).toFixed(4)}`} block />}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
