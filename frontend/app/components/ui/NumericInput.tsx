'use client'

import { type ChangeEvent, type InputHTMLAttributes, useEffect, useState } from 'react'

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type'
> & {
  value: string | number
  onChange: (value: string) => void
  prefix?: string
}

function formatWithSeparators(raw: string | number): string {
  if (raw === '' || raw === null || raw === undefined) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  const num = parseInt(digits, 10)
  if (isNaN(num)) return ''
  return num.toLocaleString('es-AR', { maximumFractionDigits: 0 })
}

export function NumericInput({ value, onChange, prefix, ...props }: NumericInputProps) {
  const [display, setDisplay] = useState(() => formatWithSeparators(value))

  useEffect(() => {
    setDisplay(formatWithSeparators(value))
  }, [value])

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const stripped = e.target.value.replace(/\./g, '').replace(/\D/g, '')
    setDisplay(formatWithSeparators(stripped))
    onChange(stripped)
  }

  const input = (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
    />
  )

  if (!prefix) return input

  return (
    <span className="numeric-input-wrapper">
      <span className="numeric-input-prefix" aria-hidden="true">
        {prefix}
      </span>
      {input}
    </span>
  )
}
