import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    PAYSTACK_SECRET_KEY: Boolean(process.env.PAYSTACK_SECRET_KEY?.trim()),
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: Boolean(
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim(),
    ),
    PAYSTACK_PUBLIC_KEY: Boolean(process.env.PAYSTACK_PUBLIC_KEY?.trim()),
    NODE_ENV: process.env.NODE_ENV,
  });
}
