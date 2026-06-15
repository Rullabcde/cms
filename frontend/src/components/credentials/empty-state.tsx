'use client'

import { Star, Search, Package2, Plus } from 'lucide-react'

interface EmptyStateProps {
  searchQuery: string
  showFavorites: boolean
  canEdit: boolean
  onAdd: () => void
}

export function EmptyState({ searchQuery, showFavorites, canEdit, onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-xl">
      <div className="w-12 h-12 rounded-2xl bg-secondary-bg flex items-center justify-center mb-4">
        {showFavorites ? (
          <Star className="w-6 h-6 text-text-secondary" />
        ) : searchQuery ? (
          <Search className="w-6 h-6 text-text-secondary" />
        ) : (
          <Package2 className="w-6 h-6 text-text-secondary" />
        )}
      </div>
      {showFavorites ? (
        <>
          <h3 className="text-base font-semibold text-foreground mb-1">No favorites yet</h3>
          <p className="text-sm text-text-secondary max-w-xs text-center">
            Star credentials you use often to find them quickly here.
          </p>
        </>
      ) : searchQuery ? (
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
