import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { slopePercentFromPitchRad } from '@/lib/calculators'

export const Route = createFileRoute('/_authed/tools/grade')({
  component: GradeEstimatorScreen,
})

const orientationSupported =
  typeof window !== 'undefined' && 'DeviceOrientationEvent' in window

function GradeEstimatorScreen() {
  const [slope, setSlope] = useState<number | null>(null)

  useEffect(() => {
    if (!orientationSupported) return

    function onOrient(e: DeviceOrientationEvent) {
      const beta = e.beta
      if (beta === null) return
      const pitchRad = ((beta - 90) * Math.PI) / 180
      setSlope(slopePercentFromPitchRad(pitchRad))
    }

    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [])

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
      <Link to="/tools" className="inline-block py-2 pr-4 text-sm text-faded">
        ← Field tools
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Grade estimator</h1>
      <p className="mt-2 text-muted">
        Hold the phone flat on the ground along the slope direction.
      </p>

      {!orientationSupported && (
        <p className="mt-6 text-alert">
          Tilt sensors are not available in this browser. Try on your phone in the field.
        </p>
      )}

      <div className="card-surface mt-6 p-6 text-center">
        <p className="label-caps text-faded">Slope</p>
        <p className="heading-stencil mt-2 text-5xl text-sand">
          {slope === null ? '—' : `${slope.toFixed(1)}%`}
        </p>
        {drainage && <p className="mt-4 text-lg text-muted">{drainage}</p>}
      </div>
    </div>
  )
}
