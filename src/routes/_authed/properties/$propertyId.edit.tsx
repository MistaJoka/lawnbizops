import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { PropertyForm } from '@/features/properties/PropertyForm'
import { SkeletonDetail } from '@/components/Skeleton'
import { QueryError } from '@/components/QueryError'
import { savePropertyWithGeocode, useProperty } from '@/features/properties/hooks'

export const Route = createFileRoute('/_authed/properties/$propertyId/edit')({
  component: EditPropertyScreen,
})

function EditPropertyScreen() {
  const { propertyId } = Route.useParams()
  const navigate = useNavigate()
  const { data: property, isLoading, isError, refetch } = useProperty(propertyId)

  return (
    <div className="px-edge pt-6">
      <Link
        to="/properties/$propertyId"
        params={{ propertyId }}
        className="tap-active inline-flex min-h-touch items-center pr-4 text-sm text-faded"
      >
        ← Back
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-sand">Edit property</h1>
      <div className="mt-4">
        {property ? (
          <PropertyForm
            initial={property}
            onSubmit={async (values) => {
              await savePropertyWithGeocode({
                id: propertyId,
                client_id: property.client_id,
                ...values,
              })
              void navigate({ to: '/properties/$propertyId', params: { propertyId } })
            }}
          />
        ) : isLoading ? (
          <SkeletonDetail />
        ) : isError ? (
          <QueryError onRetry={() => void refetch()} />
        ) : (
          <p className="mt-12 text-center text-faded">Property not found.</p>
        )}
      </div>
    </div>
  )
}
