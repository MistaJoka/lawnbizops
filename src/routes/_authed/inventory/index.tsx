import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  adjustInventoryQuantity,
  loadStarterInventory,
  saveInventoryItem,
  stockLabel,
  stockLevel,
  useInventory,
  type InventoryItem,
} from '@/features/inventory/hooks'

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
        <h1 className="heading-stencil mt-2 text-2xl text-khaki">Inventory</h1>
        <p className="mt-1 text-sm text-muted">
          Truck stock, warehouse supplies, seasonal materials.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search inventory…"
          className="mt-4 w-full rounded-lg border-2 border-edge bg-panel px-4 py-3 text-lg text-sand placeholder:text-faded focus:border-blaze focus:outline-none"
        />
      </header>

      <div className="grid grid-cols-2 gap-3 px-edge py-4">
        <div className="card-surface border-alert p-3">
          <p className="label-caps text-faded">Low stock</p>
          <p className="heading-stencil mt-1 text-2xl text-alert">{lowCount} alerts</p>
        </div>
        <div className="card-surface p-3">
          <p className="label-caps text-faded">Total SKUs</p>
          <p className="heading-stencil mt-1 text-2xl text-sand">
            {(items ?? []).length}
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-3 px-edge pb-28">
        {filtered.map((item) => (
          <InventoryCard key={item.id} item={item} />
        ))}
      </ul>

      {!isLoading && filtered.length === 0 && (
        <p className="px-edge py-12 text-center text-faded">No matching items.</p>
      )}

      <button
        type="button"
        onClick={() => setShowAdd((s) => !s)}
        className="tap-active fixed right-6 bottom-28 z-40 flex h-14 items-center justify-center gap-2 rounded-full bg-blaze px-6 text-on-cta shadow-2xl ring-4 ring-canvas active:scale-90 sm:right-[calc(50%-14rem+1.5rem)]"
        aria-label="Add inventory"
      >
        <span className="text-3xl leading-none font-bold">+</span>
        <span className="label-caps text-sm">Item</span>
      </button>

      {showAdd && <QuickAddSheet onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const level = stockLevel(item)
  return (
    <li className={`card-surface p-4 ${level === 'critical' ? 'border-alert' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-sand">{item.name}</h2>
          <p className="label-caps mt-1 text-faded">{item.location || 'No location'}</p>
        </div>
        <span className={`status-badge rounded px-2 py-0.5 ${STOCK_STYLE[level]}`}>
          {stockLabel(level)}
        </span>
      </div>
      <p className="mt-2 text-lg text-sand">
        {item.quantity} {item.unit}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void adjustInventoryQuantity(item, 1)}
          className="heading-stencil tap-active flex-1 rounded-lg border-2 border-edge py-2 text-sm text-sand"
        >
          + Add
        </button>
        <button
          type="button"
          onClick={() => void adjustInventoryQuantity(item, -1)}
          className="heading-stencil tap-active flex-1 rounded-lg border-2 border-edge py-2 text-sm text-faded"
        >
          Use 1
        </button>
      </div>
    </li>
  )
}

function QuickAddSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('each')
  const [location, setLocation] = useState('Truck')

  async function save() {
    if (!name.trim()) return
    await saveInventoryItem({
      id: crypto.randomUUID(),
      name: name.trim(),
      category: 'general',
      unit,
      quantity: 1,
      reorder_level: 2,
      location,
      notes: '',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-canvas/80">
      <div className="w-full border-t-2 border-edge bg-panel p-4 pb-8">
        <p className="heading-stencil text-lg text-sand">Add item</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className="mt-3 w-full rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-lg text-sand"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit"
            className="rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-sand"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="rounded-lg border-2 border-edge bg-canvas px-4 py-3 text-sand"
          />
        </div>
        <button
          type="button"
          onClick={() => void save()}
          className="heading-stencil tap-active mt-4 w-full rounded-lg bg-blaze py-4 text-on-cta"
        >
          Save
        </button>
      </div>
    </div>
  )
}
