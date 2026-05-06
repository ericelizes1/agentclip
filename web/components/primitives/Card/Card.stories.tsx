import type { Meta, StoryObj } from '@storybook/nextjs'
import { Card } from './Card'

const meta = {
  title: 'Primitives/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

const filler = (
  <div className="p-6">
    <h3 className="font-medium text-base">Onboarding regression</h3>
    <p className="mt-2 text-sm text-ink-600">
      The summary callout sits inside a Card at the top of the viewer.
    </p>
  </div>
)

export const Flat: Story = { args: { children: filler, elevation: 'flat' } }
export const Raised: Story = { args: { children: filler, elevation: 'raised' } }
export const Dark: Story = { args: { children: filler, elevation: 'dark' } }
