"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { useIconCatalogue } from "@/components/icon-catalogue"
import { HomarrImportConnect } from "@/components/homarr-import-connect"
import { HomarrImportReview } from "@/components/homarr-import-review"
import { ModalContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"
import {
  applyImported,
  clearUnknownIcons,
  runImport,
  toImportRows,
  type ImportFailure,
  type ImportRow,
} from "@/lib/homarr-import"

export function HomarrImportBody({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported?: (count: number) => void
}) {
  const preview = trpc.imports.previewHomarr.useMutation()
  const create = trpc.apps.create.useMutation()
  const [step, setStep] = useState<"connect" | "review">("connect")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [rows, setRows] = useState<ImportRow[]>([])
  const [filter, setFilter] = useState("")
  const [openIconKey, setOpenIconKey] = useState<string | null>(null)
  const [failures, setFailures] = useState<ImportFailure[]>([])
  const [pending, setPending] = useState(false)
  const catalogueState = useIconCatalogue(step === "review")

  useEffect(() => {
    if (!catalogueState.catalogue) return
    setRows((current) =>
      clearUnknownIcons(
        current,
        new Set(Object.keys(catalogueState.catalogue!)),
      ),
    )
  }, [catalogueState.catalogue])

  function connect() {
    setFailures([])
    preview.mutate(
      { baseUrl, apiKey },
      {
        onSuccess: (apps) => {
          setRows(toImportRows(apps))
          setStep("review")
        },
      },
    )
  }

  async function importSelected() {
    setPending(true)
    setFailures([])
    const result = await runImport(rows, (input) => create.mutateAsync(input))
    setPending(false)
    if (result.failures.length === 0) {
      onImported?.(result.importedKeys.size)
      onClose()
      return
    }
    setRows((current) => applyImported(current, result.importedKeys))
    setFailures(result.failures)
  }

  if (step === "connect")
    return (
      <HomarrImportConnect
        baseUrl={baseUrl}
        apiKey={apiKey}
        onBaseUrlChange={setBaseUrl}
        onApiKeyChange={setApiKey}
        error={preview.error?.message ?? ""}
        pending={preview.isPending}
        onSubmit={connect}
      />
    )

  return (
    <HomarrImportReview
      rows={rows}
      filter={filter}
      onFilterChange={setFilter}
      onToggleRow={(key, selected) =>
        setRows((current) =>
          current.map((row) => (row.key === key ? { ...row, selected } : row)),
        )
      }
      onToggleAll={(selected) =>
        setRows((current) =>
          current.map((row) => (row.importable ? { ...row, selected } : row)),
        )
      }
      catalogue={catalogueState.catalogue}
      catalogueError={catalogueState.error}
      onRetryCatalogue={catalogueState.retry}
      openIconKey={openIconKey}
      onOpenIcon={setOpenIconKey}
      onSelectIcon={(key, slug) =>
        setRows((current) =>
          current.map((row) =>
            row.key === key ? { ...row, iconSlug: slug } : row,
          ),
        )
      }
      failures={failures}
      pending={pending}
      onBack={() => setStep("connect")}
      onImport={importSelected}
    />
  )
}

export function HomarrImportDialog({
  open,
  onOpenChange,
  trigger,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  onImported?: (count: number) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger}
      <ModalContent
        wide
        withFooter
        title="Import from Homarr"
        description="Bring your Homarr apps into the shared library."
      >
        {open && (
          <HomarrImportBody
            onClose={() => onOpenChange(false)}
            onImported={onImported}
          />
        )}
      </ModalContent>
    </Dialog.Root>
  )
}
