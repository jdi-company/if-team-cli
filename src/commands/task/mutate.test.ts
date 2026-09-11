import { describe, expect, it } from 'vitest'
import { CliError } from '../../lib/errors.js'
import { buildCreateBody, parseProjectId } from './create.js'
import { buildUpdateBody } from './update.js'

describe('task create — parseProjectId', () => {
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

describe('task create — buildCreateBody', () => {
    it('returns {} when nothing is passed', () => {
        expect(buildCreateBody({})).toEqual({})
    })

    it('maps named flags onto API field names', () => {
        expect(
            buildCreateBody({
                name: 'My task',
                status: '3',
                priority: '2',
                iteration: '7',
                startAt: '2026-06-01',
                finishAt: '2026-06-10',
                timePlan: '3600',
                participant: [5, 8],
                client: ['1'],
            }),
        ).toEqual({
            name: 'My task',
            status_id: 3,
            priority_id: 2,
            iteration_id: 7,
            start_at: '2026-06-01',
            finish_at: '2026-06-10',
            time_plan: 3600,
            participant_ids: [5, 8],
            client_ids: ['1'],
        })
    })

    it('lets named flags override --data', () => {
        expect(
            buildCreateBody({ data: '{"name":"from data"}', name: 'from flag' }),
        ).toEqual({ name: 'from flag' })
    })

    it('defaults start_at to the start of the finish_at day when start_at is omitted', () => {
        expect(
            buildCreateBody({ finishAt: '2026-08-12T23:59:59.000Z' }),
        ).toEqual({
            finish_at: '2026-08-12T23:59:59.000Z',
            start_at: '2026-08-12T00:00:00.000Z',
        })
    })

    it('does not override an explicitly provided start_at', () => {
        expect(
            buildCreateBody({
                startAt: '2026-08-01T00:00:00.000Z',
                finishAt: '2026-08-12T23:59:59.000Z',
            }),
        ).toEqual({
            start_at: '2026-08-01T00:00:00.000Z',
            finish_at: '2026-08-12T23:59:59.000Z',
        })
    })

    it('leaves start_at unset when finish_at is not provided', () => {
        expect(buildCreateBody({ name: 'No dates' })).toEqual({ name: 'No dates' })
    })

    it('applies the start_at default when finish_at comes from --data', () => {
        expect(
            buildCreateBody({ data: '{"finish_at":"2026-08-12T23:59:59.000Z"}' }),
        ).toEqual({
            finish_at: '2026-08-12T23:59:59.000Z',
            start_at: '2026-08-12T00:00:00.000Z',
        })
    })
})

describe('task update — buildUpdateBody', () => {
    it('returns {} when nothing is passed', () => {
        expect(buildUpdateBody({})).toEqual({})
    })

    it('supports --project (move task) and --iteration on update', () => {
        expect(buildUpdateBody({ project: '99', iteration: '7' })).toEqual({
            project_id: 99,
            iteration_id: 7,
        })
    })
})
