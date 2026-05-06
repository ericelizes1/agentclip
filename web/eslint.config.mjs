import { FlatCompat } from '@eslint/eslintrc'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Component-tier import direction: primitives can't import from
      // composites or patterns; composites can't import from patterns.
      // The check fires at lint time so a layering violation surfaces in
      // CI before review.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/composites/*', '@/components/patterns/*'],
              importNames: ['*'],
              message:
                'Primitives layer cannot import from composites or patterns. ' +
                'See docs/architecture or web/components/README.md for the layering rules.',
            },
          ],
        },
      ],
    },
  },
  {
    // Composites layer: can import from primitives, NOT from patterns.
    files: ['components/composites/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/patterns/*'],
              message:
                'Composites layer cannot import from patterns. Patterns ' +
                'compose composites + primitives, not the other way around.',
            },
          ],
        },
      ],
    },
  },
  {
    // Patterns layer: free to import from anywhere below.
    files: ['components/patterns/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
]
