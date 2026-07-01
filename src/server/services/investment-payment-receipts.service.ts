import "server-only";

import { AppError } from "@/server/errors/app-error";
import { renderInvestmentPaymentReceiptPdfBuffer } from "@/server/pdf/investment-payment-receipt-pdf";
import {
  createSignedDeveloperPaymentReceiptPdfUrl,
  uploadDeveloperPaymentReceiptPdf,
} from "@/server/services/storage.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type InvestmentPaymentLinkReceiptRow = {
  id: string;
  developer_account_id: string;
  investment_plan_id: string;
  investor_id: string | null;
  investment_id: string | null;
  investor_full_name: string | null;
  investor_phone_number: string | null;
  investor_email: string | null;
  amount_paid: number | string | null;
  paystack_reference: string | null;
  paid_at: string | null;
  status: string;
  receipt_number: string | null;
  receipt_path: string | null;
  receipt_generated: boolean;
};

type DeveloperAccountReceiptRow = {
  id: string;
  company_name: string;
};

type InvestmentPlanReceiptRow = {
  id: string;
  plan_name: string;
  payout_frequency: "maturity" | "monthly" | "quarterly" | "biannual";
};

type InvestmentReceiptRow = {
  id: string;
  principal_amount: number | string;
  expected_return_amount: number | string;
  maturity_total_amount: number | string;
  start_date: string;
  maturity_date: string;
};

export type GeneratedInvestmentReceiptResult = {
  receiptNumber: string;
  receiptPath: string;
  receiptDownloadUrl: string;
};

function formatNaira(amount: number | string | null) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatPayoutFrequency(
  frequency: InvestmentPlanReceiptRow["payout_frequency"],
) {
  if (frequency === "maturity") {
    return "One-time at maturity";
  }

  if (frequency === "monthly") {
    return "Monthly return, capital at maturity";
  }

  if (frequency === "quarterly") {
    return "Quarterly return, capital at maturity";
  }

  return "Bi-annual return, capital at maturity";
}

function createInvestmentReceiptNumber(link: InvestmentPaymentLinkReceiptRow) {
  const datePart = new Date(link.paid_at ?? Date.now())
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  return `PDR-INV-${datePart}-${link.id.slice(0, 8).toUpperCase()}`;
}

function createInvestmentReceiptPath(params: {
  developerAccountId: string;
  paymentLinkId: string;
}) {
  return `${params.developerAccountId}/investor-receipts/${params.paymentLinkId}.pdf`;
}

async function getPaymentLink(paymentLinkId: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("developer_investment_payment_links")
    .select(
      `
        id,
        developer_account_id,
        investment_plan_id,
        investor_id,
        investment_id,
        investor_full_name,
        investor_phone_number,
        investor_email,
        amount_paid,
        paystack_reference,
        paid_at,
        status,
        receipt_number,
        receipt_path,
        receipt_generated
      `,
    )
    .eq("id", paymentLinkId)
    .maybeSingle<InvestmentPaymentLinkReceiptRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError(
      "INVESTMENT_PAYMENT_LINK_NOT_FOUND",
      "Investment payment was not found.",
      404,
    );
  }

  return data;
}

async function getDeveloperAccount(developerAccountId: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("developer_accounts")
    .select("id, company_name")
    .eq("id", developerAccountId)
    .maybeSingle<DeveloperAccountReceiptRow>();

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

async function getInvestmentPlan(planId: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("developer_investment_plans")
    .select("id, plan_name, payout_frequency")
    .eq("id", planId)
    .maybeSingle<InvestmentPlanReceiptRow>();

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

async function getInvestment(investmentId: string) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("developer_investor_investments")
    .select(
      `
        id,
        principal_amount,
        expected_return_amount,
        maturity_total_amount,
        start_date,
        maturity_date
      `,
    )
    .eq("id", investmentId)
    .maybeSingle<InvestmentReceiptRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new AppError(
      "INVESTMENT_NOT_FOUND",
      "Investment record was not found.",
      404,
    );
  }

  return data;
}

export async function generateInvestmentPaymentReceiptSystem(
  paymentLinkId: string,
): Promise<GeneratedInvestmentReceiptResult> {
  const paymentLink = await getPaymentLink(paymentLinkId);

  if (paymentLink.status !== "paid") {
    throw new AppError(
      "INVESTMENT_RECEIPT_PAYMENT_NOT_PAID",
      "Receipt can only be generated after payment is confirmed.",
      400,
    );
  }

  if (!paymentLink.investment_id) {
    throw new AppError(
      "INVESTMENT_RECEIPT_INVESTMENT_MISSING",
      "Investment record is missing for this payment.",
      400,
    );
  }

  if (paymentLink.receipt_generated && paymentLink.receipt_path) {
    const receiptDownloadUrl = await createSignedDeveloperPaymentReceiptPdfUrl(
      paymentLink.receipt_path,
    );

    if (!receiptDownloadUrl) {
      throw new AppError(
        "INVESTMENT_RECEIPT_URL_FAILED",
        "Receipt download link could not be created.",
        500,
      );
    }

    return {
      receiptNumber:
        paymentLink.receipt_number ??
        createInvestmentReceiptNumber(paymentLink),
      receiptPath: paymentLink.receipt_path,
      receiptDownloadUrl,
    };
  }

  const [developerAccount, plan, investment] = await Promise.all([
    getDeveloperAccount(paymentLink.developer_account_id),
    getInvestmentPlan(paymentLink.investment_plan_id),
    getInvestment(paymentLink.investment_id),
  ]);

  const receiptNumber =
    paymentLink.receipt_number ?? createInvestmentReceiptNumber(paymentLink);
  const receiptPath =
    paymentLink.receipt_path ??
    createInvestmentReceiptPath({
      developerAccountId: paymentLink.developer_account_id,
      paymentLinkId: paymentLink.id,
    });

  const pdfBuffer = await renderInvestmentPaymentReceiptPdfBuffer({
    receiptNumber,
    developerName: developerAccount.company_name,
    investorName: paymentLink.investor_full_name ?? "Investor",
    investorPhone: paymentLink.investor_phone_number ?? "Not provided",
    investorEmail: paymentLink.investor_email ?? "Not provided",
    planName: plan.plan_name,
    paymentReference: paymentLink.paystack_reference ?? "Not available",
    paymentDate: formatDate(paymentLink.paid_at),
    principalAmount: formatNaira(investment.principal_amount),
    expectedReturnAmount: formatNaira(investment.expected_return_amount),
    maturityTotalAmount: formatNaira(investment.maturity_total_amount),
    startDate: formatDate(investment.start_date),
    maturityDate: formatDate(investment.maturity_date),
    payoutFrequency: formatPayoutFrequency(plan.payout_frequency),
  });

  await uploadDeveloperPaymentReceiptPdf({
    path: receiptPath,
    pdfBuffer,
  });

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("developer_investment_payment_links")
    .update({
      receipt_number: receiptNumber,
      receipt_path: receiptPath,
      receipt_generated: true,
      receipt_id: paymentLink.id,
    })
    .eq("id", paymentLink.id);

  if (error) {
    throw error;
  }

  const receiptDownloadUrl =
    await createSignedDeveloperPaymentReceiptPdfUrl(receiptPath);

  if (!receiptDownloadUrl) {
    throw new AppError(
      "INVESTMENT_RECEIPT_URL_FAILED",
      "Receipt download link could not be created.",
      500,
    );
  }

  return {
    receiptNumber,
    receiptPath,
    receiptDownloadUrl,
  };
}
