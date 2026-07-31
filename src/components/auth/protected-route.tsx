import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="glass-panel w-full max-w-sm rounded-3xl border p-6 text-center shadow-xl shadow-black/5">
          <p className="text-sm font-medium text-muted-foreground">Restoring your session...</p>
        </div>
      </div>
    )
  }

  if (!auth.isConfigured) {
    return <>{children}</>
  }

  if (auth.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
