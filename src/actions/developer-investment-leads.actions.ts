"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { DeveloperInvestmentLeadActionState } from "@/actions/developer-investment-leads.state";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { prepareDeveloperInvestmentLeadFollowUp } from "@/server/services/developer-investment-leads.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function normalizePhoneForWhatsApp(phoneNumber: string | null) {
  if (!phoneNumber) {
    return null;
  }

  const digits = phoneNumber.replace(/\D/g, "");

  if (digits.length < 7) {
    return null;
  }

  if (digits.startsWith("0")) {
    return `234${digits.slice(1)}`;
  }

  return digits;
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

function buildFollowUpWhatsAppHref(params: {
  phoneNumber: string | null;
  fullName: string;
  planName: string;
  amountRequested: number;
  investmentLink: string;
}) {
  const phone = normalizePhoneForWhatsApp(params.phoneNumber);

  if (!phone) {
    return undefined;
  }

  const message = `Hello ${params.fullName}, this is Piedras Properties. You started the ${params.planName} investment payment for ${formatNaira(
    params.amountRequested,
  )} but did not complete it. You can continue securely here: ${
    params.investmentLink
  }. Let us know if you need help.`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export async function prepareInvestmentLeadFollowUpAction(
  _previousState: DeveloperInvestmentLeadActionState,
  formData: FormData,
): Promise<DeveloperInvestmentLeadActionState> {
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

    const linkId = getText(formData, "linkId");

    if (!linkId) {
      return {
        status: "error",
        message: "Investment lead is missing.",
      };
    }

    const lead = await prepareDeveloperInvestmentLeadFollowUp({
      supabase,
      developerAccountId: account.id,
      profileId: developer.id,
      linkId,
    });

    const origin = await getOrigin();
    const investmentLink = `${origin}/invest/${lead.token}`;
    const whatsappHref = buildFollowUpWhatsAppHref({
      phoneNumber: lead.phoneNumber,
      fullName: lead.fullName,
      planName: lead.planName,
      amountRequested: lead.amountRequested,
      investmentLink,
    });

    revalidatePath("/developer/investors");

    return {
      status: "success",
      message: whatsappHref
        ? "WhatsApp follow-up prepared."
        : "Follow-up recorded, but investor phone number is not valid for WhatsApp.",
      whatsappHref,
    };
  } catch (error) {
    console.error("prepareInvestmentLeadFollowUpAction failed", error);

    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Unable to prepare follow-up.",
    };
  }
}
