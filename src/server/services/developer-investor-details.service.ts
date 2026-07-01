import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";

export type DeveloperInvestorDetailStatus =
  | "Overdue"
  | "Due today"
  | "Due soon"
  | "Upcoming"
  | "Paid"
  | "Cancelled";

export type DeveloperInvestorDetail = {
  investor: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    email: string | null;
    status: string;
    notes: string | null;
    createdAt: string;
  };
  summary: {
    investmentCount: number;
    activeInvestmentCount: number;
    totalPrincipal: number;
    totalExpectedReturn: number;
    totalMaturityValue: number;
    totalPendingPayout: number;
    overduePayoutCount: number;
  };
  investments: DeveloperInvestorInvestmentDetail[];
  payouts: DeveloperInvestorPayoutDetail[];
  events: DeveloperInvestorPayoutEventDetail[];
};

export type DeveloperInvestorInvestmentDetail = {
  id: string;
  planId: string | null;
  planName: string | null;
  title: string;
  principalAmount: number;
  expectedReturnAmount: number;
  maturityTotalAmount: number;
  startDate: string;
  maturityDate: string;
  status: string;
};

export type DeveloperInvestorPayoutDetail = {
  id: string;
  investmentId: string | null;
  investmentTitle: string | null;
  payoutLabel: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: "pending" | "part_paid" | "paid" | "cancelled";
  displayStatus: DeveloperInvestorDetailStatus;
  paidAt: string | null;
  paymentChannel: string | null;
  paymentReference: string | null;
  notes: string | null;
  payoutType: "return" | "capital_plus_return";
};

export type DeveloperInvestorPayoutEventDetail = {
  id: string;
  payoutId: string;
  eventType: "marked_paid" | "note";
  eventTitle: string;
  eventNote: string | null;
  amountDue: number;
  amountPaid: number;
  paymentChannel: string | null;
  paymentReference: string | null;
  eventDate: string;
  createdAt: string;
};

export type MarkInvestorPayoutPaidResult = {
  payoutId: string;
  investorId: string;
  investorName: string;
  investorPhoneNumber: string | null;
  amountPaid: number;
  paymentDate: string;
  paymentReference: string;
};

