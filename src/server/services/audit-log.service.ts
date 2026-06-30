import "server-only";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

type JsonObject = Record<string, unknown>;

export type WriteAuditLogInput = {
  landlordId?: string | null;
  tenantId?: string | null;
  tenancyId?: string | null;
  unitId?: string | null;
  propertyId?: string | null;
  actorProfileId?: string | null;
  actorRole?: string | null;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: JsonObject;
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function getRequestAuditContext() {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");

    return {
      ipAddress: forwardedFor?.split(",")[0]?.trim() || null,
      userAgent: requestHeaders.get("user-agent"),
    };
  } catch {
    return {
      ipAddress: null,
      userAgent: null,
    };
  }
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  const supabase = createSupabaseAdminClient();
  const requestContext = await getRequestAuditContext();

  const { error } = await supabase.from("audit_logs").insert({
    landlord_id: input.landlordId ?? null,
    tenant_id: input.tenantId ?? null,
    tenancy_id: input.tenancyId ?? null,
    unit_id: input.unitId ?? null,
    property_id: input.propertyId ?? null,
    actor_profile_id: input.actorProfileId ?? null,
    actor_role: input.actorRole ?? "system",
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    description: input.description,
    metadata: input.metadata ?? {},
    ip_address: input.ipAddress ?? requestContext.ipAddress,
    user_agent: input.userAgent ?? requestContext.userAgent,
  });

  if (error) {
    throw new Error(`Audit log write failed: ${error.message}`);
  }
}

export async function writeSystemAuditLog(
  input: Omit<WriteAuditLogInput, "actorRole" | "actorProfileId">,
) {
  await writeAuditLog({
    ...input,
    actorRole: "system",
    actorProfileId: null,
  });
}
