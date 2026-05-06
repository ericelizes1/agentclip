import type { Meta, StoryObj } from '@storybook/nextjs'
import { Badge } from './Badge'

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = { args: { children: '5 clips', tone: 'neutral' } }
export const Accent: Story = { args: { children: 'NEW', tone: 'accent' } }
export const Ink: Story = { args: { children: '01', tone: 'ink' } }
