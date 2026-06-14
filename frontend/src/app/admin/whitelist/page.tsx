'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whitelistApi } from '@/lib/api'
import DashboardLayout from '../../dashboard-layout'
import { Shield, Plus, Trash2, Upload, X, Search, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { WhitelistEmail } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function WhitelistPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['whitelist'],
    queryFn: () => whitelistApi.list().then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: () => whitelistApi.add(newEmail, newNotes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] })
      setShowAddModal(false)
      setNewEmail('')
      setNewNotes('')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => whitelistApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whitelist'] }),
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => whitelistApi.bulkImport(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] })
      setShowImportModal(false)
    },
  })

  const allEntries: WhitelistEmail[] = data?.data || []
  const entries = search
    ? allEntries.filter(
        (e) =>
          e.email.toLowerCase().includes(search.toLowerCase()) ||
          (e.notes || '').toLowerCase().includes(search.toLowerCase())
      )
    : allEntries

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Email Whitelist</h1>
          </div>
          <p className="text-sm text-text-secondary ml-11">
            {allEntries.length} whitelisted email{allEntries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="gap-2">
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="w-3.5 h-3.5" />
            Add Email
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
        <Input
          placeholder="Search emails..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-secondary-bg text-sm"
        />
      </div>

      {/* Whitelist Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary-bg/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Added By
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Date Added
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Notes
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Actions
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
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-text-secondary text-sm">
                  {search ? 'No matching emails' : 'No whitelisted emails yet'}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-secondary-bg/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                        {entry.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{entry.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                        entry.is_active
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-danger/10 text-danger border-danger/20'
                      )}
                    >
                      {entry.is_active ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{entry.created_by?.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary max-w-[160px] truncate">
                    {entry.notes || <span className="italic text-text-secondary/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {entry.is_active && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${entry.email} from whitelist?`)) {
                            removeMutation.mutate(entry.id)
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                        title="Remove from whitelist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Email Modal ─────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">Add Email to Whitelist</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-secondary-bg text-text-secondary hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@company.com"
                    onKeyDown={(e) => e.key === 'Enter' && newEmail && addMutation.mutate()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Notes
                  </label>
                  <Input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Optional notes..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => addMutation.mutate()}
                    disabled={!newEmail || addMutation.isPending}
                    className="gap-2"
                  >
                    {addMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Add Email
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Import CSV Modal ────────────────────────────────────────── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Bulk Import Emails</h2>
                  <p className="text-xs text-text-secondary mt-0.5">Upload a CSV with one email per line</p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 rounded-lg hover:bg-secondary-bg text-text-secondary hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                onClick={() => document.getElementById('whitelist-file-input')?.click()}
                className="border-2 border-dashed border-border hover:border-accent/50 rounded-xl p-8 text-center cursor-pointer transition-colors hover:bg-secondary-bg/30 mb-4"
              >
                <Upload className="w-8 h-8 text-text-secondary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
                <p className="text-xs text-text-secondary mt-1">One email per line</p>
                <input
                  id="whitelist-file-input"
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) importMutation.mutate(file)
                  }}
                />
              </div>

              {importMutation.isPending && (
                <div className="flex items-center gap-2 p-3 bg-accent/5 border border-accent/20 rounded-lg text-accent text-sm">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Importing emails...
                </div>
              )}
              {importMutation.isSuccess && (
                <div className="flex items-center gap-2 p-3 bg-success/5 border border-success/20 rounded-lg text-success text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Import completed successfully!
                </div>
              )}
              {importMutation.isError && (
                <div className="flex items-center gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg text-danger text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Import failed. Please check the file format.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
