'use client'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'

import { cn } from '@/lib/utils'

const Provider = TooltipPrimitive.Provider
const Root = TooltipPrimitive.Root
const Trigger = TooltipPrimitive.Trigger

const Content = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-md bg-ink-900 text-paper px-2.5 py-1.5 text-xs',
        'shadow-[var(--shadow-whisper)]',
        'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
Content.displayName = 'TooltipContent'

/**
 * Dot-notation Radix wrapper. Use as:
 *
 *   <Tooltip.Provider>
 *     <Tooltip.Root>
 *       <Tooltip.Trigger asChild>...</Tooltip.Trigger>
 *       <Tooltip.Content>Copy share URL</Tooltip.Content>
 *     </Tooltip.Root>
 *   </Tooltip.Provider>
 *
 * Wrap the app in a single `Tooltip.Provider` once near the root.
 */
export const Tooltip = { Provider, Root, Trigger, Content }
