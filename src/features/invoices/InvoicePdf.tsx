import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { formatCents } from '@/lib/format'
import {
  invoiceTotalCents,
  lineTotalCents,
  type BusinessSettings,
  type InvoiceDetail,
} from './hooks'

/**
 * Client-facing invoice PDF. Deliberately NOT the app's tactical theme —
 * clean white paper, dark text, the kind of invoice you'd hand a customer.
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
  logo: { width: 64, height: 64, objectFit: 'contain', marginBottom: 8 },
  businessName: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  businessLine: { color: '#555555', marginBottom: 2 },
  invoiceTitle: {
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
  totalsRow: {
    flexDirection: 'row',
    width: 200,
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalsLabel: { color: '#555555' },
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
  balanceDue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#2d5016' },
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

export function InvoicePdf({
  detail,
  settings,
  logoDataUrl,
}: {
  detail: InvoiceDetail
  settings: BusinessSettings | null
  /** Pre-fetched data URL — share flows skip the logo silently when offline. */
  logoDataUrl?: string
}) {
  const { invoice, items, payments, client } = detail
  const total = invoiceTotalCents(items)
  const paid = payments.reduce((sum, p) => sum + p.amount_cents, 0)
  const balance = total - paid
  const businessName = settings?.business_name || 'LawnBizOps'

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {logoDataUrl ? <Image src={logoDataUrl} style={styles.logo} /> : null}
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
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.metaLine}>{invoice.number ?? 'Pending number'}</Text>
            <Text style={styles.metaLine}>
              Issued {formatLongDate(invoice.issued_at)}
            </Text>
            {invoice.due_at ? (
              <Text style={styles.metaLine}>Due {formatLongDate(invoice.due_at)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.billToLabel}>Bill to</Text>
          <Text style={styles.billToName}>{client?.name ?? 'Customer'}</Text>
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
          {payments.length > 0 ? (
            <>
              {payments.map((payment) => (
                <View key={payment.id} style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    Paid {formatLongDate(payment.paid_at)} ({payment.method})
                  </Text>
                  <Text>-{formatCents(payment.amount_cents)}</Text>
                </View>
              ))}
              <View style={styles.grandTotal}>
                <Text style={styles.balanceDue}>Balance due</Text>
                <Text style={styles.balanceDue}>{formatCents(balance)}</Text>
              </View>
            </>
          ) : null}
        </View>

        {invoice.notes ? <Text style={styles.notes}>{invoice.notes}</Text> : null}

        <Text style={styles.footer}>Thank you for your business.</Text>
      </Page>
    </Document>
  )
}
