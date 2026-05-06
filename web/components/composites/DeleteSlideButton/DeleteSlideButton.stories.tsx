import type { Meta, StoryObj } from '@storybook/nextjs'
import { DeleteSlideButton } from './DeleteSlideButton'

const meta = {
  title: 'Composites/DeleteSlideButton',
  component: DeleteSlideButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof DeleteSlideButton>

export default meta
type Story = StoryObj<typeof meta>

export const HappyPath: Story = {
  args: {
    position: 2,
    onDelete: async () => {
      await new Promise((r) => setTimeout(r, 600))
    },
  },
}

export const FailingDelete: Story = {
  args: {
    position: 5,
    onDelete: async () => {
      throw new Error('Edit link is no longer valid.')
    },
  },
}
