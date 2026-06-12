import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { PropertyForm } from '@/features/properties/PropertyForm'
import { savePropertyWithGeocode, useProperty } from '@/features/properties/hooks'

export const Route = createFileRoute('/_authed/properties/$propertyId/edit')({
  component: EditPropertyScreen,
})

function EditPropertyScreen() {
  const { propertyId } = Route.useParams()
  const navigate = useNavigate()
  const { data: property, isLoading } = useProperty(propertyId)

  return (
    <div className="px-4 pt-6">
      <Link
        to="/properties/$propertyId"
        params={{ propertyId }}
        className="inline-block py-2 pr-4 text-sm text-faded"
      >
        ← Back
      </Link>
      <h1 className="heading-stencil mt-2 text-2xl text-khaki">Edit property</h1>
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
        ) : (
          <p className="mt-12 text-center text-faded">
            {isLoading ? 'Loading…' : 'Property not found.'}
          </p>
        )}
      </div>
    </div>
  )
}
