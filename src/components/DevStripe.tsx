// Thin always-on build-provenance stripe pinned to the top of every screen.
// Reads the build constants Vite bakes in (see vite.config.ts → buildInfoPlugin);
// useful in prod for confirming which cached PWA version is actually running on
// the device after a deploy.
import buildInfo from 'virtual:build-info'

const { version, sha, branch, dirty, committedAt } = buildInfo

// "Jun 21 14:32" in the device's locale/timezone — committedAt is an ISO string.
function shortStamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DevStripe() {
  return (
    <div className="sticky top-0 z-50 border-b border-edge bg-panel">
      <p className="font-mono mx-auto flex max-w-md gap-2 overflow-hidden px-3 py-1 text-[10px] leading-none whitespace-nowrap text-faded">
        <span className="text-sand">v{version}</span>
        <span aria-hidden>·</span>
        <span>{sha}</span>
        <span aria-hidden>·</span>
        <span>
          {branch}
          {dirty && <span className="text-alert">✱</span>}
        </span>
        <span aria-hidden>·</span>
        <span className="truncate">{shortStamp(committedAt)}</span>
      </p>
    </div>
  )
}
