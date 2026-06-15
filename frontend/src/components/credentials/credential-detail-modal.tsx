'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { credentialsApi } from '@/lib/api'
import { X, Tag, Search, Database, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getTagColor } from '@/components/shared/tag-helpers'
import { DatabaseSection } from './database-section'
import type { Credential } from '@/types'

interface CredentialDetailModalProps {
  credential: Credential
  onClose: () => void
  canEdit: boolean
  onCopy: (text: string) => void
}

function dbNameMatchesSearch(entries: [string, Record<string, string>][], search: string): boolean {
  return entries.some(([dbName]) => dbName.toLowerCase().includes(search.toLowerCase()))
}

export function CredentialDetailModal({ credential, onClose, onCopy }: CredentialDetailModalProps) {
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [fieldSearch, setFieldSearch] = useState('')

  const { data } = useQuery({
    queryKey: ['credential', credential.id],
    queryFn: () => credentialsApi.get(credential.id).then((r) => r.data),
  })

  const databases: Record<string, Record<string, string>> = data?.data?.credential_fields || {}
  const dbEntries = Object.entries(databases)

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
