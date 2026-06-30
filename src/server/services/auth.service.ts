import "server-only";

import { redirect } from "next/navigation";
import { AppError } from "@/server/errors/app-error";
import { createSupabaseServerClient } from "@/server/supabase/server";
import type { ServerSessionUser, UserRole } from "@/server/types/auth.types";

export type AppPermission = string;

type ProfileRow = {
  id: string;
  role: UserRole;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  is_active: boolean;
};

function mapProfileToSessionUser(profile: ProfileRow): ServerSessionUser {
  return {
    id: profile.id,
    role: profile.role,
    fullName: profile.full_name,
    phoneNumber: profile.phone_number,
    email: profile.email,
  };
}

function assertAllowedRole(params: {
  role: UserRole;
  allowedRoles: readonly UserRole[];
  message?: string;
}) {
  if (!params.allowedRoles.includes(params.role)) {
    throw new AppError(
      "FORBIDDEN",
      params.message ?? "You do not have permission to access this page.",
      403,
    );
  }
}

async function fetchSessionUserProfile() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone_number, email, is_active")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (profileError || !profile || !profile.is_active) {
    return null;
  }

  return mapProfileToSessionUser(profile);
}

export async function getSessionUser(): Promise<ServerSessionUser | null> {
  return fetchSessionUserProfile();
}

export async function requireUser(): Promise<ServerSessionUser> {
  const user = await fetchSessionUserProfile();

  if (!user) {
    redirect("/developer/login");
  }

  return user;
}

export async function requireDeveloperUser(): Promise<ServerSessionUser> {
  const user = await fetchSessionUserProfile();

  if (!user) {
    redirect("/developer/login");
  }

  assertAllowedRole({
    role: user.role,
    allowedRoles: ["developer"],
    message: "You do not have permission to view this developer workspace.",
  });

  return user;
}

export async function requireDeveloper() {
  return requireDeveloperUser();
}

export async function requireRole(params: {
  allowedRoles: readonly UserRole[];
  message?: string;
}): Promise<ServerSessionUser> {
  const user = await requireUser();

  assertAllowedRole({
    role: user.role,
    allowedRoles: params.allowedRoles,
    message: params.message,
  });

  return user;
}

export async function requirePermission(
  _permission: AppPermission,
): Promise<ServerSessionUser> {
  return requireDeveloperUser();
}

function throwDisabledModule(moduleName: string): never {
  throw new AppError(
    "MODULE_DISABLED",
    `${moduleName} is not enabled for Piedras Properties.`,
    403,
  );
}

export async function requireLandlord() {
  return throwDisabledModule("Landlord module");
}

export async function requireLandlordPlatformOperator() {
  return throwDisabledModule("Landlord module");
}

export async function requireTenant() {
  return throwDisabledModule("Tenant module");
}

export async function requireCaretaker() {
  return throwDisabledModule("Caretaker module");
}

export async function requireAgent() {
  return throwDisabledModule("Agent module");
}

export async function requireLandlordOrCaretaker() {
  return throwDisabledModule("Landlord/Caretaker module");
}

export async function requireLandlordOrAgent() {
  return throwDisabledModule("Landlord/Agent module");
}
