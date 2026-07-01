import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  Link2,
  ShoppingBag,
} from "lucide-react";
import { DeveloperBankSetupToast } from "@/components/developer/developer-bank-setup-toast";
import { DeveloperDocumentTemplateForm } from "@/components/developer/developer-document-template-form";
import { DeveloperPayoutSetupForm } from "@/components/developer/developer-payout-setup-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { DEVELOPER_TEMPLATE_PLACEHOLDERS } from "@/constants/developer-document-templates";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { getDeveloperDocumentTemplateSettingsForCurrentDeveloper } from "@/server/services/developer-document-templates.service";
import {
  getDeveloperPayoutAccountState,
  getPaystackBanksForDeveloperSetup,
} from "@/server/services/developer-payout.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperDashboardPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

type PayoutDashboardState = "missing" | "unverified" | "verified" | "failed";

type DashboardMetric = {
  estateCount: number;
  totalPlots: number;
  availablePlots: number;
  activeSales: number;
  investorCount: number;
  salesReceivedThisMonth: number;
  paymentsReceivedToday: number;
};

type CountQueryResult = {
  count: number | null;
  error: unknown;
};

type SalePaymentAmountRow = {
  amount_paid: number | string | null;
};

type ScheduleItemRow = {
  id: string;
  sale_id: string;
  label: string;
  due_date: string;
  expected_amount: number | string;
  amount_paid: number | string;
  status: string;
};

type SaleLookupRow = {
  id: string;
  buyer_id: string;
  estate_id: string;
  plot_id: string;
};

type BuyerLookupRow = {
  id: string;
  full_name: string;
};

type EstateLookupRow = {
  id: string;
  estate_name: string;
};

type PlotLookupRow = {
  id: string;
  plot_number: string;
};

type RecentPaymentRow = {
  id: string;
  sale_id: string;
  amount_paid: number | string;
  payment_date: string;
  created_at: string;
};

type InvestorReturnRow = {
  id: string;
  investorName: string;
  estateName: string;
  plotNumber: string;
  returnPlan: string;
  dueDate: string;
  amountDue: number;
  statusLabel: "Overdue" | "Due today" | "Due soon" | "Upcoming";
};

type RecentActivityRow = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
};

function getSingleSearchParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function maskAccountNumber(accountNumber: string) {
  const trimmed = accountNumber.trim();

  if (trimmed.length <= 4) {
    return trimmed;
  }

  return `${"*".repeat(Math.max(trimmed.length - 4, 0))}${trimmed.slice(-4)}`;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not approved yet";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getLagosDateIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function addDaysToIso(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getMonthStartIso(todayIso: string) {
  return `${todayIso.slice(0, 7)}-01`;
}

