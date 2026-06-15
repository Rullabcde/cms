'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import { Users, Shield, UserCog, Search, AlertTriangle } from 'lucide-react'
import type { User } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-accent/10 text-accent border-accent/20',
  editor: 'bg-success/10 text-success border-success/20',
  viewer: 'bg-secondary-bg text-text-secondary border-border',
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersApi.updateRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const allUsers: User[] = data?.data || []
  const users = search ? allUsers.filter((u) => u.email.toLowerCase().includes(search.toLowerCase())) : allUsers

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-accent" />
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">User Management</h1>
        </div>
        <p className="text-sm text-text-secondary ml-11">
          {allUsers.length} active user{allUsers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-secondary-bg text-sm"
        />
      </div>

      {/* User Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary-bg/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Last Login
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-text-secondary">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-text-secondary text-sm">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary-bg/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                          ROLE_COLORS[user.role]?.replace('border-', 'border ').split('border')[0] ||
                            'bg-secondary-bg text-text-secondary'
                        )}
                      >
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-foreground font-medium truncate max-w-[220px]">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={user.role}
                      onValueChange={(role) => {
                        if (role) updateRoleMutation.mutate({ id: user.id, role })
                      }}
                    >
                      <SelectTrigger
                        className={cn('h-7 w-[110px] text-xs border font-semibold', ROLE_COLORS[user.role])}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3 h-3" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-1.5">
                            <UserCog className="w-3 h-3" />
                            Editor
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3" />
                            Viewer
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {user.last_login_at ? (
                      new Date(user.last_login_at).toLocaleString()
                    ) : (
                      <span className="italic text-text-secondary/60">Never</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                        user.is_active
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-danger/10 text-danger border-danger/20'
                      )}
                    >
                      {user.is_active ? '● Active' : '● Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Deactivate user ${user.email}?`)) deactivateMutation.mutate(user.id)
                        }}
                        className="h-7 text-xs text-danger border-danger/20 hover:bg-danger/5 hover:text-danger gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
