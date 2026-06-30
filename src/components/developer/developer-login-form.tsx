"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  initialDeveloperAuthActionState,
  loginDeveloperAction,
} from "@/actions/developer-auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export function DeveloperLoginForm() {
  const [state, formAction] = useActionState(
    loginDeveloperAction,
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
        autoComplete="current-password"
        placeholder="Enter your password"
        error={state.fieldErrors?.password?.[0]}
        required
      />

      <SubmitButton />
    </form>
  );
}
