'use client'

import { useState } from 'react'
import { Database, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CredentialCard } from './credential-card'
import type { Credential } from '@/types'

interface DatabaseGroupProps {
  groupName: string
  credentials: Credential[]
  canEdit: boolean
  onView: (cred: Credential) => void
  onEdit: (cred: Credential) => void
  onCopy: (text: string) => void
  isFavorite: (id: string) => boolean
  onToggleFavorite: (id: string) => void
}

export function DatabaseGroup({
  groupName,
  credentials,
  canEdit,
  onView,
  onEdit,
  onCopy,
  isFavorite,
  onToggleFavorite,
}: DatabaseGroupProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface">
      {/* Group Header */}
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

      {/* Expanded Content: Credential Cards Grid */}
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
                isFavorite={isFavorite(cred.id)}
                onToggleFavorite={() => onToggleFavorite(cred.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
