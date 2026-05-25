import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { parseId } from './show.js'

describe('iteration show — parseId', () => {
    it('returns the integer for a valid numeric id', () => {
        expect(parseId('345')).toBe(345)
    })

    it('throws MISSING_ID when id is undefined', () => {
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
