import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { DeveloperInvestmentPlanForm } from "@/components/developer/developer-investment-plan-form";
import { DeveloperInvestmentPlanList } from "@/components/developer/developer-investment-plan-list";
import { getDeveloperAccountByOwnerProfileId } from "@/server/repositories/developer.repository";
import { requireDeveloper } from "@/server/services/auth.service";
import {
  getDeveloperInvestorRows,
  getDateDiffInDays,
  getLagosDateIso,
  type DeveloperInvestorDashboardRow,
} from "@/server/services/developer-investor-payouts.service";
import { listDeveloperInvestmentPlans } from "@/server/services/developer-investment-plans.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getDueDateText(dueDate: string | null, todayIso: string) {
  if (!dueDate) {
    return "No payout scheduled";
  }

  const diff = getDateDiffInDays(todayIso, dueDate);

  if (diff < 0) {
    return `Overdue since ${formatDate(dueDate)}`;
  }

  if (diff === 0) {
    return `${formatDate(dueDate)} · today`;
  }

  if (diff === 1) {
    return `${formatDate(dueDate)} · tomorrow`;
  }

  return `${formatDate(dueDate)} · in ${diff} days`;
}

function StatusBadge({
  status,
}: {
  status: DeveloperInvestorDashboardRow["payoutStatus"];
}) {
  const className =
    status === "Overdue"
      ? "bg-danger-soft text-danger"
      : status === "Due soon"
        ? "bg-warning-soft text-warning"
        : status === "Upcoming"
          ? "bg-primary-soft text-primary"
          : "bg-success-soft text-success";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-black ${className}`}
    >
      {status}
    </span>
  );
}

export default async function DeveloperInvestorsPage() {
  const developer = await requireDeveloper();
  const supabase = createSupabaseAdminClient();

  const account = await getDeveloperAccountByOwnerProfileId(
    supabase,
    developer.id,
  );

  const [investors, investmentPlans] = account
    ? await Promise.all([
        getDeveloperInvestorRows({ developerAccountId: account.id }),
        listDeveloperInvestmentPlans({
          supabase,
          developerAccountId: account.id,
        }),
      ])
    : [[], []];

  const todayIso = getLagosDateIso();
  const overdueInvestors = investors.filter(
    (investor) => investor.payoutStatus === "Overdue",
  );
  const dueSoonInvestors = investors.filter(
    (investor) => investor.payoutStatus === "Due soon",
  );
  const totalDue = investors.reduce(
    (total, investor) => total + investor.totalAmountDue,
    0,
  );

  const sortedInvestors = [...investors].sort((a, b) => {
    const priority = {
      Overdue: 0,
      "Due soon": 1,
      Upcoming: 2,
      Clear: 3,
    };

    const priorityDiff = priority[a.payoutStatus] - priority[b.payoutStatus];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    if (!a.nextDueDate && !b.nextDueDate) {
      return a.fullName.localeCompare(b.fullName);
    }

    if (!a.nextDueDate) {
      return 1;
    }

    if (!b.nextDueDate) {
      return -1;
    }

    return a.nextDueDate.localeCompare(b.nextDueDate);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-muted">
            Investor plans, payment links, and payout dates
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-strong">
            Investors
          </h1>
        </div>

        <Link
          href="/developer"
          className="inline-flex min-h-10 items-center justify-center rounded-button border border-border-soft bg-white px-4 text-sm font-extrabold text-text-strong transition hover:bg-primary-soft hover:text-primary"
        >
          Back to overview
        </Link>
      </div>

      <section className="rounded-card border border-border-soft bg-white p-4 shadow-card">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Investors
            </p>
            <p className="mt-1 text-xl font-black text-text-strong">
              {investors.length}
            </p>
          </div>

          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Plans
            </p>
            <p className="mt-1 text-xl font-black text-primary">
              {investmentPlans.length}
            </p>
          </div>

          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Due soon
            </p>
            <p className="mt-1 text-xl font-black text-warning">
              {dueSoonInvestors.length}
            </p>
          </div>

          <div className="border-border-soft px-4 first:pl-0 md:border-l md:first:border-l-0">
            <p className="text-xs font-black uppercase tracking-wide text-text-muted">
              Total due
            </p>
            <p className="mt-1 text-xl font-black text-text-strong">
              {formatNaira(totalDue)}
            </p>
          </div>
        </div>
      </section>

      {overdueInvestors.length > 0 ? (
        <section className="rounded-card border border-danger/20 bg-danger-soft p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-danger">
              <AlertTriangle aria-hidden="true" size={20} strokeWidth={2.7} />
            </div>

            <div>
              <p className="font-black text-danger">
                {overdueInvestors.length} investor payout
                {overdueInvestors.length === 1 ? "" : "s"} overdue
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-danger">
                These investors should remain at the top until the payout is
                marked as paid.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
        <div className="flex items-center justify-between gap-4 border-b border-border-soft px-5 py-4">
          <div>
            <h2 className="font-black text-text-strong">
              Investor payout table
            </h2>
            <p className="mt-1 text-sm font-semibold text-text-muted">
              Overdue and due-soon payouts stay on top.
            </p>
          </div>
        </div>

        {sortedInvestors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-soft bg-background text-xs font-black uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3">Investor</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Investments</th>
                  <th className="px-5 py-3">Next payout</th>
                  <th className="px-5 py-3 text-right">Amount due</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {sortedInvestors.map((investor) => (
                  <tr
                    key={investor.id}
                    className="border-b border-border-soft last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-black text-text-strong">
                        {investor.fullName}
                      </p>
                      <p className="mt-1 text-xs font-semibold capitalize text-text-muted">
                        {investor.status}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-text-strong">
                        {investor.phoneNumber ?? "No phone"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        {investor.email ?? "No email"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-black text-text-strong">
                        {investor.activeInvestmentCount}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        {formatNaira(investor.totalPrincipal)} principal
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-text-muted">
                      {getDueDateText(investor.nextDueDate, todayIso)}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-text-strong">
                      {formatNaira(investor.totalAmountDue)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={investor.payoutStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <TrendingUp
              aria-hidden="true"
              className="mx-auto text-text-muted"
              size={34}
              strokeWidth={2.4}
            />
            <p className="mt-3 font-black text-text-strong">
              No investors recorded yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm font-semibold leading-6 text-text-muted">
              Investors will appear here after they complete payment through an
              investment link.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-card border border-border-soft bg-white p-5 shadow-card">
        <div className="border-b border-border-soft pb-4">
          <h2 className="font-black text-text-strong">
            Create investment plan
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
            Create the offer marketers will share. Investor records are created
            after payment is verified.
          </p>
        </div>

        <div className="mt-5">
          <DeveloperInvestmentPlanForm />
        </div>
      </section>

      <DeveloperInvestmentPlanList plans={investmentPlans} />

      {dueSoonInvestors.length === 0 && overdueInvestors.length === 0 ? (
        <section className="rounded-card border border-success/20 bg-success-soft p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-success">
              <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2.7} />
            </div>

            <div>
              <p className="font-black text-success">
                No urgent investor payout today
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-success">
                Investors with upcoming returns will move to the top when their
                payout date gets close.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {investors.length > 0 ? (
        <section className="rounded-card border border-border-soft bg-white p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <CalendarClock aria-hidden="true" size={20} strokeWidth={2.7} />
            </div>

            <div>
              <p className="font-black text-text-strong">
                How this page is sorted
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-text-muted">
                Overdue payouts show first, then payouts due within 7 days, then
                upcoming payouts, then investors with no pending payout.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
