import { TRPCError } from "@trpc/server"
import {
  fetchHomarrApps,
  HomarrError,
  homarrConnectionSchema,
} from "@/lib/homarr"
import { protectedProcedure, router } from "@/server/trpc"

export const importRouter = router({
  previewHomarr: protectedProcedure
    .input(homarrConnectionSchema)
    .mutation(async ({ input }) => {
      try {
        return await fetchHomarrApps(input)
      } catch (error) {
        if (error instanceof HomarrError)
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message })
        throw error
      }
    }),
})
