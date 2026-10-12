import { describe, expect, it } from 'vitest'
import { editNumber, parseValues } from '../app/components/lab/input'

describe('number input', () => {
  it('parses signed integers and mixed separators', () => {
    expect(parseValues('-999, 4 0,999').values).toEqual([-999, 4, 0, 999])
  })
  it('rejects invalid tokens, ranges and oversized batches', () => {
    expect(parseValues('4,x').error).toContain('x')
    expect(parseValues('1000').values).toEqual([])
    expect(parseValues(Array.from({ length: 21 }, (_, i) => i).join(',')).error).toContain('20')
  })
  it('toggles only the current token and avoids duplicate separators', () => {
    expect(editNumber('10, 4', '-')).toBe('10, -4')
    expect(editNumber('10, -4', '-')).toBe('10, 4')
    expect(editNumber('10, ', ',')).toBe('10, ')
  })
})