function getDateDiffInDays(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T00:00:00.000Z`).getTime();
  const to = new Date(`${toIso}T00:00:00.000Z`).getTime();

  return Math.round((to - from) / 86_400_000);
}

function getDueDateText(dueDate: string, todayIso: string) {
  const diff = getDateDiffInDays(todayIso, dueDate);

  if (diff < 0) {
    return `Overdue since ${formatDate(dueDate)}`;
  }

  if (diff === 0) {
    return `${formatDate(dueDate)} · today`;
  }

  if (diff === 1) {
    return `${formatDate(dueDate)} · tomorrow`;
  }

  return `${formatDate(dueDate)} · in ${diff} days`;
}

function getInvestorReturnStatus(
  dueDate: string,
  todayIso: string,
): InvestorReturnRow["statusLabel"] {
  const diff = getDateDiffInDays(todayIso, dueDate);

  if (diff < 0) {
    return "Overdue";
  }

  if (diff === 0) {
    return "Due today";
  }

  if (diff <= 7) {
    return "Due soon";
  }

  return "Upcoming";
}

function getPayoutCopy(state: PayoutDashboardState) {
  if (state === "verified") {
    return {
      badge: "Ready",
      badgeTone: "success" as const,
      title: "Payment account ready",
      description:
        "Buyer payment links are available. Sale payments can be routed to your approved bank account.",
      iconTone: "bg-success-soft text-success",
    };
  }

  if (state === "unverified") {
    return {
      badge: "Under review",
      badgeTone: "warning" as const,
      title: "Bank account under review",
      description:
        "You can keep managing estates and sales. Payment links unlock after approval.",
      iconTone: "bg-warning-soft text-warning",
    };
  }

  if (state === "failed") {
    return {
      badge: "Needs correction",
      badgeTone: "danger" as const,
      title: "Bank account needs correction",
      description: "Update your bank details before sending payment links.",
      iconTone: "bg-danger-soft text-danger",
    };
  }

  return {
    badge: "Action needed",
    badgeTone: "warning" as const,
    title: "Add bank account",
    description:
      "Add the bank account where buyer payments should be settled before sending payment links.",
    iconTone: "bg-primary-soft text-primary",
  };
}

async function getExactCount(query: PromiseLike<CountQueryResult>) {
  const result = await query;

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function toLookupMap<TRow extends { id: string }>(rows: TRow[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

async function getDashboardMetrics(params: {
  developerAccountId: string;
}): Promise<DashboardMetric> {
  const supabase = createSupabaseAdminClient();
  const todayIso = getLagosDateIso();
  const monthStartIso = getMonthStartIso(todayIso);

  const [
    estateCount,
    totalPlots,
    availablePlots,
    activeSales,
    investorCount,
    paymentsToday,
    paymentsThisMonthResult,
  ] = await Promise.all([
    getExactCount(
      supabase
        .from("developer_estates")
        .select("id", { count: "exact", head: true })
        .eq("developer_account_id", params.developerAccountId),
    ),
    getExactCount(
      supabase
        .from("developer_plots")
        .select("id", { count: "exact", head: true })
        .eq("developer_account_id", params.developerAccountId),
    ),
    getExactCount(
      supabase
        .from("developer_plots")
        .select("id", { count: "exact", head: true })
        .eq("developer_account_id", params.developerAccountId)
        .eq("status", "available"),
    ),
    getExactCount(
      supabase
        .from("developer_sales")
        .select("id", { count: "exact", head: true })
        .eq("developer_account_id", params.developerAccountId)
        .eq("status", "active"),
    ),
    getExactCount(
      supabase
        .from("developer_buyers")
        .select("id", { count: "exact", head: true })
        .eq("developer_account_id", params.developerAccountId),
    ),
    getExactCount(
      supabase
        .from("developer_sale_payments")
        .select("id", { count: "exact", head: true })
        .eq("developer_account_id", params.developerAccountId)
        .eq("status", "posted")
        .eq("payment_date", todayIso),
    ),
    supabase
      .from("developer_sale_payments")
      .select("amount_paid")
      .eq("developer_account_id", params.developerAccountId)
      .eq("status", "posted")
      .gte("payment_date", monthStartIso)
      .returns<SalePaymentAmountRow[]>(),
  ]);

  if (paymentsThisMonthResult.error) {
    throw paymentsThisMonthResult.error;
  }

  const salesReceivedThisMonth = (paymentsThisMonthResult.data ?? []).reduce(
    (total, row) => total + Number(row.amount_paid ?? 0),
    0,
  );

  return {
    estateCount,
    totalPlots,
    availablePlots,
    activeSales,
    investorCount,
    salesReceivedThisMonth,
    paymentsReceivedToday: paymentsToday,
  };
}

async function getLookupRows(params: {
  developerAccountId: string;
  saleIds: string[];
}) {
  const supabase = createSupabaseAdminClient();

  if (params.saleIds.length === 0) {
    return {
      salesById: new Map<string, SaleLookupRow>(),
      buyersById: new Map<string, BuyerLookupRow>(),
      estatesById: new Map<string, EstateLookupRow>(),
      plotsById: new Map<string, PlotLookupRow>(),
    };
  }

  const salesResult = await supabase
    .from("developer_sales")
    .select("id, buyer_id, estate_id, plot_id")
    .eq("developer_account_id", params.developerAccountId)
    .in("id", params.saleIds)
    .returns<SaleLookupRow[]>();

  if (salesResult.error) {
    throw salesResult.error;
  }

  const sales = salesResult.data ?? [];
  const buyerIds = unique(sales.map((sale) => sale.buyer_id));
  const estateIds = unique(sales.map((sale) => sale.estate_id));
  const plotIds = unique(sales.map((sale) => sale.plot_id));

  const [buyersResult, estatesResult, plotsResult] = await Promise.all([
    buyerIds.length > 0
      ? supabase
          .from("developer_buyers")
          .select("id, full_name")
          .eq("developer_account_id", params.developerAccountId)
          .in("id", buyerIds)
          .returns<BuyerLookupRow[]>()
      : Promise.resolve({ data: [], error: null }),
    estateIds.length > 0
      ? supabase
          .from("developer_estates")
          .select("id, estate_name")
          .eq("developer_account_id", params.developerAccountId)
          .in("id", estateIds)
          .returns<EstateLookupRow[]>()
      : Promise.resolve({ data: [], error: null }),
    plotIds.length > 0
      ? supabase
          .from("developer_plots")
          .select("id, plot_number")
          .eq("developer_account_id", params.developerAccountId)
          .in("id", plotIds)
          .returns<PlotLookupRow[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (buyersResult.error) {
    throw buyersResult.error;
  }

  if (estatesResult.error) {
    throw estatesResult.error;
  }

  if (plotsResult.error) {
    throw plotsResult.error;
  }

  return {
    salesById: toLookupMap(sales),
    buyersById: toLookupMap(buyersResult.data ?? []),
    estatesById: toLookupMap(estatesResult.data ?? []),
    plotsById: toLookupMap(plotsResult.data ?? []),
  };
}

async function getInvestorReturnRows(params: {
  developerAccountId: string;
}): Promise<InvestorReturnRow[]> {
  const supabase = createSupabaseAdminClient();
  const todayIso = getLagosDateIso();
  const dueWindowEndIso = addDaysToIso(todayIso, 14);

  const scheduleResult = await supabase
    .from("developer_payment_schedule_items")
    .select(
      "id, sale_id, label, due_date, expected_amount, amount_paid, status",
    )
    .eq("developer_account_id", params.developerAccountId)
    .in("status", ["pending", "part_paid"])
    .lte("due_date", dueWindowEndIso)
    .order("due_date", { ascending: true })
    .limit(50)
    .returns<ScheduleItemRow[]>();

  if (scheduleResult.error) {
    throw scheduleResult.error;
  }

  const scheduleRows = scheduleResult.data ?? [];
  const saleIds = unique(scheduleRows.map((row) => row.sale_id));
  const { salesById, buyersById, estatesById, plotsById } = await getLookupRows(
    {
      developerAccountId: params.developerAccountId,
      saleIds,
    },
  );

  return scheduleRows
    .map((row) => {
      const sale = salesById.get(row.sale_id);
      const buyer = sale ? buyersById.get(sale.buyer_id) : null;
      const estate = sale ? estatesById.get(sale.estate_id) : null;
      const plot = sale ? plotsById.get(sale.plot_id) : null;
      const expectedAmount = Number(row.expected_amount);
      const amountPaid = Number(row.amount_paid);
      const amountDue = Math.max(expectedAmount - amountPaid, 0);

      return {
        id: row.id,
        investorName: buyer?.full_name ?? "Investor",
        estateName: estate?.estate_name ?? "Estate",
        plotNumber: plot?.plot_number ?? "Plot",
        returnPlan: row.label,
        dueDate: row.due_date,
        amountDue,
        statusLabel: getInvestorReturnStatus(row.due_date, todayIso),
      };
    })
    .filter((row) => row.amountDue > 0);
}

async function getRecentActivityRows(params: {
  developerAccountId: string;
}): Promise<RecentActivityRow[]> {
  const supabase = createSupabaseAdminClient();

  const paymentsResult = await supabase
    .from("developer_sale_payments")
    .select("id, sale_id, amount_paid, payment_date, created_at")
    .eq("developer_account_id", params.developerAccountId)
    .eq("status", "posted")
    .order("created_at", { ascending: false })
    .limit(4)
    .returns<RecentPaymentRow[]>();

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  const payments = paymentsResult.data ?? [];
  const saleIds = unique(payments.map((payment) => payment.sale_id));
  const { salesById, buyersById, estatesById, plotsById } = await getLookupRows(
    {
      developerAccountId: params.developerAccountId,
      saleIds,
    },
  );

  return payments.map((payment) => {
    const sale = salesById.get(payment.sale_id);
    const buyer = sale ? buyersById.get(sale.buyer_id) : null;
    const estate = sale ? estatesById.get(sale.estate_id) : null;
    const plot = sale ? plotsById.get(sale.plot_id) : null;
    const investorName = buyer?.full_name ?? "Investor";
    const plotLabel = plot?.plot_number ? `Plot ${plot.plot_number}` : "Plot";
    const estateLabel = estate?.estate_name ?? "Estate";

    return {
      id: payment.id,
      title: `Payment received from ${investorName}`,
      description: `${plotLabel} · ${estateLabel}`,
      amount: Number(payment.amount_paid),
      createdAt: payment.created_at,
    };
  });
}

function PayoutAccountSummary({
  state,
  bankName,
  accountNumber,
  accountName,
  verifiedAt,
}: {
  state: PayoutDashboardState;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  verifiedAt?: string | null;
}) {
  if (!bankName || !accountNumber || !accountName) {
    return (
      <div className="rounded-button bg-background p-5">
        <p className="text-sm font-bold leading-6 text-text-muted">
          No bank account has been submitted yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Bank
        </p>
        <p className="mt-2 font-black text-text-strong">{bankName}</p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Account number
        </p>
        <p className="mt-2 font-black text-text-strong">
          {maskAccountNumber(accountNumber)}
        </p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Account name
        </p>
        <p className="mt-2 font-black text-text-strong">{accountName}</p>
      </div>

      <div className="rounded-button bg-background p-4">
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Approval
        </p>
        <p className="mt-2 font-black text-text-strong">
          {state === "verified"
            ? formatDateTime(verifiedAt ?? null)
            : "Not approved yet"}
        </p>
      </div>
    </div>
  );
}

function OverviewStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="min-w-0 border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
      <p className="text-xs font-black uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-black text-text-strong">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 truncate text-xs font-semibold text-text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function InvestorStatusBadge({
  status,
}: {
  status: InvestorReturnRow["statusLabel"];
}) {
  const className =
    status === "Overdue"
      ? "bg-danger-soft text-danger"
      : status === "Due today" || status === "Due soon"
        ? "bg-warning-soft text-warning"
        : "bg-surface text-text-muted";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-black ${className}`}
    >
      {status}
    </span>
  );
}

