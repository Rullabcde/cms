'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogsApi } from '@/lib/api'
import { FileText, Filter, CheckCircle, XCircle, Search } from 'lucide-react'
import type { AuditLog } from '@/types'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/shared/pagination'

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-success/10 text-success border-success/20',
  READ: 'bg-accent/10 text-accent border-accent/20',
  UPDATE: 'bg-warning/10 text-warning border-warning/20',
  DELETE: 'bg-danger/10 text-danger border-danger/20',
  LOGIN: 'bg-accent/10 text-accent border-accent/20',
  LOGOUT: 'bg-secondary-bg text-text-secondary border-border',
  IMPORT: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  EXPORT: 'bg-accent/10 text-accent border-accent/20',
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ action: '', status: '', resource_type: '' })
  const [search, setSearch] = useState('')

  const params: Record<string, string> = { page: String(page), limit: '50' }
  if (filters.action) params.action = filters.action
  if (filters.status) params.status = filters.status
  if (filters.resource_type) params.resource_type = filters.resource_type

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => auditLogsApi.list(params).then((r) => r.data),
  })

  const allLogs: AuditLog[] = data?.data || []
  const total: number = data?.total || 0
  const totalPages = Math.ceil(total / 50)

  const logs = search
    ? allLogs.filter(
        (l) =>
          (l.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
          l.resource_type.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          (l.change_summary || '').toLowerCase().includes(search.toLowerCase())
      )
    : allLogs

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Audit Logs</h1>
        </div>
        <p className="text-sm text-text-secondary ml-11">{total} log entries</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-secondary-bg text-sm"
          />
        </div>
        <div className="flex items-center gap-1 text-text-secondary">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Filter:</span>
        </div>
        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          className="h-9 px-3 rounded-lg bg-secondary-bg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-[140px]"
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="READ">READ</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="IMPORT">IMPORT</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="h-9 px-3 rounded-lg bg-secondary-bg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-[130px]"
        >
          <option value="">All Status</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
        </select>
        <select
          value={filters.resource_type}
          onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
          className="h-9 px-3 rounded-lg bg-secondary-bg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 w-[150px]"
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
      <div className="border border-border rounded-xl overflow-hidden bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary-bg/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Resource
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Summary
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-secondary">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-secondary text-sm">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary-bg/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                          {(log.user?.email || 'S').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-foreground truncate max-w-[140px]">
                          {log.user?.email || 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ACTION_COLORS[log.action] || 'bg-secondary-bg text-text-secondary border-border'}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary font-mono">
                      <span className="text-foreground">{log.resource_type}</span>
                      <span className="text-text-secondary/60">:{log.resource_id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary max-w-[200px] truncate">
                      {log.change_summary || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {log.status === 'SUCCESS' ? (
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">OK</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-danger">
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Fail</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )
}
