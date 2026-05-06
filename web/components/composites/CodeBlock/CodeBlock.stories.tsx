import type { Meta, StoryObj } from '@storybook/nextjs'
import { CodeBlock } from './CodeBlock'

const meta = {
  title: 'Composites/CodeBlock',
  component: CodeBlock,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof CodeBlock>

export default meta
type Story = StoryObj<typeof meta>

export const InstallYourself: Story = {
  args: {
    label: 'Install yourself',
    prompt: '$',
    code: 'pip install agentclip',
  },
}

export const MultiLine: Story = {
  args: {
    label: 'Have your agent do it',
    prompt: '$',
    code: ['claude install agentclip', 'agentclip whoami "Eric Elizes"'].join('\n'),
  },
}
