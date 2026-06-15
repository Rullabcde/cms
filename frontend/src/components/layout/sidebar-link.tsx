'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SidebarLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  preventDefault?: boolean
  badge?: number
}

export function SidebarLink({ href, icon, label, active, onClick, preventDefault, badge }: SidebarLinkProps) {
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
      <span className="truncate flex-1">{label}</span>
      {badge !== undefined && (
        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent/15 text-accent text-[10px] font-semibold">
          {badge}
        </span>
      )}
    </Link>
  )
}
