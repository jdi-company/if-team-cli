import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildQuery, parseProjectId } from './list.js'

describe('iteration list — parseProjectId', () => {
    it('returns the integer for a valid numeric project id', () => {
        expect(parseProjectId('12')).toBe(12)
    })

    it('throws MISSING_ID when project id is undefined', () => {
        try {
            parseProjectId(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('MISSING_ID')
        }
    })

    it('throws INVALID_REF for non-numeric input', () => {
        expect(() => parseProjectId('abc')).toThrow(CliError)
        try {
            parseProjectId('abc')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_REF')
        }
    })

    it('throws INVALID_REF for zero or negative numbers', () => {
        expect(() => parseProjectId('0')).toThrow(CliError)
        expect(() => parseProjectId('-1')).toThrow(CliError)
    })
})

describe('iteration list — buildQuery', () => {
    it('always includes project_id as a direct param', () => {
        expect(buildQuery(12, {})).toEqual({ project_id: 12 })
    })

    it('maps --status to filter[status_id][]', () => {
        expect(buildQuery(12, { status: '3' })).toEqual({
            project_id: 12,
            'filter[status_id][]': '3',
        })
    })

    it('forwards --page and --limit', () => {
        expect(buildQuery(12, { page: '2', limit: '50' })).toEqual({
            project_id: 12,
            page: '2',
            limit: '50',
        })
    })

    it('combines every flag correctly', () => {
        expect(buildQuery(12, { status: '3', page: '2', limit: '50' })).toEqual({
            project_id: 12,
            'filter[status_id][]': '3',
            page: '2',
            limit: '50',
        })
    })
})
