import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type DeveloperInvestorReturnStatus =
  | "Overdue"
  | "Due today"
  | "Due soon"
  | "Upcoming";

export type DeveloperInvestorRowStatus =
  | "Overdue"
  | "Due soon"
  | "Upcoming"
  | "Clear";

export type DeveloperOverviewMetrics = {
  estateCount: number;
  totalPlots: number;
  availablePlots: number;
  activeSales: number;
  investorCount: number;
  salesReceivedThisMonth: number;
  paymentsReceivedToday: number;
};

export type DeveloperInvestorReturnRow = {
  id: string;
  investorName: string;
  investmentTitle: string;
  dueDate: string;
  amountDue: number;
  statusLabel: DeveloperInvestorReturnStatus;
};

export type DeveloperRecentActivityRow = {
  id: string;
  title: string;
  description: string;
  amount: number;
  createdAt: string;
};

export type DeveloperInvestorDashboardRow = {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
  status: string;
  activeInvestmentCount: number;
  totalPrincipal: number;
  totalAmountDue: number;
  nextDueDate: string | null;
  payoutStatus: DeveloperInvestorRowStatus;
};

type CountQueryResult = {
  count: number | null;
  error: unknown;
};

type SalePaymentAmountRow = {
  amount_paid: number | string | null;
};

type InvestorLookupRow = {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  status: string;
};

type InvestmentLookupRow = {
  id: string;
  investor_id: string;
  investment_title: string;
  principal_amount: number | string;
  status: string;
};

