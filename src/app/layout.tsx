import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import { TRPCProvider } from "@/components/trpc-provider"
import "./globals.css"

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
})

export const metadata: Metadata = {
  title: "Shelf",
  description: "A calm home dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="min-h-screen bg-background bg-dot-grid font-mono text-foreground text-sm">
        <TRPCProvider>
          <div className="flex min-h-screen flex-col">
            <div className="flex flex-1 flex-col">{children}</div>
            <footer className="px-4 py-3 text-center text-xs text-muted">
              Built by{" "}
              <a
                href="https://jackcuthbert.dev"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground hover:underline"
              >
                Jack Cuthbert
              </a>
              <span aria-hidden> · </span>
              <a href="/docs" className="hover:text-foreground hover:underline">
                Docs
              </a>
              <span aria-hidden> · </span>
              <a
                href="https://github.com/JackCuthbert/shelf"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground hover:underline"
              >
                Shelf is open source
              </a>
            </footer>
          </div>
        </TRPCProvider>
      </body>
    </html>
  )
}
