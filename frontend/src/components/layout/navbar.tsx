'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/contexts/theme-context'
import { Sun, Moon, LogOut, Menu, X, Shield, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface NavbarProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function Navbar({ onToggleSidebar, sidebarOpen }: NavbarProps) {
  const { user, logout } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 h-12 border-b border-border bg-surface/80 backdrop-blur-md flex items-center px-4 gap-3">
      {/* Mobile menu toggle */}
      <button onClick={onToggleSidebar} className="lg:hidden p-1.5 rounded-md hover:bg-secondary-bg transition-colors">
        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 font-semibold text-sm shrink-0">
        <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
          <Shield className="w-3.5 h-3.5 text-background" />
        </div>
        <span className="hidden sm:inline text-foreground tracking-tight">Credential Manager</span>
      </Link>

      <div className="flex-1" />

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="p-1.5 rounded-md hover:bg-secondary-bg transition-colors text-text-secondary hover:text-foreground"
        title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* User Menu */}
      <UserMenu user={user} logout={logout} />
    </header>
  )
}

function UserMenu({ user, logout }: { user: { email?: string; role?: string } | null; logout: () => void }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-secondary-bg text-sm transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-foreground font-semibold text-[10px]">
          {user?.email?.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:inline text-text-secondary max-w-[140px] truncate text-xs">{user?.email}</span>
        <ChevronDown className="w-3 h-3 text-text-secondary hidden md:block" />
      </button>

      {userMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-surface border border-border rounded-xl shadow-lg z-50 py-1 animate-fade-in">
            <div className="px-3 py-2.5 border-b border-border mb-1">
              <div className="text-sm font-medium text-foreground truncate">{user?.email}</div>
              <div className="text-xs text-text-secondary capitalize mt-0.5">{user?.role}</div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
