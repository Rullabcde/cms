'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogsApi } from '@/lib/api'
import DashboardLayout from '../../dashboard-layout'
import { FileText, Download, Filter, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import type { AuditLog } from '@/types'

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    action: '',
    status: '',
    resource_type: '',
  })

  const params: Record<string, string> = {
    page: String(page),
    limit: '50',
  }
  if (filters.action) params.action = filters.action
  if (filters.status) params.status = filters.status
  if (filters.resource_type) params.resource_type = filters.resource_type

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => auditLogsApi.list(params).then((r) => r.data),
  })

  const logs: AuditLog[] = data?.data || []
  const total: number = data?.total || 0
  const totalPages = Math.ceil(total / 50)

  const handleExport = async () => {
    try {
      const response = await auditLogsApi.export(params)
      const url = URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
            <p className="text-sm text-text-secondary mt-0.5">{total} log entries</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary-bg text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm"
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="READ">READ</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="IMPORT">IMPORT</option>
          <option value="EXPORT">EXPORT</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm"
        >
          <option value="">All Status</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
        </select>
        <select
          value={filters.resource_type}
          onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
          className="px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm"
        >
          <option value="">All Resources</option>
          <option value="credential">Credential</option>
          <option value="user">User</option>
          <option value="category">Category</option>
          <option value="whitelist">Whitelist</option>
          <option value="session">Session</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary-bg">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">User</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Action</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Resource</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Summary</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-text-secondary">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-text-secondary">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary-bg/50">
                    <td className="px-4 py-3 text-foreground">{log.user?.email || 'System'}</td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {log.resource_type}:{log.resource_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{log.change_summary}</td>
                    <td className="px-4 py-3">
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-secondary-bg disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-secondary-bg disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </DashboardLayout>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    CREATE: 'bg-success/10 text-success',
    READ: 'bg-accent/10 text-accent',
    UPDATE: 'bg-warning/10 text-warning',
    DELETE: 'bg-danger/10 text-danger',
    LOGIN: 'bg-accent/10 text-accent',
    LOGOUT: 'bg-text-secondary/10 text-text-secondary',
    IMPORT: 'bg-accent/10 text-accent',
    EXPORT: 'bg-accent/10 text-accent',
  }

  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[action] || 'bg-secondary-bg text-text-secondary'}`}
    >
      {action}
    </span>
  )
}
