import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Compose Tailwind class lists with conflict resolution.
 *
 * `clsx` handles the conditional / array / object input shapes;
 * `tailwind-merge` resolves conflicts (e.g. `'p-4 p-2'` → `'p-2'`)
 * so variant-prop overrides on primitives behave intuitively.
 *
 * Usage:
 *   className={cn('rounded-md p-4', isActive && 'bg-vermillion-500', className)}
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
