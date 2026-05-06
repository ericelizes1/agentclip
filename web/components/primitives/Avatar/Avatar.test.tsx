import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders the fallback when no image is supplied', () => {
    render(
      <Avatar.Root>
        <Avatar.Image src="" alt="Eric Elizes" />
        <Avatar.Fallback>EE</Avatar.Fallback>
      </Avatar.Root>,
    )
    expect(screen.getByText('EE')).toBeInTheDocument()
  })
})
