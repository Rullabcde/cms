// ─── Tag color mapping ───────────────────────────────────────────────────────
export const tagColors: Record<string, string> = {
  production: 'bg-red-500/10 text-red-500 border-red-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  development: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  dev: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  staging: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  sre: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  backup: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ai: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
}

export function getTagColor(tag: string): string {
  const lower = tag.toLowerCase()
  return tagColors[lower] || 'bg-secondary-bg text-text-secondary border-border'
}
