'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { credentialsApi, categoriesApi } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from './dashboard-layout'
import { Plus, Eye, Copy, Pencil, Trash2, Tag, ChevronLeft, ChevronRight, Database, X, Download } from 'lucide-react'
import type { Credential, Category } from '@/types'
import { exportCredentialsToCSV } from '@/lib/utils'

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const searchQuery = searchParams.get('q') || ''
  const categoryId = searchParams.get('category_id') || ''
  const page = Number(searchParams.get('page') || '1')

  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const updatePageParam = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.replace(`/?${params.toString()}`)
  }

  const { data: credData, isLoading } = useQuery({
    queryKey: ['credentials', page, searchQuery, categoryId],
    queryFn: () =>
      credentialsApi
        .list({
          page: String(page),
          limit: '20',
          ...(searchQuery && { q: searchQuery }),
          ...(categoryId && { category_id: categoryId }),
        })
        .then((r) => r.data),
  })

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  })

  const credentials: Credential[] = credData?.data || []
  const total: number = credData?.total || 0
  const categories: Category[] = catData?.data || []
  const totalPages = Math.ceil(total / 20)

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    // Auto-clear after 30 seconds
    setTimeout(() => navigator.clipboard.writeText(''), 30000)
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credentials</h1>
          <p className="text-sm text-text-secondary mt-1">
            {total} credential{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportCredentialsToCSV(credentials)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-secondary-bg text-sm transition-colors"
            title="Export currently displayed credentials"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Credential
            </button>
          )}
        </div>
      </div>

      {/* Credential Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-secondary-bg rounded-lg w-3/4" />
                  <div className="h-4 bg-secondary-bg rounded w-1/3" />
                </div>
              </div>
              <div className="h-4 bg-secondary-bg rounded w-full mb-2" />
              <div className="h-4 bg-secondary-bg rounded w-2/3 mb-4" />
              <div className="flex gap-2 mb-4">
                <div className="h-6 w-16 bg-secondary-bg rounded-full" />
                <div className="h-6 w-20 bg-secondary-bg rounded-full" />
              </div>
              <div className="flex gap-2 pt-4 border-t border-border">
                <div className="h-7 w-16 bg-secondary-bg rounded-md" />
                <div className="h-7 w-16 bg-secondary-bg rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
            <Database className="w-8 h-8 text-accent" />
          </div>
          {searchQuery || categoryId ? (
            <>
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-text-secondary text-sm mb-6 max-w-sm text-center">
                No credentials match your current filters. Try adjusting your search or selecting a different category.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-foreground mb-2">No credentials yet</h3>
              <p className="text-text-secondary text-sm mb-6 max-w-sm text-center">
                Get started by adding your first credential to the vault.
              </p>
              {canEdit && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Credential
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {credentials.map((cred) => (
            <CredentialCard
              key={cred.id}
              credential={cred}
              canEdit={canEdit}
              onView={() => setSelectedCredential(cred)}
              onCopy={copyToClipboard}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => updatePageParam(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-secondary-bg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => updatePageParam(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-secondary-bg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Credential Detail Modal */}
      {selectedCredential && (
        <CredentialDetailModal
          credential={selectedCredential}
          onClose={() => setSelectedCredential(null)}
          canEdit={canEdit}
          onCopy={copyToClipboard}
        />
      )}

      {/* Create Credential Modal */}
      {showCreateModal && <CreateCredentialModal categories={categories} onClose={() => setShowCreateModal(false)} />}
    </DashboardLayout>
  )
}

const tagColors: Record<string, string> = {
  production: 'bg-danger/10 text-danger',
  critical: 'bg-danger/10 text-danger font-semibold',
  development: 'bg-success/10 text-success',
  staging: 'bg-warning/10 text-warning',
  sre: 'bg-accent/10 text-accent',
  backup: 'bg-accent/10 text-accent',
  ai: 'bg-purple-500/10 text-purple-500',
}

function getTagColor(tag: string): string {
  const lower = tag.toLowerCase()
  return tagColors[lower] || 'bg-secondary-bg text-text-secondary'
}

