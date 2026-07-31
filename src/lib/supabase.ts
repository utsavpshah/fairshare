import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient() {
  if (!env.isSupabaseConfigured) {
    return null
  }

  if (!browserClient) {
    browserClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  }

  return browserClient
}
