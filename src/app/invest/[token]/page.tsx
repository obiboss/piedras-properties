import { notFound } from "next/navigation";
import { InvestmentPaymentForm } from "@/components/investment/investment-payment-form";
import { getPublicInvestmentPageData } from "@/server/services/investment-payment-link.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";

type InvestmentPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatNaira(amount: number | string | null) {
  if (amount === null) {
    return "No limit";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatReturn(params: {
  returnType: "percentage" | "fixed";
  returnRatePercent: number | string | null;
  fixedReturnAmount: number | string | null;
}) {
  if (params.returnType === "percentage") {
    return `${Number(params.returnRatePercent ?? 0)}%`;
  }

  return formatNaira(params.fixedReturnAmount);
}

function formatPayoutFrequency(value: string) {
  if (value === "maturity") {
    return "One-time at maturity";
  }

  if (value === "monthly") {
    return "Monthly return, capital at maturity";
  }

  if (value === "quarterly") {
    return "Quarterly return, capital at maturity";
  }

  return "Bi-annual return, capital at maturity";
}

export default async function InvestmentPage({ params }: InvestmentPageProps) {
  const { token } = await params;

  let pageData;

  try {
    pageData = await getPublicInvestmentPageData({
      supabase: createSupabaseAdminClient(),
      token,
    });
  } catch {
    notFound();
  }

  const minimumAmount = Number(pageData.plan.minimum_amount);
  const maximumAmount = pageData.plan.maximum_amount
    ? Number(pageData.plan.maximum_amount)
    : null;
  const linkClosed =
    pageData.link.status === "paid" ||
    pageData.link.status === "expired" ||
    pageData.link.status === "cancelled" ||
    pageData.link.status === "failed" ||
    pageData.plan.status !== "active";

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_420px]">
        <section className="rounded-4xl border border-border-soft bg-white p-6 shadow-card sm:p-8">
          <p className="text-sm font-black uppercase tracking-wide text-primary">
            {pageData.companyName}
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-text-strong sm:text-4xl">
            {pageData.plan.plan_name}
          </h1>

          {pageData.plan.summary ? (
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-text-muted">
              {pageData.plan.summary}
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-primary-soft p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Minimum investment
              </p>
              <p className="mt-1 text-xl font-black text-text-strong">
                {formatNaira(pageData.plan.minimum_amount)}
              </p>
            </div>

            <div className="rounded-2xl bg-primary-soft p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Maximum investment
              </p>
              <p className="mt-1 text-xl font-black text-text-strong">
                {formatNaira(pageData.plan.maximum_amount)}
              </p>
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Return
              </p>
              <p className="mt-1 text-xl font-black text-text-strong">
                {formatReturn({
                  returnType: pageData.plan.return_type,
                  returnRatePercent: pageData.plan.return_rate_percent,
                  fixedReturnAmount: pageData.plan.fixed_return_amount,
                })}
              </p>
            </div>

            <div className="rounded-2xl bg-surface p-4">
              <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                Duration
              </p>
              <p className="mt-1 text-xl font-black text-text-strong">
                {pageData.plan.duration_months} months
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border-soft bg-background p-4">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Payout structure
            </p>
            <p className="mt-2 text-sm font-bold leading-6 text-text-strong">
              {formatPayoutFrequency(pageData.plan.payout_frequency)}
            </p>
          </div>

          {pageData.plan.description ? (
            <div className="mt-6">
              <h2 className="font-black text-text-strong">Plan details</h2>
              <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-text-muted">
                {pageData.plan.description}
              </p>
            </div>
          ) : null}

          {pageData.plan.terms ? (
            <div className="mt-6 rounded-2xl border border-border-soft bg-white p-4">
              <h2 className="font-black text-text-strong">Terms</h2>
              <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-text-muted">
                {pageData.plan.terms}
              </p>
            </div>
          ) : null}
        </section>

        <aside className="rounded-4xl border border-border-soft bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-black tracking-tight text-text-strong">
            Investor details
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
            Fill in your details and proceed to secure payment.
          </p>

          <div className="mt-6">
            {linkClosed ? (
              <div className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                This investment link is no longer available.
              </div>
            ) : (
              <InvestmentPaymentForm
                token={pageData.link.token}
                minimumAmount={minimumAmount}
                maximumAmount={maximumAmount}
              />
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
