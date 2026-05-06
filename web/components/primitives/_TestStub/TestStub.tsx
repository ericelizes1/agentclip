/**
 * _TestStub — pipeline-verification stub.
 *
 * Exists only to prove the test toolchain works end-to-end before any
 * real primitive lands in Unit 8: Vitest renders + asserts, Storybook
 * boots + the addon-a11y axe pass succeeds, and the test-runner can
 * execute the story's interaction. Deleted in Unit 8 along with this
 * folder.
 *
 * The leading underscore signals "private to the build, not part of
 * the design system". Real primitives (Button, Input, ...) live next
 * to this folder without the underscore.
 */
export interface TestStubProps {
  /** Visible label so the test + story can assert against the rendered text. */
  label: string
}

export function TestStub({ label }: TestStubProps) {
  return (
    <button
      type="button"
      className="rounded-md bg-vermillion-500 px-4 py-2 text-paper"
      // Plain semantic button + label is enough to pass axe-core a11y
      // without any extra ARIA wiring.
    >
      {label}
    </button>
  )
}