function CredentialCard({
  credential,
  canEdit,
  onView,
  onCopy,
}: {
  credential: Credential
  canEdit: boolean
  onView: () => void
  onCopy: (text: string) => void
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 hover:border-accent/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 ease-out">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground truncate leading-snug">{credential.name}</h3>
          {credential.category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent mt-1">
              {credential.category.name}
            </span>
          )}
        </div>
      </div>

      {credential.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">{credential.description}</p>
      )}

      {credential.tags && credential.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {credential.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getTagColor(tag)}`}
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {credential.tags.length > 3 && (
            <span className="text-xs text-text-secondary">+{credential.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 pt-3 border-t border-border">
        <button
          onClick={onView}
          className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md hover:bg-secondary-bg hover:text-accent text-text-secondary transition-colors"
          title="View details"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
        {canEdit && (
          <>
            <button
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md hover:bg-secondary-bg hover:text-accent text-text-secondary transition-colors"
              title="Edit credential"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md hover:bg-danger/10 hover:text-danger text-text-secondary transition-colors"
              title="Delete credential"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function CredentialDetailModal({
  credential,
  onClose,
  canEdit,
  onCopy,
}: {
  credential: Credential
  onClose: () => void
  canEdit: boolean
  onCopy: (text: string) => void
}) {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [fields, setFields] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch credential with decrypted fields
  const { data } = useQuery({
    queryKey: ['credential', credential.id],
    queryFn: () => credentialsApi.get(credential.id).then((r) => r.data),
  })

  const decryptedFields: Record<string, string> = data?.data?.credential_fields || {}

  const toggleField = (key: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{credential.name}</h2>
              {credential.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent/10 text-accent mt-1">
                  {credential.category.name}
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary-bg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {credential.description && <p className="text-sm text-text-secondary mb-4">{credential.description}</p>}

          {/* Credential Fields */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-foreground">Fields</h3>
            {Object.entries(decryptedFields).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 p-3 bg-secondary-bg rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-secondary capitalize mb-1">{key}</div>
                  <div className="font-mono text-sm text-foreground truncate">
                    {visibleFields.has(key) ? value : '••••••••'}
                  </div>
                </div>
                <button
                  onClick={() => toggleField(key)}
                  className="p-1.5 rounded hover:bg-border transition-colors"
                  title={visibleFields.has(key) ? 'Hide' : 'Show'}
                >
                  <Eye className="w-4 h-4 text-text-secondary" />
                </button>
                <button
                  onClick={() => onCopy(value)}
                  className="p-1.5 rounded hover:bg-border transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="text-xs text-text-secondary space-y-1 pt-4 border-t border-border">
            <div>
              Created by: {credential.created_by?.email || 'Unknown'} on{' '}
              {new Date(credential.created_at).toLocaleDateString()}
            </div>
            <div>Updated: {new Date(credential.updated_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateCredentialModal({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [fields, setFields] = useState([{ label: '', value: '' }])

  const addField = () => setFields([...fields, { label: '', value: '' }])
  const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index))
  const updateField = (index: number, key: 'label' | 'value', val: string) => {
    const updated = [...fields]
    updated[index][key] = val
    setFields(updated)
  }

  const handleSave = async () => {
    const credentialFields: Record<string, string> = {}
    fields.forEach((f) => {
      if (f.label.trim()) {
        credentialFields[f.label.trim()] = f.value
      }
    })

    try {
      await credentialsApi.create({
        name,
        category_id: categoryId,
        description: description || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        credential_fields: credentialFields,
      })
      onClose()
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
    } catch (err) {
      console.error('Failed to create credential:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Create Credential</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary-bg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="e.g., Production MySQL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                placeholder="Optional description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                placeholder="production, critical, backup (comma separated)"
              />
            </div>

            {/* Dynamic Fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Credential Fields *</label>
                <button onClick={addField} className="text-xs text-accent hover:text-accent-hover">
                  + Add field
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(i, 'label', e.target.value)}
                      placeholder="Label (e.g., Username)"
                      className="flex-1 px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    <input
                      type="password"
                      value={field.value}
                      onChange={(e) => updateField(i, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                    {fields.length > 1 && (
                      <button
                        onClick={() => removeField(i)}
                        className="p-2 text-danger hover:bg-secondary-bg rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-secondary-bg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name || !categoryId}
              className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              Save Credential
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
