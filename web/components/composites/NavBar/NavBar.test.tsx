import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavBar } from './NavBar'

describe('NavBar', () => {
  it('renders a <nav> landmark with the brand and GitHub link', () => {
    render(<NavBar githubUrl="https://github.com/ericelizes1/agentclip" />)
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Agent\s+Clip/i }),
    ).toHaveAttribute('href', '/')
    const link = screen.getByRole('link', { name: /github/i })
    expect(link).toHaveAttribute('href', 'https://github.com/ericelizes1/agentclip')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
