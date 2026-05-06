import type { Meta, StoryObj } from '@storybook/nextjs'
import { Button } from './Button'

const meta = {
  title: 'Primitives/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'ghost', 'accent'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { children: 'Read the docs', variant: 'primary' },
}

export const Ghost: Story = {
  args: { children: 'View on GitHub', variant: 'ghost' },
}

export const Accent: Story = {
  args: { children: 'Open clip', variant: 'accent' },
}

export const Disabled: Story = {
  args: { children: 'Saving…', disabled: true },
}
