import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Typewriter } from './Typewriter'

// happy-dom defaults to `matches: false` for every media query, so
// `useReducedMotion()` returns false and the animation runs. We drive
// it with fake timers so tests are deterministic.

describe('Typewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes the full text to assistive tech via aria-label even mid-animation', () => {
    render(<Typewriter text="Walkthroughs that record themselves." />)
    // Even at t=0 (no characters typed yet), the full text is in the
    // accessibility tree so screen readers announce the headline correctly.
    expect(
      screen.getByLabelText('Walkthroughs that record themselves.'),
    ).toBeInTheDocument()
  })

  it('reveals the full text after the animation runs to completion', () => {
    render(<Typewriter text="hi" speedMs={10} />)
    act(() => {
      vi.advanceTimersByTime(100) // 2 chars × 10ms + headroom
    })
    // After the timers fire, the visible (aria-hidden) span should contain the full text.
    const wrapper = screen.getByLabelText('hi')
    expect(wrapper.textContent).toBe('hi')
  })

  it('fires onComplete when typing finishes', () => {
    const onComplete = vi.fn()
    render(<Typewriter text="abc" speedMs={10} onComplete={onComplete} />)
    expect(onComplete).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('hides the caret once typing has completed', () => {
    const { container } = render(<Typewriter text="abc" speedMs={10} />)
    // While typing, the caret IS in the DOM.
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
    // After typing finishes, the caret unmounts.
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })

  it('updates rendered text when the prop changes', () => {
    const { rerender } = render(<Typewriter text="first" speedMs={10} />)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    let wrapper = screen.getByLabelText('first')
    expect(wrapper.textContent).toBe('first')

    rerender(<Typewriter text="second take" speedMs={10} />)
    // The new text should now be present in the aria-label.
    wrapper = screen.getByLabelText('second take')
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(wrapper.textContent).toBe('second take')
  })

  it('honors startDelayMs before kicking off the animation', () => {
    const onComplete = vi.fn()
    render(
      <Typewriter
        text="ab"
        speedMs={10}
        startDelayMs={500}
        onComplete={onComplete}
      />,
    )
    // 100ms is well past speedMs but well before startDelayMs.
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(onComplete).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(600)
    })
    expect(onComplete).toHaveBeenCalled()
  })
})