type InvestorPayoutRow = {
  id: string;
  investor_id: string;
  investment_id: string | null;
  payout_label: string;
  due_date: string;
  amount_due: number | string;
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

export function getLagosDateIso(date = new Date()) {
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

export function addDaysToIso(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function getDateDiffInDays(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T00:00:00.000Z`).getTime();
  const to = new Date(`${toIso}T00:00:00.000Z`).getTime();

  return Math.round((to - from) / 86_400_000);
}

function getMonthStartIso(todayIso: string) {
  return `${todayIso.slice(0, 7)}-01`;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function toLookupMap<TRow extends { id: string }>(rows: TRow[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

async function getExactCount(query: PromiseLike<CountQueryResult>) {
  const result = await query;

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
}

function getInvestorReturnStatus(
  dueDate: string,
  todayIso: string,
): DeveloperInvestorReturnStatus {
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

function getInvestorRowStatus(
  dueDate: string | null,
  todayIso: string,
  amountDue: number,
): DeveloperInvestorRowStatus {
  if (!dueDate || amountDue <= 0) {
    return "Clear";
  }

  const diff = getDateDiffInDays(todayIso, dueDate);

  if (diff < 0) {
    return "Overdue";
  }

  if (diff <= 7) {
    return "Due soon";
  }

  return "Upcoming";
}

export async function getDeveloperOverviewMetrics(params: {
  developerAccountId: string;
}): Promise<DeveloperOverviewMetrics> {
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
        .from("developer_investors")
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

async function getInvestorLookups(params: {
  developerAccountId: string;
  investorIds: string[];
  investmentIds: string[];
}) {
  const supabase = createSupabaseAdminClient();

  const [investorsResult, investmentsResult] = await Promise.all([
    params.investorIds.length > 0
      ? supabase
          .from("developer_investors")
          .select("id, full_name, phone_number, email, status")
          .eq("developer_account_id", params.developerAccountId)
          .in("id", params.investorIds)
          .returns<InvestorLookupRow[]>()
      : Promise.resolve({ data: [] as InvestorLookupRow[], error: null }),
    params.investmentIds.length > 0
      ? supabase
          .from("developer_investor_investments")
          .select("id, investor_id, investment_title, principal_amount, status")
          .eq("developer_account_id", params.developerAccountId)
          .in("id", params.investmentIds)
          .returns<InvestmentLookupRow[]>()
      : Promise.resolve({ data: [] as InvestmentLookupRow[], error: null }),
  ]);

  if (investorsResult.error) {
    throw investorsResult.error;
  }

  if (investmentsResult.error) {
    throw investmentsResult.error;
  }

  return {
    investorsById: toLookupMap(investorsResult.data ?? []),
    investmentsById: toLookupMap(investmentsResult.data ?? []),
  };
}

export async function getDeveloperInvestorReturnRows(params: {
  developerAccountId: string;
  daysAhead?: number;
  limit?: number;
}): Promise<DeveloperInvestorReturnRow[]> {
  const supabase = createSupabaseAdminClient();
  const todayIso = getLagosDateIso();
  const dueWindowEndIso = addDaysToIso(todayIso, params.daysAhead ?? 14);

  const payoutsResult = await supabase
    .from("developer_investor_payouts")
    .select(
      "id, investor_id, investment_id, payout_label, due_date, amount_due, amount_paid, status",
    )
    .eq("developer_account_id", params.developerAccountId)
    .in("status", ["pending", "part_paid"])
    .lte("due_date", dueWindowEndIso)
    .order("due_date", { ascending: true })
    .limit(params.limit ?? 50)
    .returns<InvestorPayoutRow[]>();

  if (payoutsResult.error) {
    throw payoutsResult.error;
  }

  const payouts = payoutsResult.data ?? [];
  const investorIds = unique(payouts.map((payout) => payout.investor_id));
  const investmentIds = unique(
    payouts
      .map((payout) => payout.investment_id)
      .filter((id): id is string => Boolean(id)),
  );

  const { investorsById, investmentsById } = await getInvestorLookups({
    developerAccountId: params.developerAccountId,
    investorIds,
    investmentIds,
  });

  return payouts
    .map((payout) => {
      const investor = investorsById.get(payout.investor_id);
      const investment = payout.investment_id
        ? investmentsById.get(payout.investment_id)
        : null;
      const amountDue = Math.max(
        Number(payout.amount_due) - Number(payout.amount_paid),
        0,
      );

      return {
        id: payout.id,
        investorName: investor?.full_name ?? "Investor",
        investmentTitle:
          investment?.investment_title ??
          payout.payout_label ??
          "Investor return",
        dueDate: payout.due_date,
        amountDue,
        statusLabel: getInvestorReturnStatus(payout.due_date, todayIso),
      };
    })
    .filter((row) => row.amountDue > 0);
}

async function getSaleLookups(params: {
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
      : Promise.resolve({ data: [] as BuyerLookupRow[], error: null }),
    estateIds.length > 0
      ? supabase
          .from("developer_estates")
          .select("id, estate_name")
          .eq("developer_account_id", params.developerAccountId)
          .in("id", estateIds)
          .returns<EstateLookupRow[]>()
      : Promise.resolve({ data: [] as EstateLookupRow[], error: null }),
    plotIds.length > 0
      ? supabase
          .from("developer_plots")
          .select("id, plot_number")
          .eq("developer_account_id", params.developerAccountId)
          .in("id", plotIds)
          .returns<PlotLookupRow[]>()
      : Promise.resolve({ data: [] as PlotLookupRow[], error: null }),
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

export async function getDeveloperRecentActivityRows(params: {
  developerAccountId: string;
}): Promise<DeveloperRecentActivityRow[]> {
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
  const { salesById, buyersById, estatesById, plotsById } =
    await getSaleLookups({
      developerAccountId: params.developerAccountId,
      saleIds,
    });

  return payments.map((payment) => {
    const sale = salesById.get(payment.sale_id);
    const buyer = sale ? buyersById.get(sale.buyer_id) : null;
    const estate = sale ? estatesById.get(sale.estate_id) : null;
    const plot = sale ? plotsById.get(sale.plot_id) : null;
    const clientName = buyer?.full_name ?? "Client";
    const plotLabel = plot?.plot_number ? `Plot ${plot.plot_number}` : "Plot";
    const estateLabel = estate?.estate_name ?? "Estate";

    return {
      id: payment.id,
      title: `Payment received from ${clientName}`,
      description: `${plotLabel} · ${estateLabel}`,
      amount: Number(payment.amount_paid),
      createdAt: payment.created_at,
    };
  });
}

export async function getDeveloperInvestorRows(params: {
  developerAccountId: string;
}): Promise<DeveloperInvestorDashboardRow[]> {
  const supabase = createSupabaseAdminClient();
  const todayIso = getLagosDateIso();

  const investorsResult = await supabase
    .from("developer_investors")
    .select("id, full_name, phone_number, email, status")
    .eq("developer_account_id", params.developerAccountId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<InvestorLookupRow[]>();

  if (investorsResult.error) {
    throw investorsResult.error;
  }

  const investors = investorsResult.data ?? [];
  const investorIds = investors.map((investor) => investor.id);

  if (investorIds.length === 0) {
    return [];
  }

  const [investmentsResult, payoutsResult] = await Promise.all([
    supabase
      .from("developer_investor_investments")
      .select("id, investor_id, investment_title, principal_amount, status")
      .eq("developer_account_id", params.developerAccountId)
      .in("investor_id", investorIds)
      .returns<InvestmentLookupRow[]>(),
    supabase
      .from("developer_investor_payouts")
      .select(
        "id, investor_id, investment_id, payout_label, due_date, amount_due, amount_paid, status",
      )
      .eq("developer_account_id", params.developerAccountId)
      .in("investor_id", investorIds)
      .in("status", ["pending", "part_paid"])
      .order("due_date", { ascending: true })
      .returns<InvestorPayoutRow[]>(),
  ]);

  if (investmentsResult.error) {
    throw investmentsResult.error;
  }

  if (payoutsResult.error) {
    throw payoutsResult.error;
  }

  const investments = investmentsResult.data ?? [];
  const payouts = payoutsResult.data ?? [];

  return investors.map((investor) => {
    const investorInvestments = investments.filter(
      (investment) => investment.investor_id === investor.id,
    );
    const investorPayouts = payouts.filter(
      (payout) => payout.investor_id === investor.id,
    );

    const totalPrincipal = investorInvestments.reduce(
      (total, investment) => total + Number(investment.principal_amount),
      0,
    );

    const totalAmountDue = investorPayouts.reduce(
      (total, payout) =>
        total +
        Math.max(Number(payout.amount_due) - Number(payout.amount_paid), 0),
      0,
    );

    const nextDueDate = investorPayouts[0]?.due_date ?? null;

    return {
      id: investor.id,
      fullName: investor.full_name,
      phoneNumber: investor.phone_number,
      email: investor.email,
      status: investor.status,
      activeInvestmentCount: investorInvestments.filter(
        (investment) => investment.status === "active",
      ).length,
      totalPrincipal,
      totalAmountDue,
      nextDueDate,
      payoutStatus: getInvestorRowStatus(nextDueDate, todayIso, totalAmountDue),
    };
  });
}
