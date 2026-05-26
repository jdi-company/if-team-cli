import { describe, expect, it } from 'vitest'
import { CliError } from './errors.js'
import { mergeBody, parseDataInput } from './mutate.js'

describe('parseDataInput', () => {
    it('returns {} when input is undefined or empty', () => {
        expect(parseDataInput(undefined)).toEqual({})
        expect(parseDataInput('')).toEqual({})
    })

    it('parses a literal JSON object', () => {
        expect(parseDataInput('{"name":"x","n":3}')).toEqual({ name: 'x', n: 3 })
    })

    it('throws INVALID_OPTIONS for malformed JSON', () => {
        try {
            parseDataInput('{name:x}')
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_OPTIONS')
        }
    })

    it('throws INVALID_OPTIONS when JSON is not an object', () => {
        expect(() => parseDataInput('[1,2,3]')).toThrow(CliError)
        expect(() => parseDataInput('"foo"')).toThrow(CliError)
        expect(() => parseDataInput('null')).toThrow(CliError)
    })

    it('throws INVALID_OPTIONS when @file is missing', () => {
        try {
            parseDataInput('@/this/path/definitely/does/not/exist.json')
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_OPTIONS')
        }
    })
})

describe('mergeBody', () => {
    it('overlays flag values onto data', () => {
        expect(mergeBody({ name: 'a', n: 1 }, { name: 'b' })).toEqual({ name: 'b', n: 1 })
    })

    it('ignores undefined flag values', () => {
        expect(mergeBody({ name: 'a' }, { name: undefined, n: 2 })).toEqual({ name: 'a', n: 2 })
    })

    it('returns the data object when no flags are set', () => {
        expect(mergeBody({ name: 'a' }, {})).toEqual({ name: 'a' })
    })

    it('returns {} when neither data nor flags are set', () => {
        expect(mergeBody({}, {})).toEqual({})
    })
})
