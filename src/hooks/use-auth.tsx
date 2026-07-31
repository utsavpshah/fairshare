import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { AppUser } from '@/types/auth'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  isConfigured: boolean
  isPreviewMode: boolean
  session: Session | null
  status: AuthStatus
  user: AppUser | null
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function mapSessionUser(session: Session | null): AppUser | null {
  const user = session?.user

  if (!user) {
    return null
  }

  return {
    id: user.id,
    name:
      user.user_metadata.full_name ??
      user.user_metadata.name ??
      user.email?.split('@')[0] ??
      'Guest',
    email: user.email ?? '',
    avatar: user.user_metadata.avatar_url ?? null,
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    env.isSupabaseConfigured ? 'loading' : 'anonymous',
  )

  useEffect(() => {
    const client = getSupabaseBrowserClient()

    if (!client) {
      setStatus('anonymous')
      return
    }

    let mounted = true

    client.auth.getSession().then(({ data, error }) => {
      if (!mounted || error) {
        setStatus('anonymous')
        return
      }

      setSession(data.session)
      setStatus(data.session ? 'authenticated' : 'anonymous')
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'anonymous')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: env.isSupabaseConfigured,
      isPreviewMode: !env.isSupabaseConfigured,
      session,
      status,
      user: mapSessionUser(session),
      signInWithPassword: async ({ email, password }) => {
        const client = getSupabaseBrowserClient()

        if (!client) {
          return
        }

        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }
      },
      signOut: async () => {
        const client = getSupabaseBrowserClient()

        if (!client) {
          return
        }

        const { error } = await client.auth.signOut()

        if (error) {
          throw error
        }
      },
    }),
    [session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
