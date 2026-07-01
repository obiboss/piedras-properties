import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

export type InvestmentPaymentReceiptPdfData = {
  receiptNumber: string;
  developerName: string;
  investorName: string;
  investorPhone: string;
  investorEmail: string;
  planName: string;
  paymentReference: string;
  paymentDate: string;
  principalAmount: string;
  expectedReturnAmount: string;
  maturityTotalAmount: string;
  startDate: string;
  maturityDate: string;
  payoutFrequency: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 18,
    marginBottom: 22,
  },
  brand: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "bold",
  },
  titleBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },
  receiptNumber: {
    marginTop: 6,
    fontSize: 10,
    color: "#374151",
    fontWeight: "bold",
  },
  section: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 7,
    marginBottom: 7,
  },
  label: {
    width: "38%",
    color: "#6b7280",
    fontWeight: "bold",
  },
  value: {
    width: "62%",
    color: "#111827",
    fontWeight: "bold",
  },
  moneyBox: {
    backgroundColor: "#ecfdf5",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  moneyTitle: {
    fontSize: 10,
    color: "#047857",
    fontWeight: "bold",
    marginBottom: 6,
  },
  moneyValue: {
    fontSize: 20,
    color: "#064e3b",
    fontWeight: "bold",
  },
  note: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 9,
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    color: "#6b7280",
    fontSize: 8,
    lineHeight: 1.5,
  },
});

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function InvestmentPaymentReceiptPdf({
  data,
}: {
  data: InvestmentPaymentReceiptPdfData;
}) {
  return (
    <Document
      title={`Investment Receipt ${data.receiptNumber}`}
      author="Piedras Properties"
      subject="Investment Payment Receipt"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{data.developerName}</Text>
          <Text style={styles.subtitle}>Investment payment confirmation</Text>
        </View>

        <View style={styles.titleBox}>
          <Text style={styles.title}>Investment Receipt</Text>
          <Text style={styles.receiptNumber}>
            Receipt Number: {data.receiptNumber}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investor Details</Text>
          <ReceiptRow label="Investor" value={data.investorName} />
          <ReceiptRow label="Phone" value={data.investorPhone} />
          <ReceiptRow label="Email" value={data.investorEmail} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investment Details</Text>
          <ReceiptRow label="Plan" value={data.planName} />
          <ReceiptRow label="Payment reference" value={data.paymentReference} />
          <ReceiptRow label="Payment date" value={data.paymentDate} />
          <ReceiptRow label="Start date" value={data.startDate} />
          <ReceiptRow label="Maturity date" value={data.maturityDate} />
          <ReceiptRow label="Payout frequency" value={data.payoutFrequency} />
        </View>

        <View style={styles.moneyBox}>
          <Text style={styles.moneyTitle}>Amount Paid</Text>
          <Text style={styles.moneyValue}>{data.principalAmount}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Payout Summary</Text>
          <ReceiptRow label="Capital invested" value={data.principalAmount} />
          <ReceiptRow
            label="Expected return"
            value={data.expectedReturnAmount}
          />
          <ReceiptRow
            label="Total payout at maturity"
            value={data.maturityTotalAmount}
          />
        </View>

        <Text style={styles.note}>
          This receipt confirms a verified investment payment processed through
          Piedras Properties. Payouts are subject to the investment plan terms
          selected by the investor.
        </Text>

        <Text style={styles.footer}>
          This is a system-generated receipt. Please keep a copy for your
          records. For enquiries, contact Piedras Properties with the receipt
          number and payment reference.
        </Text>
      </Page>
    </Document>
  );
}

async function normalisePdfOutputToBuffer(output: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(output)) {
    return output;
  }

  if (output instanceof Uint8Array) {
    return Buffer.from(output);
  }

  if (output instanceof ArrayBuffer) {
    return Buffer.from(output);
  }

  if (typeof Blob !== "undefined" && output instanceof Blob) {
    return Buffer.from(await output.arrayBuffer());
  }

  if (
    output &&
    typeof output === "object" &&
    "arrayBuffer" in output &&
    typeof output.arrayBuffer === "function"
  ) {
    const arrayBuffer = await output.arrayBuffer();

    return Buffer.from(arrayBuffer);
  }

  throw new Error("PDF output could not be converted to Buffer.");
}

export async function renderInvestmentPaymentReceiptPdfBuffer(
  data: InvestmentPaymentReceiptPdfData,
) {
  const output = await pdf(
    <InvestmentPaymentReceiptPdf data={data} />,
  ).toBuffer();

  return normalisePdfOutputToBuffer(output);
}
