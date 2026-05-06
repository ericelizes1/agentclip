import type { Meta, StoryObj } from '@storybook/nextjs'
import { CreatorAvatar } from './CreatorAvatar'

const meta = {
  title: 'Composites/CreatorAvatar',
  component: CreatorAvatar,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof CreatorAvatar>

export default meta
type Story = StoryObj<typeof meta>

export const SingleName: Story = { args: { name: 'Eric' } }
export const FullName: Story = { args: { name: 'Eric Elizes' } }
export const Linked: Story = {
  args: { name: 'Eric Elizes', url: 'https://github.com/elizes' },
}

export const VarietyOfNames: Story = {
  args: { name: '' },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      {[
        'Eric Elizes',
        'Daisy Park',
        'Karri Saarinen',
        'Linda Tran',
        'Jane',
        'Kentaro Kawamoto',
        'Bay',
      ].map((n) => (
        <div key={n} className="flex flex-col items-center gap-1">
          <CreatorAvatar name={n} />
          <span className="text-xs text-ink-600">{n}</span>
        </div>
      ))}
    </div>
  ),
}
