import type { Meta, StoryObj } from '@storybook/nextjs'
import { Tooltip } from './Tooltip'

const meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip.Content,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip.Content>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger className="rounded-md border border-ink-200 bg-paper px-3 py-2 text-sm">
          Hover me
        </Tooltip.Trigger>
        <Tooltip.Content>Copy share URL</Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  ),
}
