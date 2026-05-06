import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders an aria-hidden placeholder so screen readers skip it', () => {
    const { container } = render(<Skeleton className="h-10 w-40" />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.className).toContain('h-10')
  })
})
