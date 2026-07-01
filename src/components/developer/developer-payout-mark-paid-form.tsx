"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { MessageCircle } from "lucide-react";
import { markInvestorPayoutPaidAction } from "@/actions/developer-investor-payouts.actions";
import { initialDeveloperInvestorPayoutActionState } from "@/actions/developer-investor-payouts.state";

type DeveloperPayoutMarkPaidFormProps = {
  investorId: string;
  payoutId: string;
  amountDue: number;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-extrabold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Mark as paid"}
    </button>
  );
}

export function DeveloperPayoutMarkPaidForm({
  investorId,
  payoutId,
  amountDue,
}: DeveloperPayoutMarkPaidFormProps) {
  const [state, formAction] = useActionState(
    markInvestorPayoutPaidAction,
    initialDeveloperInvestorPayoutActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-button border border-border-soft bg-background p-3"
    >
      <input type="hidden" name="investorId" value={investorId} />
      <input type="hidden" name="payoutId" value={payoutId} />

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-text-muted">
          Amount to record as paid
        </p>
        <p className="mt-1 text-sm font-black text-text-strong">
          {formatNaira(amountDue)}
        </p>
        <p className="mt-1 text-xs font-semibold leading-5 text-text-muted">
          Part-payment is not supported. This records the full payout amount.
        </p>
      </div>

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
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-button bg-success px-4 text-sm font-extrabold text-white transition hover:opacity-90"
        >
          <MessageCircle aria-hidden="true" size={17} strokeWidth={2.7} />
          Send WhatsApp confirmation
        </a>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-black text-text-strong">
          Payment date
        </span>
        <input
          name="paymentDate"
          type="date"
          defaultValue={getTodayIso()}
          required
          className="min-h-10 w-full rounded-button border border-border-soft bg-white px-3 text-sm font-bold text-text-strong outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-black text-text-strong">
          Payment channel
        </span>
        <select
          name="paymentChannel"
          required
          defaultValue="bank_transfer"
          className="min-h-10 w-full rounded-button border border-border-soft bg-white px-3 text-sm font-bold text-text-strong outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
        >
          <option value="bank_transfer">Bank transfer</option>
          <option value="cheque">Cheque</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-black text-text-strong">Reference</span>
        <input
          name="paymentReference"
          placeholder="Bank reference or approval code"
          required
          className="min-h-10 w-full rounded-button border border-border-soft bg-white px-3 text-sm font-bold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary-soft"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-black text-text-strong">Note</span>
        <textarea
          name="note"
          rows={2}
          placeholder="Optional internal note"
          className="w-full rounded-button border border-border-soft bg-white px-3 py-2 text-sm font-bold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary-soft"
        />
      </label>

      <SubmitButton />
    </form>
  );
}
