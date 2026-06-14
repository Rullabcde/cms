'use client'

import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/contexts/theme-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/lib/api'
import type { Category } from '@/types'
import {
  Search,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Plus,
  Shield,
  FileText,
  Users,
  Tag,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// ─── Inner layout with search params access ──────────────────────────────────
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const isHomePage = pathname === '/'

  // URL-driven filter state (only used on home page)
  const searchQuery = searchParams.get('q') || ''
  const activeCategoryId = searchParams.get('category_id') || ''

  // Debounced search input
  const [searchInput, setSearchInput] = useState(searchQuery)
  useEffect(() => {
    if (!isHomePage) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchInput) params.set('q', searchInput)
      else params.delete('q')
      router.replace(`/?${params.toString()}`)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, router, searchParams, isHomePage])

  // Fetch categories for sidebar
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  })
  const categories: Category[] = catData?.data || []

  // Add category mutation
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setNewCatName('')
      setShowAddCategory(false)
    },
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-sm text-text-secondary">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Top Navbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-12 border-b border-border bg-surface/80 backdrop-blur-md flex items-center px-4 gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1.5 rounded-md hover:bg-secondary-bg transition-colors"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm shrink-0">
          <div className="w-6 h-6 rounded-md bg-foreground flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-background" />
          </div>
          <span className="hidden sm:inline text-foreground tracking-tight">Credential Manager</span>
        </Link>

        {/* Search Bar – only on home page */}
        {isHomePage && (
          <div className="flex-1 max-w-sm mx-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-text-secondary"
              />
            </div>
          </div>
        )}

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
      </header>

      <div className="flex">
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className={cn(
            'fixed lg:sticky top-12 z-40 h-[calc(100vh-3rem)] w-52 bg-surface border-r border-border flex flex-col transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {/* Dashboard */}
            <SidebarLink
              href="/"
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Credentials"
              active={isHomePage && !activeCategoryId}
              preventDefault
              onClick={() => {
                const params = new URLSearchParams()
                router.replace(`/?${params.toString()}`)
                setSearchInput('')
                setSidebarOpen(false)
              }}
            />

            {/* Categories Section */}
            <div className="pt-4 pb-1.5 px-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest">
                  Categories
                </span>
                {user?.role === 'admin' && (
                  <button
                    className="p-0.5 rounded hover:bg-secondary-bg transition-colors"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    title="Add category"
                  >
                    <Plus className="w-3 h-3 text-text-secondary" />
                  </button>
                )}
              </div>
            </div>

            {showAddCategory && (
              <div className="px-2 pb-1">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCatName.trim()) {
                      addCategoryMutation.mutate(newCatName.trim())
                    }
                    if (e.key === 'Escape') {
                      setShowAddCategory(false)
                      setNewCatName('')
                    }
                  }}
                  placeholder="Category name..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-secondary-bg border border-border focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>
            )}

            {categories.map((cat) => (
              <SidebarLink
                key={cat.id}
                href={`/?category_id=${cat.id}`}
                icon={<Tag className="w-3.5 h-3.5" />}
                label={cat.name}
                active={isHomePage && activeCategoryId === cat.id}
                preventDefault
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.set('category_id', cat.id)
                  params.delete('q')
                  router.replace(`/?${params.toString()}`)
                  setSearchInput('')
                  setSidebarOpen(false)
                }}
              />
            ))}
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
                onClick={() => setSidebarOpen(false)}
              />
              <SidebarLink
                href="/admin/users"
                icon={<Users className="w-4 h-4" />}
                label="Users"
                active={pathname === '/admin/users'}
                onClick={() => setSidebarOpen(false)}
              />
              <SidebarLink
                href="/admin/whitelist"
                icon={<Shield className="w-4 h-4" />}
                label="Whitelist"
                active={pathname === '/admin/whitelist'}
                onClick={() => setSidebarOpen(false)}
              />
            </div>
          )}
        </aside>

        {/* ─── Main Content ──────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 p-5 lg:p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  )
}

// ─── Public export wrapped in Suspense ────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span className="text-sm text-text-secondary">Loading...</span>
          </div>
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  )
}

// ─── SidebarLink Component ────────────────────────────────────────────────────
function SidebarLink({
  href,
  icon,
  label,
  active,
  onClick,
  preventDefault,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  preventDefault?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (preventDefault) e.preventDefault()
        if (onClick) onClick()
      }}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150',
        active
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-text-secondary hover:bg-secondary-bg hover:text-foreground'
      )}
    >
      <span className={cn('shrink-0', active ? 'text-accent' : 'text-text-secondary')}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  )
}
