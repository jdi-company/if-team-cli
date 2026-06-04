import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildCreateBody, parseProjectId } from './create.js'
import { buildUpdateBody } from './update.js'

describe('iteration create — parseProjectId', () => {
    it('returns the integer for a valid numeric project id', () => {
        expect(parseProjectId('12')).toBe(12)
    })

    it('throws MISSING_ID when project is omitted', () => {
        try {
            parseProjectId(undefined)
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('MISSING_ID')
        }
    })

    it('throws INVALID_REF for garbage input', () => {
        expect(() => parseProjectId('abc')).toThrow(CliError)
    })
})

describe('iteration create — buildCreateBody', () => {
    it('defaults to_project_amount=false when nothing is passed', () => {
        expect(buildCreateBody({})).toEqual({ to_project_amount: false })
    })

    it('maps named flags onto API field names', () => {
        expect(
            buildCreateBody({
                name: 'Sprint 1',
                comment: 'Kickoff',
                status: '2299',
                startAt: '2026-06-01',
                finishAt: '2026-06-14',
                hours: '80',
                amount: '1000',
                exchangeRate: '36.5',
                toProjectAmount: true,
            }),
        ).toEqual({
            name: 'Sprint 1',
            comment: 'Kickoff',
            status_id: 2299,
            start_at: '2026-06-01',
            finish_at: '2026-06-14',
            hours: 80,
            amount: 1000,
            exchange_rate: 36.5,
            to_project_amount: true,
        })
    })

    it('defaults to_project_amount=false when only other flags are passed', () => {
        expect(buildCreateBody({ name: 'X' })).toEqual({
            name: 'X',
            to_project_amount: false,
        })
    })

    it('defaults amount to 0 when to_project_amount is true and --amount is omitted', () => {
        expect(buildCreateBody({ name: 'X', toProjectAmount: true })).toEqual({
            name: 'X',
            to_project_amount: true,
            amount: 0,
        })
    })

    it('keeps an explicit --amount when to_project_amount is true', () => {
        expect(
            buildCreateBody({ name: 'X', toProjectAmount: true, amount: '500' }),
        ).toEqual({ name: 'X', to_project_amount: true, amount: 500 })
    })

    it('keeps amount/to_project_amount supplied via --data', () => {
        expect(
            buildCreateBody({ data: '{"to_project_amount":true,"amount":750}' }),
        ).toEqual({ to_project_amount: true, amount: 750 })
    })

    it('defaults amount to 0 when to_project_amount comes from --data as true', () => {
        expect(buildCreateBody({ data: '{"to_project_amount":true}' })).toEqual({
            to_project_amount: true,
            amount: 0,
        })
    })
})

describe('iteration update — buildUpdateBody', () => {
    it('returns {} when nothing is passed', () => {
        expect(buildUpdateBody({})).toEqual({})
    })

    it('supports flipping to_project_amount false explicitly', () => {
        expect(buildUpdateBody({ toProjectAmount: false })).toEqual({
            to_project_amount: false,
        })
    })
})
