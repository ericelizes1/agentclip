'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'

import { cn } from '@/lib/utils'

const Root = DialogPrimitive.Root
const Trigger = DialogPrimitive.Trigger
const Close = DialogPrimitive.Close
const Title = DialogPrimitive.Title
const Description = DialogPrimitive.Description

const Overlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm', className)}
    {...props}
  />
))
Overlay.displayName = 'DialogOverlay'

const Content = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-md rounded-[14px] border border-ink-200 bg-paper p-6',
        'shadow-[var(--shadow-whisper)]',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-md p-1 text-ink-500 hover:bg-paper-raised hover:text-ink-900"
        aria-label="Close dialog"
      >
        <X className="size-4" aria-hidden="true" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
Content.displayName = 'DialogContent'

/**
 * Dot-notation Radix wrapper. The viewer's "Copy share URL" modal
 * uses this; future settings pop-ups too. Always include a Title
 * (Radix enforces this for screen readers — even sr-only counts).
 */
export const Dialog = { Root, Trigger, Close, Title, Description, Content }
