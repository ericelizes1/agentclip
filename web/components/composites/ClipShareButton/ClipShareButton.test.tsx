import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ClipShareButton } from './ClipShareButton'

const props = {
  title: 'Demo clip',
  shareUrl: 'https://agentclip.dev/s/abc',
  clipMp4Url: 'https://agentclip.dev/s/abc.mp4',
  clipPdfUrl: 'https://agentclip.dev/s/abc.pdf',
  embedUrl: 'https://agentclip.dev/embed/abc',
}

describe('ClipShareButton', () => {
  it('renders a single share button with the popover closed', () => {
    render(<ClipShareButton {...props} />)
    expect(screen.getByLabelText('Share this clip')).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens a popover with the share + export actions on click', () => {
    render(<ClipShareButton {...props} />)
    fireEvent.click(screen.getByLabelText('Share this clip'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByText('Share link')).toBeInTheDocument()
    expect(screen.getByText('Copy MP4 URL')).toBeInTheDocument()
    expect(screen.getByText('Copy embed code')).toBeInTheDocument()
    expect(screen.getByText('Download PDF')).toBeInTheDocument()
  })

  it('hands off to the native share sheet when Web Share is available', () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(<ClipShareButton {...props} />)
    fireEvent.click(screen.getByLabelText('Share this clip'))
    fireEvent.click(screen.getByText('Share link'))
    expect(share).toHaveBeenCalledWith({ title: 'Demo clip', url: props.shareUrl })
    delete (navigator as { share?: unknown }).share
  })

  it('closes the popover on Escape', () => {
    render(<ClipShareButton {...props} />)
    fireEvent.click(screen.getByLabelText('Share this clip'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
