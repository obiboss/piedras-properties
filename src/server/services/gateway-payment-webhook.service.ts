import "server-only";

import { AppError, isAppError } from "@/server/errors/app-error";
import { getDeveloperPaymentIntentByReference } from "@/server/repositories/developer-payment-intents.repository";
import {
  markGatewayPaymentEventFailed,
  markGatewayPaymentEventIgnored,
  markGatewayPaymentEventProcessed,
  registerGatewayPaymentEvent,
} from "@/server/repositories/gateway-payment-event.repository";
import { verifyAndPostDeveloperPaymentReference } from "@/server/services/developer-payment.service";
import {
  parsePaystackWebhook,
  verifyPaystackWebhookSignature,
} from "@/server/services/paystack.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export type GatewayPaymentWebhookResult = {
  status: "processed" | "duplicate" | "ignored" | "failed";
  message: string;
  paymentId?: string;
  gatewayPaymentIntentId?: string;
  developerPaymentIntentId?: string;
  developerSalePaymentId?: string;
  verifiedPayload?: Record<string, unknown>;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getErrorMessage(error: unknown) {
  if (isAppError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Payment could not be processed.";
}

function getWebhookData(rawPayload: Record<string, unknown>) {
  return toRecord(rawPayload.data);
}

function getWebhookMetadata(rawPayload: Record<string, unknown>) {
  return toRecord(getWebhookData(rawPayload).metadata);
}

function isDeveloperPaymentReference(reference: string) {
  return reference.trim().toUpperCase().startsWith("BPD-");
}

function isDeveloperInstallmentWebhook(params: {
  reference: string;
  rawPayload?: Record<string, unknown>;
}) {
  if (isDeveloperPaymentReference(params.reference)) {
    return true;
  }

  const metadata = params.rawPayload
    ? getWebhookMetadata(params.rawPayload)
    : {};

  return (
    metadata.product === "piedras_developer_module" ||
    metadata.product === "piedras_developer_module" ||
    metadata.payment_type === "developer_installment"
  );
}

async function findDeveloperIntentByReferenceSafely(reference: string) {
  try {
    return await getDeveloperPaymentIntentByReference(
      createSupabaseAdminClient(),
      reference,
    );
  } catch (error) {
    console.error("Failed to resolve developer payment intent:", error);
    return null;
  }
}

async function processVerifiedDeveloperPaymentReference(reference: string) {
  const supabase = createSupabaseAdminClient();

  const result = await verifyAndPostDeveloperPaymentReference({
    supabase,
    reference,
  });

  return {
    status: result.status === "duplicate" ? "duplicate" : "processed",
    message:
      result.status === "duplicate"
        ? "Developer payment already recorded."
        : "Developer payment confirmed.",
    paymentId: result.paymentId,
    developerPaymentIntentId: result.paymentIntentId,
    developerSalePaymentId: result.paymentId,
    verifiedPayload: result.verifiedPayload,
  } satisfies GatewayPaymentWebhookResult;
}

async function resolveDuplicateWebhookEvent(params: {
  registeredEvent: Awaited<ReturnType<typeof registerGatewayPaymentEvent>>;
}): Promise<GatewayPaymentWebhookResult | null> {
  if (!params.registeredEvent.isDuplicate) {
    return null;
  }

  const event = params.registeredEvent.event;

  if (
    event.processing_status === "processed" &&
    (event.processed_payment_id || event.developer_sale_payment_id)
  ) {
    return {
      status: "duplicate",
      message: "Payment webhook already processed.",
      paymentId:
        event.processed_payment_id ??
        event.developer_sale_payment_id ??
        undefined,
      developerPaymentIntentId: event.developer_payment_intent_id ?? undefined,
      developerSalePaymentId: event.developer_sale_payment_id ?? undefined,
    };
  }

  if (event.processing_status === "ignored") {
    return {
      status: "duplicate",
      message: "Payment webhook was already ignored.",
    };
  }

  return null;
}

export async function processVerifiedGatewayPaymentReference(
  reference: string,
): Promise<GatewayPaymentWebhookResult> {
  if (!isDeveloperPaymentReference(reference)) {
    throw new AppError(
      "GATEWAY_INTENT_NOT_FOUND",
      "Payment reference was not found in Piedras Properties.",
      404,
    );
  }

  return processVerifiedDeveloperPaymentReference(reference);
}

export async function processGatewayPaystackWebhook(params: {
  rawBody: string;
  signature: string | null;
}): Promise<GatewayPaymentWebhookResult> {
  verifyPaystackWebhookSignature({
    rawBody: params.rawBody,
    signature: params.signature,
  });

  const webhook = parsePaystackWebhook(params.rawBody);
  const rawPayload = JSON.parse(params.rawBody) as Record<string, unknown>;
  const supabase = createSupabaseAdminClient();
  const reference = webhook.data.reference;

  const registeredEvent = await registerGatewayPaymentEvent(supabase, {
    eventType: webhook.event,
    paymentReference: reference,
    rawPayload,
    signature: params.signature ?? "",
  });

  const duplicateResult = await resolveDuplicateWebhookEvent({
    registeredEvent,
  });

  if (duplicateResult) {
    return duplicateResult;
  }

  const isDeveloperPayment = isDeveloperInstallmentWebhook({
    reference,
    rawPayload,
  });

  try {
    if (!isDeveloperPayment) {
      await markGatewayPaymentEventIgnored(supabase, {
        eventId: registeredEvent.event.id,
        reason: "Non-developer Paystack webhook ignored by Piedras.",
        gatewayPaymentIntentId: null,
        verifiedPayload: rawPayload,
      });

      return {
        status: "ignored",
        message: "Webhook ignored because it is not a Piedras developer payment.",
      };
    }

    if (webhook.event !== "charge.success") {
      const developerIntent = await findDeveloperIntentByReferenceSafely(
        reference,
      );

      await markGatewayPaymentEventIgnored(supabase, {
        eventId: registeredEvent.event.id,
        reason: `Unsupported Paystack event: ${webhook.event}`,
        gatewayPaymentIntentId: null,
        developerPaymentIntentId: developerIntent?.id ?? null,
        verifiedPayload: rawPayload,
      });

      return {
        status: "ignored",
        message: "Webhook ignored.",
        developerPaymentIntentId: developerIntent?.id ?? undefined,
      };
    }

    const result = await processVerifiedDeveloperPaymentReference(reference);

    await markGatewayPaymentEventProcessed(supabase, {
      eventId: registeredEvent.event.id,
      gatewayPaymentIntentId: null,
      developerPaymentIntentId: result.developerPaymentIntentId ?? null,
      developerSalePaymentId: result.developerSalePaymentId ?? null,
      processedPaymentId: null,
      verifiedPayload: result.verifiedPayload ?? rawPayload,
    });

    return result;
  } catch (error) {
    const message = getErrorMessage(error);
    const failedDeveloperIntent = isDeveloperPayment
      ? await findDeveloperIntentByReferenceSafely(reference)
      : null;

    await markGatewayPaymentEventFailed(supabase, {
      eventId: registeredEvent.event.id,
      reason: message,
      gatewayPaymentIntentId: null,
      developerPaymentIntentId: failedDeveloperIntent?.id ?? null,
      developerSalePaymentId:
        failedDeveloperIntent?.processed_payment_id ?? null,
      verifiedPayload: rawPayload,
    });

    return {
      status: "failed",
      message,
      developerPaymentIntentId: failedDeveloperIntent?.id ?? undefined,
      developerSalePaymentId:
        failedDeveloperIntent?.processed_payment_id ?? undefined,
    };
  }
}
