"use server";

import { revalidatePath } from "next/cache";
import type { DeveloperInvestorPayoutActionState } from "@/actions/developer-investor-payouts.state";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { markDeveloperInvestorPayoutPaid } from "@/server/services/developer-investor-details.service";
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

export async function markInvestorPayoutPaidAction(
  _previousState: DeveloperInvestorPayoutActionState,
  formData: FormData,
): Promise<DeveloperInvestorPayoutActionState> {
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

    const investorId = getText(formData, "investorId");
    const payoutId = getText(formData, "payoutId");
    const paymentDate = getText(formData, "paymentDate");
    const paymentChannel = getText(formData, "paymentChannel");
    const paymentReference = getText(formData, "paymentReference");
    const note = getNullableText(formData, "note");

    if (!investorId || !payoutId) {
      return {
        status: "error",
        message: "Payout record is missing.",
      };
    }

    await markDeveloperInvestorPayoutPaid({
      supabase,
      developerAccountId: account.id,
      payoutId,
      paymentDate,
      paymentChannel,
      paymentReference,
      note,
    });

    revalidatePath("/developer");
    revalidatePath("/developer/investors");
    revalidatePath(`/developer/investors/${investorId}`);

    return {
      status: "success",
      message: "Investor payout marked as paid.",
    };
  } catch (error) {
    console.error("markInvestorPayoutPaidAction failed", error);

    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to mark payout as paid.",
    };
  }
}
