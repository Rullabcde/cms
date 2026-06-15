'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { credentialsApi } from '@/lib/api'
import { X, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImportCSVModalProps {
  onClose: () => void
}

export function ImportCSVModal({ onClose }: ImportCSVModalProps) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const importMutation = useMutation({
    mutationFn: (file: File) => credentialsApi.importCSV(file),
    onSuccess: () => {
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
