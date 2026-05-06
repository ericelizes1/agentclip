import type { Preview } from '@storybook/nextjs'
import { withThemeByClassName } from '@storybook/addon-themes'
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      // Both surfaces from the design system; defaults to warm parchment.
      values: [
        { name: 'paper', value: '#faf9f5' },
        { name: 'paper-dark', value: '#141413' },
      ],
      default: 'paper',
    },
    a11y: {
      // Treat any axe violation as a story-test failure.
      test: 'error',
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'theme-light',
        dark: 'theme-dark',
      },
      defaultTheme: 'light',
    }),
  ],
}

export default preview
