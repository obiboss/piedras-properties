import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/server/errors/app-error";
import { assertDeveloperPayoutAccountVerified } from "@/server/services/developer-payout.service";
import {
  assertPaystackAmountMatchesExpected,
  convertKoboToNaira,
  convertNairaToKobo,
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "@/server/services/paystack.service";

export type PublicInvestmentPlan = {
  id: string;
  developer_account_id: string;
  plan_name: string;
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
};

export type PublicInvestmentPaymentLink = {
  id: string;
  developer_account_id: string;
  investment_plan_id: string;
  shared_by_profile_id: string | null;
  token: string;
  investor_full_name: string | null;
  investor_phone_number: string | null;
  investor_email: string | null;
  amount_requested: number | string | null;
  amount_paid: number | string | null;
  paystack_reference: string | null;
  paystack_authorization_url: string | null;
  status:
    | "pending"
    | "details_submitted"
    | "payment_started"
    | "paid"
    | "expired"
    | "cancelled"
    | "failed";
  expires_at: string | null;
  submitted_at: string | null;
  payment_started_at: string | null;
  paid_at: string | null;
  investor_id: string | null;
  investment_id: string | null;
  receipt_id: string | null;
};

export type PublicInvestmentPageData = {
  companyName: string;
  link: PublicInvestmentPaymentLink;
  plan: PublicInvestmentPlan;
};

type DeveloperAccountRow = {
  id: string;
  company_name: string;
};

type InvestorRow = {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
};

type PaymentLinkLookupRow = PublicInvestmentPaymentLink;

type PaystackVerifiedTransaction = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
};

type FinalizedInvestmentPayment = {
  investorId: string;
  investmentId: string;
  amountPaid: number;
  maturityDate: string;
};

