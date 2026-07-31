import { z } from 'zod'

const supabaseEnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
})

const parsedEnv = supabaseEnvSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

export const env = {
  supabaseUrl: parsedEnv.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: parsedEnv.VITE_SUPABASE_ANON_KEY ?? '',
  isSupabaseConfigured: Boolean(
    parsedEnv.VITE_SUPABASE_URL && parsedEnv.VITE_SUPABASE_ANON_KEY,
  ),
} as const
