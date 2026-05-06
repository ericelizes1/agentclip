'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'

import { cn } from '@/lib/utils'

const Root = TabsPrimitive.Root

const List = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center gap-1 rounded-md border border-ink-200 bg-paper p-1',
      className,
    )}
    {...props}
  />
))
List.displayName = 'TabsList'

const Trigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm',
      'tracking-tight text-ink-600 transition-colors',
      'data-[state=active]:bg-paper-raised data-[state=active]:text-ink-900',
      'hover:text-ink-900 focus-visible:outline-none',
      'focus-visible:ring-2 focus-visible:ring-vermillion-500',
      className,
    )}
    {...props}
  />
))
Trigger.displayName = 'TabsTrigger'

const Content = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-3 focus-visible:outline-none', className)}
    {...props}
  />
))
Content.displayName = 'TabsContent'

/**
 * Dot-notation Radix wrapper. Powers the install tab on the home
 * mockup ("pip install" / "Have your agent do it" / "uvx").
 */
export const Tabs = { Root, List, Trigger, Content }
