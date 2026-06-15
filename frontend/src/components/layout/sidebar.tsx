'use client'

import { useAuth } from '@/contexts/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { FileText, Users, Shield, LayoutDashboard, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarLink } from './sidebar-link'

// ─── Shared favorites helper ──────────────────────────────────────────────────
export function getFavoriteIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('favorite_credentials')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isHomePage = pathname === '/'
  const favCount = getFavoriteIds().length

  return (
    <>
      {/* Sidebar Overlay (mobile) */}
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed lg:sticky top-12 z-40 h-[calc(100vh-3rem)] w-52 bg-surface border-r border-border flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <SidebarLink
            href="/"
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Credentials"
            active={isHomePage}
            onClick={onClose}
          />
          <SidebarLink
            href="/?favorites=true"
            icon={<Star className="w-4 h-4" />}
            label="Favorites"
            active={false}
            badge={favCount > 0 ? favCount : undefined}
            preventDefault
            onClick={() => {
              router.push('/?favorites=true')
              onClose()
            }}
          />
        </nav>

        {/* Admin Links */}
        {user?.role === 'admin' && (
          <div className="border-t border-border p-2 space-y-0.5">
            <div className="px-2 pb-1.5 pt-1">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">Admin</span>
            </div>
            <SidebarLink
              href="/admin/audit-logs"
              icon={<FileText className="w-4 h-4" />}
              label="Audit Logs"
              active={pathname === '/admin/audit-logs'}
              onClick={onClose}
            />
            <SidebarLink
              href="/admin/users"
              icon={<Users className="w-4 h-4" />}
              label="Users"
              active={pathname === '/admin/users'}
              onClick={onClose}
            />
            <SidebarLink
              href="/admin/whitelist"
              icon={<Shield className="w-4 h-4" />}
              label="Whitelist"
              active={pathname === '/admin/whitelist'}
              onClick={onClose}
            />
          </div>
        )}
      </aside>
    </>
  )
}
