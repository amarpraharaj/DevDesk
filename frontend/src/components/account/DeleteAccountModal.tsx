import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, X } from 'lucide-react'

import type { DeleteAccountInput } from '../../features/auth/auth.api'

type DeleteAccountModalProps = {
  isOpen: boolean
  isSubmitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (input: DeleteAccountInput) => Promise<void>
}

export default function DeleteAccountModal({
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: DeleteAccountModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const submissionInProgress = useRef(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current

    if (!isOpen || !dialog) return

    if (!dialog.open) dialog.showModal()

    return () => {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  if (!isOpen) return null

  const canSubmit =
    currentPassword.length > 0 && confirmation === 'DELETE' && !isSubmitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit || submissionInProgress.current) return

    submissionInProgress.current = true
    try {
      await onSubmit({ currentPassword, confirmation: 'DELETE' })
    } finally {
      submissionInProgress.current = false
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-account-title"
      aria-describedby="delete-account-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!isSubmitting) onClose()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-priority-high/30 bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-priority-high/10 text-priority-high">
            <AlertTriangle size={21} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-account-title" className="text-xl font-semibold">
              Delete your account?
            </h2>
            <p
              id="delete-account-description"
              className="mt-2 text-sm leading-6 text-muted"
            >
              This is permanent. Your account, all tickets you own, and their
              activity history will be deleted and cannot be recovered.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close delete account dialog"
            className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="delete-account-password"
              className="mb-2 block text-sm font-medium"
            >
              Current password
            </label>
            <input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={72}
              autoFocus
              disabled={isSubmitting}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 text-sm outline-none focus:border-accent disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="delete-account-confirmation"
              className="mb-2 block text-sm font-medium"
            >
              Type <span className="font-mono font-bold">DELETE</span> to
              confirm
            </label>
            <input
              id="delete-account-confirmation"
              type="text"
              autoComplete="off"
              required
              disabled={isSubmitting}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-canvas px-3 font-mono text-sm outline-none focus:border-accent disabled:opacity-60"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-priority-high/30 bg-priority-high/10 px-3 py-2.5 text-sm text-priority-high"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-11 rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:bg-canvas disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-priority-high px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Deleting account…' : 'Permanently delete account'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
