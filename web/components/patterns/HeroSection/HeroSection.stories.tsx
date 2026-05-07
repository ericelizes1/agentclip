import type { Meta, StoryObj } from '@storybook/nextjs'
import { HeroSection } from './HeroSection'

const meta = {
  title: 'Patterns/HeroSection',
  component: HeroSection,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof HeroSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
