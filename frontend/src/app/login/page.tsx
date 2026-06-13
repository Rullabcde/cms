'use client'

import { useAuth } from '@/contexts/auth-context'
import { Shield, KeyRound } from 'lucide-react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { login, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">CMS</h1>
          <p className="text-text-secondary mt-2">Credential Management System</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome back</h2>
          <p className="text-text-secondary text-sm mb-6">
            Sign in with your company Google account to access credentials.
          </p>

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors duration-150"
          >
            <KeyRound className="w-5 h-5" />
            Login with Google Workspace
          </button>

          <p className="text-text-secondary text-xs text-center mt-4">
            Only whitelisted emails are authorized. Contact your admin if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}
