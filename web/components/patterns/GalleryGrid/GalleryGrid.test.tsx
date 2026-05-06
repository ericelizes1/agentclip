import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GalleryGrid, type GalleryClip } from './GalleryGrid'

const clips: GalleryClip[] = [
  { shareToken: 'a', title: 'Alpha' },
  { shareToken: 'b', title: 'Beta' },
  { shareToken: 'c', title: 'Gamma' },
]

describe('GalleryGrid', () => {
  it('renders one ClipCard per clip with semantic <ul>/<li>', () => {
    const { container } = render(<GalleryGrid clips={clips} />)
    expect(container.querySelector('ul')).not.toBeNull()
    expect(container.querySelectorAll('li')).toHaveLength(3)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('renders the empty state when no clips are passed', () => {
    render(<GalleryGrid clips={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent(
      /no clips yet/i,
    )
  })
})
