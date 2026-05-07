import type { Meta, StoryObj } from '@storybook/nextjs'
import { RecordingProvider } from '@/components/context/RecordingProvider/RecordingProvider'
import { RecordingPill } from './RecordingPill'

const meta = {
  title: 'Composites/RecordingPill',
  component: RecordingPill,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof RecordingPill>

export default meta
type Story = StoryObj<typeof meta>

const Final = <>v0.1 · open source · MCP</>

export const Recording: Story = {
  args: { finalContent: Final },
  render: () => (
    <RecordingProvider initial="recording">
      <RecordingPill finalContent={Final} />
    </RecordingProvider>
  ),
}

export const Recorded: Story = {
  args: { finalContent: Final },
  render: () => (
    <RecordingProvider initial="recorded">
      <RecordingPill finalContent={Final} />
    </RecordingProvider>
  ),
}

export const Idle: Story = {
  args: { finalContent: Final },
  render: () => (
    <RecordingProvider initial="idle">
      <RecordingPill finalContent={Final} />
    </RecordingProvider>
  ),
}
