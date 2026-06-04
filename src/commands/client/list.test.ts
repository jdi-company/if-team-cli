import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildQuery, parseType } from './list.js'

describe('client list — parseType', () => {
    it('returns the type for valid input', () => {
        expect(parseType('legal')).toBe('legal')
        expect(parseType('individual')).toBe('individual')
    })

    it('throws INVALID_OPTIONS when --type is omitted', () => {
        try {
            parseType(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_OPTIONS')
        }
    })

    it('throws INVALID_OPTIONS for an unknown type', () => {
        expect(() => parseType('vendor')).toThrow(CliError)
    })
})

describe('client list — buildQuery', () => {
    it('always sends the required type param', () => {
        expect(buildQuery({ type: 'legal' })).toEqual({ type: 'legal' })
    })

    it('maps each filter flag to bracket-notation keys', () => {
        expect(
            buildQuery({
                type: 'individual',
                name: 'adam',
                email: 'a@b.test',
                phone: '+123',
                comment: 'vip',
                country: '1',
                page: '2',
                limit: '50',
            }),
        ).toEqual({
            type: 'individual',
            'filter[name]': 'adam',
            'filter[email]': 'a@b.test',
            'filter[phone]': '+123',
            'filter[comment]': 'vip',
            'filter[country_id][]': '1',
            page: '2',
            limit: '50',
        })
    })

    it('throws when type is missing', () => {
        expect(() => buildQuery({})).toThrow(CliError)
    })
})
