import { HandCoins, LayoutGrid, ReceiptText, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { AppLogo } from '@/components/common/app-logo'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const navigationItems = [
  { href: '/app', icon: LayoutGrid, label: 'Overview' },
  { href: '/app/groups', icon: Users, label: 'Groups' },
  { href: '/app/expenses', icon: ReceiptText, label: 'Expenses' },
  { href: '/app/settlements', icon: HandCoins, label: 'Settlements' },
]

export function AppShell() {
  const auth = useAuth()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-24 pt-4 sm:px-6 lg:px-8">
      <header className="glass-panel sticky top-4 z-20 mb-6 rounded-[28px] border border-white/40 px-4 py-4 shadow-xl shadow-black/5 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <AppLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {auth.isConfigured && auth.user ? (
              <Button variant="outline" size="sm" onClick={() => void auth.signOut()}>
                Sign out
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <nav className="glass-panel fixed inset-x-4 bottom-4 z-30 rounded-[28px] border border-white/40 p-2 shadow-xl shadow-black/10 sm:inset-x-auto sm:left-1/2 sm:w-[24rem] sm:-translate-x-1/2">
        <div className="grid grid-cols-4 gap-2">
          {navigationItems.map(({ href, icon: Icon, label }) => (
            <NavLink
              key={href + label}
              to={href}
              end={href === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold text-muted-foreground transition',
                  isActive && 'bg-primary text-primary-foreground shadow-md shadow-primary/20',
                )
              }
            >
              <Icon className="mb-1 h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
