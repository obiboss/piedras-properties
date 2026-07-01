"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { MessageCircle, UserRoundCheck } from "lucide-react";
import { prepareInvestmentLeadFollowUpAction } from "@/actions/developer-investment-leads.actions";
import { initialDeveloperInvestmentLeadActionState } from "@/actions/developer-investment-leads.state";
import type { DeveloperInvestmentUnpaidLead } from "@/server/services/developer-investment-leads.service";

type DeveloperInvestmentLeadFollowUpListProps = {
  leads: DeveloperInvestmentUnpaidLead[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: DeveloperInvestmentUnpaidLead["status"]) {
  if (status === "failed") {
    return "Payment failed";
  }

  if (status === "details_submitted") {
    return "Details submitted";
  }

  return "Payment started";
}

function getStatusClass(status: DeveloperInvestmentUnpaidLead["status"]) {
  if (status === "failed") {
    return "bg-danger-soft text-danger";
  }

  if (status === "details_submitted") {
    return "bg-warning-soft text-warning";
  }

  return "bg-primary-soft text-primary";
}

function FollowUpSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-button bg-success px-4 text-sm font-extrabold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <MessageCircle aria-hidden="true" size={17} strokeWidth={2.7} />
      {pending ? "Preparing..." : "Follow up on WhatsApp"}
    </button>
  );
}

function LeadFollowUpForm({ linkId }: { linkId: string }) {
  const [state, formAction] = useActionState(
    prepareInvestmentLeadFollowUpAction,
    initialDeveloperInvestmentLeadActionState,
  );

  useEffect(() => {
    if (state.whatsappHref) {
      window.open(state.whatsappHref, "_blank", "noopener,noreferrer");
    }
  }, [state.whatsappHref]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="linkId" value={linkId} />

      {state.message ? (
        <div
          role="status"
          className={`rounded-button px-3 py-2 text-xs font-bold ${
            state.status === "success"
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      {state.whatsappHref ? (
        <a
          href={state.whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-button border border-success/20 bg-white px-4 text-sm font-extrabold text-success transition hover:bg-success-soft"
        >
          <MessageCircle aria-hidden="true" size={17} strokeWidth={2.7} />
          Open WhatsApp again
        </a>
      ) : null}

      <FollowUpSubmitButton />
    </form>
  );
}

export function DeveloperInvestmentLeadFollowUpList({
  leads,
}: DeveloperInvestmentLeadFollowUpListProps) {
  if (leads.length === 0) {
    return (
      <section className="rounded-card border border-success/20 bg-success-soft p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-success">
            <UserRoundCheck aria-hidden="true" size={20} strokeWidth={2.7} />
          </div>

          <div>
            <p className="font-black text-success">No unpaid investor lead</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-success">
              Investors who start payment but do not complete it will appear
              here for follow-up.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-card border border-border-soft bg-white shadow-card">
      <div className="border-b border-border-soft px-5 py-4">
        <h2 className="font-black text-text-strong">
          Unpaid investor follow-up
        </h2>
        <p className="mt-1 text-sm font-semibold text-text-muted">
          Follow up investors who started payment but did not complete it.
        </p>
      </div>

      <div className="divide-y divide-border-soft">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_260px]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-text-strong">{lead.fullName}</p>
                <span
                  className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-black ${getStatusClass(
                    lead.status,
                  )}`}
                >
                  {getStatusLabel(lead.status)}
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold text-text-muted">
                {lead.planName} · {formatNaira(lead.amountRequested)}
              </p>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Phone
                  </p>
                  <p className="mt-1 font-bold text-text-strong">
                    {lead.phoneNumber ?? "No phone"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Email
                  </p>
                  <p className="mt-1 font-bold text-text-strong">
                    {lead.email ?? "No email"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Last activity
                  </p>
                  <p className="mt-1 font-bold text-text-strong">
                    {formatDateTime(lead.lastActivityAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-text-muted">
                    Follow-ups
                  </p>
                  <p className="mt-1 font-bold text-text-strong">
                    {lead.followUpCount} · Last:{" "}
                    {formatDateTime(lead.lastFollowedUpAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-button border border-border-soft bg-background p-3">
              <LeadFollowUpForm linkId={lead.id} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
