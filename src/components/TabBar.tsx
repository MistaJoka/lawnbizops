import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useOutboxPending } from '@/lib/outbox'
import { QuickCreateSheet } from './QuickCreateSheet'

const tabs = [
  { to: '/', label: 'Today', icon: SunIcon },
  { to: '/schedule', label: 'Schedule', icon: CalendarIcon },
  { to: '/clients', label: 'Clients', icon: PeopleIcon },
  { to: '/money', label: 'Money', icon: DollarIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
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
          <PlusIcon />
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

function PlusIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 5" />
      <path d="M18.5 15.5c1.6.8 2.7 2.3 3 4.5" />
    </svg>
  )
}

function DollarIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 2v20M16.5 6.5c-.8-1.3-2.4-2-4.5-2-2.8 0-4.5 1.4-4.5 3.5S9.5 11 12 11.5s4.8 1.4 4.8 3.7c0 2.2-2 3.6-4.8 3.6-2.3 0-4-.8-4.8-2.3" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2l1 3h-2zM12 22l-1-3h2zM2 12l3-1v2zM22 12l-3 1v-2zM4.9 4.9l2.8 1.4-1.4 1.4zM19.1 19.1l-2.8-1.4 1.4-1.4zM19.1 4.9l-1.4 2.8-1.4-1.4zM4.9 19.1l1.4-2.8 1.4 1.4z" />
    </svg>
  )
}
