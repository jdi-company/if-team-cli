import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildQuery, parseTaskId } from './list.js'

describe('workload list — parseTaskId', () => {
    it('returns the integer for a valid numeric task id', () => {
        expect(parseTaskId('42')).toBe(42)
    })

    it('throws MISSING_ID when task id is undefined', () => {
        try {
            parseTaskId(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('MISSING_ID')
        }
    })

    it('throws INVALID_REF for non-numeric input', () => {
        try {
            parseTaskId('abc')
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_REF')
        }
    })

    it('throws INVALID_REF for zero or negative numbers', () => {
        expect(() => parseTaskId('0')).toThrow(CliError)
        expect(() => parseTaskId('-1')).toThrow(CliError)
    })
})

describe('workload list — buildQuery', () => {
    it('always includes task_id as a direct param', () => {
        expect(buildQuery(42, {})).toEqual({ task_id: 42 })
    })

    it('forwards --page and --limit', () => {
        expect(buildQuery(42, { page: '2', limit: '50' })).toEqual({
            task_id: 42,
            page: '2',
            limit: '50',
        })
    })
})
