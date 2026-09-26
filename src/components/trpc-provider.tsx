"use client"

import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"
import { useState } from "react"
import type { AppRouter } from "@/server/root"

export const trpc = createTRPCReact<AppRouter>()

export function createAppQueryClient() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        const path = mutation.options.mutationKey?.[0]
        if (!Array.isArray(path)) return
        const [router, procedure] = path
        if (router === "apps") {
          void queryClient.invalidateQueries({ queryKey: [["apps"]] })
          void queryClient.invalidateQueries({ queryKey: [["boards"]] })
        } else if (router === "boards") {
          void queryClient.invalidateQueries({ queryKey: [["boards"]] })
          if (procedure === "refreshStatuses")
            void queryClient.invalidateQueries({ queryKey: [["apps"]] })
        }
      },
    }),
  })
  return queryClient
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createAppQueryClient)
  const [client] = useState(() =>
    trpc.createClient({ links: [httpBatchLink({ url: "/api/trpc" })] }),
  )
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
