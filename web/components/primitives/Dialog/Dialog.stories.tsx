import type { Meta, StoryObj } from '@storybook/nextjs'
import { Dialog } from './Dialog'

const meta = {
  title: 'Primitives/Dialog',
  component: Dialog.Content,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog.Content>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger className="rounded-md border border-ink-200 bg-paper px-3 py-2 text-sm">
        Open dialog
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title className="text-lg font-semibold tracking-tight">
          Share this clip
        </Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-ink-600">
          The link is public; anyone with it can view.
        </Dialog.Description>
      </Dialog.Content>
    </Dialog.Root>
  ),
}
