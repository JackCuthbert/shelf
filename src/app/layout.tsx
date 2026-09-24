import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { TRPCProvider } from "@/components/trpc-provider";
import "./globals.css";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-ibm-plex-mono" });

export const metadata: Metadata = { title: "Hometime", description: "A calm home dashboard" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={mono.variable}><body className="bg-background bg-dot-grid font-mono text-foreground text-sm"><TRPCProvider>{children}</TRPCProvider></body></html>;
}
