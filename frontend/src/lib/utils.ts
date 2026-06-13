import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Credential } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function exportCredentialsToCSV(credentials: Credential[]) {
  const headers = ['Name', 'Category', 'Description', 'Tags', 'Created By', 'Created At', 'Updated At']
  const rows = credentials.map((c) =>
    [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.category?.name || '').replace(/"/g, '""')}"`,
      `"${(c.description || '').replace(/"/g, '""')}"`,
      `"${(c.tags || []).join('; ')}"`,
      `"${c.created_by?.email || ''}"`,
      `"${c.created_at}"`,
      `"${c.updated_at}"`,
    ].join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `credentials_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
