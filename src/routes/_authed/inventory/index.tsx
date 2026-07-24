import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { HeaderAdd } from '@/components/HeaderAdd'
import { SkeletonList } from '@/components/Skeleton'
import {
  adjustInventoryQuantity,
  archiveInventoryItem,
  loadStarterInventory,
  saveInventoryItem,
  stockLabel,
  stockLevel,
  useInventory,
  type InventoryItem,
} from '@/features/inventory/hooks'
import { confirm } from '@/lib/confirm'

export const Route = createFileRoute('/_authed/inventory/')({
  component: InventoryScreen,
})

const STOCK_STYLE = {
  critical: 'border-alert bg-alert/10 text-alert',
  low: 'border-blaze bg-blaze/10 text-blaze',
  in_stock: 'bg-go/20 text-go',
} as const

function InventoryScreen() {
  const { data: items, isLoading } = useInventory()
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)

  useEffect(() => {
    if (!isLoading && (items ?? []).length === 0) {
      void loadStarterInventory()
    }
  }, [isLoading, items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items ?? []
    return (items ?? []).filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    )
  }, [items, query])

  const lowCount = (items ?? []).filter((i) => stockLevel(i) !== 'in_stock').length

  return (
    <div>
      <header className="sticky top-0 z-40 border-b-2 border-edge bg-canvas px-edge py-4">
        <Link to="/settings" className="inline-block py-2 pr-4 text-sm text-faded">
          ← Settings
        </Link>
        <h1 className="heading-stencil mt-2 text-2xl text-sand">Inventory</h1>
        <p className="mt-1 text-sm text-muted">
          Truck stock, warehouse supplies, seasonal materials.
        </p>
        <div className="mt-4 flex items-stretch gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search inventory"
            placeholder="Search inventory…"
            className="w-full min-w-0 rounded-lg border-2 border-edge bg-panel px-4 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
          />
          <HeaderAdd onClick={() => setShowAdd(true)} label="Item" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 px-edge py-4">
        <div className="card-surface border-alert p-3">
          <p className="label-caps text-faded">Low stock</p>
          <p className="heading-stencil mt-1 text-2xl text-alert tabular-nums">
            {lowCount} alerts
          </p>
        </div>
        <div className="card-surface p-3">
          <p className="label-caps text-faded">Total SKUs</p>
          <p className="heading-stencil mt-1 text-2xl text-sand tabular-nums">
            {(items ?? []).length}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3 px-edge pb-28">
        {filtered.map((item) => (
          <InventoryCard key={item.id} item={item} onEdit={() => setEditItem(item)} />
        ))}
      </ul>

      {isLoading && (items ?? []).length === 0 && (
        <div className="px-edge">
          <SkeletonList count={4} variant="card" />
        </div>
      )}

      {!isLoading &&
        filtered.length === 0 &&
        ((items ?? []).length === 0 ? (
          <EmptyState
            icon={<Package size={40} strokeWidth={1.5} />}
            title="No inventory yet"
            body="Track fuel, line, bags, and parts — low stock surfaces on Today."
            action={
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="heading-stencil tap-active rounded-lg bg-blaze px-6 py-4 text-on-cta"
              >
                + Add item
              </button>
            }
          />
        ) : (
          <p className="px-edge py-12 text-center text-faded">No matching items.</p>
        ))}

      {showAdd && <ItemSheet onClose={() => setShowAdd(false)} />}
      {editItem && <ItemSheet item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}

function InventoryCard({ item, onEdit }: { item: InventoryItem; onEdit: () => void }) {
  const level = stockLevel(item)
  return (
    <li className={`card-surface p-4 ${level === 'critical' ? 'border-alert' : ''}`}>
      <button type="button" onClick={onEdit} className="block w-full text-left">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block font-display text-lg font-semibold text-sand">
              {item.name}
            </span>
            <span className="label-caps mt-1 block text-faded">
              {item.location || 'No location'}
            </span>
          </span>
          <span className={`status-badge rounded px-2 py-0.5 ${STOCK_STYLE[level]}`}>
            {stockLabel(level)}
          </span>
        </span>
      </button>
      <p className="mt-2 text-lg text-sand tabular-nums">
        {item.quantity} {item.unit}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void adjustInventoryQuantity(item, 1)}
          className="heading-stencil tap-active min-h-11 flex-1 rounded-lg border-2 border-edge py-2 text-sm text-sand"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={() => void adjustInventoryQuantity(item, -1)}
          className="heading-stencil tap-active min-h-11 flex-1 rounded-lg border-2 border-edge py-2 text-sm text-faded"
        >
          Use 1
        </button>
      </div>
    </li>
  )
}

/** Add a new item (no `item`) or edit an existing one — same sheet, same save. */
function ItemSheet({ item, onClose }: { item?: InventoryItem; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [unit, setUnit] = useState(item?.unit ?? 'each')
  const [location, setLocation] = useState(item?.location ?? 'Truck')
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '1')
  const [reorderLevel, setReorderLevel] = useState(
    item ? String(item.reorder_level) : '2',
  )

  async function save() {
    if (!name.trim()) return
    await saveInventoryItem({
      id: item?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category: item?.category ?? 'general',
      unit,
      quantity: Math.max(0, parseFloat(quantity) || 0),
      reorder_level: Math.max(0, parseFloat(reorderLevel) || 0),
      location,
      notes: item?.notes ?? '',
    })
    onClose()
  }

  async function remove() {
    if (!item) return
    if (
      !(await confirm({
        title: `Remove ${item.name}?`,
        body: 'It comes off inventory and the low-stock alerts.',
        confirmLabel: 'Remove',
        destructive: true,
      }))
    )
      return
    await archiveInventoryItem(item)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-canvas/80" onClick={onClose}>
      <div
        className="w-full border-t-2 border-edge bg-panel p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="heading-stencil text-lg text-sand">
          {item ? 'Edit item' : 'Add item'}
        </p>
        <input
          autoFocus={!item}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          aria-label="Item name"
          className="mt-3 w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit"
            aria-label="Unit"
            className="rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-sand"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            aria-label="Location"
            className="rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-sand"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label-caps text-faded">On hand</span>
            <input
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              aria-label="Quantity on hand"
              className="mt-1 w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-sand tabular-nums"
            />
          </label>
          <label className="block">
            <span className="label-caps text-faded">Low-stock at</span>
            <input
              inputMode="decimal"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              aria-label="Low-stock threshold"
              className="mt-1 w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-sand tabular-nums"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          className="heading-stencil tap-active mt-4 w-full rounded-lg bg-blaze py-4 text-on-cta"
        >
          Save
        </button>
        {item && (
          <button
            type="button"
            onClick={() => void remove()}
            className="heading-stencil tap-active mt-3 w-full rounded-lg border border-edge py-3 text-alert"
          >
            Remove item
          </button>
        )}
      </div>
    </div>
  )
}
