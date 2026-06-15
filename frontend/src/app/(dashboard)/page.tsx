'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { credentialsApi, categoriesApi } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Upload, Search, X, Loader2, Database } from 'lucide-react'
import { getFavoriteIds } from '@/components/layout/sidebar'
import { DatabaseGroup } from '@/components/credentials/database-group'
import { EmptyState } from '@/components/credentials/empty-state'
import { CredentialDetailModal } from '@/components/credentials/credential-detail-modal'
import { CredentialFormModal } from '@/components/credentials/credential-form-modal'
import { ImportCSVModal } from '@/components/credentials/import-csv-modal'
import { Pagination } from '@/components/shared/pagination'
import type { Credential, Category } from '@/types'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

  const searchQuery = searchParams.get('q') || ''
  const showFavorites = searchParams.get('favorites') === 'true'
  const selectedCategory = searchParams.get('category') || ''
  const page = Number(searchParams.get('page') || '1')

  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(getFavoriteIds()))
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null)
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [localSearch, setLocalSearch] = useState('')

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('favorite_credentials', JSON.stringify([...next]))
      return next
    })
  }

  const isFavorite = (id: string) => favorites.has(id)

  const updatePageParam = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.replace(`/?${params.toString()}`)
  }

  const { data: credData, isLoading } = useQuery({
    queryKey: ['credentials', page, searchQuery],
    queryFn: () =>
      credentialsApi
        .list({ page: String(page), limit: '100', ...(searchQuery && { q: searchQuery }) })
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

  // Group by category
  const grouped = credentials.reduce<Record<string, Credential[]>>((acc, cred) => {
    const groupKey = cred.category?.name || 'Uncategorized'
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(cred)
    return acc
  }, {})

  // Apply local search + favorites + category filter
  const filteredGrouped = Object.entries(grouped).reduce<Record<string, Credential[]>>((acc, [group, creds]) => {
    let filtered = creds
    // Filter by selected category
    if (selectedCategory) {
      filtered = filtered.filter((c) => (c.category?.name || 'Uncategorized') === selectedCategory)
    }
    if (showFavorites) filtered = filtered.filter((c) => favorites.has(c.id))
    if (localSearch) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(localSearch.toLowerCase()) ||
          (c.database_name || '').toLowerCase().includes(localSearch.toLowerCase()) ||
          (c.description || '').toLowerCase().includes(localSearch.toLowerCase()) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(localSearch.toLowerCase()))
      )
    }
    if (filtered.length > 0) acc[group] = filtered
    return acc
  }, {})

  const filteredTotal = Object.values(filteredGrouped).flat().length

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            {selectedCategory && (
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent/10">
                <Database className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              {showFavorites ? 'Favorites' : selectedCategory ? selectedCategory : 'Credentials'}
            </h1>
            {selectedCategory && (
              <button
                onClick={() => router.push('/')}
                className="p-1 rounded-md hover:bg-secondary-bg text-text-secondary hover:text-foreground transition-colors"
                title="Show all credentials"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {showFavorites
              ? `${filteredTotal} favorite${filteredTotal !== 1 ? 's' : ''}`
              : `${filteredTotal} of ${total} credential${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)} className="gap-2">
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-3.5 h-3.5" /> Add Credential
            </Button>
          )}
        </div>
      </div>

      {/* Local Search */}
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

      {/* Credential Groups */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-accent animate-spin" />
        </div>
      ) : Object.keys(filteredGrouped).length === 0 ? (
        <EmptyState
          searchQuery={searchQuery || localSearch}
          showFavorites={showFavorites}
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
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={updatePageParam} />

      {/* Modals */}
      {selectedCredential && (
        <CredentialDetailModal
          credential={selectedCredential}
          onClose={() => setSelectedCredential(null)}
          canEdit={canEdit}
          onCopy={copyToClipboard}
        />
      )}
      {showCreateModal && <CredentialFormModal categories={categories} onClose={() => setShowCreateModal(false)} />}
      {showImportModal && <ImportCSVModal onClose={() => setShowImportModal(false)} />}
      {editingCredential && (
        <CredentialFormModal
          credential={editingCredential}
          categories={categories}
          onClose={() => setEditingCredential(null)}
        />
      )}
    </>
  )
}
