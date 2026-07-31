import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AppLogo } from '@/components/common/app-logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'

const featureList = [
  'Create shared groups for trips, homes, and dinners',
  'Track equal and exact splits with clear balance summaries',
  'Upload receipts and settle up without a custom backend',
]

const signInSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

type SignInFormValues = z.infer<typeof signInSchema>

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const redirectTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : '/app'

  useEffect(() => {
    if (auth.isConfigured && auth.status === 'authenticated') {
      navigate(redirectTo, { replace: true })
    }
  }, [auth.isConfigured, auth.status, navigate, redirectTo])

  const handleSignIn = async (values: SignInFormValues) => {
    try {
      await auth.signInWithPassword(values)
    } catch {
      toast.error('Sign-in failed. Check that the user exists in Supabase Auth and the password is correct.')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-white/40 bg-transparent p-2">
          <div className="glass-panel rounded-[28px] border border-white/40 p-6 sm:p-8 lg:p-10">
            <AppLogo />
            <Badge className="mt-6 bg-accent/20 text-accent-foreground">Phase 1 foundation</Badge>
            <h1 className="mt-4 max-w-xl font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Shared expense tracking for the people you actually split life with.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              FairShare is an original mobile-first app shell for friends and family who need clean, low-friction expense sharing with secure Supabase auth and a static frontend.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {featureList.map((feature) => (
                <Card key={feature} className="bg-white/60 dark:bg-slate-950/30">
                  <CardContent className="mt-0 flex h-full items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                    <p className="text-sm text-card-foreground">{feature}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Card className="self-center p-1">
          <div className="rounded-[24px] bg-card p-5 sm:p-7">
            <CardHeader>
              <CardTitle>Sign in with your shared credentials</CardTitle>
              <CardDescription>
                Use Supabase Auth with a pre-created user list. Only accounts you add in Supabase can access the live app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-secondary/70 p-4 text-sm text-secondary-foreground">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4" />
                  <p>
                    Disable public sign-up and create each permitted user in Supabase Auth. Share the email address and password with the people you trust.
                  </p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={form.handleSubmit((values) => void handleSignIn(values))}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground" htmlFor="email">
                    Email
                  </label>
                  <Input id="email" type="email" autoComplete="username" placeholder="alex@example.com" {...form.register('email')} />
                  {form.formState.errors.email ? (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground" htmlFor="password">
                    Password
                  </label>
                  <Input id="password" type="password" autoComplete="current-password" placeholder="Enter the password you shared" {...form.register('password')} />
                  {form.formState.errors.password ? (
                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                  ) : null}
                </div>

                <Button className="w-full" size="lg" type="submit" disabled={!auth.isConfigured || form.formState.isSubmitting}>
                  <KeyRound className="h-4 w-4" />
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              {!auth.isConfigured ? (
                <Button className="w-full" size="lg" variant="secondary" onClick={() => (window.location.href = '/app')}>
                  Open preview mode
                </Button>
              ) : null}

              <p className="text-center text-xs text-muted-foreground">
                Preview mode bypasses live auth only when Supabase env vars are not configured.
              </p>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
