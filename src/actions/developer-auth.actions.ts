"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  developerLoginSchema,
  developerRegisterSchema,
} from "@/server/validators/auth.schema";
import { normalisePhoneNumber } from "@/server/utils/phone";

export type DeveloperAuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialDeveloperAuthActionState: DeveloperAuthActionState = {
  status: "idle",
  message: "",
};

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

// function nullableText(value: string | null | undefined): string | null {
//   if (!value) {
//     return null;
//   }

//   const trimmed = value.trim();

//   if (!trimmed) {
//     return null;
//   }

//   return trimmed;
// }

async function deleteAuthUserSafely(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  await admin.auth.admin.deleteUser(userId);
}

export async function registerDeveloperAction(
  _previousState: DeveloperAuthActionState,
  formData: FormData,
): Promise<DeveloperAuthActionState> {
  const parsed = developerRegisterSchema.safeParse({
    fullName: readFormText(formData.get("fullName")),
    email: readFormText(formData.get("email")),
    password: readFormText(formData.get("password")),
    companyName: readFormText(formData.get("companyName")),
    companyPhone: readFormText(formData.get("companyPhone")),
    companyEmail: readFormText(formData.get("companyEmail")),
    rcNumber: readFormText(formData.get("rcNumber")),
    officeAddress: readFormText(formData.get("officeAddress")),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  let normalizedCompanyPhone: { e164: string };

  try {
    normalizedCompanyPhone = normalisePhoneNumber(parsed.data.companyPhone);
  } catch {
    return {
      status: "error",
      message: "Enter a valid company phone number.",
      fieldErrors: {
        companyPhone: ["Enter a valid company phone number."],
      },
    };
  }

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
        company_name: parsed.data.companyName,
      },
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Unable to create developer account.",
    };
  }

  const userId = data.user?.id;

  if (!userId) {
    return {
      status: "error",
      message: "Unable to create developer account.",
    };
  }

  const companyEmail = parsed.data.companyEmail ?? parsed.data.email;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "developer",
      full_name: parsed.data.fullName,
      phone_number: normalizedCompanyPhone.e164,
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
      message: "Unable to save developer profile.",
    };
  }

  const { data: developerAccount, error: accountError } = await admin
    .from("developer_accounts")
    .insert({
      owner_profile_id: userId,
      company_name: parsed.data.companyName,
      company_phone: normalizedCompanyPhone.e164,
      company_email: companyEmail,
      rc_number: parsed.data.rcNumber,
      office_address: parsed.data.officeAddress,
      status: "active",
      subscription_plan: "starter",
    })
    .select("id")
    .single();

  if (accountError || !developerAccount) {
    await deleteAuthUserSafely(userId);

    return {
      status: "error",
      message: "Unable to create company workspace.",
    };
  }

  const { error: developerProfileError } = await admin
    .from("developer_profiles")
    .insert({
      developer_account_id: developerAccount.id,
      profile_id: userId,
      full_name: parsed.data.fullName,
      phone_number: normalizedCompanyPhone.e164,
      email: parsed.data.email,
      role: "developer_owner",
      is_active: true,
      accepted_at: new Date().toISOString(),
    });

  if (developerProfileError) {
    await deleteAuthUserSafely(userId);

    return {
      status: "error",
      message: "Unable to create developer access profile.",
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
      message: "This developer account is not active.",
    };
  }

  redirect("/developer");
}
