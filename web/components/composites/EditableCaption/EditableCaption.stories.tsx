import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import { EditableCaption } from './EditableCaption'

const meta = {
  title: 'Composites/EditableCaption',
  component: EditableCaption,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof EditableCaption>

export default meta
type Story = StoryObj<typeof meta>

function Demo({ initial = 'Login screen on staging.', shouldFail = false }: { initial?: string; shouldFail?: boolean }) {
  const [value, setValue] = useState(initial)
  return (
    <div className="w-[400px]">
      <EditableCaption
        value={value}
        onSave={async (next) => {
          await new Promise((r) => setTimeout(r, 600))
          if (shouldFail) throw new Error('The edit link is no longer valid.')
          setValue(next)
        }}
      />
    </div>
  )
}

// Each story renders the Demo wrapper; the args here satisfy the
// component's required-prop contract but the wrapper supplies its own
// state, so the values are placeholders.
const placeholderArgs = { value: '', onSave: async () => {} }

export const HappyPath: Story = { args: placeholderArgs, render: () => <Demo /> }
export const Empty: Story = { args: placeholderArgs, render: () => <Demo initial="" /> }
export const SaveFails: Story = { args: placeholderArgs, render: () => <Demo shouldFail /> }
