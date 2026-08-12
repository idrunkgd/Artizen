/**
 * Template PDF d'un bon de commande matériel pour un fournisseur.
 * Reprend la liste : référence, libellé, qté, prix unit. HT, total HT.
 *
 * Style sobre noir/or, aligné sur les autres PDF Artizen (devis/facture).
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#0a0a0a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  brand: { fontSize: 18, fontWeight: 700, color: "#0a0a0a" },
  brandSub: { fontSize: 8, color: "#666" },
  refBlock: { textAlign: "right" },
  refLabel: { fontSize: 8, color: "#666" },
  refValue: { fontSize: 14, fontWeight: 700 },
  boxes: { flexDirection: "row", justifyContent: "space-between", marginVertical: 12 },
  box: { width: "48%", padding: 8, border: "1pt solid #ddd", borderRadius: 4 },
  boxTitle: { fontSize: 8, color: "#666", marginBottom: 4, textTransform: "uppercase" },
  boxName: { fontSize: 11, fontWeight: 700 },
  boxLine: { fontSize: 9, color: "#333" },
  h2: { fontSize: 12, fontWeight: 700, marginTop: 12, marginBottom: 6, color: "#C9A227" },
  table: { border: "1pt solid #ddd", borderRadius: 4 },
  tr: { flexDirection: "row", borderBottom: "0.5pt solid #eee" },
  trHead: { flexDirection: "row", backgroundColor: "#0a0a0a", color: "#FAF8F1" },
  th: { padding: 6, fontSize: 9, fontWeight: 700 },
  td: { padding: 6, fontSize: 9 },
  cRef: { width: "20%" },
  cLab: { width: "44%" },
  cQty: { width: "10%", textAlign: "right" },
  cUnit: { width: "8%", textAlign: "right" },
  cPrice: { width: "9%", textAlign: "right" },
  cTotal: { width: "9%", textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  total: { fontSize: 12, fontWeight: 700, padding: 6, backgroundColor: "#0a0a0a", color: "#C9A227" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#666", textAlign: "center", borderTop: "0.5pt solid #ddd", paddingTop: 6 },
  notes: { marginTop: 8, fontSize: 9, color: "#444", fontStyle: "italic" }
});

export type MaterialOrderPdfData = {
  reference: string;
  orderedAt: Date | null;
  expectedAt: Date | null;
  notes: string | null;
  totalHt: number;
  supplier: {
    name: string;
    email: string | null;
    vatNumber: string | null;
  } | null;
  project: {
    name: string;
    reference: string;
    address: string | null;
  } | null;
  organization: {
    name: string;
    email?: string | null;
    phone?: string | null;
    vatNumber?: string | null;
    addressLine?: string | null;
  };
  lines: Array<{
    reference: string | null;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalHt: number;
  }>;
};

function formatEUR(n: number) {
  // Espace normale (U+0020) : l'espace fine insécable du format fr-BE (U+202F)
  // n'est pas rendue par la police Helvetica du PDF (milliers cassés ≥ 1000).
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${neg ? "-" : ""}${grouped},${dec} €`;
}
function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "long" }).format(d);
}

export function MaterialOrderPdf({ data }: { data: MaterialOrderPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.organization.name}</Text>
            {data.organization.addressLine && <Text style={styles.brandSub}>{data.organization.addressLine}</Text>}
            {data.organization.vatNumber && <Text style={styles.brandSub}>TVA {data.organization.vatNumber}</Text>}
          </View>
          <View style={styles.refBlock}>
            <Text style={styles.refLabel}>BON DE COMMANDE</Text>
            <Text style={styles.refValue}>{data.reference}</Text>
            <Text style={styles.brandSub}>Émis le {formatDate(data.orderedAt ?? new Date())}</Text>
            {data.expectedAt && (
              <Text style={styles.brandSub}>Livraison souhaitée : {formatDate(data.expectedAt)}</Text>
            )}
          </View>
        </View>

        <View style={styles.boxes}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Fournisseur</Text>
            {data.supplier ? (
              <>
                <Text style={styles.boxName}>{data.supplier.name}</Text>
                {data.supplier.email && <Text style={styles.boxLine}>{data.supplier.email}</Text>}
                {data.supplier.vatNumber && <Text style={styles.boxLine}>TVA {data.supplier.vatNumber}</Text>}
              </>
            ) : (
              <Text style={styles.boxLine}>—</Text>
            )}
          </View>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Livrer pour le chantier</Text>
            {data.project ? (
              <>
                <Text style={styles.boxName}>{data.project.name}</Text>
                <Text style={styles.boxLine}>Réf. {data.project.reference}</Text>
                {data.project.address && <Text style={styles.boxLine}>{data.project.address}</Text>}
              </>
            ) : (
              <Text style={styles.boxLine}>—</Text>
            )}
          </View>
        </View>

        <Text style={styles.h2}>Articles commandés</Text>
        <View style={styles.table}>
          <View style={styles.trHead}>
            <Text style={[styles.th, styles.cRef]}>Référence</Text>
            <Text style={[styles.th, styles.cLab]}>Désignation</Text>
            <Text style={[styles.th, styles.cQty]}>Qté</Text>
            <Text style={[styles.th, styles.cUnit]}>Unité</Text>
            <Text style={[styles.th, styles.cPrice]}>P.U. HT</Text>
            <Text style={[styles.th, styles.cTotal]}>Total HT</Text>
          </View>
          {data.lines.map((l, idx) => (
            <View key={idx} style={styles.tr}>
              <Text style={[styles.td, styles.cRef]}>{l.reference ?? "—"}</Text>
              <Text style={[styles.td, styles.cLab]}>{l.description}</Text>
              <Text style={[styles.td, styles.cQty]}>{l.quantity}</Text>
              <Text style={[styles.td, styles.cUnit]}>{l.unit}</Text>
              <Text style={[styles.td, styles.cPrice]}>{formatEUR(l.unitPrice)}</Text>
              <Text style={[styles.td, styles.cTotal]}>{formatEUR(l.totalHt)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <Text style={styles.total}>Total HT : {formatEUR(data.totalHt)}</Text>
        </View>

        {data.notes && <Text style={styles.notes}>Notes : {data.notes}</Text>}

        <Text style={styles.footer}>
          {data.organization.name}
          {data.organization.email ? ` · ${data.organization.email}` : ""}
          {data.organization.phone ? ` · ${data.organization.phone}` : ""}
        </Text>
      </Page>
    </Document>
  );
}
