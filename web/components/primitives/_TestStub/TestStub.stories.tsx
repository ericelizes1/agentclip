import type { Meta, StoryObj } from '@storybook/nextjs'
import { TestStub } from './TestStub'

const meta = {
  title: 'Primitives/_TestStub',
  component: TestStub,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof TestStub>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: 'Pipeline OK' },
}
