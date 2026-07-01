"use client";

import Link from "next/link";
import { useState } from "react";
import { CreditCard, X } from "lucide-react";

type DeveloperBankSetupToastProps = {
  state: "missing" | "unverified" | "failed" | "verified";
};

function getToastCopy(state: DeveloperBankSetupToastProps["state"]) {
  if (state === "failed") {
    return {
      title: "Bank account needs correction",
      description: "Update the bank account before sending payment links.",
      actionLabel: "Update account",
    };
  }

  if (state === "unverified") {
    return {
      title: "Bank account under review",
      description: "Payment links unlock after the account is approved.",
      actionLabel: "View setup",
    };
  }

  return {
    title: "Add your bank account",
    description: "Add the account where buyer payments should be settled.",
    actionLabel: "Add account",
  };
}

export function DeveloperBankSetupToast({
  state,
}: DeveloperBankSetupToastProps) {
  const [dismissed, setDismissed] = useState(false);

  if (state === "verified" || dismissed) {
    return null;
  }

  const copy = getToastCopy(state);

  return (
    <div className="fixed right-4 top-24 z-50 w-[calc(100%-2rem)] max-w-sm rounded-card border border-border-soft bg-white p-4 shadow-2xl md:right-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <CreditCard aria-hidden="true" size={20} strokeWidth={2.6} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-black text-text-strong">{copy.title}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-text-muted">
            {copy.description}
          </p>

          <Link
            href="/developer?section=settings#payout-account"
            className="mt-3 inline-flex min-h-9 items-center justify-center rounded-button bg-primary px-4 text-xs font-extrabold text-white transition hover:bg-primary-hover"
          >
            {copy.actionLabel}
          </Link>
        </div>

        <button
          type="button"
          aria-label="Dismiss bank setup reminder"
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-text-muted transition hover:bg-surface hover:text-text-strong"
        >
          <X aria-hidden="true" size={16} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
