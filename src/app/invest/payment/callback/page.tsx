import Link from "next/link";
import { CheckCircle2, Download, XCircle } from "lucide-react";
import { verifyAndFinalizeInvestmentPayment } from "@/server/services/investment-payment-link.service";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

export const dynamic = "force-dynamic";

type InvestmentPaymentCallbackPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

type CallbackState =
  | {
      status: "success";
      title: string;
      message: string;
      receiptDownloadUrl: string | null;
    }
  | {
      status: "error";
      title: string;
      message: string;
      receiptDownloadUrl: null;
    };

function getSearchParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function resolvePaymentReference(params: {
  reference?: string;
  trxref?: string;
}) {
  const candidates = [params.trxref, params.reference]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    candidates.find((value) => value.startsWith("piedras_inv_")) ??
    candidates[0]
  );
}

async function resolveCallbackState(
  reference: string | undefined,
): Promise<CallbackState> {
  if (!reference) {
    return {
      status: "error",
      title: "Payment reference missing",
      message:
        "Your payment may have gone through, but the payment reference was not found on this page. Contact Piedras Properties with your payment alert.",
      receiptDownloadUrl: null,
    };
  }

  try {
    const result = await verifyAndFinalizeInvestmentPayment({
      supabase: createSupabaseAdminClient(),
      reference,
    });

    return {
      status: "success",
      title: "Investment payment confirmed",
      message: `Your payment of ${new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(
        result.amountPaid,
      )} has been confirmed. Your investor record, payout schedule, and receipt have been created.`,
      receiptDownloadUrl: result.receiptDownloadUrl,
    };
  } catch (error) {
    console.error("Investment payment callback failed", error);

    return {
      status: "error",
      title: "Payment could not be confirmed",
      message:
        "We could not confirm this investment payment yet. If your account was debited, contact Piedras Properties with your payment reference.",
      receiptDownloadUrl: null,
    };
  }
}

export default async function InvestmentPaymentCallbackPage({
  searchParams,
}: InvestmentPaymentCallbackPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const reference = resolvePaymentReference({
    reference: getSearchParamValue(resolvedSearchParams.reference),
    trxref: getSearchParamValue(resolvedSearchParams.trxref),
  });
  const pageState = await resolveCallbackState(reference);

  const Icon = pageState.status === "success" ? CheckCircle2 : XCircle;
  const iconClass =
    pageState.status === "success" ? "text-success" : "text-danger";
  const bgClass =
    pageState.status === "success" ? "bg-success-soft" : "bg-danger-soft";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-xl rounded-4xl border border-border-soft bg-white p-6 text-center shadow-card sm:p-8">
        <div
          className={`mx-auto flex size-16 items-center justify-center rounded-full ${bgClass}`}
        >
          <Icon
            aria-hidden="true"
            className={iconClass}
            size={34}
            strokeWidth={2.7}
          />
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-text-strong">
          {pageState.title}
        </h1>

        <p className="mt-3 text-sm font-semibold leading-7 text-text-muted">
          {pageState.message}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {pageState.receiptDownloadUrl ? (
            <a
              href={pageState.receiptDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-extrabold text-white transition hover:bg-primary-hover"
            >
              <Download aria-hidden="true" size={18} strokeWidth={2.6} />
              Download receipt
            </a>
          ) : null}

          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-button border border-border-soft bg-white px-5 text-sm font-extrabold text-text-strong transition hover:bg-primary-soft hover:text-primary"
          >
            Done
          </Link>
        </div>
      </section>
    </main>
  );
}
