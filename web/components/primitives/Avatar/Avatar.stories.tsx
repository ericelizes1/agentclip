import type { Meta, StoryObj } from '@storybook/nextjs'
import { Avatar } from './Avatar'

const meta = {
  title: 'Primitives/Avatar',
  component: Avatar.Root,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar.Root>

export default meta
type Story = StoryObj<typeof meta>

export const InitialsFallback: Story = {
  render: () => (
    <Avatar.Root>
      <Avatar.Image src="" alt="Eric Elizes" />
      <Avatar.Fallback>EE</Avatar.Fallback>
    </Avatar.Root>
  ),
}
