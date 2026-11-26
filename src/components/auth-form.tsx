"use client";

import { useActionState } from "react";
import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { loginAction, signUpAction, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? loginAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition ${
            mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Create account
        </button>
      </div>

      <form action={formAction} className="space-y-4" key={mode}>
        <input type="hidden" name="next" value={next} />

        <Field label="Work email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
            required
          />
        </Field>

        {mode === "signup" ? (
          <Field label="Confirm password" htmlFor="confirm" required>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
        ) : null}

        {state?.error ? (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        ) : null}

        {state?.message ? (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.message}</span>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {mode === "signin" ? "Sign in to workspace" : "Create account"}
        </Button>
      </form>

      <p className="mt-5 text-xs leading-relaxed text-slate-400">
        {mode === "signin"
          ? "Demo environment: use the account created by your team, or create a new one and load demo data."
          : "After signing up you can load a full demo dataset (10 clients, 25 campaigns, 500 leads) with one click."}
      </p>
    </div>
  );
}
