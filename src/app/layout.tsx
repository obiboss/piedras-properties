import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Piedras Properties",
    template: "%s | Piedras Properties",
  },
  description:
    "Piedras Properties estate sales, buyer records, plot inventory, payment tracking, receipts, and document management.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
