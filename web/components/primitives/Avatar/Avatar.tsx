'use client'

import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'

import { cn } from '@/lib/utils'

const Root = forwardRef<
  ElementRef<typeof AvatarPrimitive.Root>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative inline-flex size-8 shrink-0 overflow-hidden rounded-full',
      'bg-paper-raised',
      className,
    )}
    {...props}
  />
))
Root.displayName = 'AvatarRoot'

const Image = forwardRef<
  ElementRef<typeof AvatarPrimitive.Image>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('size-full object-cover', className)}
    {...props}
  />
))
Image.displayName = 'AvatarImage'

const Fallback = forwardRef<
  ElementRef<typeof AvatarPrimitive.Fallback>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center text-xs font-medium',
      'bg-paper-raised text-ink-700',
      className,
    )}
    {...props}
  />
))
Fallback.displayName = 'AvatarFallback'

/**
 * Used in the viewer's creator chip. Image + initials
 * fallback per Radix's contract — the fallback only renders if the
 * image errors or hasn't loaded yet.
 */
export const Avatar = { Root, Image, Fallback }
