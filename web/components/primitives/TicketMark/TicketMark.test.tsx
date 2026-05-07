import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TicketMark } from './TicketMark'

describe('TicketMark', () => {
  it('renders an SVG with the default 8:5 aspect at size 20', () => {
    const { container } = render(<TicketMark />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('20')
    expect(svg.getAttribute('viewBox')).toBe('0 0 32 20')
  })

  it('scales width with size while keeping the aspect', () => {
    const { container } = render(<TicketMark size={40} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('64')
    expect(svg.getAttribute('height')).toBe('40')
  })

  it('exposes itself as decorative by default', () => {
    const { container } = render(<TicketMark />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('role')).toBeNull()
  })

  it('becomes a labeled img when aria-label is given', () => {
    render(<TicketMark aria-label="AgentClip" />)
    const svg = screen.getByRole('img', { name: 'AgentClip' })
    expect(svg).toBeInTheDocument()
  })

  it('does not animate any circle by default', () => {
    const { container } = render(<TicketMark />)
    const pulses = container.querySelectorAll('circle.animate-pulse')
    expect(pulses).toHaveLength(0)
  })

  it('pulses the bottom-most perforation when recording=true', () => {
    const { container } = render(<TicketMark recording />)
    const pulses = container.querySelectorAll('circle.animate-pulse')
    expect(pulses).toHaveLength(1)
    expect(pulses[0]?.getAttribute('cy')).toBe('16')
  })
})
