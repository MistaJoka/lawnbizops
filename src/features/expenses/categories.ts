/**
 * Expense categories — the single source of truth for the category Select and,
 * later, the Schedule C tax rollup (Phase 4 adds a `scheduleCLine` here rather
 * than a second list). Kept as a frontend constant, not a DB table: these map to
 * IRS-fixed reference data, so they evolve in code without a migration. The
 * `value` is what lands in expenses.category (validated at the edge).
 */
export interface ExpenseCategory {
  value: string
  label: string
  /** Where this category lands on IRS Schedule C (Part II). Structural line
   *  references only — no dollar figures, which change yearly. Confirm against
   *  the current-year form before filing. */
  scheduleCLine: string
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    value: 'supplies',
    label: 'Supplies & materials',
    scheduleCLine: 'Line 22 · Supplies',
  },
  { value: 'fuel', label: 'Fuel', scheduleCLine: 'Line 9 · Car & truck' },
  {
    value: 'equipment',
    label: 'Equipment & tools',
    scheduleCLine: 'Line 13 · Depreciation',
  },
  {
    value: 'equipment_rental',
    label: 'Equipment rental',
    scheduleCLine: 'Line 20 · Rent or lease',
  },
  {
    value: 'repairs',
    label: 'Repairs & maintenance',
    scheduleCLine: 'Line 21 · Repairs',
  },
  {
    value: 'contract_labor',
    label: 'Contract labor',
    scheduleCLine: 'Line 11 · Contract labor',
  },
  { value: 'vehicle', label: 'Vehicle', scheduleCLine: 'Line 9 · Car & truck' },
  { value: 'insurance', label: 'Insurance', scheduleCLine: 'Line 15 · Insurance' },
  { value: 'advertising', label: 'Advertising', scheduleCLine: 'Line 8 · Advertising' },
  {
    value: 'dues_licenses',
    label: 'Dues & licenses',
    scheduleCLine: 'Line 23 · Taxes & licenses',
  },
  { value: 'office', label: 'Office & admin', scheduleCLine: 'Line 18 · Office expense' },
  { value: 'other', label: 'Other', scheduleCLine: 'Line 27a · Other expenses' },
]

const SCHEDULE_C_BY_VALUE = new Map(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.scheduleCLine]),
)

/** Schedule C line hint for a stored category value; '' if unknown. */
export function scheduleCLine(value: string): string {
  return SCHEDULE_C_BY_VALUE.get(value) ?? ''
}

const LABEL_BY_VALUE = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c.label]))

/**
 * Human label for a stored category value. `expenses.category` is open text
 * validated at the edge (0027), so rows outlive the catalog: a category retired
 * from EXPENSE_CATEGORIES must still read as a label in reports, never as a raw
 * db token — "equipment_rental" sitting beside "Fuel" reads as a bug.
 */
export function categoryLabel(value: string): string {
  const known = LABEL_BY_VALUE.get(value)
  if (known) return known
  const words = value.replace(/[_-]+/g, ' ').trim()
  if (!words) return 'Other'
  return words.charAt(0).toUpperCase() + words.slice(1)
}
