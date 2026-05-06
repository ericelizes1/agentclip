import type { Meta, StoryObj } from '@storybook/nextjs'
import { ClipCard } from './ClipCard'

const meta = {
  title: 'Composites/ClipCard',
  component: ClipCard,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ClipCard>

export default meta
type Story = StoryObj<typeof meta>

export const WithCover: Story = {
  args: {
    shareToken: 'TYs5a9Wibl-Sgayn',
    title: 'Onboarding regression',
    description: 'Post-login redirect dropped a query parameter; repro in 47s.',
    coverImageUrl: 'https://placehold.co/640x360/d94824/faf9f5?text=Slide+01',
    meta: '4 clips',
  },
}

export const NoCover: Story = {
  args: {
    shareToken: 'abc',
    title: 'Untitled draft',
  },
}
