import "server-only";

import { AppError } from "@/server/errors/app-error";

function throwDisabledRentGateway(): never {
  throw new AppError(
    "RENT_GATEWAY_DISABLED",
    "Rent payment gateway is not enabled for Piedras Properties.",
    403,
  );
}

export async function initializeRentPayment(_input: unknown): Promise<never> {
  return throwDisabledRentGateway();
}

export async function initializeFirstRentPaymentAfterAgreementAcceptance(
  _params: unknown,
): Promise<never> {
  return throwDisabledRentGateway();
}

export async function initializeTenantDashboardRentPayment(
  _params: unknown,
): Promise<never> {
  return throwDisabledRentGateway();
}

export async function getPublicTenantPaymentCheckout(_params: {
  reference: string;
  verify?: boolean;
}) {
  return null;
}
