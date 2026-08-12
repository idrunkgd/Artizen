// Template PDF devis Artizen — charte OR/NOIR.
// @react-pdf/renderer 3.4.5 (Helvetica supporte le WinAnsi avec € et accents).
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import React from "react";

const GOLD = "#C9A227";
const INK = "#0a0a0a";
const GREY = "#71717A";
const CREAM = "#FAF8F1";
const BORDER = "#E5E2D9";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: INK, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${INK}`, paddingBottom: 16, marginBottom: 20 },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: INK, letterSpacing: 1 },
  brandTag: { fontSize: 7, color: GREY, marginTop: 2 },
  docTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: GOLD, textAlign: "right" },
  docRef: { fontSize: 9, color: GREY, textAlign: "right", marginTop: 4 },
  twoCol: { flexDirection: "row", gap: 12, marginBottom: 20 },
  block: { flex: 1, backgroundColor: CREAM, padding: 10, borderRadius: 4 },
  blockLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  blockName: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 3 },
  blockLine: { fontSize: 9, marginBottom: 1 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: INK, marginTop: 12, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${GOLD}` },
  table: { borderTop: `1px solid ${BORDER}` },
  tr: { flexDirection: "row", borderBottom: `1px solid ${BORDER}`, paddingVertical: 5 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: GREY, paddingHorizontal: 4 },
  td: { fontSize: 9, paddingHorizontal: 4 },
  right: { textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: 240, backgroundColor: INK, padding: 12, borderRadius: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { fontSize: 9, color: CREAM },
  totalValue: { fontSize: 10, color: CREAM, fontFamily: "Helvetica-Bold" },
  grandTotal: { fontSize: 14, color: GOLD, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 7, color: GREY, textAlign: "center", borderTop: `1px solid ${BORDER}`, paddingTop: 6 }
});

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "long" }).format(d);
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(n);
}

export interface QuotePdfData {
  reference: string;
  title: string;
  description: string | null;
  status: string;
  billingType: string;
  vatRate: number;
  totalHt: number;
  totalTvac: number;
  validityDays: number;
  sentAt: Date | null;
  acceptedAt: Date | null;
  notes: string | null;
  org: { name: string; vatNumber: string | null; street: string | null; postalCode: string | null; city: string | null; country: string | null; phone: string | null; email: string | null; iban: string | null; logoUrl: string | null; paymentTermsDays: number };
  customer: { name: string; type: string; vatNumber: string | null; email: string | null; phone: string | null; street: string | null; postalCode: string | null; city: string | null };
  project: { name: string; reference: string } | null;
  lines: { description: string; quantity: number; unit: string; unitPrice: number; totalHt: number; category: string }[];
  milestones: { label: string; amountHt: number; percentage: number | null; expectedAt: Date | null }[];
}

