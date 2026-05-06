import type { Meta, StoryObj } from '@storybook/nextjs'
import { NavBar } from './NavBar'

const meta = {
  title: 'Composites/NavBar',
  component: NavBar,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof NavBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
