import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MediaFrame } from './MediaFrame'

describe('MediaFrame', () => {
  it('renders an <img> for media_kind=image', () => {
    render(
      <MediaFrame
        mediaKind="image"
        src="/static/clip.png"
        alt="Login screen"
        position={1}
      />,
    )
    const img = screen.getByAltText('Login screen') as HTMLImageElement
    expect(img.tagName).toBe('IMG')
    expect(img.getAttribute('src')).toBe('/static/clip.png')
  })

  it('renders a <video> for media_kind=video with the right attrs', () => {
    const { container } = render(
      <MediaFrame
        mediaKind="video"
        src="/static/clip.mp4"
        alt="Crash repro"
        position={3}
      />,
    )
    const video = container.querySelector('video')!
    expect(video.tagName).toBe('VIDEO')
    expect(video.hasAttribute('controls')).toBe(true)
    expect(video.getAttribute('preload')).toBe('metadata')
    expect(video.hasAttribute('muted')).toBe(true)
    expect(video.getAttribute('aria-label')).toBe('Crash repro')
  })

  it('zero-pads the position into the badge', () => {
    render(
      <MediaFrame mediaKind="image" src="x" alt="x" position={4} />,
    )
    expect(screen.getByText('04')).toBeInTheDocument()
  })
})