export function QuotePdf({ data, isInvoice = false }: { data: QuotePdfData; isInvoice?: boolean }) {
  const vatAmount = data.totalTvac - data.totalHt;
  const isRegie = data.billingType === "REGIE";
  return (
    <Document title={`${isInvoice ? "Facture" : "Devis"} ${data.reference}`} author={data.org.name}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {data.org.logoUrl ? (
              <Image src={data.org.logoUrl} style={{ width: 50, height: 50, objectFit: "contain" }} />
            ) : null}
            <View>
              <Text style={s.brand}>{data.org.name.toUpperCase()}</Text>
              <Text style={s.brandTag}>Artisan du bâtiment</Text>
            </View>
          </View>
          <View>
            <Text style={s.docTitle}>{isInvoice ? "FACTURE" : "DEVIS"}</Text>
            <Text style={s.docRef}>{data.reference}</Text>
            <Text style={s.docRef}>{fmtDate(data.sentAt ?? new Date())}</Text>
          </View>
        </View>

        {/* Émetteur / Destinataire */}
        <View style={s.twoCol}>
          <View style={s.block}>
            <Text style={s.blockLabel}>Émetteur</Text>
            <Text style={s.blockName}>{data.org.name}</Text>
            {data.org.street && <Text style={s.blockLine}>{data.org.street}</Text>}
            {(data.org.postalCode || data.org.city) && <Text style={s.blockLine}>{data.org.postalCode} {data.org.city}</Text>}
            {data.org.country && <Text style={s.blockLine}>{data.org.country}</Text>}
            {data.org.vatNumber && <Text style={s.blockLine}>TVA : {data.org.vatNumber}</Text>}
            {data.org.phone && <Text style={s.blockLine}>{data.org.phone}</Text>}
            {data.org.email && <Text style={s.blockLine}>{data.org.email}</Text>}
          </View>
          <View style={s.block}>
            <Text style={s.blockLabel}>Client</Text>
            <Text style={s.blockName}>{data.customer.name}</Text>
            {data.customer.street && <Text style={s.blockLine}>{data.customer.street}</Text>}
            {(data.customer.postalCode || data.customer.city) && <Text style={s.blockLine}>{data.customer.postalCode} {data.customer.city}</Text>}
            {data.customer.vatNumber && <Text style={s.blockLine}>TVA : {data.customer.vatNumber}</Text>}
            {data.customer.phone && <Text style={s.blockLine}>{data.customer.phone}</Text>}
            {data.customer.email && <Text style={s.blockLine}>{data.customer.email}</Text>}
          </View>
        </View>

        {/* Titre + chantier */}
        <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 6 }}>{data.title}</Text>
        {data.project && (
          <Text style={{ fontSize: 9, color: GREY, marginBottom: 8 }}>Chantier : {data.project.name} ({data.project.reference})</Text>
        )}
        {data.description && (
          <Text style={{ fontSize: 9, color: INK, marginBottom: 12 }}>{data.description}</Text>
        )}

        {!isInvoice && isRegie && (
          <View style={{ backgroundColor: CREAM, borderLeft: `3px solid ${GOLD}`, padding: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: INK }}>Devis en régie</Text>
            <Text style={{ fontSize: 8, color: GREY, marginTop: 2, lineHeight: 1.4 }}>
              Les quantités et montants ci-dessous sont estimatifs. La facturation sera établie
              sur la base du temps réellement presté, aux taux horaires / journaliers indiqués.
            </Text>
          </View>
        )}

        {/* Lignes */}
        <Text style={s.sectionTitle}>
          {!isInvoice && isRegie ? "Prestations & taux (régie — estimation)" : "Détail des prestations"}
        </Text>
        <View style={s.table}>
          <View style={s.tr}>
            <Text style={[s.th, { flex: 5 }]}>Description</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Qté</Text>
            <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Unité</Text>
            <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>P.U.</Text>
            <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>Total HT</Text>
          </View>
          {data.lines.map((l, i) => (
            <View key={i} style={s.tr}>
              <Text style={[s.td, { flex: 5 }]}>{l.description}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{l.quantity}</Text>
              <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{l.unit}</Text>
              <Text style={[s.td, { flex: 1.5, textAlign: "right" }]}>{fmtMoney(l.unitPrice)}</Text>
              <Text style={[s.td, { flex: 1.5, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{fmtMoney(l.totalHt)}</Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{!isInvoice && isRegie ? "Estimation HTVA" : "Total HTVA"}</Text>
            <Text style={s.totalValue}>{fmtMoney(data.totalHt)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TVA {data.vatRate} %</Text>
            <Text style={s.totalValue}>{fmtMoney(vatAmount)}</Text>
          </View>
          <View style={[s.totalRow, { marginTop: 6, paddingTop: 6, borderTop: `1px solid ${GOLD}` }]}>
            <Text style={[s.totalLabel, { color: GOLD }]}>TOTAL TVAC</Text>
            <Text style={s.grandTotal}>{fmtMoney(data.totalTvac)}</Text>
          </View>
        </View>

        {/* Tranches */}
        {data.milestones.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Échéancier de facturation</Text>
            {data.milestones.map((m, i) => (
              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: `1px solid ${BORDER}` }}>
                <Text style={{ fontSize: 9 }}>{m.label}{m.percentage && ` (${m.percentage} %)`}</Text>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>
                  {fmtMoney(m.amountHt)} HTVA{m.expectedAt && ` · ${fmtDate(m.expectedAt)}`}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Conditions */}
        <Text style={s.sectionTitle}>Conditions</Text>
        <Text style={{ fontSize: 8, color: GREY, lineHeight: 1.4 }}>
          Devis valable {data.validityDays} jours à compter de la date d'émission.
          Conditions de paiement : {data.org.paymentTermsDays} jours fin de mois.
          {data.org.iban && ` · Versement sur IBAN ${data.org.iban}.`}
          {data.notes && `\n\n${data.notes}`}
        </Text>

        <Text style={s.footer} fixed render={({ pageNumber, totalPages }) => `${data.org.name}${data.org.vatNumber ? ` · TVA ${data.org.vatNumber}` : ""} · Page ${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  );
}
