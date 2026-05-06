import type { Meta, StoryObj } from '@storybook/nextjs'
import { Code } from './Code'

const meta = {
  title: 'Primitives/Code',
  component: Code,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Code>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { children: 'pip install agentclip' },
}
