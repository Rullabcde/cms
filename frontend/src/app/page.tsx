'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { credentialsApi, categoriesApi } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from './dashboard-layout'
import {
  Plus,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Database,
  X,
  Upload,
  ChevronDown,
  ChevronRight as ChevronRightSm,
  Search,
  Package2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import type { Credential, Category } from '@/types'
import { Suspense } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ─── Main Page (wrapped in Suspense for useSearchParams) ──────────────────────
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  )
}

function HomePageInner() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const searchQuery = searchParams.get('q') || ''
  const categoryId = searchParams.get('category_id') || ''
  const page = Number(searchParams.get('page') || '1')

  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  // Local search state (separate from URL search)
  const [localSearch, setLocalSearch] = useState('')

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
          limit: '100',
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
  const totalPages = Math.ceil(total / 100)

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setTimeout(() => navigator.clipboard.writeText(''), 30000)
  }

  // ── Group credentials by database name (derived from credential name or category) ──
  // Group by category (Database as parent)
  const grouped = credentials.reduce<Record<string, Credential[]>>((acc, cred) => {
    const groupKey = cred.category?.name || 'Uncategorized'
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(cred)
    return acc
  }, {})

  // Apply local search filter
  const filteredGrouped = Object.entries(grouped).reduce<Record<string, Credential[]>>((acc, [group, creds]) => {
    const filtered = localSearch
      ? creds.filter(
          (c) =>
            c.name.toLowerCase().includes(localSearch.toLowerCase()) ||
            (c.database_name || '').toLowerCase().includes(localSearch.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(localSearch.toLowerCase()) ||
            (c.tags || []).some((t) => t.toLowerCase().includes(localSearch.toLowerCase()))
        )
      : creds
    if (filtered.length > 0) acc[group] = filtered
    return acc
  }, {})

  const filteredTotal = Object.values(filteredGrouped).flat().length

  return (
    <DashboardLayout>
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Credentials</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {filteredTotal} of {total} credential{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="gap-2">
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add Credential
            </Button>
          )}
        </div>
      </div>

      {/* ─── Local Search Bar ────────────────────────────────────────── */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
        <Input
          placeholder="Search by name, database, description, or tag..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 bg-secondary-bg border-border text-sm h-9"
        />
        {localSearch && (
          <button
            onClick={() => setLocalSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ─── Credential Hierarchical View ────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : Object.keys(filteredGrouped).length === 0 ? (
        <EmptyState
          searchQuery={searchQuery || localSearch}
          categoryId={categoryId}
          canEdit={canEdit}
          onAdd={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {Object.entries(filteredGrouped).map(([groupName, creds]) => (
            <DatabaseGroup
              key={groupName}
              groupName={groupName}
              credentials={creds}
              canEdit={canEdit}
              onView={(cred) => setSelectedCredential(cred)}
              onEdit={(cred) => setEditingCredential(cred)}
              onCopy={copyToClipboard}
            />
          ))}
        </div>
      )}

      {/* ─── Pagination ──────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => updatePageParam(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-secondary-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-text-secondary px-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => updatePageParam(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-secondary-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      {selectedCredential && (
        <CredentialDetailModal
          credential={selectedCredential}
          onClose={() => setSelectedCredential(null)}
          canEdit={canEdit}
          onCopy={copyToClipboard}
        />
      )}
      {showCreateModal && <CreateCredentialModal categories={categories} onClose={() => setShowCreateModal(false)} />}
      {showImportModal && <ImportCSVModal onClose={() => setShowImportModal(false)} />}
      {editingCredential && (
        <EditCredentialModal
          credential={editingCredential}
          categories={categories}
          onClose={() => setEditingCredential(null)}
        />
      )}
    </DashboardLayout>
  )
}

// ─── Database Group (Accordion Parent) ───────────────────────────────────────
function DatabaseGroup({
  groupName,
  credentials,
  canEdit,
  onView,
  onEdit,
  onCopy,
}: {
  groupName: string
  credentials: Credential[]
  canEdit: boolean
  onView: (cred: Credential) => void
  onEdit: (cred: Credential) => void
  onCopy: (text: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      {/* ── Group Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary-bg/50 transition-colors text-left"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 shrink-0">
          <Database className="w-3.5 h-3.5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-foreground tracking-tight">{groupName}</span>
          <span className="ml-2 text-[11px] text-text-secondary">
            {credentials.length} item{credentials.length !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-secondary transition-transform duration-200 shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* ── Expanded Content: Credential Cards Grid ── */}
      {expanded && (
        <div className="border-t border-border bg-secondary-bg/30 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {credentials.map((cred) => (
              <CredentialCard
                key={cred.id}
                credential={cred}
                canEdit={canEdit}
                onView={() => onView(cred)}
                onEdit={() => onEdit(cred)}
                onCopy={onCopy}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tag colors ───────────────────────────────────────────────────────────────
const tagColors: Record<string, string> = {
  production: 'bg-red-500/10 text-red-500 border-red-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  development: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  dev: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  staging: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  sre: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  backup: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ai: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
}

function getTagColor(tag: string): string {
  const lower = tag.toLowerCase()
  return tagColors[lower] || 'bg-secondary-bg text-text-secondary border-border'
}

// ─── Credential Card (Compact) ─────────────────────────────────────────────────
function CredentialCard({
  credential,
  canEdit,
  onView,
  onEdit,
  onCopy,
}: {
  credential: Credential
  canEdit: boolean
  onView: () => void
  onEdit: () => void
  onCopy: (text: string) => void
}) {
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => credentialsApi.delete(credential.id),
    onSuccess: () => {
      setShowDeleteConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
    },
  })

  return (
    <>
      <div className="group relative flex flex-col gap-2 p-3.5 rounded-xl border border-border bg-surface hover:border-accent/30 hover:shadow-sm transition-all duration-150">
        {/* Name */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-medium text-foreground leading-snug truncate flex-1 tracking-tight">
            {credential.name}
          </h3>
        </div>

        {/* Database Name */}
        {credential.database_name && (
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-accent shrink-0" />
            <span className="text-[11px] font-mono text-accent/80 truncate">{credential.database_name}</span>
          </div>
        )}

        {/* Description */}
        {credential.description && <p className="text-xs text-text-secondary line-clamp-1">{credential.description}</p>}

        {/* Tags */}
        {credential.tags && credential.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {credential.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border',
                  getTagColor(tag)
                )}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
            {credential.tags.length > 2 && (
              <span className="text-[10px] text-text-secondary self-center">+{credential.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 border-t border-border/50">
          <button
            onClick={onView}
            className="flex items-center gap-1 px-1.5 py-1 text-[11px] rounded hover:bg-secondary-bg hover:text-accent text-text-secondary transition-colors"
            title="View details"
          >
            <Eye className="w-3 h-3" />
            View
          </button>
          {canEdit && (
            <>
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-1.5 py-1 text-[11px] rounded hover:bg-secondary-bg hover:text-accent text-text-secondary transition-colors"
                title="Edit"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="ml-auto flex items-center p-1 text-[11px] rounded hover:bg-danger/10 hover:text-danger text-text-secondary transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
            <div className="p-6">
              {/* Icon */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-danger" />
              </div>

              {/* Title & Message */}
              <div className="text-center mb-6">
                <h3 className="text-base font-semibold text-foreground mb-1.5">Delete Credential</h3>
                <p className="text-sm text-text-secondary">
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-foreground">&quot;{credential.name}&quot;</span>? This action cannot
                  be undone.
                </p>
              </div>

              {/* Error */}
              {deleteMutation.isError && (
                <div className="flex items-center gap-2 p-2.5 mb-4 bg-danger/5 border border-danger/20 rounded-lg text-danger text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Failed to delete. Please try again.
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-danger hover:bg-danger/90 text-white border-danger"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({
  searchQuery,
  categoryId,
  canEdit,
  onAdd,
}: {
  searchQuery: string
  categoryId: string
  canEdit: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-xl">
      <div className="w-12 h-12 rounded-2xl bg-secondary-bg flex items-center justify-center mb-4">
        {searchQuery || categoryId ? (
          <Search className="w-6 h-6 text-text-secondary" />
        ) : (
          <Package2 className="w-6 h-6 text-text-secondary" />
        )}
      </div>
      {searchQuery || categoryId ? (
        <>
          <h3 className="text-base font-semibold text-foreground mb-1">No results found</h3>
          <p className="text-sm text-text-secondary max-w-xs text-center">
            No credentials match your search. Try different keywords.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold text-foreground mb-1">No credentials yet</h3>
          <p className="text-sm text-text-secondary mb-5 max-w-xs text-center">
            Start by adding credentials or importing a CSV file.
          </p>
          {canEdit && (
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Credential
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Credential Detail Modal ──────────────────────────────────────────────────
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
  const [copied, setCopied] = useState<string | null>(null)
  const [fieldSearch, setFieldSearch] = useState('')

  const { data } = useQuery({
    queryKey: ['credential', credential.id],
    queryFn: () => credentialsApi.get(credential.id).then((r) => r.data),
  })

  // Nested structure: { "db_name": { "field_key": "value" } }
  const databases: Record<string, Record<string, string>> = data?.data?.credential_fields || {}
  const dbEntries = Object.entries(databases)

  // Filter by search
  const filteredDbs = fieldSearch
    ? dbEntries
        .map(([dbName, fields]) => {
          const filtered = Object.entries(fields).filter(
            ([key, value]) =>
              key.toLowerCase().includes(fieldSearch.toLowerCase()) ||
              value.toLowerCase().includes(fieldSearch.toLowerCase()) ||
              dbName.toLowerCase().includes(fieldSearch.toLowerCase())
          )
          return [dbName, Object.fromEntries(filtered)] as [string, Record<string, string>]
        })
        .filter(([, fields]) => Object.keys(fields).length > 0 || dbNameMatchesSearch(dbEntries, fieldSearch))
    : dbEntries

  const totalFields = dbEntries.reduce((sum, [, fields]) => sum + Object.keys(fields).length, 0)
  const filteredTotalFields = filteredDbs.reduce((sum, [, fields]) => sum + Object.keys(fields).length, 0)

  const toggleField = (key: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCopy = async (key: string, value: string) => {
    await onCopy(value)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground tracking-tight">{credential.name}</h2>
              {credential.category && (
                <Badge variant="secondary" className="text-xs gap-1 mt-2">
                  <Database className="w-2.5 h-2.5" />
                  {credential.category.name}
                </Badge>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary-bg text-text-secondary hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {credential.description && (
            <p className="text-sm text-text-secondary mb-5 pb-5 border-b border-border">{credential.description}</p>
          )}

          {/* Tags */}
          {credential.tags && credential.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {credential.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                    getTagColor(tag)
                  )}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Search within fields */}
          {totalFields > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search databases, users, fields..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-secondary-bg border border-border text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 placeholder:text-text-secondary"
              />
              {fieldSearch && (
                <button
                  onClick={() => setFieldSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Databases with their fields */}
          <div className="space-y-4 mb-5">
            {dbEntries.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-sm text-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading fields...
              </div>
            ) : filteredDbs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-sm text-text-secondary">
                <Search className="w-5 h-5" />
                <span>No fields match &quot;{fieldSearch}&quot;</span>
              </div>
            ) : (
              filteredDbs.map(([dbName, fields]) => (
                <DatabaseSection
                  key={dbName}
                  dbName={dbName === '_default' ? 'Default' : dbName}
                  fields={fields}
                  visibleFields={visibleFields}
                  copied={copied}
                  onToggle={toggleField}
                  onCopy={handleCopy}
                />
              ))
            )}
          </div>

          {/* Field count summary */}
          <div className="text-[11px] text-text-secondary mb-4">
            {filteredTotalFields} of {totalFields} field{totalFields !== 1 ? 's' : ''} across {dbEntries.length}{' '}
            database{dbEntries.length !== 1 ? 's' : ''}
          </div>

          {/* Metadata */}
          <div className="text-xs text-text-secondary space-y-1 pt-4 border-t border-border">
            <div>
              Created by{' '}
              <span className="text-foreground font-medium">{credential.created_by?.email || 'Unknown'}</span> on{' '}
              {new Date(credential.created_at).toLocaleDateString()}
            </div>
            <div>Last updated: {new Date(credential.updated_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function dbNameMatchesSearch(entries: [string, Record<string, string>][], search: string): boolean {
  return entries.some(([dbName]) => dbName.toLowerCase().includes(search.toLowerCase()))
}

// ─── Database Section (collapsible) ──────────────────────────────────────────
function DatabaseSection({
  dbName,
  fields,
  visibleFields,
  copied,
  onToggle,
  onCopy,
}: {
  dbName: string
  fields: Record<string, string>
  visibleFields: Set<string>
  copied: string | null
  onToggle: (key: string) => void
  onCopy: (key: string, value: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const entries = Object.entries(fields)

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Database Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-secondary-bg/60 hover:bg-secondary-bg transition-colors text-left"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10 shrink-0">
          <Database className="w-3.5 h-3.5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium font-mono text-foreground">{dbName}</span>
          <span className="ml-2 text-[10px] text-text-secondary">
            {entries.length} field{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-text-secondary transition-transform duration-200 shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Fields */}
      {expanded && (
        <div className="p-2 space-y-1.5">
          {entries.map(([key, value]) => {
            const compositeKey = `${dbName}::${key}`
            return (
              <div
                key={key}
                className="flex items-center gap-2 p-2.5 bg-secondary-bg/40 rounded-lg border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">
                    {key}
                  </div>
                  <div className="font-mono text-sm text-foreground truncate">
                    {visibleFields.has(compositeKey) ? value : '••••••••••••'}
                  </div>
                </div>
                <button
                  onClick={() => onToggle(compositeKey)}
                  className="p-1.5 rounded-lg hover:bg-border transition-colors text-text-secondary hover:text-foreground shrink-0"
                  title={visibleFields.has(compositeKey) ? 'Hide' : 'Show'}
                >
                  {visibleFields.has(compositeKey) ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => onCopy(compositeKey, value)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors shrink-0',
                    copied === compositeKey
                      ? 'text-success bg-success/10'
                      : 'hover:bg-border text-text-secondary hover:text-foreground'
                  )}
                  title="Copy to clipboard"
                >
                  {copied === compositeKey ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Import CSV Modal ─────────────────────────────────────────────────────────
function ImportCSVModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const importMutation = useMutation({
    mutationFn: (file: File) => credentialsApi.importCSV(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
      setTimeout(onClose, 1500)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Import failed. Please check your CSV format.')
    },
  })

  const handleFileChange = (file: File) => {
    setError(null)
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = text
        .split('\n')
        .slice(0, 6)
        .map((row) => row.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
        .filter((row) => row.some((cell) => cell.length > 0))
      setPreview(rows)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFileChange(file)
    } else {
      setError('Please upload a .csv file')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Import CSV</h2>
              <p className="text-xs text-text-secondary mt-0.5">Upload a CSV to auto-generate credential cards</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary-bg text-text-secondary hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4',
              selectedFile
                ? 'border-success/50 bg-success/5'
                : 'border-border hover:border-accent/50 hover:bg-secondary-bg/50'
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileChange(file)
              }}
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-success" />
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-text-secondary">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-text-secondary" />
                <p className="text-sm font-medium text-foreground">
                  Drop your CSV file here, or <span className="text-accent">browse</span>
                </p>
                <p className="text-xs text-text-secondary">Supports .csv files</p>
              </div>
            )}
          </div>

          {/* CSV Format hint */}
          <div className="mb-4 p-3 bg-secondary-bg rounded-lg border border-border">
            <p className="text-xs text-text-secondary font-medium mb-1">Expected CSV format:</p>
            <code className="text-xs font-mono text-foreground">name,category,description,username,password,tags</code>
          </div>

          {/* Preview Table */}
          {preview.length > 0 && (
            <div className="mb-4 overflow-hidden rounded-lg border border-border">
              <div className="text-xs font-medium text-text-secondary bg-secondary-bg px-3 py-2 border-b border-border">
                Preview (first {preview.length} rows)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={i === 0 ? 'bg-secondary-bg/50 font-semibold' : 'hover:bg-secondary-bg/30'}>
                        {row.slice(0, 5).map((cell, j) => (
                          <td key={j} className="px-3 py-1.5 border-b border-border/50 max-w-[120px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-danger/5 border border-danger/20 rounded-lg text-danger text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {importMutation.isSuccess && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-success/5 border border-success/20 rounded-lg text-success text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Import successful! Credentials generated.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => selectedFile && importMutation.mutate(selectedFile)}
              disabled={!selectedFile || importMutation.isPending || importMutation.isSuccess}
              className="gap-2"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Import & Generate Cards
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Credential Modal ────────────────────────────────────────────────────
function EditCredentialModal({
  credential,
  categories,
  onClose,
}: {
  credential: Credential
  categories: Category[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(credential.name)
  const [categoryId, setCategoryId] = useState(credential.category_id || '')
  const [description, setDescription] = useState(credential.description || '')
  const [tags, setTags] = useState((credential.tags || []).join(', '))
  const [databases, setDatabases] = useState<{ name: string; fields: { label: string; value: string }[] }[]>([
    { name: '', fields: [{ label: '', value: '' }] },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    credentialsApi
      .get(credential.id)
      .then((res) => {
        const data = res.data?.data
        if (data) {
          setName(data.name)
          if (data.category_id) setCategoryId(data.category_id)
          setDescription(data.description || '')
          setTags((data.tags || []).join(', '))
          const nested: Record<string, Record<string, string>> = data.credential_fields || {}
          const dbList = Object.entries(nested).map(([dbName, fields]) => ({
            name: dbName === '_default' ? '' : dbName,
            fields: Object.entries(fields).map(([label, value]) => ({
              label,
              value: String(value),
            })),
          }))
          setDatabases(dbList.length > 0 ? dbList : [{ name: '', fields: [{ label: '', value: '' }] }])
        }
      })
      .catch((err: unknown) => console.error('Failed to load credential:', err))
      .finally(() => setLoading(false))
  }, [credential.id])

  const addDatabase = () => setDatabases([...databases, { name: '', fields: [{ label: '', value: '' }] }])
  const removeDatabase = (i: number) => setDatabases(databases.filter((_, idx) => idx !== i))
  const updateDbName = (i: number, val: string) => {
    const u = [...databases]
    u[i] = { ...u[i], name: val }
    setDatabases(u)
  }
  const addFieldToDb = (dbIdx: number) => {
    const u = [...databases]
    u[dbIdx] = { ...u[dbIdx], fields: [...u[dbIdx].fields, { label: '', value: '' }] }
    setDatabases(u)
  }
  const removeFieldFromDb = (dbIdx: number, fIdx: number) => {
    const u = [...databases]
    u[dbIdx] = { ...u[dbIdx], fields: u[dbIdx].fields.filter((_, i) => i !== fIdx) }
    setDatabases(u)
  }
  const updateDbField = (dbIdx: number, fIdx: number, key: 'label' | 'value', val: string) => {
    const u = [...databases]
    u[dbIdx].fields[fIdx][key] = val
    setDatabases(u)
  }

  const handleSave = async () => {
    const credentialFields: Record<string, Record<string, string>> = {}
    databases.forEach((db) => {
      const dbName = db.name.trim() || '_default'
      credentialFields[dbName] = {}
      db.fields.forEach((f) => {
        if (f.label.trim()) credentialFields[dbName][f.label.trim()] = f.value
      })
    })
    setSaving(true)
    try {
      await credentialsApi.update(credential.id, {
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
      console.error('Failed to update credential:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Edit Credential</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary-bg text-text-secondary hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 text-accent animate-spin" />
              <span className="text-sm text-text-secondary">Loading details...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Name *
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                  placeholder="e.g., Production MySQL"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Tags
                </label>
                <Input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="production, critical (comma separated)"
                />
              </div>
              {/* Multi-Database Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Databases *
                  </label>
                  <button
                    onClick={addDatabase}
                    className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add database
                  </button>
                </div>
                <div className="space-y-3">
                  {databases.map((db, dbIdx) => (
                    <div key={dbIdx} className="border border-border rounded-xl p-3 bg-secondary-bg/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-3.5 h-3.5 text-accent shrink-0" />
                        <Input
                          type="text"
                          value={db.name}
                          onChange={(e) => updateDbName(dbIdx, e.target.value)}
                          placeholder="Database name (e.g., front_db)"
                          className="flex-1 text-sm"
                        />
                        {databases.length > 1 && (
                          <button
                            onClick={() => removeDatabase(dbIdx)}
                            className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5 pl-5">
                        {db.fields.map((field, fIdx) => (
                          <div key={fIdx} className="flex gap-1.5">
                            <Input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateDbField(dbIdx, fIdx, 'label', e.target.value)}
                              placeholder="Label"
                              className="flex-1 text-xs"
                            />
                            <Input
                              type="password"
                              value={field.value}
                              onChange={(e) => updateDbField(dbIdx, fIdx, 'value', e.target.value)}
                              placeholder="Value"
                              className="flex-1 font-mono text-xs"
                            />
                            {db.fields.length > 1 && (
                              <button
                                onClick={() => removeFieldFromDb(dbIdx, fIdx)}
                                className="p-1 text-danger hover:bg-danger/10 rounded transition-colors shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addFieldToDb(dbIdx)}
                          className="text-[11px] text-accent hover:text-accent-hover flex items-center gap-1 mt-1 transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" /> Add field
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={!name || !categoryId || saving} className="gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Changes
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Create Credential Modal ──────────────────────────────────────────────────
function CreateCredentialModal({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [databases, setDatabases] = useState<{ name: string; fields: { label: string; value: string }[] }[]>([
    { name: '', fields: [{ label: '', value: '' }] },
  ])
  const [saving, setSaving] = useState(false)

  const addDatabase = () => setDatabases([...databases, { name: '', fields: [{ label: '', value: '' }] }])
  const removeDatabase = (i: number) => setDatabases(databases.filter((_, idx) => idx !== i))
  const updateDbName = (i: number, val: string) => {
    const u = [...databases]
    u[i] = { ...u[i], name: val }
    setDatabases(u)
  }
  const addFieldToDb = (dbIdx: number) => {
    const u = [...databases]
    u[dbIdx] = { ...u[dbIdx], fields: [...u[dbIdx].fields, { label: '', value: '' }] }
    setDatabases(u)
  }
  const removeFieldFromDb = (dbIdx: number, fIdx: number) => {
    const u = [...databases]
    u[dbIdx] = { ...u[dbIdx], fields: u[dbIdx].fields.filter((_, i) => i !== fIdx) }
    setDatabases(u)
  }
  const updateDbField = (dbIdx: number, fIdx: number, key: 'label' | 'value', val: string) => {
    const u = [...databases]
    u[dbIdx].fields[fIdx][key] = val
    setDatabases(u)
  }

  const handleSave = async () => {
    const credentialFields: Record<string, Record<string, string>> = {}
    databases.forEach((db) => {
      const dbName = db.name.trim() || '_default'
      credentialFields[dbName] = {}
      db.fields.forEach((f) => {
        if (f.label.trim()) credentialFields[dbName][f.label.trim()] = f.value
      })
    })
    setSaving(true)
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Create Credential</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary-bg text-text-secondary hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Name *
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                placeholder="e.g., Production MySQL"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                placeholder="Optional description..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Tags
              </label>
              <Input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="production, critical (comma separated)"
              />
            </div>
            {/* Multi-Database Fields */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Databases *
                </label>
                <button
                  onClick={addDatabase}
                  className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add database
                </button>
              </div>
              <div className="space-y-3">
                {databases.map((db, dbIdx) => (
                  <div key={dbIdx} className="border border-border rounded-xl p-3 bg-secondary-bg/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-3.5 h-3.5 text-accent shrink-0" />
                      <Input
                        type="text"
                        value={db.name}
                        onChange={(e) => updateDbName(dbIdx, e.target.value)}
                        placeholder="Database name (e.g., front_db)"
                        className="flex-1 text-sm"
                      />
                      {databases.length > 1 && (
                        <button
                          onClick={() => removeDatabase(dbIdx)}
                          className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 pl-5">
                      {db.fields.map((field, fIdx) => (
                        <div key={fIdx} className="flex gap-1.5">
                          <Input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateDbField(dbIdx, fIdx, 'label', e.target.value)}
                            placeholder="Label"
                            className="flex-1 text-xs"
                          />
                          <Input
                            type="password"
                            value={field.value}
                            onChange={(e) => updateDbField(dbIdx, fIdx, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-1 font-mono text-xs"
                          />
                          {db.fields.length > 1 && (
                            <button
                              onClick={() => removeFieldFromDb(dbIdx, fIdx)}
                              className="p-1 text-danger hover:bg-danger/10 rounded transition-colors shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addFieldToDb(dbIdx)}
                        className="text-[11px] text-accent hover:text-accent-hover flex items-center gap-1 mt-1 transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" /> Add field
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!name || !categoryId || saving} className="gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save Credential
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
