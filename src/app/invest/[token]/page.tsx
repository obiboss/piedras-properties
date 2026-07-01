import { notFound } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  TrendingUp,
} from "lucide-react";
import { InvestmentPaymentForm } from "@/components/investment/investment-payment-form";
import {
  getPublicInvestmentPageData,
  type PublicInvestorPortalPayout,
} from "@/server/services/investment-payment-link.service";
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

function formatDate(value: string | null) {
  if (!value) {
    return "No pending return";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
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

function getPayoutStatusClass(status: string) {
  if (status === "paid") {
    return "bg-success-soft text-success";
  }

  if (status === "overdue") {
    return "bg-danger-soft text-danger";
  }

  return "bg-primary-soft text-primary";
}

function InvestorPortalPayoutRow({
  payout,
}: {
  payout: PublicInvestorPortalPayout;
}) {
  return (
    <div className="grid gap-3 border-b border-border-soft px-5 py-4 last:border-b-0 md:grid-cols-[1fr_150px_150px_120px] md:items-center">
      <div>
        <p className="font-black text-text-strong">{payout.payoutLabel}</p>
        <p className="mt-1 text-sm font-semibold text-text-muted">
          Due {formatDate(payout.dueDate)}
        </p>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Amount due
        </p>
        <p className="mt-1 font-black text-text-strong">
          {formatNaira(payout.amountDue)}
        </p>
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Paid
        </p>
        <p className="mt-1 font-black text-text-strong">
          {formatNaira(payout.amountPaid)}
        </p>
      </div>

      <span
        className={`inline-flex min-h-7 w-fit items-center rounded-full px-3 text-xs font-black capitalize ${getPayoutStatusClass(
          payout.status,
        )}`}
      >
        {payout.status}
      </span>
    </div>
  );
}

function InvestorPortal({
  companyName,
  planName,
  portal,
}: {
  companyName: string;
  planName: string;
  portal: NonNullable<
    Awaited<ReturnType<typeof getPublicInvestmentPageData>>["portal"]
  >;
}) {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-4xl border border-border-soft bg-white shadow-card">
          <div className="bg-primary px-6 py-7 text-white sm:px-8">
            <p className="text-sm font-black uppercase tracking-wide text-white/75">
              {companyName}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Welcome, {portal.investorName}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/85">
              This is your investor page. You can view your investment amount,
              receipt, return dates, and payment status here.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-4">
            <div className="rounded-2xl bg-primary-soft p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Investment
              </p>
              <p className="mt-1 font-black text-text-strong">{planName}</p>
            </div>

            <div className="rounded-2xl bg-primary-soft p-4">
              <p className="text-xs font-black uppercase tracking-wide text-primary">
                Amount invested
              </p>
              <p className="mt-1 font-black text-text-strong">
                {formatNaira(portal.principalAmount)}
              </p>
            </div>

            <div className="rounded-2xl bg-success-soft p-4">
              <p className="text-xs font-black uppercase tracking-wide text-success">
                Expected return
              </p>
              <p className="mt-1 font-black text-text-strong">
                {formatNaira(portal.expectedReturnAmount)}
              </p>
            </div>

            <div className="rounded-2xl bg-warning-soft p-4">
              <p className="text-xs font-black uppercase tracking-wide text-warning">
                Next return date
              </p>
              <p className="mt-1 font-black text-text-strong">
                {formatDate(portal.nextPayoutDate)}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="overflow-hidden rounded-4xl border border-border-soft bg-white shadow-card">
            <div className="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-4">
              <div>
                <h2 className="font-black text-text-strong">Return schedule</h2>
                <p className="mt-1 text-sm font-semibold text-text-muted">
                  See when returns are due and which ones have been paid.
                </p>
              </div>
              <CalendarClock
                aria-hidden="true"
                className="text-primary"
                size={24}
                strokeWidth={2.6}
              />
            </div>

            {portal.payouts.length > 0 ? (
              <div>
                {portal.payouts.map((payout) => (
                  <InvestorPortalPayoutRow key={payout.id} payout={payout} />
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <CalendarClock
                  aria-hidden="true"
                  className="mx-auto text-text-muted"
                  size={34}
                  strokeWidth={2.4}
                />
                <p className="mt-3 font-black text-text-strong">
                  No return schedule yet
                </p>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-4xl border border-border-soft bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-success-soft text-success">
                  <CheckCircle2
                    aria-hidden="true"
                    size={22}
                    strokeWidth={2.7}
                  />
                </div>
                <div>
                  <p className="font-black text-text-strong">
                    Investment active
                  </p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    Started {formatDate(portal.startDate)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Maturity date
                  </p>
                  <p className="mt-1 font-black text-text-strong">
                    {formatDate(portal.maturityDate)}
                  </p>
                </div>

                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Total at maturity
                  </p>
                  <p className="mt-1 font-black text-text-strong">
                    {formatNaira(portal.maturityTotalAmount)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-4xl border border-border-soft bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <FileText aria-hidden="true" size={22} strokeWidth={2.7} />
                </div>
                <div>
                  <p className="font-black text-text-strong">Receipt</p>
                  <p className="mt-1 text-sm font-semibold text-text-muted">
                    Download your payment receipt.
                  </p>
                </div>
              </div>

              {portal.receiptDownloadUrl ? (
                <a
                  href={portal.receiptDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white transition hover:bg-primary-hover"
                >
                  <Download aria-hidden="true" size={18} strokeWidth={2.6} />
                  Download receipt
                </a>
              ) : (
                <div className="mt-5 rounded-2xl bg-warning-soft px-4 py-3 text-sm font-bold leading-6 text-warning">
                  Receipt is being prepared. Refresh this page shortly.
                </div>
              )}
            </section>

            <section className="rounded-4xl border border-border-soft bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <TrendingUp aria-hidden="true" size={22} strokeWidth={2.7} />
                </div>
                <div>
                  <p className="font-black text-text-strong">
                    Want to invest again?
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                    Request a fresh secure investment link from Piedras
                    Properties before making another investment.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
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

  if (pageData.portal) {
    return (
      <InvestorPortal
        companyName={pageData.companyName}
        planName={pageData.plan.plan_name}
        portal={pageData.portal}
      />
    );
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
              <h2 className="font-black text-text-strong">Offer details</h2>
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
