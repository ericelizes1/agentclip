import type { Meta, StoryObj } from '@storybook/nextjs'
import { MediaFrame } from './MediaFrame'

const meta = {
  title: 'Composites/MediaFrame',
  component: MediaFrame,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof MediaFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Image: Story = {
  args: {
    mediaKind: 'image',
    src: 'https://placehold.co/640x360/d94824/faf9f5?text=Slide+01',
    alt: 'Onboarding step 1: API key paste',
    position: 1,
  },
}

export const Video: Story = {
  args: {
    mediaKind: 'video',
    src: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    alt: 'Bug repro screen recording',
    position: 3,
  },
}
