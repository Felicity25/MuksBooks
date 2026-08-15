'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionShell } from '@/components/section-shell'

interface ErrorReportData {
  id: string
  reportId: string
  sessionId: string
  page: string
  browserUrl?: string
  userFeedback?: string
  errorMessage?: string
  severity: string
  resolutionEstimate?: string
  browserMemoryMb?: number
  performanceMetrics?: string
  userId?: string
  timestamp: string
  reviewed: boolean
  reviewNotes?: string
}

export function ErrorDashboard() {
  const [reports, setReports] = useState<ErrorReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [severity, setSeverity] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<ErrorReportData | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0 })

  const fetchReports = async () => {
    setLoading(true)
    try {
      const query = severity ? `?severity=${severity}` : ''
      const response = await fetch(`/api/error-reports${query}`)
      const result = await response.json()

      if (result.ok) {
        setReports(result.data)
        const counts = { total: result.pagination.total, critical: 0, high: 0, medium: 0, low: 0 }
        result.data.forEach((report: ErrorReportData) => {
          counts[report.severity as keyof typeof counts]++
        })
        setStats(counts)
      }
    } catch (error) {
      console.error('[ErrorDashboard] Failed to fetch reports', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [severity])

  const markAsReviewed = async (id: string) => {
    try {
      const response = await fetch(`/api/error-reports`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reviewed: true, reviewNotes })
      })

      if (response.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, reviewed: true, reviewNotes } : r
          )
        )
        setSelectedReport(null)
        setReviewNotes('')
      }
    } catch (error) {
      console.error('[ErrorDashboard] Failed to mark as reviewed', error)
    }
  }

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-100 text-red-900'
      case 'high':
        return 'bg-orange-100 text-orange-900'
      case 'medium':
        return 'bg-yellow-100 text-yellow-900'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <SectionShell title="Error Dashboard" description="Monitor system errors, user feedback, and performance issues">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-5">
          {[
            { label: 'Total', count: stats.total, color: 'bg-slate-100' },
            { label: 'Critical', count: stats.critical, color: 'bg-red-100' },
            { label: 'High', count: stats.high, color: 'bg-orange-100' },
            { label: 'Medium', count: stats.medium, color: 'bg-yellow-100' },
            { label: 'Low', count: stats.low, color: 'bg-slate-50' }
          ].map((item) => (
            <Card key={item.label} className={`p-4 ${item.color}`}>
              <p className="text-xs font-semibold uppercase text-slate-600">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{item.count}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="flex gap-2 p-4">
          <Button
            variant={severity === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSeverity(null)}
          >
            All
          </Button>
          {['critical', 'high', 'medium', 'low'].map((sev) => (
            <Button
              key={sev}
              variant={severity === sev ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverity(sev)}
            >
              {sev}
            </Button>
          ))}
        </Card>

        {/* Reports Table */}
        <Card className="overflow-x-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">No reports found</div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Report ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Feedback</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs font-mono text-slate-700">{report.reportId}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{report.page}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${severityColor(report.severity)}`}>
                        {report.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {report.userFeedback ? report.userFeedback.slice(0, 50) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(report.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                        report.reviewed ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {report.reviewed ? 'Reviewed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedReport(report)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <Card className="max-h-96 w-full max-w-2xl overflow-y-auto p-6">
              <h2 className="text-lg font-semibold text-slate-950">Error Report: {selectedReport.reportId}</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-700">Severity</p>
                  <p className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${severityColor(selectedReport.severity)}`}>
                    {selectedReport.severity}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-700">Page</p>
                  <p className="text-slate-600">{selectedReport.page}</p>
                </div>

                {selectedReport.errorMessage && (
                  <div>
                    <p className="font-semibold text-slate-700">Error</p>
                    <pre className="rounded bg-slate-50 p-2 text-xs overflow-auto max-h-32 text-slate-600">
                      {selectedReport.errorMessage}
                    </pre>
                  </div>
                )}

                {selectedReport.userFeedback && (
                  <div>
                    <p className="font-semibold text-slate-700">User Feedback</p>
                    <p className="text-slate-600">{selectedReport.userFeedback}</p>
                  </div>
                )}

                {selectedReport.browserMemoryMb && (
                  <div>
                    <p className="font-semibold text-slate-700">Browser Memory</p>
                    <p className="text-slate-600">{selectedReport.browserMemoryMb} MB</p>
                  </div>
                )}

                {selectedReport.resolutionEstimate && (
                  <div>
                    <p className="font-semibold text-slate-700">Est. Resolution Time</p>
                    <p className="text-slate-600">{selectedReport.resolutionEstimate}</p>
                  </div>
                )}

                <div>
                  <p className="font-semibold text-slate-700">Reported At</p>
                  <p className="text-slate-600">{new Date(selectedReport.timestamp).toLocaleString()}</p>
                </div>
              </div>

              {!selectedReport.reviewed && (
                <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add review notes..."
                    className="h-24 w-full rounded-2xl border border-slate-300 bg-slate-50 p-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(null)
                        setReviewNotes('')
                      }}
                    >
                      Close
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => markAsReviewed(selectedReport.id)}
                    >
                      Mark Reviewed
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </SectionShell>
  )
}
