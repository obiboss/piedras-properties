"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { startInvestmentPaymentAction } from "@/actions/investment-payment.actions";
import { initialInvestmentPaymentActionState } from "@/actions/investment-payment.state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InvestmentPaymentFormProps = {
  token: string;
  minimumAmount: number;
  maximumAmount: number | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-12 w-full rounded-2xl"
      disabled={pending}
    >
      {pending ? "Opening payment..." : "Proceed to secure payment"}
    </Button>
  );
}

export function InvestmentPaymentForm({
  token,
  minimumAmount,
  maximumAmount,
}: InvestmentPaymentFormProps) {
  const [state, formAction] = useActionState(
    startInvestmentPaymentAction,
    initialInvestmentPaymentActionState,
  );

  useEffect(() => {
    if (state.authorizationUrl) {
      window.location.href = state.authorizationUrl;
    }
  }, [state.authorizationUrl]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {state.message ? (
        <div
          role="status"
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            state.status === "success"
              ? "bg-success-soft text-success"
              : "bg-danger-soft text-danger"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <Input
        label="Full name"
        name="fullName"
        autoComplete="name"
        placeholder="Enter your full name"
        required
      />

      <Input
        label="Phone number"
        name="phoneNumber"
        autoComplete="tel"
        placeholder="Enter your phone number"
        required
      />

      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <Input
        label="Investment amount"
        name="amount"
        type="number"
        min={minimumAmount}
        max={maximumAmount ?? undefined}
        step="0.01"
        placeholder={String(minimumAmount)}
        required
      />

      <SubmitButton />
    </form>
  );
}