type InvestorRow = {
  id: string;
  developer_account_id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type InvestmentRow = {
  id: string;
  investment_plan_id: string | null;
  investment_title: string;
  principal_amount: number | string;
  expected_return_amount: number | string;
  maturity_total_amount: number | string;
  start_date: string;
  maturity_date: string;
  status: string;
};

type PayoutRow = {
  id: string;
  investment_id: string | null;
  payout_label: string;
  due_date: string;
  amount_due: number | string;
  amount_paid: number | string;
  status: "pending" | "part_paid" | "paid" | "cancelled";
  paid_at: string | null;
  payment_channel: string | null;
  payment_reference: string | null;
  notes: string | null;
  payout_type: "return" | "capital_plus_return";
};

type PayoutForPaymentRow = {
  id: string;
  developer_account_id: string;
  investor_id: string;
  payout_label: string;
  amount_due: number | string;
  amount_paid: number | string;
  status: "pending" | "part_paid" | "paid" | "cancelled";
};

type PayoutEventRow = {
  id: string;
  payout_id: string;
  event_type: "marked_paid" | "note";
  event_title: string;
  event_note: string | null;
  amount_due: number | string;
  amount_paid: number | string;
  payment_channel: string | null;
  payment_reference: string | null;
  event_date: string;
  created_at: string;
};

type PlanRow = {
  id: string;
  plan_name: string;
};

function toNumber(value: number | string | null) {
  return Number(value ?? 0);
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getDateDiffInDays(fromIso: string, toIso: string) {
  const fromDate = new Date(`${fromIso}T00:00:00.000Z`);
  const toDate = new Date(`${toIso}T00:00:00.000Z`);

  return Math.round(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getPayoutDisplayStatus(
  payout: Pick<PayoutRow, "status" | "due_date">,
): DeveloperInvestorDetailStatus {
  if (payout.status === "paid") {
    return "Paid";
  }

  if (payout.status === "cancelled") {
    return "Cancelled";
  }

  const diff = getDateDiffInDays(getTodayIso(), payout.due_date);

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

function sortPayouts(
  payouts: DeveloperInvestorPayoutDetail[],
): DeveloperInvestorPayoutDetail[] {
  const priority: Record<DeveloperInvestorDetailStatus, number> = {
    Overdue: 0,
    "Due today": 1,
    "Due soon": 2,
    Upcoming: 3,
    Paid: 4,
    Cancelled: 5,
  };

  return [...payouts].sort((left, right) => {
    const statusDiff =
      priority[left.displayStatus] - priority[right.displayStatus];

    if (statusDiff !== 0) {
      return statusDiff;
    }

    return left.dueDate.localeCompare(right.dueDate);
  });
}

async function getInvestor(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  investorId: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_investors")
    .select(
      `
        id,
        developer_account_id,
        full_name,
        phone_number,
        email,
        status,
        notes,
        created_at
      `,
    )
    .eq("developer_account_id", params.developerAccountId)
    .eq("id", params.investorId)
    .maybeSingle<InvestorRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError(
      "INVESTOR_NOT_FOUND",
      "Investor record was not found.",
      404,
    );
  }

  return data;
}

async function getInvestments(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  investorId: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_investor_investments")
    .select(
      `
        id,
        investment_plan_id,
        investment_title,
        principal_amount,
        expected_return_amount,
        maturity_total_amount,
        start_date,
        maturity_date,
        status
      `,
    )
    .eq("developer_account_id", params.developerAccountId)
    .eq("investor_id", params.investorId)
    .order("created_at", { ascending: false })
    .returns<InvestmentRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getPayouts(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  investorId: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_investor_payouts")
    .select(
      `
        id,
        investment_id,
        payout_label,
        due_date,
        amount_due,
        amount_paid,
        status,
        paid_at,
        payment_channel,
        payment_reference,
        notes,
        payout_type
      `,
    )
    .eq("developer_account_id", params.developerAccountId)
    .eq("investor_id", params.investorId)
    .order("due_date", { ascending: true })
    .returns<PayoutRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getEvents(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  investorId: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_investor_payout_events")
    .select(
      `
        id,
        payout_id,
        event_type,
        event_title,
        event_note,
        amount_due,
        amount_paid,
        payment_channel,
        payment_reference,
        event_date,
        created_at
      `,
    )
    .eq("developer_account_id", params.developerAccountId)
    .eq("investor_id", params.investorId)
    .order("created_at", { ascending: false })
    .returns<PayoutEventRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getPlans(params: {
  supabase: SupabaseClient;
  planIds: string[];
}) {
  if (params.planIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await params.supabase
    .from("developer_investment_plans")
    .select("id, plan_name")
    .in("id", params.planIds)
    .returns<PlanRow[]>();

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((plan) => [plan.id, plan.plan_name]));
}

function validatePaymentDate(paymentDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    throw new AppError(
      "PAYOUT_PAYMENT_DATE_INVALID",
      "Enter a valid payment date.",
      400,
    );
  }

  return paymentDate;
}

function validatePaymentChannel(paymentChannel: string) {
  const allowedChannels = new Set(["bank_transfer", "cheque", "cash", "other"]);

  if (!allowedChannels.has(paymentChannel)) {
    throw new AppError(
      "PAYOUT_PAYMENT_CHANNEL_INVALID",
      "Select a valid payment channel.",
      400,
    );
  }

  return paymentChannel;
}

export async function getDeveloperInvestorDetail(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  investorId: string;
}): Promise<DeveloperInvestorDetail> {
  const investor = await getInvestor(params);

  const [investments, payouts, events] = await Promise.all([
    getInvestments(params),
    getPayouts(params),
    getEvents(params),
  ]);

  const planIds = investments
    .map((investment) => investment.investment_plan_id)
    .filter((planId): planId is string => Boolean(planId));

  const planNames = await getPlans({
    supabase: params.supabase,
    planIds: [...new Set(planIds)],
  });

  const investmentTitleById = new Map(
    investments.map((investment) => [
      investment.id,
      investment.investment_title,
    ]),
  );

  const investmentDetails = investments.map((investment) => ({
    id: investment.id,
    planId: investment.investment_plan_id,
    planName: investment.investment_plan_id
      ? (planNames.get(investment.investment_plan_id) ?? null)
      : null,
    title: investment.investment_title,
    principalAmount: toNumber(investment.principal_amount),
    expectedReturnAmount: toNumber(investment.expected_return_amount),
    maturityTotalAmount: toNumber(investment.maturity_total_amount),
    startDate: investment.start_date,
    maturityDate: investment.maturity_date,
    status: investment.status,
  }));

  const payoutDetails = sortPayouts(
    payouts.map((payout) => ({
      id: payout.id,
      investmentId: payout.investment_id,
      investmentTitle: payout.investment_id
        ? (investmentTitleById.get(payout.investment_id) ?? null)
        : null,
      payoutLabel: payout.payout_label,
      dueDate: payout.due_date,
      amountDue: toNumber(payout.amount_due),
      amountPaid: toNumber(payout.amount_paid),
      status: payout.status,
      displayStatus: getPayoutDisplayStatus(payout),
      paidAt: payout.paid_at,
      paymentChannel: payout.payment_channel,
      paymentReference: payout.payment_reference,
      notes: payout.notes,
      payoutType: payout.payout_type,
    })),
  );

  const eventDetails = events.map((event) => ({
    id: event.id,
    payoutId: event.payout_id,
    eventType: event.event_type,
    eventTitle: event.event_title,
    eventNote: event.event_note,
    amountDue: toNumber(event.amount_due),
    amountPaid: toNumber(event.amount_paid),
    paymentChannel: event.payment_channel,
    paymentReference: event.payment_reference,
    eventDate: event.event_date,
    createdAt: event.created_at,
  }));

  const unpaidPayouts = payoutDetails.filter(
    (payout) => payout.status !== "paid" && payout.status !== "cancelled",
  );

  return {
    investor: {
      id: investor.id,
      fullName: investor.full_name,
      phoneNumber: investor.phone_number,
      email: investor.email,
      status: investor.status,
      notes: investor.notes,
      createdAt: investor.created_at,
    },
    summary: {
      investmentCount: investmentDetails.length,
      activeInvestmentCount: investmentDetails.filter(
        (investment) => investment.status === "active",
      ).length,
      totalPrincipal: investmentDetails.reduce(
        (total, investment) => total + investment.principalAmount,
        0,
      ),
      totalExpectedReturn: investmentDetails.reduce(
        (total, investment) => total + investment.expectedReturnAmount,
        0,
      ),
      totalMaturityValue: investmentDetails.reduce(
        (total, investment) => total + investment.maturityTotalAmount,
        0,
      ),
      totalPendingPayout: unpaidPayouts.reduce(
        (total, payout) => total + payout.amountDue,
        0,
      ),
      overduePayoutCount: payoutDetails.filter(
        (payout) => payout.displayStatus === "Overdue",
      ).length,
    },
    investments: investmentDetails,
    payouts: payoutDetails,
    events: eventDetails,
  };
}

export async function markDeveloperInvestorPayoutPaid(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  profileId: string;
  payoutId: string;
  paymentDate: string;
  paymentChannel: string;
  paymentReference: string;
  note: string | null;
}): Promise<MarkInvestorPayoutPaidResult> {
  const paymentDate = validatePaymentDate(params.paymentDate);
  const paymentChannel = validatePaymentChannel(params.paymentChannel);
  const paymentReference = params.paymentReference.trim();

  if (paymentReference.length < 2) {
    throw new AppError(
      "PAYOUT_PAYMENT_REFERENCE_REQUIRED",
      "Enter the bank reference, cheque number, or internal approval reference.",
      400,
    );
  }

  const { data: payout, error: payoutError } = await params.supabase
    .from("developer_investor_payouts")
    .select(
      `
        id,
        developer_account_id,
        investor_id,
        payout_label,
        amount_due,
        amount_paid,
        status
      `,
    )
    .eq("developer_account_id", params.developerAccountId)
    .eq("id", params.payoutId)
    .maybeSingle<PayoutForPaymentRow>();

  if (payoutError) {
    throw payoutError;
  }

  if (!payout) {
    throw new AppError(
      "PAYOUT_NOT_FOUND",
      "Investor payout was not found.",
      404,
    );
  }

  if (payout.status === "paid") {
    throw new AppError(
      "PAYOUT_ALREADY_PAID",
      "This investor payout has already been marked as paid.",
      400,
    );
  }

  if (payout.status === "cancelled") {
    throw new AppError(
      "PAYOUT_CANCELLED",
      "Cancelled payout cannot be marked as paid.",
      400,
    );
  }

  const amountDue = toNumber(payout.amount_due);

  if (amountDue <= 0) {
    throw new AppError(
      "PAYOUT_AMOUNT_INVALID",
      "Payout amount is not valid.",
      400,
    );
  }

  const investor = await getInvestor({
    supabase: params.supabase,
    developerAccountId: params.developerAccountId,
    investorId: payout.investor_id,
  });

  const paidAt = `${paymentDate}T12:00:00.000Z`;

  const { error: updateError } = await params.supabase
    .from("developer_investor_payouts")
    .update({
      amount_paid: amountDue,
      status: "paid",
      paid_at: paidAt,
      payment_channel: paymentChannel,
      payment_reference: paymentReference,
      notes: params.note,
      updated_at: new Date().toISOString(),
    })
    .eq("developer_account_id", params.developerAccountId)
    .eq("id", params.payoutId)
    .neq("status", "paid");

  if (updateError) {
    throw updateError;
  }

  const { error: eventError } = await params.supabase
    .from("developer_investor_payout_events")
    .insert({
      developer_account_id: params.developerAccountId,
      investor_id: payout.investor_id,
      payout_id: payout.id,
      event_type: "marked_paid",
      event_title: "Payout marked as paid",
      event_note: params.note,
      amount_due: amountDue,
      amount_paid: amountDue,
      payment_channel: paymentChannel,
      payment_reference: paymentReference,
      event_date: paymentDate,
      created_by_profile_id: params.profileId,
    });

  if (eventError) {
    throw eventError;
  }

  return {
    payoutId: payout.id,
    investorId: investor.id,
    investorName: investor.full_name,
    investorPhoneNumber: investor.phone_number,
    amountPaid: amountDue,
    paymentDate,
    paymentReference,
  };
}
