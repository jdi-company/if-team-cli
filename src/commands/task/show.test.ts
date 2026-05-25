import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { parseId } from './show.js'

describe('task show — parseId', () => {
    it('returns the integer for a valid numeric ref', () => {
        expect(parseId('4567')).toBe(4567)
    })

    it('throws MISSING_ID when ref is undefined', () => {
        try {
            parseId(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('MISSING_ID')
        }
    })

    it('throws INVALID_REF for non-numeric input', () => {
        expect(() => parseId('abc')).toThrow(CliError)
        try {
            parseId('abc')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_REF')
        }
    })

    it('throws INVALID_REF for zero or negative numbers', () => {
        expect(() => parseId('0')).toThrow(CliError)
        expect(() => parseId('-5')).toThrow(CliError)
    })
})
