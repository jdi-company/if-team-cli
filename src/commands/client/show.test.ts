import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { parseId } from './show.js'

describe('client show — parseId', () => {
    it('returns the integer for a valid numeric id', () => {
        expect(parseId('1001')).toBe(1001)
    })

    it('throws MISSING_ID when id is omitted', () => {
        try {
            parseId(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('MISSING_ID')
        }
    })

    it('throws INVALID_REF for garbage input', () => {
        try {
            parseId('abc')
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_REF')
        }
    })

    it('throws INVALID_REF for non-positive input', () => {
        expect(() => parseId('0')).toThrow(CliError)
    })
})
