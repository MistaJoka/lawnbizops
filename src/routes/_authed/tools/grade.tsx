import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BackLink } from '@/components/BackLink'
import { slopePercentFromPitchRad } from '@/lib/calculators'

export const Route = createFileRoute('/_authed/tools/grade')({
  component: GradeEstimatorScreen,
})

const orientationSupported =
  typeof window !== 'undefined' && 'DeviceOrientationEvent' in window

// iOS 13+ gates motion sensors behind an explicit permission request that must
// come from a user gesture — without it the listener attaches but never fires.
const requestOrientationPermission = orientationSupported
  ? (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
    ).requestPermission
  : undefined

function GradeEstimatorScreen() {
  const [slope, setSlope] = useState<number | null>(null)
  const [permission, setPermission] = useState<'needed' | 'granted' | 'denied'>(
    requestOrientationPermission ? 'needed' : 'granted',
  )

  useEffect(() => {
    if (!orientationSupported || permission !== 'granted') return

    function onOrient(e: DeviceOrientationEvent) {
      const beta = e.beta
      if (beta === null) return
      const pitchRad = ((beta - 90) * Math.PI) / 180
      setSlope(slopePercentFromPitchRad(pitchRad))
    }

    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [permission])

  async function enableTilt() {
    if (!requestOrientationPermission) return
    try {
      setPermission(
        (await requestOrientationPermission()) === 'granted' ? 'granted' : 'denied',
      )
    } catch {
      setPermission('denied')
    }
  }

  const abs = slope !== null ? Math.abs(slope) : null
  const drainage =
    abs === null
      ? null
      : abs < 1
        ? 'Too flat — poor drainage'
        : abs > 5
          ? 'Steep — check runoff'
          : 'Good drainage range'

  return (
    <div className="px-edge pt-6 pb-24">
      <BackLink fallback="/tools" label="Field tools" />
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Grade estimator</h1>
      <p className="mt-2 text-muted">
        Hold the phone flat on the ground along the slope direction.
      </p>

      {!orientationSupported && (
        <p className="mt-6 text-alert">
          Tilt sensors are not available in this browser. Try on your phone in the field.
        </p>
      )}

      {orientationSupported && permission === 'needed' && (
        <button
          type="button"
          onClick={() => void enableTilt()}
          className="heading-stencil tap-active mt-6 w-full rounded-lg bg-blaze px-4 py-4 text-lg text-on-cta"
        >
          Enable tilt sensor
        </button>
      )}
      {permission === 'denied' && (
        <p className="mt-6 text-alert">
          Motion access was denied. Allow Motion &amp; Orientation for this site in your
          browser settings, then reload.
        </p>
      )}

      <div className="card-surface mt-6 p-6 text-center">
        <p className="label-caps text-faded">Slope</p>
        <p className="heading-stencil mt-2 text-5xl text-sand tabular-nums">
          {slope === null ? '—' : `${slope.toFixed(1)}%`}
        </p>
        {drainage && <p className="mt-4 text-lg text-muted">{drainage}</p>}
      </div>
    </div>
  )
}
