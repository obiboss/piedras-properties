"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { DeveloperInvestmentPlanActionState } from "@/actions/developer-investment-plans.state";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import {
  createDeveloperInvestmentPaymentLink,
  createDeveloperInvestmentPlan,
} from "@/server/services/developer-investment-plans.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getNullableText(formData: FormData, key: string) {
  const value = getText(formData, key);

  return value.length > 0 ? value : null;
}

function getNumber(formData: FormData, key: string) {
  const rawValue = getText(formData, key).replace(/,/g, "");

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    return null;
  }

  return value;
}

async function getOrigin() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (!host) {
    return "";
  }

  const protocol = host.includes("localhost")
    ? "http"
    : (forwardedProtocol ?? "https");

  return `${protocol}://${host}`;
}

export async function createInvestmentPlanAction(
  _previousState: DeveloperInvestmentPlanActionState,
  formData: FormData,
): Promise<DeveloperInvestmentPlanActionState> {
  try {
    const developer = await requireDeveloper();
    const supabase = createSupabaseAdminClient();
    const account = await getDeveloperAccountByOwnerProfileId(
      supabase,
      developer.id,
    );

    if (!account) {
      return {
        status: "error",
        message: "Developer account was not found.",
      };
    }

    const planName = getText(formData, "planName");
    const summary = getNullableText(formData, "summary");
    const description = getNullableText(formData, "description");
    const minimumAmount = getNumber(formData, "minimumAmount");
    const maximumAmount = getNumber(formData, "maximumAmount");
    const returnType = getText(formData, "returnType");
    const returnRatePercent = getNumber(formData, "returnRatePercent");
    const fixedReturnAmount = getNumber(formData, "fixedReturnAmount");
    const durationMonths = getNumber(formData, "durationMonths");
    const payoutFrequency = getText(formData, "payoutFrequency");
    const terms = getNullableText(formData, "terms");

    if (planName.length < 2) {
      return {
        status: "error",
        message: "Enter a valid investment plan name.",
      };
    }

    if (!minimumAmount || minimumAmount <= 0) {
      return {
        status: "error",
        message: "Enter a valid minimum investment amount.",
      };
    }

    if (maximumAmount !== null && maximumAmount < minimumAmount) {
      return {
        status: "error",
        message: "Maximum amount cannot be lower than minimum amount.",
      };
    }

    if (!durationMonths || durationMonths <= 0) {
      return {
        status: "error",
        message: "Enter a valid duration in months.",
      };
    }

    if (returnType !== "percentage" && returnType !== "fixed") {
      return {
        status: "error",
        message: "Select a valid return type.",
      };
    }

    if (
      returnType === "percentage" &&
      (!returnRatePercent || returnRatePercent <= 0)
    ) {
      return {
        status: "error",
        message: "Enter a valid return percentage.",
      };
    }

    if (
      returnType === "fixed" &&
      (!fixedReturnAmount || fixedReturnAmount <= 0)
    ) {
      return {
        status: "error",
        message: "Enter a valid fixed return amount.",
      };
    }

    if (
      payoutFrequency !== "maturity" &&
      payoutFrequency !== "monthly" &&
      payoutFrequency !== "quarterly" &&
      payoutFrequency !== "biannual"
    ) {
      return {
        status: "error",
        message: "Select a valid payout frequency.",
      };
    }

    await createDeveloperInvestmentPlan({
      supabase,
      developerAccountId: account.id,
      profileId: developer.id,
      planName,
      summary,
      description,
      minimumAmount,
      maximumAmount,
      returnType,
      returnRatePercent: returnType === "percentage" ? returnRatePercent : null,
      fixedReturnAmount: returnType === "fixed" ? fixedReturnAmount : null,
      durationMonths,
      payoutFrequency,
      terms,
    });

    revalidatePath("/developer/investors");

    return {
      status: "success",
      message: "Investment plan created.",
    };
  } catch (error) {
    console.error("createInvestmentPlanAction failed", error);

    return {
      status: "error",
      message: "Unable to create investment plan.",
    };
  }
}

export async function createInvestmentPaymentLinkAction(
  _previousState: DeveloperInvestmentPlanActionState,
  formData: FormData,
): Promise<DeveloperInvestmentPlanActionState> {
  try {
    const developer = await requireDeveloper();
    const supabase = createSupabaseAdminClient();
    const account = await getDeveloperAccountByOwnerProfileId(
      supabase,
      developer.id,
    );

    if (!account) {
      return {
        status: "error",
        message: "Developer account was not found.",
      };
    }

    const investmentPlanId = getText(formData, "investmentPlanId");

    if (!investmentPlanId) {
      return {
        status: "error",
        message: "Select a valid investment plan.",
      };
    }

    const link = await createDeveloperInvestmentPaymentLink({
      supabase,
      developerAccountId: account.id,
      profileId: developer.id,
      investmentPlanId,
    });

    const origin = await getOrigin();
    const investmentLink = `${origin}/invest/${link.token}`;

    revalidatePath("/developer/investors");

    return {
      status: "success",
      message: "Investment link created.",
      investmentLink,
    };
  } catch (error) {
    console.error("createInvestmentPaymentLinkAction failed", error);

    return {
      status: "error",
      message: "Unable to create investment link.",
    };
  }
}
