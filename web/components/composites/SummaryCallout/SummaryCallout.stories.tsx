import type { Meta, StoryObj } from '@storybook/nextjs'
import { SummaryCallout } from './SummaryCallout'

const meta = {
  title: 'Composites/SummaryCallout',
  component: SummaryCallout,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof SummaryCallout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    summary:
      'The agent reproduced a P1 onboarding regression in 47 seconds: the post-login redirect dropped a query parameter, blocking welcome-flow entry. Repro steps captured in three screenshots; downstream impact pulled from session telemetry.',
  },
}

export const Empty: Story = {
  args: { summary: '' },
}
