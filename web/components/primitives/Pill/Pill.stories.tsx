import type { Meta, StoryObj } from '@storybook/nextjs'
import { Pill } from './Pill'

const meta = {
  title: 'Primitives/Pill',
  component: Pill,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Pill>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'v0.1 · open source' },
}
