import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DeveloperInvestmentPlanRow = {
  id: string;
  developer_account_id: string;
  plan_name: string;
  plan_slug: string;
  summary: string | null;
  description: string | null;
  minimum_amount: number | string;
  maximum_amount: number | string | null;
  return_type: "percentage" | "fixed";
  return_rate_percent: number | string | null;
  fixed_return_amount: number | string | null;
  duration_months: number;
  payout_frequency: "maturity" | "monthly" | "quarterly" | "biannual";
  status: "draft" | "active" | "paused" | "closed";
  terms: string | null;
  created_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DeveloperInvestmentPaymentLinkRow = {
  id: string;
  developer_account_id: string;
  investment_plan_id: string;
  shared_by_profile_id: string | null;
  token: string;
  status:
    | "pending"
    | "details_submitted"
    | "payment_started"
    | "paid"
    | "expired"
    | "cancelled"
    | "failed";
  created_at: string;
};

type CreateInvestmentPlanParams = {
  supabase: SupabaseClient;
  developerAccountId: string;
  profileId: string;
  planName: string;
  summary: string | null;
  description: string | null;
  minimumAmount: number;
  maximumAmount: number | null;
  returnType: "percentage" | "fixed";
  returnRatePercent: number | null;
  fixedReturnAmount: number | null;
  durationMonths: number;
  payoutFrequency: "maturity" | "monthly" | "quarterly" | "biannual";
  terms: string | null;
};

type CreateInvestmentPaymentLinkParams = {
  supabase: SupabaseClient;
  developerAccountId: string;
  profileId: string;
  investmentPlanId: string;
};

function createSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `investment-plan-${Date.now()}`;
}

function createToken() {
  return randomBytes(24).toString("hex");
}

export function formatInvestmentReturn(plan: DeveloperInvestmentPlanRow) {
  if (plan.return_type === "percentage") {
    return `${Number(plan.return_rate_percent ?? 0)}% return`;
  }

  return `Fixed return of ₦${Number(
    plan.fixed_return_amount ?? 0,
  ).toLocaleString("en-NG")}`;
}

export function formatPayoutFrequency(
  frequency: DeveloperInvestmentPlanRow["payout_frequency"],
) {
  if (frequency === "maturity") {
    return "At maturity";
  }

  if (frequency === "monthly") {
    return "Monthly";
  }

  if (frequency === "quarterly") {
    return "Quarterly";
  }

  return "Bi-annually";
}

export async function listDeveloperInvestmentPlans(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_investment_plans")
    .select(
      `
        id,
        developer_account_id,
        plan_name,
        plan_slug,
        summary,
        description,
        minimum_amount,
        maximum_amount,
        return_type,
        return_rate_percent,
        fixed_return_amount,
        duration_months,
        payout_frequency,
        status,
        terms,
        created_by_profile_id,
        created_at,
        updated_at
      `,
    )
    .eq("developer_account_id", params.developerAccountId)
    .order("created_at", { ascending: false })
    .returns<DeveloperInvestmentPlanRow[]>();

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createDeveloperInvestmentPlan(
  params: CreateInvestmentPlanParams,
) {
  const planSlug = createSlug(params.planName);

  const { data, error } = await params.supabase
    .from("developer_investment_plans")
    .insert({
      developer_account_id: params.developerAccountId,
      plan_name: params.planName.trim(),
      plan_slug: `${planSlug}-${Date.now()}`,
      summary: params.summary,
      description: params.description,
      minimum_amount: params.minimumAmount,
      maximum_amount: params.maximumAmount,
      return_type: params.returnType,
      return_rate_percent: params.returnRatePercent,
      fixed_return_amount: params.fixedReturnAmount,
      duration_months: params.durationMonths,
      payout_frequency: params.payoutFrequency,
      status: "active",
      terms: params.terms,
      created_by_profile_id: params.profileId,
    })
    .select(
      `
        id,
        developer_account_id,
        plan_name,
        plan_slug,
        summary,
        description,
        minimum_amount,
        maximum_amount,
        return_type,
        return_rate_percent,
        fixed_return_amount,
        duration_months,
        payout_frequency,
        status,
        terms,
        created_by_profile_id,
        created_at,
        updated_at
      `,
    )
    .single<DeveloperInvestmentPlanRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDeveloperInvestmentPaymentLink(
  params: CreateInvestmentPaymentLinkParams,
) {
  const { data, error } = await params.supabase
    .from("developer_investment_payment_links")
    .insert({
      developer_account_id: params.developerAccountId,
      investment_plan_id: params.investmentPlanId,
      shared_by_profile_id: params.profileId,
      token: createToken(),
      status: "pending",
    })
    .select(
      `
        id,
        developer_account_id,
        investment_plan_id,
        shared_by_profile_id,
        token,
        status,
        created_at
      `,
    )
    .single<DeveloperInvestmentPaymentLinkRow>();

  if (error) {
    throw error;
  }

  return data;
}
