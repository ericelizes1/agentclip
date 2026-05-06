import type { Meta, StoryObj } from '@storybook/nextjs'
import { Tabs } from './Tabs'

const meta = {
  title: 'Primitives/Tabs',
  component: Tabs.Root,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs.Root>

export default meta
type Story = StoryObj<typeof meta>

export const InstallTabs: Story = {
  render: () => (
    <Tabs.Root defaultValue="pip">
      <Tabs.List>
        <Tabs.Trigger value="pip">Install yourself</Tabs.Trigger>
        <Tabs.Trigger value="agent">Have your agent do it</Tabs.Trigger>
        <Tabs.Trigger value="uvx">No install</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="pip">pip install agentclip</Tabs.Content>
      <Tabs.Content value="agent">claude install agentclip</Tabs.Content>
      <Tabs.Content value="uvx">uvx agentclip --help</Tabs.Content>
    </Tabs.Root>
  ),
}
