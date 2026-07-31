import { WalletCards } from 'lucide-react'

export function AppLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <WalletCards className="h-5 w-5" />
      </div>
      <div>
        <p className="font-serif text-xl font-semibold tracking-tight text-foreground">FairShare</p>
        <p className="text-xs text-muted-foreground">Shared spending for close circles</p>
      </div>
    </div>
  )
}
