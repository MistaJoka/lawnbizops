import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarDays, CirclePlus, DollarSign, Settings, Sun, Users } from 'lucide-react'
import { useOutboxPending } from '@/lib/outbox'
import { QuickCreateSheet } from './QuickCreateSheet'

const tabs = [
  { to: '/', label: 'Today', icon: Sun },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/money', label: 'Money', icon: DollarSign },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function TabBar() {
  const pending = useOutboxPending()
  const [createOpen, setCreateOpen] = useState(false)

  // Equal-width tabs (flex-1) so all six fit and stay evenly aligned on narrow
  // phones — the long labels (SCHEDULE/SETTINGS) overflowed at 375px with the
  // old px-3 + 12px label-caps.
  const renderTab = ({ to, label, icon: Icon }: (typeof tabs)[number]) => (
    <Link
      key={to}
      to={to}
      className="tap-active flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-faded transition-transform duration-75 active:scale-95"
      activeProps={{
        className:
          'tap-active flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg bg-blaze px-1 py-1.5 text-on-cta transition-transform duration-75 active:scale-95',
      }}
      activeOptions={{ exact: to === '/' }}
    >
      <span className="relative">
        <Icon />
        {to === '/' && pending > 0 && (
          <span
            aria-label={`${pending} write${pending === 1 ? '' : 's'} pending sync`}
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blaze ring-2 ring-surface-low"
          />
        )}
      </span>
      {/* Tab-scale label: smaller + tighter tracking than label-caps so the
          widest words fit a sixth of a narrow viewport without clipping. */}
      <span className="font-mono text-[10px] leading-none font-bold tracking-[0.04em] uppercase">
        {label}
      </span>
    </Link>
  )

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-edge bg-surface-low"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-tabbar w-full max-w-md items-center gap-1 px-1">
        {tabs.slice(0, 2).map(renderTab)}
        {/* Global quick-create: every "new record" form, reachable anywhere.
            Neutral tint like the other resting tabs — a permanent blaze label
            read as a second "active" tab. */}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={createOpen}
          className="tap-active flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-faded transition-transform duration-75 active:scale-95"
        >
          <CirclePlus aria-hidden />
          <span className="font-mono text-[10px] leading-none font-bold tracking-[0.04em] uppercase">
            New
          </span>
        </button>
        {tabs.slice(2).map(renderTab)}
      </div>
      <QuickCreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </nav>
  )
}
