'use client'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/primitives/Button/Button'
import { cn } from '@/lib/utils'

export interface DeleteSlideButtonProps {
  /** Position number rendered in the confirm prompt for clarity. */
  position: number
  /** Async delete handler. Throws on failure; the button surfaces the message. */
  onDelete: () => Promise<void>
  className?: string
}

type State = { kind: 'idle' } | { kind: 'confirming' } | { kind: 'deleting' } | { kind: 'error'; message: string }

/**
 * Two-step delete affordance: first click arms the button, second
 * click confirms. Mid-delete the button locks; on failure it surfaces
 * the error message inline so the parent can keep the slide visible
 * for retry. (Optimistic removal lives in the parent — this component
 * only owns the trigger UI.)
 */
export function DeleteSlideButton({ position, onDelete, className }: DeleteSlideButtonProps) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  const arm = () => setState({ kind: 'confirming' })
  const cancel = () => setState({ kind: 'idle' })

  const confirm = async () => {
    setState({ kind: 'deleting' })
    try {
      await onDelete()
      // Parent will unmount this component on success; if it doesn't,
      // we drop back to idle so the button can be reused.
      setState({ kind: 'idle' })
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Delete failed.',
      })
    }
  }

  if (state.kind === 'confirming' || state.kind === 'deleting') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-xs text-ink-700">
          Delete slide {String(position).padStart(2, '0')}?
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={confirm}
          disabled={state.kind === 'deleting'}
        >
          {state.kind === 'deleting' ? 'Deleting…' : 'Confirm'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={cancel}
          disabled={state.kind === 'deleting'}
        >
          Cancel
        </Button>
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span role="alert" className="text-xs text-vermillion-700">
          {state.message}
        </span>
        <Button variant="ghost" size="sm" onClick={cancel}>
          Dismiss
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={arm}
      aria-label={`Delete slide ${position}`}
      className={cn('text-ink-500 hover:text-vermillion-700', className)}
    >
      <Trash2 aria-hidden="true" className="size-3.5" />
      Delete
    </Button>
  )
}
