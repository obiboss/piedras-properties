"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createInvestmentPlanAction } from "@/actions/developer-investment-plans.actions";
import { initialDeveloperInvestmentPlanActionState } from "@/actions/developer-investment-plans.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="min-h-11 rounded-button"
      disabled={pending}
    >
      {pending ? "Creating plan..." : "Create investment plan"}
    </Button>
  );
}

export function DeveloperInvestmentPlanForm() {
  const [state, formAction] = useActionState(
    createInvestmentPlanAction,
    initialDeveloperInvestmentPlanActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div
          role="status"
          className={`rounded-button px-4 py-3 text-sm font-bold ${
            state.status === "success"
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Plan name"
          name="planName"
          placeholder="40% Return in 12 Months"
          required
        />

        <Input
          label="Minimum investment amount"
          name="minimumAmount"
          type="number"
          min="1"
          step="0.01"
          placeholder="1000000"
          required
        />

        <Input
          label="Maximum investment amount"
          name="maximumAmount"
          type="number"
          min="1"
          step="0.01"
          placeholder="Optional"
        />

        <Input
          label="Duration in months"
          name="durationMonths"
          type="number"
          min="1"
          step="1"
          placeholder="12"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-sm font-black text-text-strong">
            Return type
          </span>
          <select
            name="returnType"
            required
            defaultValue="percentage"
            className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-bold text-text-strong outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>

        <Input
          label="Return percentage"
          name="returnRatePercent"
          type="number"
          min="0"
          step="0.01"
          placeholder="40"
        />

        <Input
          label="Fixed return amount"
          name="fixedReturnAmount"
          type="number"
          min="0"
          step="0.01"
          placeholder="Only for fixed return"
        />
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-black text-text-strong">
          Payout frequency
        </span>
        <select
          name="payoutFrequency"
          required
          defaultValue="maturity"
          className="min-h-12 w-full rounded-button border border-border-soft bg-white px-4 text-sm font-bold text-text-strong outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft"
        >
          <option value="maturity">One-time at maturity</option>
          <option value="monthly">Monthly return, capital at maturity</option>
          <option value="quarterly">
            Quarterly return, capital at maturity
          </option>
          <option value="biannual">
            Bi-annual return, capital at maturity
          </option>
        </select>
      </label>

      <Input
        label="Short summary"
        name="summary"
        placeholder="Invest and receive capital plus return after 12 months"
      />

      <label className="block space-y-2">
        <span className="text-sm font-black text-text-strong">Description</span>
        <textarea
          name="description"
          rows={4}
          className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-bold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary-soft"
          placeholder="Explain the investment opportunity in simple terms."
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-black text-text-strong">
          Terms shown to investor
        </span>
        <textarea
          name="terms"
          rows={4}
          className="w-full rounded-button border border-border-soft bg-white px-4 py-3 text-sm font-bold text-text-strong outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary-soft"
          placeholder="State the payout promise, duration, and important terms."
        />
      </label>

      <SubmitButton />
    </form>
  );
}
