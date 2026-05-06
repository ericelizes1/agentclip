'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface EditableCaptionProps {
  /** The persisted caption value. Acts as the rollback target on save failure. */
  value: string
  /** Called when the user blurs the textarea with a new value. Async; may throw. */
  onSave: (next: string) => Promise<void>
  /** Visible placeholder when the caption is empty. */
  placeholder?: string
  className?: string
}

type State = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string }

/**
 * Click-to-edit caption with save-on-blur and optimistic rollback.
 *
 * Behavior matches the Linear inline-comment pattern:
 * - Click the caption → focus a textarea pre-filled with the current text.
 * - Edit, then blur (or press Escape to cancel) → if changed, call onSave.
 * - While the save is in flight, the textarea is read-only and a small
 *   "Saving…" indicator shows. On success → "Saved" briefly, then idle.
 * - On error → revert the displayed text to `value` and show the error
 *   message inline. Caller is expected to retry by clicking again.
 */
export function EditableCaption({
  value,
  onSave,
  placeholder = 'Add a caption…',
  className,
}: EditableCaptionProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const ref = useRef<HTMLTextAreaElement | null>(null)

  // Keep the displayed draft in sync if the parent's `value` prop changes
  // while we're not editing (e.g. a separate save committed elsewhere).
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length)
    }
  }, [editing])

  const commit = async () => {
    if (draft === value) {
      setEditing(false)
      return
    }
    setState({ kind: 'saving' })
    try {
      await onSave(draft)
      setState({ kind: 'saved' })
      setEditing(false)
      setTimeout(() => setState({ kind: 'idle' }), 1500)
    } catch (err) {
      setDraft(value)
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Save failed.',
      })
      setEditing(false)
    }
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={cn('space-y-1', className)}>
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              cancel()
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              commit()
            }
          }}
          rows={3}
          className="block w-full resize-y rounded-md border border-vermillion-500 bg-paper-raised px-3 py-2 font-sans text-base leading-relaxed text-ink-900 focus:outline-none focus:ring-2 focus:ring-vermillion-500"
          placeholder={placeholder}
          aria-label="Edit caption"
          disabled={state.kind === 'saving'}
        />
        <p className="text-xs text-ink-500">
          Blur to save, <kbd className="font-mono">Esc</kbd> to cancel,{' '}
          <kbd className="font-mono">⌘↵</kbd> to save now.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('group space-y-1', className)}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Edit caption"
        className="block w-full cursor-text rounded-md border border-transparent px-3 py-2 text-left text-base leading-relaxed text-ink-700 hover:border-ink-200 hover:bg-paper-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vermillion-500"
      >
        {value || <span className="text-ink-400">{placeholder}</span>}
      </button>
      {state.kind === 'saving' && (
        <p role="status" className="px-3 text-xs text-ink-500">
          Saving…
        </p>
      )}
      {state.kind === 'saved' && (
        <p role="status" className="px-3 text-xs text-vermillion-700">
          Saved.
        </p>
      )}
      {state.kind === 'error' && (
        <p role="alert" className="px-3 text-xs text-vermillion-700">
          {state.message}
        </p>
      )}
    </div>
  )
}
