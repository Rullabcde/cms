'use client'

import { useState } from 'react'
import { Database, ChevronDown, Eye, EyeOff, Copy, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatabaseSectionProps {
  dbName: string
  fields: Record<string, string>
  visibleFields: Set<string>
  copied: string | null
  onToggle: (key: string) => void
  onCopy: (key: string, value: string) => void
}

export function DatabaseSection({ dbName, fields, visibleFields, copied, onToggle, onCopy }: DatabaseSectionProps) {
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
