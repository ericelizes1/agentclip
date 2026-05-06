import type { Meta, StoryObj } from '@storybook/nextjs'
import { ClipViewer, type ClipViewerSlideshow } from './ClipViewer'

const meta = {
  title: 'Patterns/ClipViewer',
  component: ClipViewer,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof ClipViewer>

export default meta
type Story = StoryObj<typeof meta>

const placeholder = (n: number) =>
  `https://placehold.co/1280x720/d94824/faf9f5?text=Slide+${String(n).padStart(2, '0')}`

const base: ClipViewerSlideshow = {
  id: 'a4d5e1ce',
  title: 'Onboarding regression',
  description:
    'The post-login redirect dropped a query parameter, blocking the welcome flow.',
  summary:
    'The agent reproduced a P1 onboarding regression in 47 seconds. Repro steps are captured below; downstream impact pulled from session telemetry.',
  created_by: 'Eric Elizes',
  created_by_url: 'https://github.com/elizes',
  created_at: '2026-03-14T18:42:00Z',
  slides: [
    { id: 1, position: 1, media_kind: 'image', media_url: placeholder(1), caption: 'Login screen on staging.' },
    { id: 2, position: 2, media_kind: 'image', media_url: placeholder(2), caption: 'OAuth handshake completes; token issued.' },
    { id: 3, position: 3, media_kind: 'image', media_url: placeholder(3), caption: 'Redirect arrives without ?welcome=1; flow blocked.' },
  ],
}

export const FullySpecified: Story = {
  args: { slideshow: base },
}

export const NoSummary: Story = {
  args: { slideshow: { ...base, summary: '' } },
}

export const NoCredit: Story = {
  args: { slideshow: { ...base, created_by: '', created_by_url: '' } },
}
