'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { credentialsApi } from '@/lib/api'
import { X, Plus, Trash2, Database, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Credential, Category } from '@/types'

interface CredentialFormModalProps {
  credential?: Credential | null
  categories: Category[]
  onClose: () => void
}

export function CredentialFormModal({ credential, categories, onClose }: CredentialFormModalProps) {
  const isEditing = !!credential

  const { data: fetchedData, isLoading: loading } = useQuery({
    queryKey: ['credential-form', credential?.id],
    queryFn: () => credentialsApi.get(credential!.id).then((r) => r.data),
    enabled: isEditing,
  })

  const initialData = fetchedData?.data

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              {isEditing ? 'Edit Credential' : 'Create Credential'}
            </h2>
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
            <CredentialFormInner
              key={credential?.id || 'new'}
              credential={credential}
              categories={categories}
              initialData={initialData}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface FormInnerProps {
  credential?: Credential | null
  categories: Category[]
  initialData?: {
    name: string
    category_id?: string
    description?: string
    tags?: string[]
    credential_fields?: Record<string, Record<string, string>>
  }
  onClose: () => void
}

function CredentialFormInner({ credential, categories, initialData, onClose }: FormInnerProps) {
  const queryClient = useQueryClient()
  const isEditing = !!credential

  const nested: Record<string, Record<string, string>> = initialData?.credential_fields || {}
  const dbList = Object.entries(nested).map(([dbName, fields]) => ({
    name: dbName === '_default' ? '' : dbName,
    fields: Object.entries(fields).map(([label, value]) => ({ label, value: String(value) })),
  }))

  const [name, setName] = useState(initialData?.name || '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || categories[0]?.id || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [tags, setTags] = useState((initialData?.tags || []).join(', '))
  const [databases, setDatabases] = useState<{ name: string; fields: { label: string; value: string }[] }[]>(
    dbList.length > 0 ? dbList : [{ name: '', fields: [{ label: '', value: '' }] }]
  )
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
      if (isEditing && credential) {
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
      } else {
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
      }
      onClose()
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
    } catch (err) {
      console.error(`Failed to ${isEditing ? 'update' : 'create'} credential:`, err)
    } finally {
      setSaving(false)
    }
  }

  return (
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
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Tags</label>
        <Input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="production, critical (comma separated)"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Databases *</label>
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
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isEditing ? 'Save Changes' : 'Save Credential'}
        </Button>
      </div>
    </div>
  )
}
