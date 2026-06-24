import { Link } from '@tanstack/react-router'
import { useOutboxPending } from '@/lib/outbox'

const tabs = [
  { to: '/', label: 'Today', icon: SunIcon },
  { to: '/schedule', label: 'Schedule', icon: CalendarIcon },
  { to: '/clients', label: 'Clients', icon: PeopleIcon },
  { to: '/money', label: 'Money', icon: DollarIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
] as const

export function TabBar() {
  const pending = useOutboxPending()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-edge bg-surface-low"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-tabbar w-full max-w-md items-center justify-around px-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="tap-active flex flex-col items-center justify-center rounded-lg px-3 py-1 text-faded transition-transform duration-75 active:scale-95"
            activeProps={{
              className:
                'tap-active flex flex-col items-center justify-center rounded-lg bg-blaze px-4 py-1 text-on-cta transition-transform duration-75 active:scale-95',
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
            <span className="label-caps mt-0.5">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
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
