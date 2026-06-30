"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { registerDeveloperAction } from "@/actions/developer-auth.actions";
import { initialDeveloperAuthActionState } from "@/actions/developer-auth.state";
import { PhoneNumberInput } from "@/components/auth/phone-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-12 w-full rounded-2xl"
      disabled={pending}
    >
      {pending ? "Creating account..." : "Create admin account"}
    </Button>
  );
}

export function DeveloperRegisterForm() {
  const [companyPhone, setCompanyPhone] = useState("");

  const [state, formAction] = useActionState(
    registerDeveloperAction,
    initialDeveloperAuthActionState,
  );

  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-950">
          Founder, admin, or manager signup only
        </p>
        <p className="mt-1 text-xs leading-5 text-blue-800">
          Sales reps, document officers, accountants, and other staff should
          join through an invite link sent from the company workspace.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {state.status === "error" && state.message ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {state.message}
          </div>
        ) : null}

        <Input
          label="Full name"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          error={state.fieldErrors?.fullName?.[0]}
          required
        />

        <Input
          label="Work email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={state.fieldErrors?.email?.[0]}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a secure password"
          error={state.fieldErrors?.password?.[0]}
          required
        />

        <Input
          label="Company name"
          name="companyName"
          type="text"
          autoComplete="organization"
          placeholder="Piedras Properties"
          error={state.fieldErrors?.companyName?.[0]}
          required
        />

        <PhoneNumberInput
          label="Company phone number"
          name="companyPhone"
          value={companyPhone}
          onChange={setCompanyPhone}
          error={state.fieldErrors?.companyPhone?.[0]}
        />

        <Input
          label="Company email"
          name="companyEmail"
          type="email"
          autoComplete="email"
          placeholder="Optional"
          error={state.fieldErrors?.companyEmail?.[0]}
        />

        <Input
          label="RC number"
          name="rcNumber"
          type="text"
          placeholder="Optional"
          error={state.fieldErrors?.rcNumber?.[0]}
        />

        <Input
          label="Office address"
          name="officeAddress"
          type="text"
          autoComplete="street-address"
          placeholder="Optional"
          error={state.fieldErrors?.officeAddress?.[0]}
        />

        <div className="pt-1">
          <SubmitButton />
        </div>

        <div className="border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/developer/login"
            className="font-semibold text-blue-700 transition hover:text-blue-800"
          >
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
