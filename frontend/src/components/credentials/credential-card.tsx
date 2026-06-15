'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { credentialsApi } from '@/lib/api'
import { Eye, Pencil, Trash2, Tag, Database, Star, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getTagColor } from '@/components/shared/tag-helpers'
import type { Credential } from '@/types'

interface CredentialCardProps {
  credential: Credential
  canEdit: boolean
  onView: () => void
  onEdit: () => void
  onCopy: (text: string) => void
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function CredentialCard({
  credential,
  canEdit,
  onView,
  onEdit,
  isFavorite,
  onToggleFavorite,
}: CredentialCardProps) {
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
        {/* Name + Favorite */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-medium text-foreground leading-snug truncate flex-1 tracking-tight">
            {credential.name}
          </h3>
          <button
            onClick={onToggleFavorite}
            className={cn(
              'p-1 rounded-md transition-colors shrink-0',
              isFavorite ? 'text-warning hover:text-warning/80' : 'text-text-secondary/40 hover:text-warning'
            )}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={cn('w-3.5 h-3.5', isFavorite && 'fill-current')} />
          </button>
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
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-danger" />
              </div>
              <div className="text-center mb-6">
                <h3 className="text-base font-semibold text-foreground mb-1.5">Delete Credential</h3>
                <p className="text-sm text-text-secondary">
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-foreground">&quot;{credential.name}&quot;</span>? This action cannot
                  be undone.
                </p>
              </div>
              {deleteMutation.isError && (
                <div className="flex items-center gap-2 p-2.5 mb-4 bg-danger/5 border border-danger/20 rounded-lg text-danger text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Failed to delete. Please try again.
                </div>
              )}
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
