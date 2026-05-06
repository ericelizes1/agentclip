import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavBar } from './NavBar'

describe('NavBar', () => {
  it('renders a <nav> landmark with the brand and GitHub link', () => {
    render(<NavBar githubUrl="https://github.com/elizes/agentclip" />)
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByText('AgentClip')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /github/i })
    expect(link).toHaveAttribute('href', 'https://github.com/elizes/agentclip')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
