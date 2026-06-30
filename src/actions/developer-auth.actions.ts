"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { DeveloperAuthActionState } from "@/actions/developer-auth.state";
import {
  developerLoginSchema,
  developerRegisterSchema,
} from "@/server/validators/auth.schema";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

async function createSupabaseCookieClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

function createSupabaseAdminClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

function readFormText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

async function deleteAuthUserSafely(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.auth.admin.deleteUser(userId);
}

function getPiedrasCompanyName(): string {
  return process.env.PIEDRAS_COMPANY_NAME?.trim() || "Piedras Properties";
}

export async function registerDeveloperAction(
  _previousState: DeveloperAuthActionState,
  formData: FormData,
): Promise<DeveloperAuthActionState> {
  const parsed = developerRegisterSchema.safeParse({
    fullName: readFormText(formData.get("fullName")),
    email: readFormText(formData.get("email")),
    password: readFormText(formData.get("password")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const companyName = getPiedrasCompanyName();
  const supabase = await createSupabaseCookieClient();
  const admin = createSupabaseAdminClient();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appUrl}/developer/login`,
      data: {
        role: "developer",
        full_name: parsed.data.fullName,
        company_name: companyName,
      },
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Unable to create account.",
    };
  }

  const userId = data.user?.id;

  if (!userId) {
    return {
      status: "error",
      message: "Unable to create account.",
    };
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "developer",
      full_name: parsed.data.fullName,
      phone_number: null,
      email: parsed.data.email,
      country_code: "NG",
      preferred_currency: "NGN",
      is_active: true,
      environment_mode: "live",
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    await deleteAuthUserSafely(userId);

    return {
      status: "error",
      message: "Unable to save profile.",
    };
  }

  const { data: existingAccount, error: existingAccountError } = await admin
    .from("developer_accounts")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existingAccountError) {
    await deleteAuthUserSafely(userId);

    return {
      status: "error",
      message: "Unable to check Piedras workspace.",
    };
  }

  let developerAccountId = existingAccount?.id as string | undefined;

  if (!developerAccountId) {
    const { data: developerAccount, error: accountError } = await admin
      .from("developer_accounts")
      .insert({
        owner_profile_id: userId,
        company_name: companyName,
        company_phone: null,
        company_email: parsed.data.email,
        rc_number: null,
        office_address: null,
        status: "active",
        subscription_plan: "starter",
      })
      .select("id")
      .single();

    if (accountError || !developerAccount) {
      await deleteAuthUserSafely(userId);

      return {
        status: "error",
        message: "Unable to create Piedras workspace.",
      };
    }

    developerAccountId = developerAccount.id;
  }

  const { error: developerProfileError } = await admin
    .from("developer_profiles")
    .insert({
      developer_account_id: developerAccountId,
      profile_id: userId,
      full_name: parsed.data.fullName,
      phone_number: null,
      email: parsed.data.email,
      role: "developer_owner",
      is_active: true,
      accepted_at: new Date().toISOString(),
    });

  if (developerProfileError) {
    await deleteAuthUserSafely(userId);

    return {
      status: "error",
      message: "Unable to create account access.",
    };
  }

  redirect("/developer/login?registered=1");
}

export async function loginDeveloperAction(
  _previousState: DeveloperAuthActionState,
  formData: FormData,
): Promise<DeveloperAuthActionState> {
  const parsed = developerLoginSchema.safeParse({
    email: readFormText(formData.get("email")),
    password: readFormText(formData.get("password")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please enter a valid email and password.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseCookieClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      status: "error",
      message: "That email address or password is incorrect.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", data.user.id)
    .eq("role", "developer")
    .maybeSingle();

  if (profileError || !profile || profile.is_active !== true) {
    await supabase.auth.signOut();

    return {
      status: "error",
      message: "This account is not active.",
    };
  }

  redirect("/developer");
}

export async function developerSignOutAction(): Promise<void> {
  const supabase = await createSupabaseCookieClient();

  await supabase.auth.signOut();

  redirect("/developer/login");
}
