"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginDeveloperAction } from "@/actions/developer-auth.actions";
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

        <h1 className="text-center text-2xl font-semibold text-slate-950">
          {" "}
          Sign in to your account obi
        </h1>

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

        <div className="pt-1">
          <SubmitButton />
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 text-center text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>Founder, admin, or manager?</span>
          <Link
            href="/developer/register"
            className="font-semibold text-blue-700 transition hover:text-blue-800"
          >
            Create admin account
          </Link>
        </div>

        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          Staff members should not create public accounts. They must join
          through an invite link sent from the company workspace.
        </p>
      </form>
    </div>
  );
}