export default async function DeveloperDashboardPage({
  searchParams,
}: DeveloperDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeSection = getSingleSearchParam(resolvedSearchParams.section);

  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();

  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  const payoutState = account
    ? await getDeveloperPayoutAccountState({
        supabase,
        developerAccountId: account.id,
      })
    : {
        state: "missing" as const,
        paystackAccount: null,
      };

  const shouldShowBankForm =
    payoutState.state === "missing" || payoutState.state === "failed";
  const isSettingsSection = activeSection === "settings";
  const payoutCopy = getPayoutCopy(payoutState.state);

  const [banks, documentSettings, metrics, investorReturns, recentActivity] =
    await Promise.all([
      isSettingsSection && shouldShowBankForm
        ? getPaystackBanksForDeveloperSetup()
        : [],
      isSettingsSection
        ? getDeveloperDocumentTemplateSettingsForCurrentDeveloper()
        : null,
      account
        ? getDashboardMetrics({ developerAccountId: account.id })
        : Promise.resolve({
            estateCount: 0,
            totalPlots: 0,
            availablePlots: 0,
            activeSales: 0,
            investorCount: 0,
            salesReceivedThisMonth: 0,
            paymentsReceivedToday: 0,
          }),
      account
        ? getInvestorReturnRows({ developerAccountId: account.id })
        : Promise.resolve([]),
      account
        ? getRecentActivityRows({ developerAccountId: account.id })
        : Promise.resolve([]),
    ]);

  if (isSettingsSection) {
    return (
      <div className="space-y-7">
        <PageHeader
          title="Settings"
          description="Manage payment setup and document settings inside your workspace."
        />

        <section
          id="payout-account"
          className="scroll-mt-24 rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-7"
        >
          <div className="flex flex-col gap-4 border-b border-border-soft pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${payoutCopy.iconTone}`}
              >
                <CreditCard aria-hidden="true" size={24} strokeWidth={2.6} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-primary">
                  Payment setup
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
                  Bank account for buyer payments
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
                  Add the bank account where you want to receive buyer payments.
                  Buyer payment links stay locked until this account is
                  approved.
                </p>
              </div>
            </div>

            <Badge tone={payoutCopy.badgeTone}>{payoutCopy.badge}</Badge>
          </div>

          <div className="mt-5">
            <PayoutAccountSummary
              state={payoutState.state}
              bankName={payoutState.paystackAccount?.bank_name}
              accountNumber={payoutState.paystackAccount?.account_number}
              accountName={payoutState.paystackAccount?.account_name}
              verifiedAt={payoutState.paystackAccount?.verified_at}
            />
          </div>

          <div className="mt-5 rounded-button bg-primary-soft px-4 py-3 text-sm font-bold leading-6 text-text-strong">
            {payoutCopy.description}
          </div>
        </section>

        {shouldShowBankForm ? (
          <section className="rounded-card border border-border-soft bg-white p-5 shadow-card sm:p-7">
            <div className="border-b border-border-soft pb-5">
              <h2 className="text-xl font-black tracking-tight text-text-strong">
                {payoutState.state === "failed"
                  ? "Submit corrected bank details"
                  : "Add bank account"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-text-muted">
                Enter the bank account where your buyer payments should be
                received. Piedras will confirm the account name before saving it
                for review.
              </p>
            </div>

            <div className="mt-6">
              <DeveloperPayoutSetupForm banks={banks} />
            </div>
          </section>
        ) : null}

        {documentSettings ? (
          <>
            <SectionCard
              title="Sale documents"
              description="These are the standard documents Piedras helps you organize for each sale."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {documentSettings.documentDefinitions.map((document) => (
                  <div
                    key={document.type}
                    className="rounded-button border border-border-soft bg-background p-4"
                  >
                    <p className="font-black text-text-strong">
                      {document.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                      {document.description}
                    </p>
                    <p className="mt-3 text-xs font-black uppercase tracking-wide text-primary">
                      {document.defaultPortalStatus}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Document auto-fill fields"
              description="Piedras can automatically fill investor, estate, plot, sale, and payment details into your document templates."
            >
              <div className="flex flex-wrap gap-2">
                {DEVELOPER_TEMPLATE_PLACEHOLDERS.map((placeholder) => (
                  <span
                    key={placeholder}
                    className="rounded-full bg-primary-soft px-3 py-1 text-xs font-black text-primary"
                  >
                    {placeholder}
                  </span>
                ))}
              </div>
            </SectionCard>

            <div className="space-y-5">
              {documentSettings.editableTemplates.map((template) => (
                <DeveloperDocumentTemplateForm
                  key={template.templateType}
                  template={template}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  const todayIso = getLagosDateIso();
  const overdueReturns = investorReturns.filter(
    (row) => row.statusLabel === "Overdue",
  );
  const dueThisWeekReturns = investorReturns.filter(
    (row) => row.statusLabel === "Due today" || row.statusLabel === "Due soon",
  );
  const overdueAmount = overdueReturns.reduce(
    (total, row) => total + row.amountDue,
    0,
  );
  const dueThisWeekAmount = dueThisWeekReturns.reduce(
    (total, row) => total + row.amountDue,
    0,
  );
  const firstName = developer.fullName.trim().split(/\s+/)[0] || "Developer";

  return (
    <>
      <DeveloperBankSetupToast state={payoutState.state} />

      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-text-muted">
              Welcome back, {firstName}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
              Overview
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/developer/sales"
              className="inline-flex min-h-10 items-center gap-2 rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-primary-soft hover:text-primary"
            >
              <ShoppingBag aria-hidden="true" size={18} strokeWidth={2.6} />
              Record sale
            </Link>

            <Link
              href="/developer/sales"
              className="inline-flex min-h-10 items-center gap-2 rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-primary-soft hover:text-primary"
            >
              <Link2 aria-hidden="true" size={18} strokeWidth={2.6} />
              Send payment link
            </Link>

            <Link
              href="/developer/estates"
              className="inline-flex min-h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white shadow-soft transition hover:bg-primary-hover"
            >
              <Building2 aria-hidden="true" size={18} strokeWidth={2.6} />
              Add estate
            </Link>
          </div>
        </div>

        <section className="rounded-card border border-border-soft bg-white p-4 shadow-card">
          <div className="grid gap-4 md:grid-cols-4">
            <OverviewStat
              label="Estates selling"
              value={String(metrics.estateCount)}
              helper="Across all projects"
            />
            <OverviewStat
              label="Available plots"
              value={String(metrics.availablePlots)}
              helper={`${metrics.totalPlots} total plots`}
            />
            <OverviewStat
              label="Active sales"
              value={String(metrics.activeSales)}
              helper={`${metrics.investorCount} investors on record`}
            />
            <OverviewStat
              label="Received this month"
              value={formatNaira(metrics.salesReceivedThisMonth)}
              helper={`${metrics.paymentsReceivedToday} payments today`}
            />
          </div>
        </section>

        <section className="space-y-3">
          {overdueReturns.length > 0 || payoutState.state !== "verified" ? (
            <div className="flex flex-col gap-3 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-danger">
                  <AlertTriangle
                    aria-hidden="true"
                    size={18}
                    strokeWidth={2.7}
                  />
                </div>

                <div className="min-w-0">
                  <p className="font-black text-danger">Needs attention</p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-danger">
                    {overdueReturns.length > 0
                      ? `${overdueReturns.length} investor return${
                          overdueReturns.length === 1 ? "" : "s"
                        } overdue · ${formatNaira(overdueAmount)} due`
                      : "Bank account setup is pending"}
                    {overdueReturns.length > 0 &&
                    payoutState.state !== "verified"
                      ? " · Bank account setup is pending"
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {overdueReturns.length > 0 ? (
                  <Link
                    href="/developer/investors"
                    className="inline-flex min-h-10 items-center justify-center rounded-button bg-white px-4 text-sm font-extrabold text-danger ring-1 ring-danger/20 transition hover:bg-danger/5"
                  >
                    View investors
                  </Link>
                ) : null}

                {payoutState.state !== "verified" ? (
                  <Link
                    href="/developer?section=settings#payout-account"
                    className="inline-flex min-h-10 items-center justify-center rounded-button bg-white px-4 text-sm font-extrabold text-danger ring-1 ring-danger/20 transition hover:bg-danger/5"
                  >
                    Add bank account
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-card border border-success/20 bg-success-soft px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-success">
                <CheckCircle2 aria-hidden="true" size={18} strokeWidth={2.7} />
              </div>

              <div>
                <p className="font-black text-success">
                  Today`&apos;`s activity
                </p>
                <p className="mt-1 text-sm font-semibold leading-5 text-success">
                  {metrics.paymentsReceivedToday} payment
                  {metrics.paymentsReceivedToday === 1 ? "" : "s"} received
                  today
                  {metrics.paymentsReceivedToday > 0
                    ? ` · ${formatNaira(metrics.salesReceivedThisMonth)} received this month`
                    : ""}
                </p>
              </div>
            </div>

            <Link
              href="/developer/sales"
              className="inline-flex min-h-10 items-center justify-center text-sm font-extrabold text-success transition hover:text-success/80"
            >
              View sales
              <ArrowRight
                aria-hidden="true"
                className="ml-2"
                size={16}
                strokeWidth={2.7}
              />
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-border-soft px-5 py-4">
            <div>
              <h2 className="font-black text-text-strong">
                Investor returns due soon
              </h2>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                Prioritised by due date across all estates.
              </p>
            </div>

            <Link
              href="/developer/investors"
              className="hidden items-center text-sm font-extrabold text-primary transition hover:text-primary-hover sm:inline-flex"
            >
              View all
              <ArrowRight
                aria-hidden="true"
                className="ml-2"
                size={16}
                strokeWidth={2.7}
              />
            </Link>
          </div>

          {investorReturns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border-soft bg-background text-xs font-black uppercase tracking-wide text-text-muted">
                    <th className="px-5 py-3">Investor</th>
                    <th className="px-5 py-3">Estate / Plot</th>
                    <th className="px-5 py-3">Return plan</th>
                    <th className="px-5 py-3">Due date</th>
                    <th className="px-5 py-3 text-right">Amount due</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {investorReturns.slice(0, 6).map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border-soft last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-black text-text-strong">
                          {row.investorName}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-text-strong">
                          {row.estateName}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-text-muted">
                          Plot {row.plotNumber}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-text-muted">
                        {row.returnPlan}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-text-muted">
                        {getDueDateText(row.dueDate, todayIso)}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-text-strong">
                        {formatNaira(row.amountDue)}
                      </td>
                      <td className="px-5 py-4">
                        <InvestorStatusBadge status={row.statusLabel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <CalendarClock
                aria-hidden="true"
                className="mx-auto text-text-muted"
                size={32}
                strokeWidth={2.4}
              />
              <p className="mt-3 font-black text-text-strong">
                No investor returns due soon
              </p>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                Upcoming returns will appear here when payment schedules are
                active.
              </p>
            </div>
          )}

          <div className="border-t border-border-soft px-5 py-3 text-sm font-semibold text-text-muted">
            Showing {Math.min(investorReturns.length, 6)} of{" "}
            {investorReturns.length} due return
            {investorReturns.length === 1 ? "" : "s"}
            {dueThisWeekAmount > 0
              ? ` · ${formatNaira(dueThisWeekAmount)} due this week`
              : ""}
          </div>
        </section>

        <section className="rounded-card border border-border-soft bg-white shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-border-soft px-5 py-4">
            <div>
              <h2 className="font-black text-text-strong">Recent activity</h2>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                Latest confirmed payments.
              </p>
            </div>

            <Link
              href="/developer/sales"
              className="inline-flex items-center text-sm font-extrabold text-primary transition hover:text-primary-hover"
            >
              View all
              <ArrowRight
                aria-hidden="true"
                className="ml-2"
                size={16}
                strokeWidth={2.7}
              />
            </Link>
          </div>

          {recentActivity.length > 0 ? (
            <div className="divide-y divide-border-soft">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
                    <CheckCircle2
                      aria-hidden="true"
                      size={20}
                      strokeWidth={2.7}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-text-strong">
                      {activity.title}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-text-muted">
                      {activity.description}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-black text-text-strong">
                      {formatNaira(activity.amount)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-text-muted">
                      {formatActivityTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <FileText
                aria-hidden="true"
                className="mx-auto text-text-muted"
                size={32}
                strokeWidth={2.4}
              />
              <p className="mt-3 font-black text-text-strong">
                No payment activity yet
              </p>
              <p className="mt-1 text-sm font-semibold text-text-muted">
                Confirmed payments will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
