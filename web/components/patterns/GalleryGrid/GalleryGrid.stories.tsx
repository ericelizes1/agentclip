import type { Meta, StoryObj } from '@storybook/nextjs'
import { GalleryGrid, type GalleryClip } from './GalleryGrid'

const meta = {
  title: 'Patterns/GalleryGrid',
  component: GalleryGrid,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof GalleryGrid>

export default meta
type Story = StoryObj<typeof meta>

const sample: GalleryClip[] = [
  {
    shareToken: 'TYs5a9Wibl-Sgayn',
    title: 'Onboarding regression',
    description: 'Post-login redirect dropped a query param.',
    coverImageUrl: 'https://placehold.co/640x360/d94824/faf9f5?text=01',
    meta: '4 clips',
  },
  {
    shareToken: 'o_vjxykDX5BngXYb',
    title: 'Signup happy path',
    description: 'OAuth → workspace pick → first run, stitched.',
    coverImageUrl: 'https://placehold.co/640x360/141413/faf9f5?text=02',
    meta: '5 clips',
  },
  {
    shareToken: 'SQ9MZOI8kI8xGgMJ',
    title: 'Competitive teardown',
    description: 'Three rivals, same scenario, side-by-side reads.',
    coverImageUrl: 'https://placehold.co/640x360/87867f/faf9f5?text=03',
    meta: '3 clips',
  },
]

export const ThreeUp: Story = {
  args: { clips: sample },
}

export const SingleClip: Story = {
  args: { clips: sample.slice(0, 1) },
}

export const Empty: Story = {
  args: { clips: [] },
}
