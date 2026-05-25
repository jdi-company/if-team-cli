import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { parseId } from './show.js'

describe('project show — parseId', () => {
    it('returns the integer for a valid numeric ref', () => {
        expect(parseId('42')).toBe(42)
    })

    it('throws MISSING_ID when ref is undefined', () => {
        try {
            parseId(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect(err).toBeInstanceOf(CliError)
            expect((err as CliError).code).toBe('MISSING_ID')
        }
    })

    it('throws INVALID_REF for non-numeric input', () => {
        try {
            parseId('abc')
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_REF')
        }
    })

    it('throws INVALID_REF for zero or negative numbers', () => {
        expect(() => parseId('0')).toThrow(CliError)
        expect(() => parseId('-1')).toThrow(CliError)
    })

    it('throws INVALID_REF for non-integers', () => {
        expect(() => parseId('1.5')).toThrow(CliError)
    })
})
