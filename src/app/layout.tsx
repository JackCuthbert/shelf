import type { Metadata } from "next";
import { TRPCProvider } from "@/components/trpc-provider";
import "./globals.css";

export const metadata: Metadata = { title: "Hometime", description: "A calm home dashboard" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><TRPCProvider>{children}</TRPCProvider></body></html>;
}
