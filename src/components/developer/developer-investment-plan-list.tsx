"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Link2, MessageCircle } from "lucide-react";
import { createInvestmentPaymentLinkAction } from "@/actions/developer-investment-plans.actions";
import { initialDeveloperInvestmentPlanActionState } from "@/actions/developer-investment-plans.state";

type DeveloperInvestmentPlanRow = {
  id: string;
  plan_name: string;
  summary: string | null;
  minimum_amount: number | string;
  maximum_amount: number | string | null;
  return_type: "percentage" | "fixed";
  return_rate_percent: number | string | null;
  fixed_return_amount: number | string | null;
  duration_months: number;
  payout_frequency: "maturity" | "monthly" | "quarterly" | "biannual";
  status: "draft" | "active" | "paused" | "closed";
};

type DeveloperInvestmentPlanListProps = {
  plans: DeveloperInvestmentPlanRow[];
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

function formatInvestmentReturn(plan: DeveloperInvestmentPlanRow) {
  if (plan.return_type === "percentage") {
    return `${Number(plan.return_rate_percent ?? 0)}% return`;
  }

  return `Fixed return of ${formatNaira(plan.fixed_return_amount)}`;
}

function formatPayoutFrequency(
  frequency: DeveloperInvestmentPlanRow["payout_frequency"],
) {
  if (frequency === "maturity") {
    return "At maturity";
  }

  if (frequency === "monthly") {
    return "Monthly";
  }

  if (frequency === "quarterly") {
    return "Quarterly";
  }

  return "Bi-annually";
}

function LinkButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-extrabold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Link2 aria-hidden="true" size={16} strokeWidth={2.6} />
      {pending ? "Creating link..." : "Create investor link"}
    </button>
  );
}

function InvestmentLinkForm({ plan }: { plan: DeveloperInvestmentPlanRow }) {
  const [state, formAction] = useActionState(
    createInvestmentPaymentLinkAction,
    initialDeveloperInvestmentPlanActionState,
  );
  const [copied, setCopied] = useState(false);

  const whatsappHref = useMemo(() => {
    if (!state.investmentLink) {
      return null;
    }

    const message = `Hello, please use this secure Piedras Properties link to review the ${plan.plan_name} investment offer and proceed with payment: ${state.investmentLink}`;

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [plan.plan_name, state.investmentLink]);

  async function copyInvestmentLink() {
    if (!state.investmentLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.investmentLink);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <input type="hidden" name="investmentPlanId" value={plan.id} />
        <LinkButton />
      </form>

      {state.investmentLink ? (
        <div className="rounded-2xl border border-primary/15 bg-white p-3">
          <button
            type="button"
            onClick={copyInvestmentLink}
            className="block w-full rounded-xl bg-primary-soft px-3 py-3 text-left transition hover:bg-primary-soft/80"
            aria-label="Copy investment link"
          >
            <span className="block text-xs font-black uppercase tracking-wide text-primary">
              Click to copy link
            </span>
            <span className="mt-2 block break-all text-sm font-black leading-6 text-text-strong">
              {state.investmentLink}
            </span>
          </button>

          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={copyInvestmentLink}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button border border-border-soft bg-white px-3 text-sm font-extrabold text-text-strong transition hover:bg-primary-soft hover:text-primary"
            >
              {copied ? (
                <Check aria-hidden="true" size={16} strokeWidth={2.7} />
              ) : (
                <Copy aria-hidden="true" size={16} strokeWidth={2.7} />
              )}
              {copied ? "Copied" : "Copy link"}
            </button>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button border border-success/20 bg-white px-3 text-sm font-extrabold text-text-strong transition hover:bg-success-soft hover:text-success"
              >
                <MessageCircle aria-hidden="true" size={16} strokeWidth={2.6} />
                Send via WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-xs font-bold text-danger">{state.message}</p>
      ) : null}
    </div>
  );
}

export function DeveloperInvestmentPlanList({
  plans,
}: DeveloperInvestmentPlanListProps) {
  if (plans.length === 0) {
    return (
      <div className="rounded-card border border-border-soft bg-white px-5 py-10 text-center shadow-card">
        <p className="font-black text-text-strong">
          No investment offer created yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-text-muted">
          Create the first offer marketers can share with prospective investors.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
      <div className="border-b border-border-soft px-5 py-4">
        <h2 className="font-black text-text-strong">Existing offers</h2>
        <p className="mt-1 text-sm font-semibold text-text-muted">
          Create a secure link from an offer and send it to a prospective
          investor.
        </p>
      </div>

      <div className="divide-y divide-border-soft">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_320px]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-text-strong">{plan.plan_name}</p>
                <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-black capitalize text-success">
                  {plan.status}
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold leading-6 text-text-muted">
                {plan.summary ?? "No summary added."}
              </p>

              <div className="mt-3 grid gap-3 text-sm font-bold text-text-strong md:grid-cols-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Minimum
                  </p>
                  <p className="mt-1">{formatNaira(plan.minimum_amount)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Maximum
                  </p>
                  <p className="mt-1">{formatNaira(plan.maximum_amount)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Return
                  </p>
                  <p className="mt-1">{formatInvestmentReturn(plan)}</p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Payout
                  </p>
                  <p className="mt-1">
                    {formatPayoutFrequency(plan.payout_frequency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-button border border-border-soft bg-background p-3">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-text-muted">
                Investor payment link
              </p>
              <InvestmentLinkForm plan={plan} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
