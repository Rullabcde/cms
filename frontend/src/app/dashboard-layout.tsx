'use client'

import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/contexts/theme-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '@/lib/api'
import type { Category } from '@/types'
import {
  Search,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Menu,
  X,
  Plus,
  Database,
  Shield,
  FileText,
  Users,
  Settings,
  Tag,
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // URL-driven filter state
  const searchQuery = searchParams.get('q') || ''
  const activeCategoryId = searchParams.get('category_id') || ''

  // Debounced search input
  const [searchInput, setSearchInput] = useState(searchQuery)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchInput) params.set('q', searchInput)
      else params.delete('q')
      router.replace(`/?${params.toString()}`)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, router, searchParams])

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
        <div className="animate-pulse text-text-secondary">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-surface flex items-center px-4 gap-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-secondary-bg">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Shield className="w-6 h-6 text-accent" />
          <span className="hidden sm:inline">CMS</span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search credentials..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary-bg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-secondary-bg transition-colors"
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* User Menu */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary-bg text-sm">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium text-xs">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:inline text-text-secondary max-w-[120px] truncate">{user?.email}</span>
          </button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-text-secondary border-b border-border mb-1">
                <div className="font-medium text-foreground">{user?.email}</div>
                <div className="capitalize">{user?.role}</div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-secondary-bg rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-14 z-40 h-[calc(100vh-3.5rem)] w-60 bg-surface border-r border-border flex flex-col transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            <SidebarLink
              href="/"
              icon={<Database className="w-4 h-4" />}
              label="All Credentials"
              active={!activeCategoryId}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.delete('category_id')
                params.delete('q')
                router.replace(`/?${params.toString()}`)
                setSearchInput('')
              }}
            />

            <div className="pt-4 pb-2">
              <div className="flex items-center justify-between px-3">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Categories</span>
                {user?.role === 'admin' && (
                  <button
                    className="p-1 rounded hover:bg-secondary-bg"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                  >
                    <Plus className="w-3 h-3 text-text-secondary" />
                  </button>
                )}
              </div>
            </div>

            {showAddCategory && (
              <div className="px-3 py-1">
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
                  className="w-full px-2 py-1 text-xs rounded bg-secondary-bg border border-border focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>
            )}

            {categories.map((cat) => (
              <SidebarLink
                key={cat.id}
                href={`/?category_id=${cat.id}`}
                icon={<Tag className="w-4 h-4" />}
                label={cat.name}
                active={activeCategoryId === cat.id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.set('category_id', cat.id)
                  params.delete('q')
                  router.replace(`/?${params.toString()}`)
                  setSearchInput('')
                }}
              />
            ))}
          </nav>

          {/* Bottom sidebar links */}
          <div className="border-t border-border p-3 space-y-1">
            {user?.role === 'admin' && (
              <>
                <SidebarLink href="/admin/audit-logs" icon={<FileText className="w-4 h-4" />} label="Audit Logs" />
                <SidebarLink href="/admin/users" icon={<Users className="w-4 h-4" />} label="Users" />
                <SidebarLink href="/admin/whitelist" icon={<Shield className="w-4 h-4" />} label="Whitelist" />
              </>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  )
}

function SidebarLink({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-accent/10 text-accent font-medium' : 'text-foreground hover:bg-secondary-bg'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}
