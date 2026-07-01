import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Landmark,
} from "lucide-react";
import { DeveloperPayoutMarkPaidForm } from "@/components/developer/developer-payout-mark-paid-form";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import {
  getDeveloperInvestorDetail,
  type DeveloperInvestorDetailStatus,
} from "@/server/services/developer-investor-details.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";

type InvestorDetailPageProps = {
  params: Promise<{
    investorId: string;
  }>;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatChannel(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return value
    .split("_")
    .map((item) => item.slice(0, 1).toUpperCase() + item.slice(1))
    .join(" ");
}

function StatusBadge({ status }: { status: DeveloperInvestorDetailStatus }) {
  const className =
    status === "Overdue"
      ? "bg-danger-soft text-danger"
      : status === "Due today" || status === "Due soon"
        ? "bg-warning-soft text-warning"
        : status === "Paid"
          ? "bg-success-soft text-success"
          : status === "Cancelled"
            ? "bg-surface text-text-muted"
            : "bg-primary-soft text-primary";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-black ${className}`}
    >
      {status}
    </span>
  );
}

export default async function DeveloperInvestorDetailPage({
  params,
}: InvestorDetailPageProps) {
  const { investorId } = await params;
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();
  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  if (!account) {
    notFound();
  }

  let detail;

  try {
    detail = await getDeveloperInvestorDetail({
      supabase,
      developerAccountId: account.id,
      investorId,
    });
  } catch {
    notFound();
  }

  const hasOverduePayout = detail.payouts.some(
    (payout) => payout.displayStatus === "Overdue",
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/developer/investors"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-primary"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.7} />
            Back to investors
          </Link>

          <h1 className="mt-3 text-2xl font-black tracking-tight text-text-strong">
            {detail.investor.fullName}
          </h1>

          <p className="mt-1 text-sm font-semibold text-text-muted">
            {detail.investor.phoneNumber ?? "No phone"} ·{" "}
            {detail.investor.email ?? "No email"}
          </p>
        </div>
      </div>

      {hasOverduePayout ? (
        <section className="rounded-card border border-danger/20 bg-danger-soft p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-danger">
              <AlertTriangle aria-hidden="true" size={20} strokeWidth={2.7} />
            </div>

            <div>
              <p className="font-black text-danger">
                This investor has overdue payout
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-danger">
                It will remain at the top until the payout is marked as paid.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-card border border-border-soft bg-white p-4 shadow-card">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Investments
            </p>
            <p className="mt-1 text-xl font-black text-text-strong">
              {detail.summary.investmentCount}
            </p>
          </div>

          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Capital
            </p>
            <p className="mt-1 text-xl font-black text-text-strong">
              {formatNaira(detail.summary.totalPrincipal)}
            </p>
          </div>

          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Expected return
            </p>
            <p className="mt-1 text-xl font-black text-primary">
              {formatNaira(detail.summary.totalExpectedReturn)}
            </p>
          </div>

          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Total maturity value
            </p>
            <p className="mt-1 text-xl font-black text-success">
              {formatNaira(detail.summary.totalMaturityValue)}
            </p>
          </div>

          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Pending payout
            </p>
            <p className="mt-1 text-xl font-black text-warning">
              {formatNaira(detail.summary.totalPendingPayout)}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
        <div className="border-b border-border-soft px-5 py-4">
          <h2 className="font-black text-text-strong">Payout schedule</h2>
          <p className="mt-1 text-sm font-semibold text-text-muted">
            Overdue payouts stay first until marked as paid.
          </p>
        </div>

        {detail.payouts.length > 0 ? (
          <div className="divide-y divide-border-soft">
            {detail.payouts.map((payout) => {
              const canMarkPaid =
                payout.status !== "paid" && payout.status !== "cancelled";

              return (
                <div
                  key={payout.id}
                  className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_340px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-text-strong">
                        {payout.payoutLabel}
                      </p>
                      <StatusBadge status={payout.displayStatus} />
                    </div>

                    <p className="mt-2 text-sm font-semibold text-text-muted">
                      {payout.investmentTitle ?? "Investment"} · Due{" "}
                      {formatDate(payout.dueDate)}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
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
                          Amount paid
                        </p>
                        <p className="mt-1 font-black text-text-strong">
                          {formatNaira(payout.amountPaid)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                          Paid on
                        </p>
                        <p className="mt-1 font-bold text-text-strong">
                          {formatDate(payout.paidAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                          Channel
                        </p>
                        <p className="mt-1 font-bold text-text-strong">
                          {formatChannel(payout.paymentChannel)}
                        </p>
                      </div>
                    </div>

                    {payout.paymentReference ? (
                      <p className="mt-3 text-sm font-semibold text-text-muted">
                        Reference:{" "}
                        <span className="font-black text-text-strong">
                          {payout.paymentReference}
                        </span>
                      </p>
                    ) : null}

                    {payout.notes ? (
                      <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                        Note: {payout.notes}
                      </p>
                    ) : null}
                  </div>

                  {canMarkPaid ? (
                    <DeveloperPayoutMarkPaidForm
                      investorId={detail.investor.id}
                      payoutId={payout.id}
                      amountDue={payout.amountDue}
                    />
                  ) : (
                    <div className="rounded-button border border-success/20 bg-success-soft p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2
                          aria-hidden="true"
                          className="text-success"
                          size={20}
                          strokeWidth={2.7}
                        />
                        <div>
                          <p className="font-black text-success">
                            Payout closed
                          </p>
                          <p className="mt-1 text-sm font-semibold leading-5 text-success">
                            This payout is no longer urgent.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Clock3
              aria-hidden="true"
              className="mx-auto text-text-muted"
              size={34}
              strokeWidth={2.4}
            />
            <p className="mt-3 font-black text-text-strong">
              No payout schedule yet
            </p>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
        <div className="border-b border-border-soft px-5 py-4">
          <h2 className="font-black text-text-strong">Investment records</h2>
        </div>

        {detail.investments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-soft bg-background text-xs font-black uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3">Investment</th>
                  <th className="px-5 py-3">Start</th>
                  <th className="px-5 py-3">Maturity</th>
                  <th className="px-5 py-3 text-right">Capital</th>
                  <th className="px-5 py-3 text-right">Return</th>
                  <th className="px-5 py-3 text-right">Total due</th>
                </tr>
              </thead>

              <tbody>
                {detail.investments.map((investment) => (
                  <tr
                    key={investment.id}
                    className="border-b border-border-soft last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-black text-text-strong">
                        {investment.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        {investment.planName ?? "No plan name"} ·{" "}
                        {investment.status}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-text-muted">
                      {formatDate(investment.startDate)}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-text-muted">
                      {formatDate(investment.maturityDate)}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-text-strong">
                      {formatNaira(investment.principalAmount)}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-primary">
                      {formatNaira(investment.expectedReturnAmount)}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-success">
                      {formatNaira(investment.maturityTotalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Landmark
              aria-hidden="true"
              className="mx-auto text-text-muted"
              size={34}
              strokeWidth={2.4}
            />
            <p className="mt-3 font-black text-text-strong">
              No investment record yet
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
