import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatCents } from '@/lib/format'
import {
  invoiceTotalCents,
  lineTotalCents,
  type BusinessSettings,
} from '@/features/invoices/hooks'
import type { EstimateDetail } from './hooks'

/**
 * Client-facing estimate PDF. Mirrors InvoicePdf — clean white paper, dark
 * text — but titled ESTIMATE, with a valid-until line and no payments block.
 */

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
    fontSize: 10,
    fontFamily: 'Helvetica',
    paddingVertical: 48,
    paddingHorizontal: 56,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  businessName: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  businessLine: { color: '#555555', marginBottom: 2 },
  estimateTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#2d5016',
    textAlign: 'right',
  },
  metaLine: { textAlign: 'right', color: '#555555', marginTop: 3 },
  billTo: { marginBottom: 24 },
  billToLabel: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  billToName: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  billToLine: { color: '#555555', marginTop: 2 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 5,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#555555',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#dddddd',
    paddingVertical: 6,
  },
  colDescription: { flex: 5 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 2, textAlign: 'right' },
  colTotal: { flex: 2, textAlign: 'right' },
  totalsBlock: { marginTop: 12, alignItems: 'flex-end' },
  grandTotal: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    borderTopWidth: 1.5,
    borderTopColor: '#1a1a1a',
    marginTop: 4,
    paddingTop: 6,
  },
  grandTotalText: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  notes: { marginTop: 32, color: '#555555' },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 56,
    right: 56,
    textAlign: 'center',
    color: '#888888',
    fontSize: 9,
  },
})

function formatLongDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function EstimatePdf({
  detail,
  settings,
}: {
  detail: EstimateDetail
  settings: BusinessSettings | null
}) {
  const { estimate, items, client, property } = detail
  const total = invoiceTotalCents(items)
  const businessName = settings?.business_name || 'LawnBizOps'

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.businessName}>{businessName}</Text>
            {settings?.address ? (
              <Text style={styles.businessLine}>{settings.address}</Text>
            ) : null}
            {settings?.phone ? (
              <Text style={styles.businessLine}>{settings.phone}</Text>
            ) : null}
            {settings?.email ? (
              <Text style={styles.businessLine}>{settings.email}</Text>
            ) : null}
          </View>
          <View>
            <Text style={styles.estimateTitle}>ESTIMATE</Text>
            <Text style={styles.metaLine}>{estimate.number ?? 'Pending number'}</Text>
            <Text style={styles.metaLine}>
              Issued {formatLongDate(estimate.issued_at)}
            </Text>
            {estimate.valid_until ? (
              <Text style={styles.metaLine}>
                Valid until {formatLongDate(estimate.valid_until)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.billToLabel}>Prepared for</Text>
          <Text style={styles.billToName}>{client?.name ?? 'Customer'}</Text>
          {property ? (
            <Text style={styles.billToLine}>
              {property.label || property.address_line1}
            </Text>
          ) : null}
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
          <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit price</Text>
          <Text style={[styles.tableHeaderCell, styles.colTotal]}>Amount</Text>
        </View>
        {items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Text style={styles.colDescription}>{item.description}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>{formatCents(item.unit_price_cents)}</Text>
            <Text style={styles.colTotal}>{formatCents(lineTotalCents(item))}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalText}>Total</Text>
            <Text style={styles.grandTotalText}>{formatCents(total)}</Text>
          </View>
        </View>

        {estimate.notes ? <Text style={styles.notes}>{estimate.notes}</Text> : null}

        <Text style={styles.footer}>Thank you for the opportunity.</Text>
      </Page>
    </Document>
  )
}
