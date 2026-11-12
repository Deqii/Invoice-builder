import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'label',
            'caption',
            'meta',
            'body',
            'body-medium',
            'body-strong',
            'app-name',
            'card-amount',
            'dialog-title',
            'page-title',
            'total',
            'doc-title',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
