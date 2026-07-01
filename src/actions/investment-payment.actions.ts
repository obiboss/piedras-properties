"use server";

import { headers } from "next/headers";
import type { InvestmentPaymentActionState } from "@/actions/investment-payment.state";
import { startInvestmentPayment } from "@/server/services/investment-payment-link.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

export async function startInvestmentPaymentAction(
  _previousState: InvestmentPaymentActionState,
  formData: FormData,
): Promise<InvestmentPaymentActionState> {
  try {
    const token = getText(formData, "token");
    const fullName = getText(formData, "fullName");
    const phoneNumber = getText(formData, "phoneNumber");
    const email = getText(formData, "email");
    const amount = getNumber(formData, "amount");

    if (!token) {
      return {
        status: "error",
        message: "Investment link is missing.",
      };
    }

    if (fullName.length < 2) {
      return {
        status: "error",
        message: "Enter your full name.",
      };
    }

    if (phoneNumber.length < 7) {
      return {
        status: "error",
        message: "Enter a valid phone number.",
      };
    }

    if (!email) {
      return {
        status: "error",
        message: "Enter your email address.",
      };
    }

    if (!amount || amount <= 0) {
      return {
        status: "error",
        message: "Enter a valid investment amount.",
      };
    }

    const authorizationUrl = await startInvestmentPayment({
      supabase: createSupabaseAdminClient(),
      token,
      origin: await getOrigin(),
      fullName,
      phoneNumber,
      email,
      amount,
    });

    return {
      status: "success",
      message: "Redirecting to secure payment.",
      authorizationUrl,
    };
  } catch (error) {
    console.error("startInvestmentPaymentAction failed", error);

    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to start investment payment.",
    };
  }
}
