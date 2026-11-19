import type { ButtonHTMLAttributes } from 'react'

// Colors follow one rule: amber with dark text, blue with white text, red with white text.
const VARIANTS = {
  primary: 'bg-amber text-ink enabled:hover:bg-amber-hover enabled:active:bg-amber-press',
  blue: 'bg-blue text-white enabled:hover:bg-blue-hover enabled:active:bg-blue-press',
  danger: 'bg-red text-white enabled:hover:bg-red-hover enabled:active:bg-red-press',
  secondary: 'border border-white/10 bg-raised text-snow enabled:hover:bg-raised-hover enabled:active:bg-panel',
  ghost: 'bg-transparent text-snow enabled:hover:bg-raised enabled:active:bg-panel',
  dangerGhost:
    'bg-transparent text-red enabled:hover:bg-red enabled:hover:text-white enabled:active:bg-red-press enabled:active:text-white',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS
}

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  )
}
