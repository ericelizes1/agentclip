import type { Meta, StoryObj } from '@storybook/nextjs'
import { Smoke } from './Smoke'

const meta = {
  title: 'Primitives/_Smoke',
  component: Smoke,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Smoke>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: 'lucide + simple-icons + framer-motion OK' },
}
