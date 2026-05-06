import type { Meta, StoryObj } from '@storybook/nextjs'
import { TicketMark } from './TicketMark'

const meta = {
  title: 'Primitives/TicketMark',
  component: TicketMark,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof TicketMark>

export default meta
type Story = StoryObj<typeof meta>

export const Navbar: Story = {
  args: { size: 20, className: 'text-vermillion-500' },
}

export const Favicon: Story = {
  args: { size: 64, className: 'text-vermillion-500' },
}

export const InkOutline: Story = {
  args: { size: 32, className: 'text-ink-900' },
}

export const ScaleLadder: Story = {
  args: { size: 20 },
  render: () => (
    <div className="flex items-center gap-6">
      {[16, 20, 24, 32, 48, 64, 96].map((s) => (
        <div key={s} className="flex flex-col items-center gap-2">
          <TicketMark size={s} className="text-vermillion-500" />
          <span className="text-xs text-ink-500">{s}px</span>
        </div>
      ))}
    </div>
  ),
}
