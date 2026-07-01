import { DeveloperBankSetupToast } from "@/components/developer/developer-bank-setup-toast";
import { DeveloperShell } from "@/components/layout/developer-shell";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import { getDeveloperPayoutAccountState } from "@/server/services/developer-payout.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type DeveloperWorkspaceLayoutProps = {
  children: React.ReactNode;
};

export default async function DeveloperWorkspaceLayout({
  children,
}: DeveloperWorkspaceLayoutProps) {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  const payoutState = account
    ? await getDeveloperPayoutAccountState({
        supabase,
        developerAccountId: account.id,
      })
    : {
        state: "missing" as const,
        paystackAccount: null,
      };

  return (
    <DeveloperShell
      developerName={developer.fullName}
      companyName={account?.company_name}
    >
      <DeveloperBankSetupToast state={payoutState.state} />
      {children}
    </DeveloperShell>
  );
}
