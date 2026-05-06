import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from './Tabs'

function Fixture() {
  return (
    <Tabs.Root defaultValue="pip">
      <Tabs.List>
        <Tabs.Trigger value="pip">pip</Tabs.Trigger>
        <Tabs.Trigger value="uvx">uvx</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="pip">pip install agentclip</Tabs.Content>
      <Tabs.Content value="uvx">uvx agentclip --help</Tabs.Content>
    </Tabs.Root>
  )
}

describe('Tabs', () => {
  it('renders the default tab body', () => {
    render(<Fixture />)
    expect(screen.getByText('pip install agentclip')).toBeInTheDocument()
  })

  it('switches the rendered body when another trigger is activated', async () => {
    render(<Fixture />)
    await userEvent.click(screen.getByRole('tab', { name: 'uvx' }))
    expect(screen.getByText('uvx agentclip --help')).toBeInTheDocument()
  })
})
