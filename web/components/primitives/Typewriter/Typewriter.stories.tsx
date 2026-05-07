import type { Meta, StoryObj } from '@storybook/nextjs'
import { Typewriter } from './Typewriter'

const meta = {
  title: 'Primitives/Typewriter',
  component: Typewriter,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Typewriter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { text: 'Walkthroughs that record themselves.' },
}

export const Slow: Story = {
  args: { text: 'Walkthroughs that record themselves.', speedMs: 80 },
}

export const Headline: Story = {
  args: {
    text: 'Walkthroughs that record themselves.',
    className: 'font-display italic text-5xl text-ink-900',
  },
}

export const Delayed: Story = {
  args: {
    text: 'Starts after a beat.',
    startDelayMs: 700,
  },
}
