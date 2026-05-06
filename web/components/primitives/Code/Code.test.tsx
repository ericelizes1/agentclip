import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Code } from './Code'

describe('Code', () => {
  it('renders as a <code> element with mono styling', () => {
    const { container } = render(<Code>pip install agentclip</Code>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('CODE')
    expect(el.textContent).toBe('pip install agentclip')
    expect(el.className).toContain('font-mono')
  })
})
