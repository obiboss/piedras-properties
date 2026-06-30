import "server-only";

export const PAYSTACK_RENT_PAYMENT_IDEMPOTENCY_PREFIX =
  "piedras-disabled-rent-gateway:";

export type GatewayPaymentVerificationPhase =
  | "settled"
  | "verifiable"
  | "terminal_unpaid"
  | "unknown";

type GatewayIntentLike = {
  status: string;
  processed_payment_id?: string | null;
};

export function buildPaystackRentPaymentIdempotencyKey(
  paystackReference: string,
) {
  return `${PAYSTACK_RENT_PAYMENT_IDEMPOTENCY_PREFIX}${paystackReference}`;
}

export function getGatewayPaymentVerificationPhase(
  intent: GatewayIntentLike,
): GatewayPaymentVerificationPhase {
  if (intent.status === "paid" && intent.processed_payment_id) {
    return "settled";
  }

  if (intent.status === "initialized") {
    return "verifiable";
  }

  if (
    intent.status === "failed" ||
    intent.status === "abandoned" ||
    intent.status === "cancelled"
  ) {
    return "terminal_unpaid";
  }

  if (intent.status === "paid" && !intent.processed_payment_id) {
    return "verifiable";
  }

  return "unknown";
}

export function shouldVerifyGatewayIntentWithPaystack(intent: GatewayIntentLike) {
  return getGatewayPaymentVerificationPhase(intent) === "verifiable";
}

export async function findExistingPaystackRentPayment() {
  return null;
}

export async function auditGatewayPaymentReplayIgnored() {
  return;
}

export async function completeGatewayPaymentAllocationsSafely() {
  return;
}

export async function generateGatewayRentReceiptSafely() {
  return;
}
