"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerDeveloperAction } from "@/actions/developer-auth.actions";
import { initialDeveloperAuthActionState } from "@/actions/developer-auth.state";
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
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

export function DeveloperRegisterForm() {
  const [state, formAction] = useActionState(
    registerDeveloperAction,
    initialDeveloperAuthActionState,
  );

  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
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
          placeholder="you@piedrasproperties.com"
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
