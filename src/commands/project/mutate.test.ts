import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildCreateBody } from './create.js'
import { buildUpdateBody } from './update.js'

describe('project create — buildCreateBody', () => {
    it('returns an empty object when nothing is passed', () => {
        expect(buildCreateBody({})).toEqual({})
    })

    it('maps named flags onto API field names', () => {
        expect(
            buildCreateBody({
                name: 'New project',
                status: '5',
                responsible: '10',
                amount: '1000',
                currency: '2',
                startAt: '2026-06-01',
                client: ['1', '2'],
            }),
        ).toEqual({
            name: 'New project',
            status_id: 5,
            responsible_id: 10,
            amount: 1000,
            currency_id: 2,
            start_at: '2026-06-01',
            client_ids: ['1', '2'],
        })
    })

    it('coerces numeric flags', () => {
        expect(buildCreateBody({ status: '3' })).toEqual({ status_id: 3 })
    })

    it('lets named flags override --data fields', () => {
        expect(
            buildCreateBody({
                data: '{"name":"From data","status_id":1}',
                name: 'From flag',
            }),
        ).toEqual({ name: 'From flag', status_id: 1 })
    })

    it('merges --data fields not covered by flags', () => {
        expect(
            buildCreateBody({
                data: '{"custom_fields":[{"id":1,"value":"x"}]}',
                name: 'X',
            }),
        ).toEqual({ name: 'X', custom_fields: [{ id: 1, value: 'x' }] })
    })

    it('throws INVALID_OPTIONS for non-numeric --status', () => {
        try {
            buildCreateBody({ status: 'high' })
            expect.fail('expected to throw')
        } catch (err) {
            expect((err as CliError).code).toBe('INVALID_OPTIONS')
        }
    })
})

describe('project update — buildUpdateBody', () => {
    it('returns an empty object when nothing is passed', () => {
        expect(buildUpdateBody({})).toEqual({})
    })

    it('omits undefined flag values', () => {
        expect(buildUpdateBody({ name: 'Renamed' })).toEqual({ name: 'Renamed' })
    })

    it('honours --data with named-flag overrides', () => {
        expect(
            buildUpdateBody({ data: '{"status_id":2,"name":"old"}', status: '7' }),
        ).toEqual({ status_id: 7, name: 'old' })
    })
})