function createInvestmentReference() {
  return `piedras_inv_${randomBytes(16).toString("hex")}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function requireValidEmail(email: string) {
  const normalized = normalizeEmail(email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError(
      "INVESTOR_EMAIL_INVALID",
      "Enter a valid email address.",
      400,
    );
  }

  return normalized;
}

function requireValidPhone(phoneNumber: string) {
  const trimmed = phoneNumber.trim();

  if (trimmed.length < 7) {
    throw new AppError(
      "INVESTOR_PHONE_INVALID",
      "Enter a valid phone number.",
      400,
    );
  }

  return trimmed;
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(dateIso: string, months: number) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);

  return formatDateOnly(date);
}

function getTodayIso() {
  return formatDateOnly(new Date());
}

function getPayoutIntervalMonths(
  frequency: PublicInvestmentPlan["payout_frequency"],
) {
  if (frequency === "monthly") {
    return 1;
  }

  if (frequency === "quarterly") {
    return 3;
  }

  if (frequency === "biannual") {
    return 6;
  }

  return null;
}

function calculateReturnAmount(params: {
  plan: PublicInvestmentPlan;
  principalAmount: number;
}) {
  if (params.plan.return_type === "percentage") {
    return Number(
      (
        (params.principalAmount *
          Number(params.plan.return_rate_percent ?? 0)) /
        100
      ).toFixed(2),
    );
  }

  return Number(Number(params.plan.fixed_return_amount ?? 0).toFixed(2));
}

function calculatePayoutRows(params: {
  plan: PublicInvestmentPlan;
  principalAmount: number;
  returnAmount: number;
  startDate: string;
  maturityDate: string;
}) {
  const intervalMonths = getPayoutIntervalMonths(params.plan.payout_frequency);

  if (!intervalMonths) {
    return [
      {
        payout_label: "Capital plus return at maturity",
        due_date: params.maturityDate,
        amount_due: Number(
          (params.principalAmount + params.returnAmount).toFixed(2),
        ),
        amount_paid: 0,
        status: "pending",
        payout_type: "capital_plus_return",
      },
    ];
  }

  const dueMonths: number[] = [];
  let nextMonth = intervalMonths;

  while (nextMonth < params.plan.duration_months) {
    dueMonths.push(nextMonth);
    nextMonth += intervalMonths;
  }

  dueMonths.push(params.plan.duration_months);

  const payoutCount = dueMonths.length;
  const regularReturnAmount = Number(
    (params.returnAmount / payoutCount).toFixed(2),
  );
  const rows = dueMonths.map((month, index) => {
    const isFinal = index === dueMonths.length - 1;
    const previousReturnTotal = regularReturnAmount * index;
    const returnPortion = isFinal
      ? Number((params.returnAmount - previousReturnTotal).toFixed(2))
      : regularReturnAmount;

    return {
      payout_label: isFinal
        ? "Final capital plus return payout"
        : `Return payout ${index + 1}`,
      due_date: isFinal
        ? params.maturityDate
        : addMonths(params.startDate, month),
      amount_due: isFinal
        ? Number((params.principalAmount + returnPortion).toFixed(2))
        : returnPortion,
      amount_paid: 0,
      status: "pending",
      payout_type: isFinal ? "capital_plus_return" : "return",
    };
  });

  return rows;
}

async function getDeveloperAccount(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_accounts")
    .select("id, company_name")
    .eq("id", params.developerAccountId)
    .maybeSingle<DeveloperAccountRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError(
      "DEVELOPER_ACCOUNT_NOT_FOUND",
      "Developer account was not found.",
      404,
    );
  }

  return data;
}

async function getInvestmentPlan(params: {
  supabase: SupabaseClient;
  planId: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_investment_plans")
    .select(
      `
        id,
        developer_account_id,
        plan_name,
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
        terms
      `,
    )
    .eq("id", params.planId)
    .maybeSingle<PublicInvestmentPlan>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError(
      "INVESTMENT_PLAN_NOT_FOUND",
      "Investment plan was not found.",
      404,
    );
  }

  return data;
}

async function getPaymentLinkByToken(params: {
  supabase: SupabaseClient;
  token: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_investment_payment_links")
    .select(
      `
        id,
        developer_account_id,
        investment_plan_id,
        shared_by_profile_id,
        token,
        investor_full_name,
        investor_phone_number,
        investor_email,
        amount_requested,
        amount_paid,
        paystack_reference,
        paystack_authorization_url,
        status,
        expires_at,
        submitted_at,
        payment_started_at,
        paid_at,
        investor_id,
        investment_id,
        receipt_id
      `,
    )
    .eq("token", params.token)
    .maybeSingle<PaymentLinkLookupRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError(
      "INVESTMENT_LINK_NOT_FOUND",
      "Investment link was not found.",
      404,
    );
  }

  return data;
}

async function getPaymentLinkByReference(params: {
  supabase: SupabaseClient;
  reference: string;
}) {
  const { data, error } = await params.supabase
    .from("developer_investment_payment_links")
    .select(
      `
        id,
        developer_account_id,
        investment_plan_id,
        shared_by_profile_id,
        token,
        investor_full_name,
        investor_phone_number,
        investor_email,
        amount_requested,
        amount_paid,
        paystack_reference,
        paystack_authorization_url,
        status,
        expires_at,
        submitted_at,
        payment_started_at,
        paid_at,
        investor_id,
        investment_id,
        receipt_id
      `,
    )
    .eq("paystack_reference", params.reference)
    .maybeSingle<PaymentLinkLookupRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError(
      "INVESTMENT_PAYMENT_LINK_NOT_FOUND",
      "Investment payment could not be found.",
      404,
    );
  }

  return data;
}

function assertLinkCanAcceptPayment(params: {
  link: PublicInvestmentPaymentLink;
  plan: PublicInvestmentPlan;
}) {
  if (params.plan.status !== "active") {
    throw new AppError(
      "INVESTMENT_PLAN_NOT_ACTIVE",
      "This investment plan is not currently active.",
      400,
    );
  }

  if (params.link.status === "paid") {
    throw new AppError(
      "INVESTMENT_LINK_ALREADY_PAID",
      "This investment link has already been paid.",
      400,
    );
  }

  if (
    params.link.status === "cancelled" ||
    params.link.status === "expired" ||
    params.link.status === "failed"
  ) {
    throw new AppError(
      "INVESTMENT_LINK_CLOSED",
      "This investment link is no longer available.",
      400,
    );
  }

  if (
    params.link.expires_at &&
    new Date(params.link.expires_at).getTime() < Date.now()
  ) {
    throw new AppError(
      "INVESTMENT_LINK_EXPIRED",
      "This investment link has expired.",
      400,
    );
  }
}

function assertAmountAllowed(params: {
  amount: number;
  plan: PublicInvestmentPlan;
}) {
  const minimumAmount = Number(params.plan.minimum_amount);
  const maximumAmount = params.plan.maximum_amount
    ? Number(params.plan.maximum_amount)
    : null;

  if (params.amount < minimumAmount) {
    throw new AppError(
      "INVESTMENT_AMOUNT_BELOW_MINIMUM",
      `Minimum investment amount is ${minimumAmount.toLocaleString("en-NG")}.`,
      400,
    );
  }

  if (maximumAmount !== null && params.amount > maximumAmount) {
    throw new AppError(
      "INVESTMENT_AMOUNT_ABOVE_MAXIMUM",
      `Maximum investment amount is ${maximumAmount.toLocaleString("en-NG")}.`,
      400,
    );
  }
}

export async function getPublicInvestmentPageData(params: {
  supabase: SupabaseClient;
  token: string;
}): Promise<PublicInvestmentPageData> {
  const link = await getPaymentLinkByToken(params);
  const plan = await getInvestmentPlan({
    supabase: params.supabase,
    planId: link.investment_plan_id,
  });
  const developerAccount = await getDeveloperAccount({
    supabase: params.supabase,
    developerAccountId: link.developer_account_id,
  });

  return {
    companyName: developerAccount.company_name,
    link,
    plan,
  };
}

export async function startInvestmentPayment(params: {
  supabase: SupabaseClient;
  token: string;
  origin: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  amount: number;
}) {
  const link = await getPaymentLinkByToken(params);
  const plan = await getInvestmentPlan({
    supabase: params.supabase,
    planId: link.investment_plan_id,
  });

  assertLinkCanAcceptPayment({ link, plan });
  assertAmountAllowed({ amount: params.amount, plan });

  const fullName = params.fullName.trim();
  const phoneNumber = requireValidPhone(params.phoneNumber);
  const email = requireValidEmail(params.email);

  if (fullName.length < 2) {
    throw new AppError("INVESTOR_NAME_INVALID", "Enter your full name.", 400);
  }

  const payoutAccount = await assertDeveloperPayoutAccountVerified({
    supabase: params.supabase,
    developerAccountId: link.developer_account_id,
  });

  const reference = createInvestmentReference();
  const amountKobo = convertNairaToKobo(params.amount);
  const callbackUrl = `${params.origin.replace(/\/$/, "")}/invest/payment/callback`;

  const initialized = await initializePaystackTransaction({
    email,
    amountKobo,
    reference,
    callbackUrl,
    subaccountCode: payoutAccount.paystack_subaccount_code,
    transactionChargeKobo: 0,
    currencyCode: payoutAccount.currency_code,
    metadata: {
      payment_type: "investment_plan_payment",
      developer_account_id: link.developer_account_id,
      investment_payment_link_id: link.id,
      investment_plan_id: plan.id,
      investor_name: fullName,
      investor_phone: phoneNumber,
      investor_email: email,
    },
  });

  const { error } = await params.supabase
    .from("developer_investment_payment_links")
    .update({
      investor_full_name: fullName,
      investor_phone_number: phoneNumber,
      investor_email: email,
      amount_requested: params.amount,
      paystack_reference: reference,
      paystack_authorization_url: initialized.authorization_url,
      submitted_at: new Date().toISOString(),
      payment_started_at: new Date().toISOString(),
      status: "payment_started",
    })
    .eq("id", link.id)
    .neq("status", "paid");

  if (error) {
    throw error;
  }

  return initialized.authorization_url;
}

async function findOrCreateInvestor(params: {
  supabase: SupabaseClient;
  developerAccountId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  createdByProfileId: string | null;
}) {
  const { data: existingInvestor, error: existingInvestorError } =
    await params.supabase
      .from("developer_investors")
      .select("id, full_name, phone_number, email")
      .eq("developer_account_id", params.developerAccountId)
      .eq("email", params.email)
      .maybeSingle<InvestorRow>();

  if (existingInvestorError) {
    throw existingInvestorError;
  }

  if (existingInvestor) {
    const { data, error } = await params.supabase
      .from("developer_investors")
      .update({
        full_name: params.fullName,
        phone_number: params.phoneNumber,
        status: "active",
      })
      .eq("id", existingInvestor.id)
      .select("id, full_name, phone_number, email")
      .single<InvestorRow>();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await params.supabase
    .from("developer_investors")
    .insert({
      developer_account_id: params.developerAccountId,
      full_name: params.fullName,
      phone_number: params.phoneNumber,
      email: params.email,
      status: "active",
      created_by_profile_id: params.createdByProfileId,
    })
    .select("id, full_name, phone_number, email")
    .single<InvestorRow>();

  if (error) {
    throw error;
  }

  return data;
}

async function createInvestmentAndPayouts(params: {
  supabase: SupabaseClient;
  link: PublicInvestmentPaymentLink;
  plan: PublicInvestmentPlan;
  investorId: string;
  principalAmount: number;
  paidAtIso: string;
}) {
  const startDate = params.paidAtIso.slice(0, 10);
  const maturityDate = addMonths(startDate, params.plan.duration_months);
  const returnAmount = calculateReturnAmount({
    plan: params.plan,
    principalAmount: params.principalAmount,
  });
  const maturityTotalAmount = Number(
    (params.principalAmount + returnAmount).toFixed(2),
  );

  const { data: investment, error: investmentError } = await params.supabase
    .from("developer_investor_investments")
    .insert({
      developer_account_id: params.link.developer_account_id,
      investor_id: params.investorId,
      investment_plan_id: params.plan.id,
      payment_link_id: params.link.id,
      investment_title: params.plan.plan_name,
      principal_amount: params.principalAmount,
      return_type:
        params.plan.return_type === "percentage" ? "percentage" : "fixed",
      return_rate_percent:
        params.plan.return_type === "percentage"
          ? Number(params.plan.return_rate_percent)
          : null,
      expected_return_amount: returnAmount,
      maturity_total_amount: maturityTotalAmount,
      start_date: startDate,
      maturity_date: maturityDate,
      status: "active",
      created_by_profile_id: params.link.shared_by_profile_id,
    })
    .select("id")
    .single<{ id: string }>();

  if (investmentError) {
    throw investmentError;
  }

  const payoutRows = calculatePayoutRows({
    plan: params.plan,
    principalAmount: params.principalAmount,
    returnAmount,
    startDate,
    maturityDate,
  }).map((row) => ({
    developer_account_id: params.link.developer_account_id,
    investor_id: params.investorId,
    investment_id: investment.id,
    payout_label: row.payout_label,
    due_date: row.due_date,
    amount_due: row.amount_due,
    amount_paid: row.amount_paid,
    status: row.status,
    payout_type: row.payout_type,
    created_by_profile_id: params.link.shared_by_profile_id,
  }));

  const { error: payoutError } = await params.supabase
    .from("developer_investor_payouts")
    .insert(payoutRows);

  if (payoutError) {
    throw payoutError;
  }

  return {
    investmentId: investment.id,
    maturityDate,
  };
}

export async function verifyAndFinalizeInvestmentPayment(params: {
  supabase: SupabaseClient;
  reference: string;
}): Promise<FinalizedInvestmentPayment> {
  const link = await getPaymentLinkByReference(params);

  if (link.status === "paid" && link.investor_id && link.investment_id) {
    return {
      investorId: link.investor_id,
      investmentId: link.investment_id,
      amountPaid: Number(link.amount_paid ?? link.amount_requested ?? 0),
      maturityDate: getTodayIso(),
    };
  }

  if (
    !link.amount_requested ||
    !link.investor_full_name ||
    !link.investor_email
  ) {
    throw new AppError(
      "INVESTMENT_PAYMENT_INCOMPLETE",
      "Investment payment details are incomplete.",
      400,
    );
  }

  const plan = await getInvestmentPlan({
    supabase: params.supabase,
    planId: link.investment_plan_id,
  });

  const verified = (await verifyPaystackTransaction(
    params.reference,
  )) as PaystackVerifiedTransaction;

  if (verified.status !== "success") {
    throw new AppError(
      "INVESTMENT_PAYMENT_NOT_SUCCESSFUL",
      "Payment was not successful.",
      400,
    );
  }

  assertPaystackAmountMatchesExpected({
    paystackAmountInKobo: verified.amount,
    expectedAmountInNaira: Number(link.amount_requested),
  });

  const amountPaid = convertKoboToNaira(verified.amount);
  const paidAtIso = verified.paid_at ?? new Date().toISOString();

  const investor = await findOrCreateInvestor({
    supabase: params.supabase,
    developerAccountId: link.developer_account_id,
    fullName: link.investor_full_name,
    phoneNumber: link.investor_phone_number ?? "",
    email: normalizeEmail(link.investor_email),
    createdByProfileId: link.shared_by_profile_id,
  });

  const created = await createInvestmentAndPayouts({
    supabase: params.supabase,
    link,
    plan,
    investorId: investor.id,
    principalAmount: amountPaid,
    paidAtIso,
  });

  const { error: updateLinkError } = await params.supabase
    .from("developer_investment_payment_links")
    .update({
      amount_paid: amountPaid,
      paid_at: paidAtIso,
      status: "paid",
      investor_id: investor.id,
      investment_id: created.investmentId,
    })
    .eq("id", link.id)
    .neq("status", "paid");

  if (updateLinkError) {
    throw updateLinkError;
  }

  return {
    investorId: investor.id,
    investmentId: created.investmentId,
    amountPaid,
    maturityDate: created.maturityDate,
  };
}
