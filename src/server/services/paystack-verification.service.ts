import "server-only";

import { AppError } from "@/server/errors/app-error";
import { getSessionUser } from "@/server/services/auth.service";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type PaystackPayoutVerificationState =
  | "missing"
  | "unverified"
  | "verified"
  | "failed";

export type PayoutVerificationStatusPayload = {
  state: PaystackPayoutVerificationState;
  verifiedAt: string | null;
  updatedAt: string | null;
};

export type PaystackPayoutVerificationAudience =
  | "developer"
  | "buyer"
  | "platform"
  | "landlord"
  | "agent"
  | "tenant";

export type PaystackPayoutVerificationUiState = {
  state: PaystackPayoutVerificationState;
  isVerified: boolean;
  badgeLabel:
    | "Not Connected"
    | "Pending Verification"
    | "Verified"
    | "Verification Failed";
  badgeTone: "success" | "warning" | "danger" | "neutral";
  guidance: string;
};

export type LandlordPaymentGateUiState = PaystackPayoutVerificationUiState;

type PaystackVerificationStatus = "unverified" | "verified" | "failed";

type PaystackPayoutAccountVerificationFields = {
  verification_status: PaystackVerificationStatus;
  verified_at: string | null;
  updated_at?: string | null;
};

type DeveloperAccountRow = {
  id: string;
};

type DeveloperPaystackAccountRow = PaystackPayoutAccountVerificationFields & {
  paystack_subaccount_code: string;
};

function createPayoutVerificationError(
  state: Exclude<PaystackPayoutVerificationState, "verified">,
) {
  if (state === "missing") {
    return new AppError(
      "BANK_ACCOUNT_REQUIRED",
      "The payout account is not connected.",
      400,
    );
  }

  if (state === "failed") {
    return new AppError(
      "PAYOUT_ACCOUNT_VERIFICATION_FAILED",
      "Payout account verification failed. Please update the payout details.",
      400,
    );
  }

  return new AppError(
    "PAYOUT_ACCOUNT_PENDING_VERIFICATION",
    "Payout account verification is still pending.",
    400,
  );
}

export function getPaystackPayoutVerificationState(
  account: PaystackPayoutAccountVerificationFields | null,
): PaystackPayoutVerificationState {
  if (!account) {
    return "missing";
  }

  if (account.verification_status === "failed") {
    return "failed";
  }

  if (account.verification_status === "verified" && account.verified_at) {
    return "verified";
  }

  return "unverified";
}

export function buildPayoutVerificationStatusPayload(
  account:
    | (PaystackPayoutAccountVerificationFields & {
        updated_at?: string | null;
      })
    | null,
): PayoutVerificationStatusPayload {
  return {
    state: getPaystackPayoutVerificationState(account),
    verifiedAt: account?.verified_at ?? null,
    updatedAt: account?.updated_at ?? null,
  };
}

export function isPaystackPayoutVerified(
  account: PaystackPayoutAccountVerificationFields | null,
) {
  return getPaystackPayoutVerificationState(account) === "verified";
}

export function getPaystackPayoutVerificationUiState(
  account: PaystackPayoutAccountVerificationFields | null,
  audience: PaystackPayoutVerificationAudience,
): PaystackPayoutVerificationUiState {
  const state = getPaystackPayoutVerificationState(account);
  const audienceLabel =
    audience === "buyer" ? "buyer payment" : "online payment";

  if (state === "verified") {
    return {
      state,
      isVerified: true,
      badgeLabel: "Verified",
      badgeTone: "success",
      guidance: `${audienceLabel} collection is enabled.`,
    };
  }

  if (state === "failed") {
    return {
      state,
      isVerified: false,
      badgeLabel: "Verification Failed",
      badgeTone: "danger",
      guidance:
        "Payout account verification failed. Please update the payout details or contact support.",
    };
  }

  if (state === "missing") {
    return {
      state,
      isVerified: false,
      badgeLabel: "Not Connected",
      badgeTone: "neutral",
      guidance: "Connect a payout account before online collection can start.",
    };
  }

  return {
    state,
    isVerified: false,
    badgeLabel: "Pending Verification",
    badgeTone: "warning",
    guidance:
      "Online collection will be available once payout verification is approved.",
  };
}

export async function getCurrentPayoutVerificationStatus(): Promise<PayoutVerificationStatusPayload> {
  const user = await getSessionUser();

  if (!user || user.role !== "developer") {
    throw new AppError(
      "UNAUTHORIZED",
      "You must be signed in as a developer to check payout verification status.",
      401,
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: developerAccountData, error: developerAccountError } =
    await supabase
      .from("developer_accounts")
      .select("id")
      .eq("owner_profile_id", user.id)
      .eq("status", "active")
      .maybeSingle();

  if (developerAccountError) {
    throw new AppError(
      "DEVELOPER_ACCOUNT_LOOKUP_FAILED",
      "Could not check developer account status.",
      500,
    );
  }

  const developerAccount = developerAccountData as DeveloperAccountRow | null;

  if (!developerAccount) {
    return buildPayoutVerificationStatusPayload(null);
  }

  const { data: accountData, error: accountError } = await supabase
    .from("developer_paystack_accounts")
    .select("verification_status, verified_at, updated_at, paystack_subaccount_code")
    .eq("developer_account_id", developerAccount.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (accountError) {
    throw new AppError(
      "PAYOUT_ACCOUNT_LOOKUP_FAILED",
      "Could not check payout verification status.",
      500,
    );
  }

  return buildPayoutVerificationStatusPayload(
    accountData as DeveloperPaystackAccountRow | null,
  );
}

export function getFriendlyPayoutVerificationErrorMessage(code: string) {
  if (code === "BANK_ACCOUNT_REQUIRED") {
    return "Connect a payout account before online collection can start.";
  }

  if (code === "PAYOUT_ACCOUNT_PENDING_VERIFICATION") {
    return "Payout account verification is pending. Online collection will be available once approved.";
  }

  if (code === "PAYOUT_ACCOUNT_VERIFICATION_FAILED") {
    return "Payout account verification failed. Please update the payout details or contact support.";
  }

  return null;
}

export function getLandlordPaymentGateUiState(
  account: PaystackPayoutAccountVerificationFields | null,
): LandlordPaymentGateUiState | null {
  const state = getPaystackPayoutVerificationState(account);

  if (state === "verified") {
    return null;
  }

  return getPaystackPayoutVerificationUiState(account, "developer");
}

export function assertLandlordPayoutVerified<
  TAccount extends DeveloperPaystackAccountRow | null,
>(account: TAccount): NonNullable<TAccount> {
  const state = getPaystackPayoutVerificationState(account);

  if (state !== "verified") {
    throw createPayoutVerificationError(state);
  }

  if (!account) {
    throw createPayoutVerificationError("missing");
  }

  return account;
}

export function assertAgentPayoutVerified<
  TAccount extends DeveloperPaystackAccountRow | null,
>(account: TAccount): NonNullable<TAccount> {
  return assertLandlordPayoutVerified(account);
}

export function assertDeveloperPayoutVerified<
  TAccount extends DeveloperPaystackAccountRow | null,
>(account: TAccount): NonNullable<TAccount> {
  return assertLandlordPayoutVerified(account);
}
