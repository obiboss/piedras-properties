"use client";

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
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account..." : "Create developer account"}
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
        label="Email address"
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

      <SubmitButton />
    </form>
  );
}
