import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";

export type DeveloperInvestmentUnpaidLead = {
  id: string;
  token: string;
  planName: string;
  fullName: string;
  phoneNumber: string | null;
  email: string | null;
  amountRequested: number;
  status: "details_submitted" | "payment_started" | "failed";
  createdAt: string;
  submittedAt: string | null;
  paymentStartedAt: string | null;
  lastActivityAt: string;
  lastFollowedUpAt: string | null;
  followUpCount: number;
};

export type PreparedInvestmentLeadFollowUp = {
  linkId: string;
  token: string;
  planName: string;
  fullName: string;
  phoneNumber: string | null;
  amountRequested: number;
};

type InvestmentPaymentLinkRow = {
  id: string;
  developer_account_id: string;
  investment_plan_id: string;
  token: string;
  investor_full_name: string | null;
  investor_phone_number: string | null;
  investor_email: string | null;
  amount_requested: number | string | null;
  status:
    | "pending"
    | "details_submitted"
    | "payment_started"
    | "paid"
    | "expired"
    | "cancelled"
    | "failed";
  created_at: string;
  submitted_at: string | null;
  payment_started_at: string | null;
  last_followed_up_at: string | null;
  lead_follow_up_count: number | null;
};

type PlanRow = {
  id: string;
  plan_name: string;
};

function toNumber(value: number | string | null) {
  return Number(value ?? 0);
}

async function getPlanNameMap(params: {
  supabase: SupabaseClient;
  planIds: string[];
}) {
  if (params.planIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await params.supabase
    .from("developer_investment_plans")
    .select("id, plan_name")
    .in("id", [...new Set(params.planIds)])
    .returns<PlanRow[]>();

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((plan) => [plan.id, plan.plan_name]));
}

function getLastActivityAt(link: InvestmentPaymentLinkRow) {
  return link.payment_started_at ?? link.submitted_at ?? link.created_at;
}

function sortUnpaidLeads(leads: DeveloperInvestmentUnpaidLead[]) {
  return [...leads].sort((left, right) => {
    if (!left.lastFollowedUpAt && right.lastFollowedUpAt) {
      return -1;
    }

    if (left.lastFollowedUpAt && !right.lastFollowedUpAt) {
      return 1;
    }

    return left.lastActivityAt.localeCompare(right.lastActivityAt);
  });
}

export async function listDeveloperInvestmentUnpaidLeads(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  limit?: number;
}): Promise<DeveloperInvestmentUnpaidLead[]> {
  const { data, error } = await params.supabase
    .from("developer_investment_payment_links")
    .select(
      `
        id,
        developer_account_id,
        investment_plan_id,
        token,
        investor_full_name,
        investor_phone_number,
        investor_email,
        amount_requested,
        status,
        created_at,
        submitted_at,
        payment_started_at,
        last_followed_up_at,
        lead_follow_up_count
      `,
    )
    .eq("developer_account_id", params.developerAccountId)
    .in("status", ["details_submitted", "payment_started", "failed"])
    .not("investor_full_name", "is", null)
    .not("amount_requested", "is", null)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 20)
    .returns<InvestmentPaymentLinkRow[]>();

  if (error) {
    throw error;
  }

  const links = data ?? [];
  const planNames = await getPlanNameMap({
    supabase: params.supabase,
    planIds: links.map((link) => link.investment_plan_id),
  });

  return sortUnpaidLeads(
    links.map((link) => ({
      id: link.id,
      token: link.token,
      planName: planNames.get(link.investment_plan_id) ?? "Investment plan",
      fullName: link.investor_full_name ?? "Investor",
      phoneNumber: link.investor_phone_number,
      email: link.investor_email,
      amountRequested: toNumber(link.amount_requested),
      status:
        link.status === "failed"
          ? "failed"
          : link.status === "details_submitted"
            ? "details_submitted"
            : "payment_started",
      createdAt: link.created_at,
      submittedAt: link.submitted_at,
      paymentStartedAt: link.payment_started_at,
      lastActivityAt: getLastActivityAt(link),
      lastFollowedUpAt: link.last_followed_up_at,
      followUpCount: link.lead_follow_up_count ?? 0,
    })),
  );
}

export async function prepareDeveloperInvestmentLeadFollowUp(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  profileId: string;
  linkId: string;
}): Promise<PreparedInvestmentLeadFollowUp> {
  const { data: link, error: linkError } = await params.supabase
    .from("developer_investment_payment_links")
    .select(
      `
        id,
        developer_account_id,
        investment_plan_id,
        token,
        investor_full_name,
        investor_phone_number,
        investor_email,
        amount_requested,
        status,
        created_at,
        submitted_at,
        payment_started_at,
        last_followed_up_at,
        lead_follow_up_count
      `,
    )
    .eq("developer_account_id", params.developerAccountId)
    .eq("id", params.linkId)
    .maybeSingle<InvestmentPaymentLinkRow>();

  if (linkError) {
    throw linkError;
  }

  if (!link) {
    throw new AppError(
      "INVESTMENT_LEAD_NOT_FOUND",
      "Investment lead was not found.",
      404,
    );
  }

  if (link.status === "paid") {
    throw new AppError(
      "INVESTMENT_LEAD_ALREADY_PAID",
      "This investor has already completed payment.",
      400,
    );
  }

  if (
    link.status !== "details_submitted" &&
    link.status !== "payment_started" &&
    link.status !== "failed"
  ) {
    throw new AppError(
      "INVESTMENT_LEAD_NOT_READY",
      "This investor has not submitted payment details yet.",
      400,
    );
  }

  if (!link.investor_full_name || !link.amount_requested) {
    throw new AppError(
      "INVESTMENT_LEAD_INCOMPLETE",
      "Investor details are incomplete.",
      400,
    );
  }

  const planNames = await getPlanNameMap({
    supabase: params.supabase,
    planIds: [link.investment_plan_id],
  });

  const { error: updateError } = await params.supabase
    .from("developer_investment_payment_links")
    .update({
      lead_follow_up_count: (link.lead_follow_up_count ?? 0) + 1,
      last_followed_up_at: new Date().toISOString(),
      last_followed_up_by_profile_id: params.profileId,
    })
    .eq("developer_account_id", params.developerAccountId)
    .eq("id", link.id)
    .neq("status", "paid");

  if (updateError) {
    throw updateError;
  }

  return {
    linkId: link.id,
    token: link.token,
    planName: planNames.get(link.investment_plan_id) ?? "Investment plan",
    fullName: link.investor_full_name,
    phoneNumber: link.investor_phone_number,
    amountRequested: toNumber(link.amount_requested),
  };
}
