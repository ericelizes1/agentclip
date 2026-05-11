import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TrustBar } from './TrustBar'

describe('TrustBar', () => {
  it('omits the GitHub badge below the visibility threshold', () => {
    render(<TrustBar repo="ericelizes1/agentclip" stars={24} />)

    expect(screen.queryByText(/on GitHub/i)).not.toBeInTheDocument()
  })

  it('shows the exact star count once the threshold is met', () => {
    render(<TrustBar repo="ericelizes1/agentclip" stars={25} />)

    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText(/on GitHub/i)).toBeInTheDocument()
  })

  it('uses compact formatting for four-digit star counts', () => {
    render(<TrustBar repo="ericelizes1/agentclip" stars={1200} />)

    expect(screen.getByText('1.2k')).toBeInTheDocument()
  })
})
