import type { Meta, StoryObj } from '@storybook/nextjs'
import { MetaRow } from './MetaRow'

const meta = {
  title: 'Composites/MetaRow',
  component: MetaRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof MetaRow>

export default meta
type Story = StoryObj<typeof meta>

export const WithLinkedCredit: Story = {
  args: {
    labels: ['Mar 14, 2026', '7 clips', 'sales-demo'],
    createdBy: 'Eric Elizes',
    createdByUrl: 'https://github.com/elizes',
  },
}

export const WithUnlinkedCredit: Story = {
  args: {
    labels: ['Mar 14, 2026', '7 clips'],
    createdBy: 'Eric Elizes',
  },
}

export const NoCredit: Story = {
  args: {
    labels: ['Mar 14, 2026', '7 clips', 'sales-demo'],
  },
}
