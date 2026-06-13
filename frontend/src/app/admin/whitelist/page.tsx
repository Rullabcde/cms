'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whitelistApi } from '@/lib/api'
import DashboardLayout from '../../dashboard-layout'
import { Shield, Plus, Trash2, Upload, X } from 'lucide-react'
import type { WhitelistEmail } from '@/types'

export default function WhitelistPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newNotes, setNewNotes] = useState('')

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

  const entries: WhitelistEmail[] = data?.data || []

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email Whitelist</h1>
            <p className="text-sm text-text-secondary mt-0.5">{entries.length} whitelisted emails</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary-bg text-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Email
          </button>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary-bg">
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Email</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Added By</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Date</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Notes</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-text-secondary">
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-text-secondary">
                  No whitelisted emails
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-secondary-bg/50">
                  <td className="px-4 py-3 text-foreground font-medium">{entry.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        entry.is_active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {entry.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{entry.created_by?.email || '-'}</td>
                  <td className="px-4 py-3 text-text-secondary">{new Date(entry.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-text-secondary max-w-[150px] truncate">{entry.notes || '-'}</td>
                  <td className="px-4 py-3">
                    {entry.is_active && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${entry.email} from whitelist?`)) {
                            removeMutation.mutate(entry.id)
                          }
                        }}
                        className="p-1.5 rounded hover:bg-secondary-bg text-danger transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Email Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Add Email to Whitelist</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-secondary-bg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm rounded-lg hover:bg-secondary-bg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addMutation.mutate()}
                  disabled={!newEmail}
                  className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white font-medium rounded-lg disabled:opacity-50"
                >
                  Add Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Bulk Import Emails</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 rounded-lg hover:bg-secondary-bg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">Upload a CSV file with one email per line.</p>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importMutation.mutate(file)
              }}
              className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-white file:cursor-pointer"
            />
            {importMutation.isPending && <p className="text-sm text-accent mt-2">Importing...</p>}
            {importMutation.isSuccess && <p className="text-sm text-success mt-2">Import completed!</p>}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
